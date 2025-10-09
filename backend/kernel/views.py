from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from base.mixins import GetSerializerClassMixin
from general.defs import ConfigKeyType
from general.models import Config
from kernel.models import Template, TemplateAgent
from kernel.serializers import (
    GeneratePlanSerializer,
    SuggestionSerializer,
    TemplateAgentSerializer,
    TemplateDetailSerializer,
    TemplateModelSerializer,
)
from users.subscription.utils import subscription_provider


class TemplateViewSet(
    GetSerializerClassMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    queryset = Template.objects.all()
    serializer_class = None
    serializer_action_classes = {
        "list": TemplateModelSerializer,
        "retrieve": TemplateDetailSerializer,
        "generate_plan": GeneratePlanSerializer,
        "suggestions": SuggestionSerializer,
    }

    def get_queryset(self):
        queryset = subscription_provider.get_accessible_templates(self.request.user)
        return queryset

    @action(methods=["get"], detail=True)
    def agents(self, request, pk=None):
        template_agents = TemplateAgent.objects.all()
        serializer = TemplateAgentSerializer(template_agents, many=True)
        return Response(serializer.data)

    @action(methods=["get"], detail=False)
    def output_formats(self, request):
        return Response(Config.get(ConfigKeyType.OUTPUT_FORMATS, []))

    @action(methods=["post"], detail=False)
    def suggestions(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response()
