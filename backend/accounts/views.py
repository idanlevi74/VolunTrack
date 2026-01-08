from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from django.conf import settings
from django.contrib.auth import get_user_model

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterVolunteerSerializer, RegisterOrgSerializer

User = get_user_model()


# ======================
# רישום רגיל
# ======================
class RegisterVolunteerView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterVolunteerSerializer


class RegisterOrgView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterOrgSerializer


# ======================
# מי אני (JWT)
# ======================
class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        u = request.user
        return Response({
            "id": u.id,
            "email": u.email,
            "role": u.role,
        })


# ======================
# Google Login / Signup
# POST /api/auth/google/
# ======================
def issue_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        credential = request.data.get("credential")  # id_token מגוגל

        if not credential:
            return Response(
                {"detail": "Missing Google credential"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # אימות מול Google
        try:
            payload = id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
        except Exception:
            return Response(
                {"detail": "Invalid Google token"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        email = payload.get("email")
        if not email:
            return Response(
                {"detail": "Email not provided by Google"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if payload.get("email_verified") is False:
            return Response(
                {"detail": "Google email not verified"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # יצירה / התחברות
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email.split("@")[0],
                # ⬇️ דיפולט: משתמש שנכנס עם גוגל הוא מתנדב
                "role": User.Role.VOL,
            },
        )

        tokens = issue_tokens(user)

        return Response({
            "access": tokens["access"],
            "refresh": tokens["refresh"],
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role,
            },
            "created": created,  # true אם זה משתמש חדש
        })
