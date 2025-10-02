from rest_framework import serializers
from firebase_admin import auth as firebase_auth
from .models import Site, WorkShift, AttendanceRecord, IncidentReport, UserProfile


# ---------- User Profiles ----------
class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = "__all__"

    def update(self, instance, validated_data):
        """
        Ensure updates also sync to Firebase.
        """
        old_email = instance.email
        old_role = instance.role

        instance = super().update(instance, validated_data)

        try:
            # Sync to Firebase if user has a UID
            if instance.uid:
                update_fields = {}
                if "email" in validated_data and validated_data["email"] != old_email:
                    update_fields["email"] = validated_data["email"]
                if "full_name" in validated_data:
                    update_fields["display_name"] = validated_data["full_name"]

                if update_fields:
                    firebase_auth.update_user(instance.uid, **update_fields)

                if "role" in validated_data and validated_data["role"] != old_role:
                    firebase_auth.set_custom_user_claims(instance.uid, {"role": instance.role})

        except Exception as e:
            # Don't break API if Firebase sync fails, but log the error
            print(f"⚠️ Failed to sync user {instance.uid} to Firebase: {e}")

        return instance


# ---------- Sites ----------
class SiteSerializer(serializers.ModelSerializer):
    supervisors = UserProfileSerializer(many=True, read_only=True)
    supervisor_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=UserProfile.objects.filter(role="supervisor"),
        source="supervisors",
        write_only=True,
        required=False
    )

    class Meta:
        model = Site
        fields = '__all__'


# ---------- Shifts ----------
class WorkShiftSerializer(serializers.ModelSerializer):
    site_name = serializers.SerializerMethodField()
    assigned_user_name = serializers.SerializerMethodField()

    # Accept nullable IDs for updates; frontend may send strings so coerce below
    site = serializers.PrimaryKeyRelatedField(
        queryset=Site.objects.all(),
        allow_null=True,
        required=False
    )
    assigned_user = serializers.PrimaryKeyRelatedField(
        queryset=UserProfile.objects.filter(role="guard"),
        allow_null=True,
        required=False
    )

    class Meta:
        model = WorkShift
        fields = [
            'id',
            'site',             # expose site ID (nullable)
            'site_name',
            'assigned_user',    # expose assigned user ID (nullable)
            'assigned_user_name',
            'start',
            'end',
        ]

    def get_site_name(self, obj):
        # Return friendly name for UI even if null
        return obj.site.name if obj.site else "Unassigned"

    def get_assigned_user_name(self, obj):
        return obj.assigned_user.full_name if obj.assigned_user else "Unassigned"

    def to_internal_value(self, data):
        """
        Coerce 'site' and 'assigned_user' values which may be sent as numeric strings
        or empty strings from the frontend (datetime-local and select inputs).
        """
        data = dict(data)
        # Allow empty strings to represent null
        for key in ("site", "assigned_user"):
            if key in data and data[key] == "":
                data[key] = None
            # If it's a numeric string, let DRF handle it, but ensure it's int-like
            if key in data and isinstance(data[key], str) and data[key] is not None and data[key].isdigit():
                data[key] = int(data[key])
        return super().to_internal_value(data)


# ---------- Attendance ----------
class AttendanceSerializer(serializers.ModelSerializer):
    shift_info = serializers.SerializerMethodField()
    shift_start = serializers.DateTimeField(source="shift.start", read_only=True)
    shift_end = serializers.DateTimeField(source="shift.end", read_only=True)
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    site_name = serializers.CharField(source="shift.site.name", read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = '__all__'
        read_only_fields = (
            "user",
            "check_in_time",
            "check_in_lat",
            "check_in_lng",
            "check_out_time",
            "check_out_lat",
            "check_out_lng",
        )

    def get_shift_info(self, obj):
        return f"{obj.shift.start} → {obj.shift.end}"


# ---------- Incidents ----------
class IncidentSerializer(serializers.ModelSerializer):
    site_name = serializers.CharField(source="shift.site.name", read_only=True)
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    shift_id = serializers.IntegerField(source="shift.id", read_only=True)

    class Meta:
        model = IncidentReport
        fields = '__all__'
        read_only_fields = ("user", "created_at")  # status is editable



