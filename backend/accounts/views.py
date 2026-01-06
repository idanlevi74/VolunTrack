from rest_framework import generics, permissions
from .serializers import RegisterVolunteerSerializer, RegisterOrgSerializer
from rest_framework.views import APIView
from rest_framework.response import Response

class RegisterVolunteerView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterVolunteerSerializer

class RegisterOrgView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterOrgSerializer

class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        u = request.user
        return Response({
            "id": u.id,
            "email": u.email,
            "role": u.role,
        })