from django.urls import path
from .views import RegisterVolunteerView, RegisterOrgView, MeView ,GoogleLoginView , MyVolunteerProfileView

urlpatterns = [
    path("auth/register/volunteer/", RegisterVolunteerView.as_view()),
    path("auth/register/org/", RegisterOrgView.as_view()),
    path("me/", MeView.as_view(), name="me"),
    path("auth/google/", GoogleLoginView.as_view()),
    path("volunteer-profile/", MyVolunteerProfileView.as_view(), name="my-volunteer-profile"),
]
