from django.urls import path
from .views import RegisterVolunteerView, RegisterOrgView

urlpatterns = [
    path("auth/register/volunteer/", RegisterVolunteerView.as_view()),
    path("auth/register/org/", RegisterOrgView.as_view()),
]
