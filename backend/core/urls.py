# backend/core/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SiteViewSet,
    WorkShiftViewSet,
    AttendanceViewSet,
    IncidentViewSet,
    UserProfileViewSet,   # NEW
    whoami,
)

router = DefaultRouter()
router.register('sites', SiteViewSet)
router.register('shifts', WorkShiftViewSet)
router.register('attendance', AttendanceViewSet, basename='attendance')
router.register('incidents', IncidentViewSet)
router.register('users', UserProfileViewSet)  # NEW

urlpatterns = [
    path("whoami/", whoami, name="whoami"),
    path("", include(router.urls)),
]
