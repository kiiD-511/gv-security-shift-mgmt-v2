# backend/core/auth.py
import os
import firebase_admin
from firebase_admin import auth as fb_auth
from rest_framework import authentication, exceptions

from django.conf import settings
from .models import UserProfile
from firebase_admin import credentials, auth
# Init admin SDK once
#BASE_DIR = settings.BASE_DIR


    
cred = credentials.Certificate(settings.FIREBASE_CONFIG) 
firebase_app = firebase_admin.initialize_app(cred)
class FirebaseAuthentication(authentication.BaseAuthentication):
    
    
    def authenticate(self, request):
        print("🔥 FirebaseAuthentication.authenticate() was called")

        auth_header = request.META.get('HTTP_AUTHORIZATION')
        print(auth_header)
        if not auth_header or not auth_header.startswith('Bearer '):
            print("No valid Authorization header found")
            return None
        id_token = auth_header.split('Bearer ')[1]
        try:
            decoded = fb_auth.verify_id_token(id_token)
            print("Decoded token:", decoded)
        except Exception as e:
            print("Token verification failed:", str(e))
            raise exceptions.AuthenticationFailed('Invalid Firebase ID token')

        uid = decoded['uid']
        email = decoded.get('email', '')
        # Ensure local profile exists; role can come from custom claims or DB
        profile, _ = UserProfile.objects.get_or_create(uid=uid, defaults={
            'email': email, 'full_name': email.split('@')[0], 'role': 'guard'
        })
        # If you use Firebase custom claims for role, sync it:
        role = decoded.get('role') or decoded.get('claims', {}).get('role')
        if role and role != profile.role:
            profile.role = role
            profile.save()

        # DRF expects a (user, auth) tuple; we use profile as user-like object
        print("🎯 Authenticated user:", profile)
        return (profile, None)
