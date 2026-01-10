from rest_framework import serializers
from .models import DonationCampaign, Donation
class DonationCampaignSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(
        source="organization.email", read_only=True
    )

    total_donations = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = DonationCampaign
        fields = [
            "id",
            "organization",
            "organization_name",
            "title",
            "description",
            "goal_amount",
            "total_donations",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["organization", "created_at", "total_donations"]

class DonationSerializer(serializers.ModelSerializer):
    donor_display_name = serializers.SerializerMethodField()
    campaign_title = serializers.CharField(
        source="campaign.title", read_only=True
    )

    class Meta:
        model = Donation
        fields = [
            "id",
            "organization",
            "campaign",
            "campaign_title",
            "amount",
            "currency",
            "donor_name",
            "donor_display_name",
            "created_at",
        ]
        read_only_fields = [
            "organization",
            "created_at",
            "donor_display_name",
        ]

    def get_donor_display_name(self, obj):
        """
        מה שמציגים בפועל:
        - אם יש משתמש מחובר → שם מהפרופיל
        - אחרת → donor_name
        """
        if obj.donor_user:
            vol = getattr(obj.donor_user, "vol_profile", None)
            if vol and vol.full_name:
                return vol.full_name
            return obj.donor_user.email

        return obj.donor_name or "אנונימי"

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("סכום התרומה חייב להיות גדול מאפס")
        return value
