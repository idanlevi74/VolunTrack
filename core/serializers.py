from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Organization, Event, Registration


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']


class OrganizationSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)

    class Meta:
        model = Organization
        fields = ['id', 'name', 'description', 'website', 'owner']


class EventSerializer(serializers.ModelSerializer):
    organization = OrganizationSerializer(read_only=True)
    organization_id = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.all(),
        source='organization',
        write_only=True
    )

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'location',
            'start_time', 'end_time', 'max_volunteers',
            'organization', 'organization_id', 'created_at'
        ]


class RegistrationSerializer(serializers.ModelSerializer):
    volunteer = UserSerializer(read_only=True)
    event = EventSerializer(read_only=True)
    event_id = serializers.PrimaryKeyRelatedField(
        queryset=Event.objects.all(),
        source='event',
        write_only=True
    )

    class Meta:
        model = Registration
        fields = [
            'id', 'volunteer', 'event', 'event_id',
            'status', 'created_at', 'notes'
        ]
        read_only_fields = ['status', 'created_at']
