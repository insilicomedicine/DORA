import logging

from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger("django.request")


class LoggingMiddleware(MiddlewareMixin):
    def process_request(self, request):
        logger.info(
            f"Request Start: {request.method} {request.get_full_path()} - {request.META['REMOTE_ADDR']}"
        )

    def process_response(self, request, response):
        logger.info(
            f"Request End: {request.method} {request.get_full_path()}"
            f" - {request.META['REMOTE_ADDR']} - {response.status_code}"
        )
        return response
