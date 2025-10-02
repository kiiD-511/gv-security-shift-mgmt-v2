from django import core
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import SiteViewSet, WorkShiftViewSet, AttendanceViewSet, IncidentViewSet, whoami
from core import views as core_views
from core import views 
router = DefaultRouter()
router.register("sites", SiteViewSet)
router.register("shifts", WorkShiftViewSet)
router.register("attendance", AttendanceViewSet)
router.register("incidents", IncidentViewSet)

urlpatterns = [
    path("admin/", admin.site.urls),
    #path("api/", include("core.urls")),
    #path("whoami/", whoami, name="whoami"),
    #path("whoami/", include('core.urls')),
    path("api/", include("core.urls")),
]
