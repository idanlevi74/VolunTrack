from rest_framework import serializers
from .models import Event, EventSignup


class EventSerializer(serializers.ModelSerializer):
    signups_count = serializers.IntegerField(source="signups.count", read_only=True)

    org_name = serializers.SerializerMethodField()

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
            "org_name",          # 👈 חדש
            "created_at",
            "signups_count",
        ]
        read_only_fields = ["organization", "created_at"]

    def get_org_name(self, obj):
        org = obj.organization
        prof = getattr(org, "org_profile", None)
        return (getattr(prof, "org_name", "") or org.email) if org else ""


class EventSignupSerializer(serializers.ModelSerializer):
    volunteer_name = serializers.CharField(
        source="volunteer.vol_profile.full_name",
        read_only=True
    )

    class Meta:
        model = EventSignup
        fields = ["id", "volunteer_name", "created_at"]
