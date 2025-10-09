import json
import logging

from base.defs.core import CommonConstants

log = logging.getLogger(__name__)


class RequestParser(object):
    REQUEST_METHOD = "REQUEST_METHOD"
    PATH_INFO = "PATH_INFO"
    QUERY_STRING = "QUERY_STRING"
    REMOTE_ADDR = "REMOTE_ADDR"

    HTTP_X_FORWARDED_FOR = "HTTP_X_FORWARDED_FOR"
    HTTP_USER_AGENT = "HTTP_USER_AGENT"
    HTTP_REFERER = "HTTP_REFERER"
    HTTP_ACCEPT_LANGUAGE = "HTTP_ACCEPT_LANGUAGE"

    params = (
        REQUEST_METHOD,
        PATH_INFO,
        QUERY_STRING,
        REMOTE_ADDR,
        HTTP_X_FORWARDED_FOR,
        HTTP_USER_AGENT,
        HTTP_REFERER,
        HTTP_ACCEPT_LANGUAGE,
    )

    def __init__(self, request, message, **kwargs):
        self.request = request
        self.message = message
        self.other = kwargs

    def simple_filter(self):
        out = {}
        for key in self.request.META.keys():
            if key in self.params:
                out.update({key: self.request.META[key]})
        return out

    def parse(self):
        return self.simple_filter()

    @classmethod
    def display(cls, data):
        return json.dumps(data, indent=2)

    def get_client_ip(self):
        client_ip = CommonConstants.UNKNOWN
        try:
            client_ip = self.request.META.get(self.HTTP_X_FORWARDED_FOR, None) or self.request.META.get(
                self.REMOTE_ADDR, None
            )
            client_ip = client_ip.split(",")[0]
        except Exception as exc:
            log.error("Could not extract clients IP: {}: {}".format(exc.__class__.__name__, exc))

        return client_ip

    def get_referer(self):
        return self.request.get(self.HTTP_REFERER, CommonConstants.UNKNOWN)

    def get_uri(self):
        return self.request.get(self.request.build_absolute_uri(), CommonConstants.UNKNOWN)
