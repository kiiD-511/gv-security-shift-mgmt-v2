# backend/core/permissions.py
from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return getattr(request.user, 'role', None) == 'admin'

class IsSupervisor(BasePermission):
    def has_permission(self, request, view):
        return getattr(request.user, 'role', None) == 'supervisor'

class IsGuard(BasePermission):
    def has_permission(self, request, view):
        return getattr(request.user, 'role', None) == 'guard'
