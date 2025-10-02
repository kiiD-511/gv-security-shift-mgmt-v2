from pathlib import Path
import os
from decouple import config, Csv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!

SECRET_KEY = config("SECRET_KEY", default="insecure")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config("DEBUG", cast=bool, default=True)

ALLOWED_HOSTS = ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="gv-sigi.onrender.com").split(",")

# Application definition

INSTALLED_APPS = [
  
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',

    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework', 
    'core',
    "corsheaders",
    
]

MIDDLEWARE = [
       "corsheaders.middleware.CorsMiddleware",   # ✅ must be at the top
       #'core.middleware.FirebaseAuthMiddleware',
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# Use correct ASGI app when using Channels
WSGI_APPLICATION = 'backend.asgi.application'

# Use Redis for pub/sub

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("DB_NAME", default="gv_security_db"),
        "USER": config("DB_USER", default="postgres"),
        "PASSWORD": config("DB_PASSWORD", default="postgres_password"),
        "HOST": config("DB_HOST", default="localhost"),
        "PORT": config("DB_PORT", default="5432"),
    }
}



# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases



# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

    
#AUTH_PASSWORD_VALIDATORS = [
 #   {
  #      'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
   # },
    #{
     #   'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    #},
    #{
     #   'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
   # },
    #{
     #   'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    #},
#]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = 'static/'



# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ['core.auth.FirebaseAuthentication'],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
    # Disable global pagination for admin debug / development so full lists are returned.
    'DEFAULT_PAGINATION_CLASS': None,
}
 
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",   # Vite frontend
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    
]

CORS_ALLOW_CREDENTIALS = True 

#GOOGLE_APPLICATION_CREDENTIALS = config("GOOGLE_APPLICATION_CREDENTIALS", default=None)
#if GOOGLE_APPLICATION_CREDENTIALS:
 #   os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_APPLICATION_CREDENTIALS

 
FIREBASE_CONFIG = os.path.join(BASE_DIR,"firebase-service-account.json")
