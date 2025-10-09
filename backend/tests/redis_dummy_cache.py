from django.core.cache.backends.dummy import DummyCache


# django-redis has custom methods that are not in standard django.cache interface
class RedisDummyCache(DummyCache):
    @staticmethod
    def keys(keys=""):
        return []
