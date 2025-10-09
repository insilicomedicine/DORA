from typing import Type

from users.subscription.default_subscription import DefaultSubscriptionProvider
from users.subscription.subscription_interface import SubscriptionProvider


def get_subscription_provider_class() -> Type[SubscriptionProvider]:
    """
    Returns the appropriate subscription provider based on available modules.
    Falls back to DefaultSubscriptionProvider if payment module is not available.
    """
    try:
        from payment.subscription.subscription_provider import PaymentSubscriptionProvider

        return PaymentSubscriptionProvider
    except ImportError:
        pass

    return DefaultSubscriptionProvider


subscription_provider_class: Type[SubscriptionProvider] = get_subscription_provider_class()
subscription_provider = subscription_provider_class()


def get_subscription_field_mixin() -> object:
    try:
        from payment.subscription.subscription_field_mixin import SubscriptionFieldMixin

        return SubscriptionFieldMixin
    except ImportError:
        pass

    class Empty:
        pass

    return Empty


SubscriptionFieldMixin = get_subscription_field_mixin()
