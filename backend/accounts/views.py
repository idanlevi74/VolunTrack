from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import NotFound
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import IntegrityError

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterVolunteerSerializer, RegisterOrgSerializer, VolunteerProfileSerializer
from .models import VolunteerProfile

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

        full_name = None
        city = None
        points = 0

        # רק אם יש פרופיל מתנדב
        vol = getattr(u, "vol_profile", None)
        if vol:
            full_name = vol.full_name
            city = vol.city
            points = vol.points

        return Response({
            "id": u.id,
            "email": u.email,
            "role": getattr(u, "role", None),
            "full_name": full_name,
            "city": city,
            "points": points,
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


def _user_has_field(field_name: str) -> bool:
    return any(f.name == field_name for f in User._meta.fields)


def _safe_default_role():
    """
    מנסה לבחור Role דיפולטי שקיים אצלך במודל:
    User.Role.VOL / VOLUNTEER / USER / MEMBER ...
    אם אין enum, נחזיר None ולא נכתוב role בכלל.
    """
    Role = getattr(User, "Role", None)
    if not Role:
        return None

    for attr in ("VOL", "VOLUNTEER", "USER", "MEMBER"):
        if hasattr(Role, attr):
            return getattr(Role, attr)
    return None


def _unique_username_from_email(base: str) -> str:
    """
    מוודא username ייחודי אם יש constraint.
    אם אין שדה username בכלל – לא יקרא.
    """
    base = (base or "user").strip()
    base = base.replace(" ", "").lower()
    candidate = base[:30] if len(base) > 30 else base

    if not User.objects.filter(username=candidate).exists():
        return candidate

    for i in range(2, 9999):
        cand = f"{base[:25]}{i}"
        if not User.objects.filter(username=cand).exists():
            return cand
    # fallback קיצוני
    return f"{base[:20]}{User.objects.count() + 1}"


class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        credential = request.data.get("credential")  # id_token מגוגל
        if not credential:
            return Response({"detail": "Missing Google credential"}, status=status.HTTP_400_BAD_REQUEST)

        google_client_id = getattr(settings, "GOOGLE_CLIENT_ID", None)
        if not google_client_id:
            return Response({"detail": "Server missing GOOGLE_CLIENT_ID"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # אימות מול Google
        try:
            payload = id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                google_client_id,
            )
        except Exception:
            return Response({"detail": "Invalid Google token"}, status=status.HTTP_401_UNAUTHORIZED)

        email = payload.get("email")
        if not email:
            return Response({"detail": "Email not provided by Google"}, status=status.HTTP_400_BAD_REQUEST)

        if payload.get("email_verified") is False:
            return Response({"detail": "Google email not verified"}, status=status.HTTP_401_UNAUTHORIZED)

        # defaults חכמים שלא יפילו אם אין שדות
        defaults = {}

        if _user_has_field("username"):
            base = email.split("@")[0]
            defaults["username"] = _unique_username_from_email(base)

        if _user_has_field("role"):
            role_value = _safe_default_role()
            if role_value is not None:
                defaults["role"] = role_value

        # יצירה / התחברות
        try:
            user, created = User.objects.get_or_create(email=email, defaults=defaults)
        except IntegrityError:
            # אם נפל על username unique — ננסה שוב עם username אחר
            if _user_has_field("username"):
                defaults["username"] = _unique_username_from_email(f"{email.split('@')[0]}x")
                user, created = User.objects.get_or_create(email=email, defaults=defaults)
            else:
                raise

        # ✅ תיקון קריטי: אם זה VOLUNTEER ואין לו VolunteerProfile (במיוחד בגוגל) — ניצור
        try:
            is_volunteer = (getattr(user, "role", None) == User.Role.VOLUNTEER)
        except Exception:
            is_volunteer = (getattr(user, "role", None) == "VOLUNTEER")

        if is_volunteer and not hasattr(user, "vol_profile"):
            VolunteerProfile.objects.create(
                user=user,
                full_name=payload.get("name") or email.split("@")[0],
                phone="",
                city="",
            )

        tokens = issue_tokens(user)

        return Response({
            "access": tokens["access"],
            "refresh": tokens["refresh"],
            "user": {
                "id": user.id,
                "email": user.email,
                "role": getattr(user, "role", None),
            },
            "created": created,
        })
class MyVolunteerProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = VolunteerProfileSerializer

    def get_object(self):
        u = self.request.user

        # אם זה לא מתנדב – אין פרופיל מתנדב
        if getattr(u, "role", None) != "VOLUNTEER":
            raise NotFound("Volunteer profile exists only for VOLUNTEER users")

        try:
            return VolunteerProfile.objects.get(user=u)
        except VolunteerProfile.DoesNotExist:
            raise NotFound("Volunteer profile not found for this user")