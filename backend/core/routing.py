# core/routing.py
from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path("ws/admin/", consumers.AdminConsumer.as_asgi()),
    path("ws/supervisor/", consumers.SupervisorConsumer.as_asgi()),
    path("ws/guard/", consumers.GuardConsumer.as_asgi()),
]
