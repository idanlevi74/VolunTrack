from rest_framework import serializers
from .models import Event, EventSignup

class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = "__all__"
        read_only_fields = ["organization", "created_at"]

class EventSignupSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventSignup
        fields = ["id", "event", "volunteer", "created_at"]
        read_only_fields = ["volunteer", "created_at"]
