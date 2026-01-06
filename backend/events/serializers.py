from rest_framework import serializers
from .models import Event, EventSignup


class EventSerializer(serializers.ModelSerializer):
    signups_count = serializers.IntegerField(source="signups.count", read_only=True)

    class Meta:
        model = Event
        fields = [
            "id",
            "title",
            "description",
            "category",
            "location",
            "date",
            "time",
            "needed_volunteers",
            "organization",
            "created_at",
            "signups_count",
        ]
        read_only_fields = ["organization", "created_at"]


class EventSignupSerializer(serializers.ModelSerializer):
    volunteer_name = serializers.CharField(source="volunteer.vol_profile.full_name", read_only=True)

    class Meta:
        model = EventSignup
        fields = ["id", "volunteer_name", "created_at"]
