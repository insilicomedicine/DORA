from django.contrib.auth import authenticate, login, logout
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from base.defs.http import HttpRequestMethod
from base.mixins import GetSerializerClassMixin
from base.throttling import AttemptThrottleMixin, IPRateThrottle, LoginAttemptThrottle
from documents.models import DocumentStatus
from general.models import LogRecord
from users.models import AITokenUsage
from users.serializers import (
    DisplayPreferencesSerializer,
    LoginSerializer,
    NewPasswordSerializer,
    PublicationSettingsSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    ValidatePasswordSerializer,
    ValidateTokenSerializer,
)
from users.utils import (
    get_user_documents_count,
    get_user_plan,
    is_internal_user,
    send_activation_email,
    send_reset_password_email,
)


class UserViewSet(AttemptThrottleMixin, GetSerializerClassMixin, viewsets.GenericViewSet):
    serializer_class = None
    serializer_action_classes = {
        "register": RegisterSerializer,
        "login": LoginSerializer,
        "validate_token": ValidateTokenSerializer,
        "validate_password": ValidatePasswordSerializer,
        "reset_password": ResetPasswordSerializer,
        "set_password": NewPasswordSerializer,
        "publication_settings": PublicationSettingsSerializer,
        "display_preferences": DisplayPreferencesSerializer,
    }

    def get_permissions(self):
        if self.action in [
            "login",
            "csrf_token",
            "register",
            "validate_token",
            "validate_password",
            "reset_password",
            "set_password",
        ]:
            return []
        return super().get_permissions()

    @method_decorator(ensure_csrf_cookie)
    @action(methods=["GET"], detail=False)
    def csrf_token(self, request):
        return Response()

    @action(methods=["post"], detail=False, throttle_classes=[IPRateThrottle])
    def register(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        send_activation_email(user)
        return Response()

    @action(methods=["post"], detail=False, throttle_classes=[LoginAttemptThrottle])
    def login(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        user = authenticate(request, username=email.lower(), password=password)
        if user is not None:
            if request.user and request.user.is_authenticated:
                return Response()

            login(request, user)
            LogRecord.log(request, f"User {user.username} login succeeded.")
            return Response()
        else:
            LogRecord.log(request, f"User {email} login failed [incorrect password].")
            return Response({"detail": "Invalid email or password"}, status=status.HTTP_401_UNAUTHORIZED)

    @action(methods=["post"], detail=False)
    def logout(self, request):
        logout(request)
        return Response()

    @action(methods=["get"], detail=False)
    def info(self, request):
        user = request.user

        resp = {
            "email": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "terms_and_privacy_accepted": user.profile.terms_and_privacy_accepted_at is not None,
            "in_progress_documents": get_user_documents_count(user, status=DocumentStatus.IN_PROGRESS),
            "total_documents": get_user_documents_count(user),
        }
        if is_internal_user(user):
            resp.update({"is_internal": True, "plan": None})
        else:
            resp["plan"] = get_user_plan(user)

        return Response(resp)

    @action(methods=["get"], detail=False)
    def tokens(self, request):
        return Response({"total_tokens_used": AITokenUsage.total_tokens_used(request.user)})

    @action(methods=["post"], detail=False)
    def validate_token(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response()

    @action(methods=["post"], detail=False)
    def validate_password(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validation_results = serializer.validation_results(serializer.validated_data)
        return Response(validation_results)

    @action(methods=["post"], detail=False, throttle_classes=[IPRateThrottle])
    def reset_password(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        if user:
            request.user = user
            if user.is_active:
                send_reset_password_email(user)
                LogRecord.log(request, f"User {user.username} forgot password.")
            else:
                send_activation_email(user)
                LogRecord.log(request, f"Unactivated User {user.username} forgot password.")
        return Response()

    @action(methods=["post"], detail=False)
    def set_password(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        LogRecord.log(request, f"User {user.username} password set.")
        return Response()

    @action(methods=["post"], detail=False)
    def terms_and_privacy(self, request):
        user = request.user
        if user.profile.terms_and_privacy_accepted_at is not None:
            return Response(
                {"detail": "Terms & Conditions and Privacy Policy already accepted"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.profile.terms_and_privacy_accepted_at = timezone.now()
        user.profile.save()
        return Response()

    @action(methods=["get", "post"], detail=False)
    def publication_settings(self, request):
        user = request.user
        if request.method.lower() == HttpRequestMethod.POST:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            ret = serializer.save()
            return Response(ret)
        else:
            return Response(user.profile.publication_settings)

    @action(methods=["get", "post"], detail=False)
    def display_preferences(self, request):
        user = request.user
        if request.method.lower() == HttpRequestMethod.POST:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            ret = serializer.save()
            return Response(ret)
        else:
            return Response(user.profile.display_preferences)
