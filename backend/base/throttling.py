import time
from datetime import datetime

from django.conf import settings
from django.core.cache import cache as default_cache
from django.core.exceptions import ImproperlyConfigured
from django.utils import timezone
from ipware import get_client_ip
from rest_framework import status
from rest_framework.exceptions import Throttled
from rest_framework.throttling import BaseThrottle, SimpleRateThrottle

from general.models import BlacklistedIP, LogRecord

TIME_UNITS = {"s": 1, "m": 60, "h": 3600, "d": 86400}


class IPThrottled(Throttled):
    extra_detail_singular = extra_detail_plural = (
        "Your IP address has been temporarily blocked due to suspicious activity. "
        "If you believe this is an error, please contact Support Team."
    )


class AttemptThrottled(Throttled):
    extra_detail_singular = (
        "Your account has been temporarily locked due to multiple unsuccessful login attempts. "
        "Please try again after {wait} second."
    )
    extra_detail_plural = (
        "Your account has been temporarily locked due to multiple unsuccessful login attempts. "
        "Please try again after {wait} seconds."
    )


class IPRateThrottle(SimpleRateThrottle):
    scope = "ip"

    def __init__(self):
        super().__init__()
        self.ident = None

    def get_ident(self, request):
        ident, _ = get_client_ip(request)
        if not ident:
            ident = super().get_ident(request)

        # Handle the case where indent may contain multiple IP addresses
        return ident.strip().split(",")[0]

    def get_cache_key(self, request, view):
        self.ident = self.get_ident(request)
        return self._get_cache_key(self.ident)

    def parse_rate(self, rate):
        if rate is None:
            return (None, None)
        num, period = rate.split("/")
        num_requests = int(num)
        quantity = int(period[:-1]) if period[:-1].isdigit() else 1
        duration = TIME_UNITS[period[-1]] * quantity
        return (num_requests, duration)

    def throttle_success(self):
        super().throttle_success()

        return not self._extend_blacklisted_duration()

    def throttle_failure(self):
        if not self._extend_blacklisted_duration():
            dt_now = self._dt_now()
            wait_seconds = self.wait()
            if wait_seconds:
                BlacklistedIP.objects.create(
                    ip_address=self.ident,
                    blacklist_starts_at=dt_now,
                    blacklist_ends_at=dt_now + timezone.timedelta(seconds=wait_seconds),
                )
        return False

    def unblock(self, indent):
        self.cache.delete(self._get_cache_key(indent))

    def _get_cache_key(self, ident):
        return self.cache_format % {"scope": self.scope, "ident": ident}

    def _dt_now(self):
        return datetime.fromtimestamp(self.now, timezone.utc if settings.USE_TZ else None)

    def _extend_blacklisted_duration(self):
        dt_now = self._dt_now()
        blacklisted_ip = BlacklistedIP.objects.filter(
            ip_address=self.ident, blacklist_ends_at__gt=dt_now
        ).first()
        if blacklisted_ip:
            blacklisted_ip.extend_blacklisted_duration()
            return True
        return False


class LoginAttemptThrottle(BaseThrottle):
    cache = default_cache
    timer = time.time
    cache_format = "throttle_attempt_%(scope)s_%(ident)s"
    scope = "login"
    THROTTLE_ATTEMPTS = settings.REST_FRAMEWORK["DEFAULT_THROTTLE_ATTEMPTS"]
    CACHE_TIMEOUT = 7200

    def __init__(self):
        self.attempt_set = self.get_attempt_set()
        self.parsed_attempt_set = self.parse_attempt_set(self.attempt_set)
        self.now = self.timer()
        self.key = None
        self.history = []
        self.duration = 0

    def get_cache_key(self, ident):
        return self.cache_format % {"scope": self.scope, "ident": ident}

    def get_ident(self, request):
        return request.data.get("email")

    def get_attempt_set(self):
        if not getattr(self, "scope", None):
            msg = "You must set either `.scope` or `.attempt` for '%s' throttle" % self.__class__.__name__
            raise ImproperlyConfigured(msg)

        try:
            return self.THROTTLE_ATTEMPTS[self.scope]
        except KeyError:
            msg = "No default throttle attempt set for '%s' scope" % self.scope
            raise ImproperlyConfigured(msg)

    def parse_attempt_set(self, attempt_set):
        if attempt_set is None:
            return {}
        result = {}
        for key, value in attempt_set.items():
            unit = value[-1]
            quantity = int(value[:-1]) if value[:-1].isdigit() else 1
            parsed_value = quantity * TIME_UNITS[unit]
            result[key] = parsed_value
        return result

    def allow(self, ident):
        self.key = self.get_cache_key(ident)

        self.history = self.cache.get(self.key, [])
        if not self.history:
            return True

        if len(self.history) < min(self.parsed_attempt_set.keys()):
            return True

        max_duration = max(self.parsed_attempt_set.values())
        self.duration = self.parsed_attempt_set.get(len(self.history), max_duration)
        if self.now - self.history[0] < self.duration:
            return False
        return True

    def allow_request(self, request, view):
        ident = self.get_ident(request)
        if not ident:
            return True
        is_allowed = self.allow(ident)
        if not is_allowed:
            LogRecord.log(request, f"User {ident} login failed [blocked account].")
        return is_allowed

    def wait(self):
        if self.history:
            max_duration = max(self.parsed_attempt_set.values())
            duration = self.parsed_attempt_set.get(len(self.history), max_duration)
            return duration - (self.now - self.history[0])
        return 0

    def attempt(self, request, response):
        ident = self.get_ident(request)
        if not ident:
            return

        self.key = self.get_cache_key(ident)

        if not self.attempt_failure(response):
            if self.response_success(response) and self.cache.get(self.key):
                self.cache.delete(self.key)
            return

        self.history = self.cache.get(self.key, [])
        self.history.insert(0, self.now)
        self.cache.set(self.key, self.history, timeout=self.CACHE_TIMEOUT)

    def attempt_failure(self, response):
        return response.status_code == status.HTTP_401_UNAUTHORIZED

    def response_success(self, response):
        return response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]

    def unblock(self, indent):
        self.cache.delete(self.get_cache_key(indent))


class AttemptThrottleMixin:
    def finalize_response(self, request, response, *args, **kwargs):
        for throttle in self.get_throttles():
            if isinstance(throttle, LoginAttemptThrottle):
                throttle.attempt(request, response)

        return super().finalize_response(request, response, *args, **kwargs)

    def throttled(self, request, wait):
        for throttle in self.get_throttles():
            if isinstance(throttle, LoginAttemptThrottle):
                raise AttemptThrottled(wait)
            elif isinstance(throttle, IPRateThrottle):
                raise IPThrottled(wait)
        return super().throttled(request, wait)
