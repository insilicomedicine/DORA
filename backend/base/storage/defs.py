class AllowedBucketPresignedMethods:
    GET_OBJECT = "get_object"
    PUT_OBJECT = "put_object"

    METHODS = [GET_OBJECT, PUT_OBJECT]


class AllowedBlobPresignedMethods:
    GET_BLOB = "get_blob"
    PUT_BLOB = "put_blob"

    METHODS = [GET_BLOB, PUT_BLOB]


class AllowedStoragePresignedMethods:
    """
    Unified presigned method names that work with both S3 and Blob Storage.
    The factory will map these to the appropriate backend-specific methods.
    """

    GET = "get"
    PUT = "put"

    METHODS = [GET, PUT]
