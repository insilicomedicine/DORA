import logging

import sentry_sdk
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.socialaccount.helpers import complete_social_login
from allauth.socialaccount.models import SocialAccount, SocialToken
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.serializers import SocialLoginSerializer
from dj_rest_auth.registration.views import SocialLoginView
from django.contrib.auth import login as django_login
from django.contrib.auth.models import User
from django.db import IntegrityError
from django.http import HttpResponseBadRequest
from google.auth.exceptions import GoogleAuthError
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token as google_id_token
from requests.exceptions import HTTPError
from rest_framework import serializers
from rest_framework.response import Response

from app.settings import SOCIALACCOUNT_PROVIDERS_GOOGLE_CLIENT_ID
from general.models import LogRecord
from users.utils import send_invitation_email_login_via_google, set_important_dates

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CustomSocialLoginSerializer(SocialLoginSerializer):
    def validate(self, attrs):
        view = self.context.get("view")
        request = self._get_request()
        id_token = attrs.get("id_token")

        if not view:
            raise serializers.ValidationError("View is not defined, pass it as a context variable")

        adapter_class = getattr(view, "adapter_class", None)
        if not adapter_class:
            raise serializers.ValidationError("Define adapter_class in view")
        adapter = adapter_class(request)
        app = adapter.get_provider().app

        social_token = SocialToken(token=id_token)
        social_token.app = app

        try:
            login = self.get_social_login(adapter, app, social_token, response={"id_token": id_token})
            is_existing = User.objects.filter(email=login.user.email).exists()
            ret = complete_social_login(request, login)
        except (HTTPError, GoogleAuthError) as ex:
            logger.info(f"Google auth error: {ex}")
            sentry_sdk.capture_exception(ex)
            raise serializers.ValidationError("Incorrect value")

        if isinstance(ret, HttpResponseBadRequest):
            raise serializers.ValidationError(ret.content)

        if not is_existing:
            try:
                login.save(request, connect=True)
            except IntegrityError as ex:
                raise serializers.ValidationError(
                    "User is already registered with this e-mail address."
                ) from ex
            self.post_signup(login, attrs)

        attrs["user"] = login.account.user
        return attrs

    def post_signup(self, login, attrs):
        super().post_signup(login, attrs)
        user = login.account.user
        set_important_dates(user)
        send_invitation_email_login_via_google(user)


class CustomGoogleOAuth2Adapter(GoogleOAuth2Adapter):
    def complete_login(self, request, app, token, response, **kwargs):
        data = google_id_token.verify_oauth2_token(
            id_token=response["id_token"],
            request=GoogleRequest(),
            audience=SOCIALACCOUNT_PROVIDERS_GOOGLE_CLIENT_ID,
        )

        login = self.get_provider().sociallogin_from_response(request, data)
        return login


class CustomGoogleOAuthView(SocialLoginView):
    adapter_class = CustomGoogleOAuth2Adapter
    client_class = OAuth2Client
    serializer_class = CustomSocialLoginSerializer

    def post(self, request, *args, **kwargs):
        self.request = request
        self.serializer = self.get_serializer(data=self.request.data)
        self.serializer.is_valid(raise_exception=True)
        self.login()

        user = self.serializer.validated_data["user"]
        LogRecord.log(request, f"User {user.username} login succeeded with Google account.")
        return Response()

    def login(self):
        self.user = self.serializer.validated_data["user"]
        django_login(self.request, self.user)


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    def pre_social_login(self, request, sociallogin):
        email = sociallogin.account.extra_data.get("email")
        if not email:
            return
        try:
            existing_user = User.objects.get(username=email)
        except User.DoesNotExist:
            return
        if sociallogin.is_existing:
            return
        existing_social = SocialAccount.objects.filter(
            user=existing_user, provider=sociallogin.account.provider
        ).exists()
        if existing_social:
            return
        sociallogin.connect(request, existing_user)
