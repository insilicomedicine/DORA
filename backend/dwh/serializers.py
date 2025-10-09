from rest_framework import serializers


class DwhScientificPublicationMetadataSerializer(serializers.Serializer):
    ORDER_BY_ID = "id"
    ORDER_BY_AUTHORS = "authors"
    ORDER_BY_CHOICES = ((ORDER_BY_ID, "ID"), (ORDER_BY_AUTHORS, "Authors"))
    pubmed_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True,
    )
    order_by = serializers.ChoiceField(choices=ORDER_BY_CHOICES, default=ORDER_BY_AUTHORS)
