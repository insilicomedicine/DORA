from base64 import b64encode
from urllib import parse

from rest_framework.pagination import CursorPagination, PageNumberPagination


class CustomPageNumberPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 1000


class CustomCursorPagination(CursorPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 1000
    ordering = "-created_at"

    def encode_cursor(self, cursor):
        tokens = {}
        if cursor.offset != 0:
            tokens["o"] = str(cursor.offset)
        if cursor.reverse:
            tokens["r"] = "1"
        if cursor.position is not None:
            tokens["p"] = cursor.position

        querystring = parse.urlencode(tokens, doseq=True)
        encoded = b64encode(querystring.encode("ascii")).decode("ascii")
        return encoded
