from rest_framework import status, viewsets, mixins
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils.timezone import now
from firebase_admin import auth as firebase_auth

from .models import Site, WorkShift, AttendanceRecord, IncidentReport, UserProfile
from .serializers import (
    SiteSerializer,
    WorkShiftSerializer,
    AttendanceSerializer,
    IncidentSerializer,
    UserProfileSerializer,
)
from .permissions import IsAdmin, IsSupervisor, IsGuard


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def whoami(request):
    user = request.user
    return Response({
        "uid": user.uid,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
    })


# ---------- Sites ----------
class SiteViewSet(viewsets.ModelViewSet):
    queryset = Site.objects.all().order_by("name")
    serializer_class = SiteSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAdmin()]
        return super().get_permissions()

    def perform_create(self, serializer):
        supervisors = self.request.data.get("supervisor_ids", [])
        site = serializer.save()
        if supervisors:
            site.supervisors.set(supervisors)
        site.save()

    def perform_update(self, serializer):
        supervisors = self.request.data.get("supervisor_ids", None)
        site = serializer.save()
        if supervisors is not None:
            site.supervisors.set(supervisors)
        site.save()


# ---------- Shifts ----------
class WorkShiftViewSet(viewsets.ModelViewSet):
    queryset = WorkShift.objects.select_related("site", "assigned_user").all().order_by("-start")
    serializer_class = WorkShiftSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "admin":
            return self.queryset
        if user.role == "supervisor":
            return self.queryset.filter(site__in=user.supervisor_sites.all())
        return self.queryset.filter(assigned_user=user).order_by("-start")

    def perform_update(self, serializer):
        """
        Allow updates where frontend may send numeric strings or empty strings.
        If site/assigned_user are empty or missing, set them to NULL.
        """
        site_val = self.request.data.get("site", None)
        assigned_user_val = self.request.data.get("assigned_user", None)

        # Normalize inputs: convert numeric strings, treat empty string as None
        def normalize(val):
            if val in ["", None]:
                return None
            if isinstance(val, str) and val.isdigit():
                return int(val)
            return val

        site_id = normalize(site_val)
        assigned_user_id = normalize(assigned_user_val)

        serializer.save(
            site_id=site_id,
            assigned_user_id=assigned_user_id
        )


# ---------- Attendance ----------
class AttendanceViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.UpdateModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet
):
    queryset = AttendanceRecord.objects.select_related("shift__site", "user")\
                                     .all().order_by("-check_in_time")
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "admin":
            return self.queryset
        if user.role == "supervisor":
            return self.queryset.filter(shift__site__in=user.supervisor_sites.all())
        return self.queryset.filter(user=user).order_by("-check_in_time")

    @action(methods=["post"], detail=False, permission_classes=[IsGuard])
    def check_in(self, request):
        user = request.user
        shift_id = request.data.get("shift")
        lat = request.data.get("lat")
        lng = request.data.get("lng")
        ar = AttendanceRecord.objects.create(
            shift_id=shift_id,
            user=user,
            check_in_time=now(),
            check_in_lat=lat,
            check_in_lng=lng,
        )
        return Response(AttendanceSerializer(ar).data)

    @action(methods=["post"], detail=False, permission_classes=[IsGuard])
    def check_out(self, request):
        user = request.user
        shift_id = request.data.get("shift")

        # Grab the latest open record (no check_out_time yet)
        ar = (
            AttendanceRecord.objects
            .filter(shift_id=shift_id, user=user, check_out_time__isnull=True)
            .order_by("-check_in_time")
            .first()
        )
        if not ar:
            return Response(
                {"error": "No open check-in record found"},
                status=status.HTTP_400_BAD_REQUEST
            )

        ar.check_out_time = now()
        ar.save()
        return Response(AttendanceSerializer(ar).data)


# ---------- Incidents ----------
class IncidentViewSet(viewsets.ModelViewSet):
    queryset = IncidentReport.objects.select_related("shift__site", "user")\
                                     .all().order_by("-created_at")
    serializer_class = IncidentSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, status="pending")

    def get_queryset(self):
        user = self.request.user
        if user.role == "admin":
            return self.queryset
        if user.role == "supervisor":
            return self.queryset.filter(shift__site__in=user.supervisor_sites.all())
        return self.queryset.filter(user=user).order_by("-created_at")

    @action(detail=True, methods=["post"], permission_classes=[IsSupervisor])
    def update_status(self, request, pk=None):
        incident = self.get_object()
        new_status = request.data.get("status")
        if new_status not in ["pending", "reviewed", "resolved"]:
            return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)
        incident.status = new_status
        incident.save()
        return Response(self.get_serializer(incident).data)


# ---------- Users ----------
class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all().order_by("full_name")
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAdmin()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        full_name = request.data.get("full_name")
        email = request.data.get("email")
        role = request.data.get("role")
        password = request.data.get("password", "default123")

        if not full_name or not email or not role:
            return Response(
                {"error": "full_name, email, and role are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # create Firebase user
            firebase_user = firebase_auth.create_user(
                email=email,
                password=password,
                display_name=full_name
            )
            firebase_auth.set_custom_user_claims(firebase_user.uid, {"role": role})

            # create local profile
            user_profile = UserProfile.objects.create(
                uid=firebase_user.uid,
                full_name=full_name,
                email=email,
                role=role
            )
            serializer = self.get_serializer(user_profile)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            # also delete Firebase user (if exists)
            if instance.uid:
                try:
                    firebase_auth.delete_user(instance.uid)
                except Exception as e:
                    # Log but don’t block DB deletion
                    print(f"⚠️ Failed to delete Firebase user {instance.uid}: {e}")

            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except Exception as e:
            return Response(
                {"error": f"Failed to delete user: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
