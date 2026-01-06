from django.urls import path
from .views import RegisterVolunteerView, RegisterOrgView, MeView

urlpatterns = [
    path("auth/register/volunteer/", RegisterVolunteerView.as_view()),
    path("auth/register/org/", RegisterOrgView.as_view()),
    path("me/", MeView.as_view(), name="me"),
]
