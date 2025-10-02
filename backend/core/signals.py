# core/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import WorkShift, IncidentReport

@receiver(post_save, sender=WorkShift)
def shift_updated(sender, instance, created, **kwargs):
    """Handle shift creation and updates - No WebSocket"""
    try:
        if created:
            print(f"✅ Shift created: {instance.id}")
        else:
            print(f"✅ Shift updated: {instance.id}")
    except Exception as e:
        print(f"⚠️ Shift update signal error: {e}")

@receiver(post_delete, sender=WorkShift)
def shift_deleted(sender, instance, **kwargs):
    """Handle shift deletion - No WebSocket"""
    try:
        print(f"✅ Shift deleted: {instance.id}")
    except Exception as e:
        print(f"⚠️ Shift deletion signal error: {e}")

@receiver(post_save, sender=IncidentReport)
def incident_updated(sender, instance, created, **kwargs):
    """Handle incident creation and updates - No WebSocket"""
    try:
        if created:
            print(f"✅ Incident created: {instance.id}")
        else:
            print(f"✅ Incident updated: {instance.id}")
    except Exception as e:
        print(f"⚠️ Incident update signal error: {e}")
