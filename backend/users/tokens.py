from enum import Enum, auto

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.exceptions import ValidationError
from django.utils.crypto import constant_time_compare
from django.utils.http import base36_to_int


class InvalidTokenError(ValidationError):
    pass


class ExpiredTokenError(ValidationError):
    pass


class TokenType(Enum):
    ACTIVATION = auto()
    PASSWORD_RESET = auto()


class TokenGenerator(PasswordResetTokenGenerator):
    def check_token(self, user: User, token: str, type: TokenType) -> None:
        if not (user and token):
            raise InvalidTokenError("User or token is missing")

        ts_b36, _ = token.split("-")

        ts = base36_to_int(ts_b36)

        for secret in [self.secret, *self.secret_fallbacks]:
            if constant_time_compare(
                self._make_token_with_timestamp(user, ts, secret),
                token,
            ):
                break
        else:
            raise InvalidTokenError("Token does not match")

        timeout = (
            settings.TOKEN_ACTIVATION_TIMEOUT
            if type == TokenType.ACTIVATION
            else settings.TOKEN_PASSWORD_RESET_TIMEOUT
        )

        if (self._num_seconds(self._now()) - ts) > timeout:
            raise ExpiredTokenError("Token has expired")

    def _make_hash_value(self, user: User, timestamp: int) -> str:
        login_timestamp = (
            "" if user.last_login is None else user.last_login.replace(microsecond=0, tzinfo=None)
        )
        reset_request_timestamp = (
            ""
            if user.profile.password_reset_requested_at is None
            else user.profile.password_reset_requested_at.replace(microsecond=0, tzinfo=None)
        )
        email_field = user.get_email_field_name()
        email = getattr(user, email_field, "") or ""
        return f"{user.pk}{user.password}{login_timestamp}{reset_request_timestamp}{timestamp}{email}"


token_generator = TokenGenerator()
