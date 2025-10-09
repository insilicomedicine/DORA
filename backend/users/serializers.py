from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import serializers

from general.models import LogRecord
from users.defs import ArticleTypeEnum, DisplayLayoutEnum, PublicationDateEnum
from users.models import Profile
from users.tokens import ExpiredTokenError, InvalidTokenError
from users.utils import (
    check_token,
    get_user_by_uid,
    is_not_common_password,
    send_activated_email,
    set_important_dates,
)


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if User.objects.filter(username=value.lower(), is_active=True).exists():
            raise serializers.ValidationError(f"Account with email {value} already exists, please sign in.")
        return value

    def create(self, validated_data):
        request = self.context["request"]
        lowercased_email = validated_data["email"].lower()
        user, created = User.objects.get_or_create(
            username=lowercased_email, email=lowercased_email, is_active=False
        )
        if created:
            LogRecord.log(request, f"User {lowercased_email} created.")
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class ValidateTokenSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()

    def validate(self, attrs):
        try:
            check_token(attrs["uid"], attrs["token"])
        except (ValueError, InvalidTokenError):
            raise serializers.ValidationError("Invalid token")
        except ExpiredTokenError:
            raise serializers.ValidationError("Token expired")
        return attrs


class ValidatePasswordSerializer(ValidateTokenSerializer):
    validation_rules = [
        {"rule": "password_length", "method": lambda password: len(password) >= 8},
        {"rule": "differs_with_login", "method": lambda password, username: password != username},
        {"rule": "contains_number", "method": lambda password: any(char.isdigit() for char in password)},
        {"rule": "contains_letter", "method": lambda password: any(char.isalpha() for char in password)},
        {"rule": "not_common_password", "method": is_not_common_password},
    ]

    password = serializers.CharField()

    def validation_results(self, attrs):
        password = attrs["password"]
        user = get_user_by_uid(attrs["uid"])

        validation_rule_results = []
        for rule in self.validation_rules:
            valid = (
                rule["method"](password, user.username)
                if "username" in rule["method"].__code__.co_varnames
                else rule["method"](password)
            )
            validation_rule_results.append({"rule": rule["rule"], "valid": valid})

        password_strength = "strong" if all(result["valid"] for result in validation_rule_results) else "weak"

        return {"validation_rules": validation_rule_results, "password_strength": password_strength}


class NewPasswordSerializer(ValidatePasswordSerializer):
    def validate(self, attrs):
        super().validate(attrs)
        validation_results = self.validation_results(attrs)
        if validation_results["password_strength"] == "weak":
            raise serializers.ValidationError("Password is weak")
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        profile_fields = {"password_modified_at": timezone.now()}
        user = get_user_by_uid(validated_data["uid"])
        user.set_password(validated_data["password"])

        if not user.is_active:
            user.is_active = True
            set_important_dates(user)
            LogRecord.log(request, f"User {user.username} activated.")
            send_activated_email(user)

        user.save()
        user.profile.update_fields(profile_fields)
        return user


class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def create(self, validated_data):
        user = User.objects.filter(username=validated_data["email"].lower()).first()
        return user if user else {}


class PublicationSettingsSerializer(serializers.Serializer):
    publication_date = serializers.ChoiceField(choices=PublicationDateEnum.choices)
    article_types = serializers.ListField(child=serializers.ChoiceField(choices=ArticleTypeEnum.choices))
    top_cited = serializers.BooleanField()

    def create(self, validated_data):
        profile: Profile = self.context["request"].user.profile
        profile.update_fields({"publication_settings": validated_data})
        return validated_data


class DisplayPreferencesSerializer(serializers.Serializer):
    documents_layout = serializers.ChoiceField(choices=DisplayLayoutEnum.choices)

    def create(self, validated_data):
        profile: Profile = self.context["request"].user.profile
        profile.update_fields({"display_preferences": validated_data})
        return validated_data
