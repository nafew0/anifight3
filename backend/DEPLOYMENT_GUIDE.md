# Backend Deployment Guide

## Environment Configuration

The backend has **ZERO hardcoded sensitive values**. All configuration is done via environment variables.

### Required Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```env
# Django Settings
SECRET_KEY=your-secret-key-here
DEBUG=True  # Set to False in production
ALLOWED_HOSTS=localhost,127.0.0.1

# Database Configuration
DB_ENGINE=django.db.backends.postgresql
DB_NAME=anifight_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

# CORS Settings (comma-separated)
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# CSRF Trusted Origins (comma-separated)
CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://localhost:3000

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=your-google-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-google-client-secret

# JWT Token Settings (in seconds)
JWT_ACCESS_TOKEN_LIFETIME=3600      # 1 hour
JWT_REFRESH_TOKEN_LIFETIME=604800   # 7 days
```

## Local Development

### Step 1: Copy Environment Template

```bash
cd backend
cp .env.example .env
```

### Step 2: Edit .env File

Update the values in `.env` with your local configuration.

### Step 3: Install Dependencies

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Step 4: Run Migrations

```bash
python manage.py migrate
```

### Step 5: Create Superuser (Optional)

```bash
python manage.py createsuperuser
```

### Step 6: Run Development Server

```bash
python manage.py runserver
```

## Production Deployment

### Step 1: Generate Secret Key

**IMPORTANT:** Never use the development SECRET_KEY in production!

Generate a new one:

```python
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

### Step 2: Configure Production Environment Variables

Set the following in your production environment:

```env
# Django Settings
SECRET_KEY=<your-generated-secret-key>
DEBUG=False
ALLOWED_HOSTS=api.yourdomain.com,yourdomain.com

# Database Configuration (use production database)
DB_ENGINE=django.db.backends.postgresql
DB_NAME=anifight_production
DB_USER=anifight_user
DB_PASSWORD=<strong-production-password>
DB_HOST=your-db-host.com
DB_PORT=5432

# CORS Settings (production frontend URL)
CORS_ALLOWED_ORIGINS=https://yourdomain.com

# CSRF Trusted Origins
CSRF_TRUSTED_ORIGINS=https://yourdomain.com

# Google OAuth (production credentials)
GOOGLE_OAUTH_CLIENT_ID=<production-client-id>
GOOGLE_OAUTH_CLIENT_SECRET=<production-client-secret>

# JWT Token Settings
JWT_ACCESS_TOKEN_LIFETIME=3600
JWT_REFRESH_TOKEN_LIFETIME=604800
```

### Platform-Specific Configuration

#### Heroku

1. Set environment variables:
   ```bash
   heroku config:set SECRET_KEY=your-secret-key
   heroku config:set DEBUG=False
   heroku config:set ALLOWED_HOSTS=your-app.herokuapp.com
   # ... set all other variables
   ```

2. Or use Heroku Dashboard:
   - Settings → Config Vars → Add each variable

#### AWS Elastic Beanstalk

1. Create `.ebextensions/django.config`:
   ```yaml
   option_settings:
     aws:elasticbeanstalk:application:environment:
       SECRET_KEY: your-secret-key
       DEBUG: False
       ALLOWED_HOSTS: your-domain.com
   ```

2. Or use EB CLI:
   ```bash
   eb setenv SECRET_KEY=your-secret-key DEBUG=False
   ```

#### Docker

Create a `.env.production` file (don't commit!) and use with docker-compose:

```yaml
# docker-compose.yml
version: '3.8'
services:
  web:
    build: .
    env_file:
      - .env.production
    ports:
      - "8000:8000"
```

Or pass variables directly:
```bash
docker run -e SECRET_KEY=... -e DEBUG=False ...
```

#### VPS (Ubuntu/Debian)

1. Create `/etc/anifight/.env`:
   ```bash
   sudo mkdir -p /etc/anifight
   sudo nano /etc/anifight/.env
   # Paste your production environment variables
   ```

2. Secure the file:
   ```bash
   sudo chmod 600 /etc/anifight/.env
   sudo chown www-data:www-data /etc/anifight/.env
   ```

3. Update systemd service to load .env:
   ```ini
   [Service]
   EnvironmentFile=/etc/anifight/.env
   ```

## Database Setup

### PostgreSQL Production

1. Create production database:
   ```sql
   CREATE DATABASE anifight_production;
   CREATE USER anifight_user WITH PASSWORD 'strong-password';
   GRANT ALL PRIVILEGES ON DATABASE anifight_production TO anifight_user;
   ```

2. Set environment variables to connect to production DB

3. Run migrations:
   ```bash
   python manage.py migrate
   ```

## Static Files

In production, collect static files:

```bash
python manage.py collectstatic --noinput
```

Configure your web server (nginx, Apache) to serve from `staticfiles/`.

## Security Checklist

Before deploying to production:

- [ ] `SECRET_KEY` is unique and not the dev key
- [ ] `DEBUG=False`
- [ ] `ALLOWED_HOSTS` includes only your domain(s)
- [ ] Database credentials are secure
- [ ] `CORS_ALLOWED_ORIGINS` includes only your frontend URL
- [ ] `CSRF_TRUSTED_ORIGINS` includes only your frontend URL
- [ ] Google OAuth uses production credentials
- [ ] `.env` file is in `.gitignore` (already done)
- [ ] SSL/HTTPS is configured
- [ ] Database backups are configured
- [ ] Firewall rules are configured

## Environment Variables Reference

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `SECRET_KEY` | Django secret key | `django-insecure-...` | Yes |
| `DEBUG` | Debug mode | `True` or `False` | Yes |
| `ALLOWED_HOSTS` | Allowed hostnames | `localhost,127.0.0.1` | Yes |
| `DB_ENGINE` | Database engine | `django.db.backends.postgresql` | Yes |
| `DB_NAME` | Database name | `anifight_db` | Yes |
| `DB_USER` | Database user | `postgres` | Yes |
| `DB_PASSWORD` | Database password | `password123` | Yes |
| `DB_HOST` | Database host | `localhost` | Yes |
| `DB_PORT` | Database port | `5432` | Yes |
| `CORS_ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:5173` | Yes |
| `CSRF_TRUSTED_ORIGINS` | CSRF trusted origins | `http://localhost:5173` | Yes |
| `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth Client ID | `123...apps.googleusercontent.com` | No* |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google OAuth Client Secret | `GOCSPX-...` | No* |
| `JWT_ACCESS_TOKEN_LIFETIME` | JWT access token lifetime (seconds) | `3600` | No (default: 3600) |
| `JWT_REFRESH_TOKEN_LIFETIME` | JWT refresh token lifetime (seconds) | `604800` | No (default: 604800) |

*Required if using Google OAuth login

## Troubleshooting

### Backend won't start

**Error: `SECRET_KEY` is None**
- Make sure `.env` file exists
- Check `.env` has `SECRET_KEY=...` line
- Restart server after changing `.env`

**Error: Database connection failed**
- Verify database credentials in `.env`
- Check database is running
- Verify network access to database host

### CORS Errors

**Error: Origin not allowed**
- Add frontend URL to `CORS_ALLOWED_ORIGINS` in `.env`
- Don't include trailing slash in URL
- Restart server after changing

### Google OAuth Not Working

**Error: Invalid client**
- Check `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` are set
- Verify credentials match Google Console
- Ensure using correct credentials for environment (dev vs prod)

## Testing Configuration

Verify all environment variables are loaded:

```bash
python manage.py check
```

Test database connection:

```bash
python manage.py migrate --check
```

List all environment variables (for debugging):

```bash
python manage.py shell
>>> import os
>>> print(os.environ.get('SECRET_KEY'))  # Should NOT be None
>>> print(os.environ.get('DB_NAME'))
```

## Monitoring

### Check for Hardcoded Values

Run this to ensure no hardcoded sensitive values:

```bash
grep -r "localhost" anifight/settings.py  # Should return nothing
grep -r "django-insecure" anifight/settings.py  # Should return nothing
```

### Health Check Endpoint

Create a health check view to verify configuration:

```python
# api/views.py
from django.http import JsonResponse
from django.conf import settings

def health_check(request):
    return JsonResponse({
        'status': 'ok',
        'debug': settings.DEBUG,
        'database': settings.DATABASES['default']['NAME'],
    })
```

## Migration from Hardcoded to Environment Variables

If you had hardcoded values before:

1. Create `.env` file with all current values
2. Update `settings.py` to use `os.environ.get()`
3. Test locally: `python manage.py check`
4. Commit changes (`.env` should be gitignored)
5. Deploy and set production environment variables

## Best Practices

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Use different credentials per environment** - Dev, staging, prod
3. **Rotate secrets regularly** - Especially SECRET_KEY and DB passwords
4. **Use strong passwords** - Especially in production
5. **Limit CORS origins** - Only include necessary domains
6. **Use HTTPS in production** - Especially for OAuth callbacks
7. **Monitor environment variables** - Ensure they're set correctly
8. **Document required variables** - Use `.env.example`
