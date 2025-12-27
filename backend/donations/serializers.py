from rest_framework import serializers
from .models import DonationCampaign, Donation

class DonationCampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = DonationCampaign
        fields = "__all__"
        read_only_fields = ["organization", "created_at"]

class DonationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Donation
        fields = "__all__"
        read_only_fields = ["created_at"]
