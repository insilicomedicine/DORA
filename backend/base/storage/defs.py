class AllowedBucketPresignedMethods:
    GET_OBJECT = "get_object"
    PUT_OBJECT = "put_object"

    METHODS = [GET_OBJECT, PUT_OBJECT]


class AllowedBlobPresignedMethods:
    GET_BLOB = "get_blob"
    PUT_BLOB = "put_blob"

    METHODS = [GET_BLOB, PUT_BLOB]
