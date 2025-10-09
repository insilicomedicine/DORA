from rest_framework.exceptions import ValidationError
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if isinstance(exc, ValidationError):
        custom_response_data = {}
        for _, value in response.data.items():
            if isinstance(value, list):
                value = [str(item) for item in value]
                custom_response_data["detail"] = ", ".join(value)
            else:
                custom_response_data["detail"] = value

            break

        response.data = custom_response_data

    return response
