from rest_framework import generics, permissions
from .serializers import RegisterVolunteerSerializer, RegisterOrgSerializer

class RegisterVolunteerView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterVolunteerSerializer

class RegisterOrgView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterOrgSerializer
