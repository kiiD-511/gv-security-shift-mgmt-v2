from django.db import models


class Site(models.Model):
    name = models.CharField(max_length=100, unique=True)
    location = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return self.name


class UserProfile(models.Model):
    uid = models.CharField(max_length=128, unique=True)  # Firebase UID
    full_name = models.CharField(max_length=120)
    email = models.EmailField(unique=True)
    ROLE_CHOICES = [
        ("admin", "Admin"),
        ("supervisor", "Supervisor"),
        ("guard", "Guard"),
    ]
    role = models.CharField(max_length=12, choices=ROLE_CHOICES)
    supervisor_sites = models.ManyToManyField(
        Site,
        blank=True,
        related_name="supervisors",
    )

    def __str__(self):
        return f"{self.full_name} ({self.role})"

    @property
    def is_authenticated(self):
        return True


class WorkShift(models.Model):
    site = models.ForeignKey(
        Site,
        on_delete=models.SET_NULL,   # keep shift even if site deleted
        null=True,
        blank=True,
        related_name="shifts",
    )
    start = models.DateTimeField()
    end = models.DateTimeField()
    assigned_user = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,   # keep shift even if guard deleted
        null=True,
        blank=True,
        related_name="shifts",
    )

    def __str__(self):
        site_name = self.site.name if self.site else "Unassigned Site"
        return f"{site_name}: {self.start} → {self.end}"


class AttendanceRecord(models.Model):
    shift = models.ForeignKey(
        WorkShift,
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    user = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    check_in_time = models.DateTimeField()
    check_in_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_in_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    check_out_time = models.DateTimeField(null=True, blank=True)
    check_out_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_out_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("late", "Late"),
        ("excused", "Excused"),
        ("absent", "Absent"),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    def __str__(self):
        site_name = self.shift.site.name if self.shift and self.shift.site else "Unassigned Site"
        return (
            f"{self.user.full_name} @ {site_name} — "
            f"Checked in: {self.check_in_time} — Status: {self.status}"
        )


class IncidentReport(models.Model):
    shift = models.ForeignKey(
        WorkShift,
        on_delete=models.CASCADE,
        related_name="incident_reports",
    )
    user = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="incident_reports",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    severity = models.CharField(
        max_length=20,
        choices=[
            ("low", "Low"),
            ("medium", "Medium"),   # normalized to 'medium'
            ("high", "High"),
        ],
    )
    description = models.TextField()
    attachment_url = models.URLField(blank=True)

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("reviewed", "Reviewed"),
        ("resolved", "Resolved"),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    def __str__(self):
        return f"Incident ({self.severity}) by {self.user.full_name} — {self.status}"
