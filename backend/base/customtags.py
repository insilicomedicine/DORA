from django.template import Library

register = Library()


@register.filter(is_safe=False)
def length_is(value, arg):
    """
    Return a boolean if the length of value is equal to arg
    Source: https://stackoverflow.com/a/78894082
    """

    try:
        return len(value) == int(arg)
    except (ValueError, TypeError):
        return False
