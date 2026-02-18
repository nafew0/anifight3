# AniFight Production Deployment Guide
## Ubuntu 20.04 LTS | Domain: questiz.com

This guide will help you deploy AniFight on a fresh Ubuntu 20.04 LTS server with minimal experience.

---

## Table of Contents
1. [Server Setup](#1-server-setup)
2. [Install Dependencies](#2-install-dependencies)
3. [Clone Repository](#3-clone-repository)
4. [Database Setup](#4-database-setup)
5. [Backend Configuration](#5-backend-configuration)
6. [Frontend Build](#6-frontend-build)
7. [Nginx Configuration](#7-nginx-configuration)
8. [SSL Certificate](#8-ssl-certificate)
9. [Systemd Services](#9-systemd-services)
10. [Deploy & Start](#10-deploy--start)
11. [Update Workflow](#11-update-workflow)
12. [Troubleshooting](#12-troubleshooting)

---

## Prerequisites

- Ubuntu 20.04 LTS server with root access
- Domain: **questiz.com** pointed to your server's IP address
- At least 2GB RAM, 20GB storage
- SSH access to the server

---

## 1. Server Setup

### 1.1 Connect to Your Server

```bash
ssh root@your_server_ip
```

### 1.2 Update System

```bash
apt update && apt upgrade -y
```

### 1.3 Create Deployment User

```bash
# Create user
adduser anifight
# Add to sudo group
usermod -aG sudo anifight
# Switch to user
su - anifight
```

### 1.4 Create Project Directory

```bash
mkdir -p /home/anifight/apps
cd /home/anifight/apps
```

---

## 2. Install Dependencies

### 2.1 Install Python 3.9+

```bash
sudo apt install -y python3.9 python3.9-venv python3.9-dev python3-pip
```

### 2.2 Install PostgreSQL 15

```bash
# Add PostgreSQL repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update

# Install PostgreSQL 15
sudo apt install -y postgresql-15 postgresql-contrib-15
```

### 2.3 Install Redis

```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### 2.4 Install Node.js 18 & npm

```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v18.x
npm --version
```

### 2.5 Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 2.6 Install Certbot (for SSL)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## 3. Clone Repository

### 3.1 Install Git

```bash
sudo apt install -y git
```

### 3.2 Configure Git (Optional)

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

### 3.3 Clone Your Repository

**Option A: Using HTTPS**
```bash
cd /home/anifight/apps
git clone https://github.com/yourusername/AniFight.git
cd AniFight
```

**Option B: Using SSH (Recommended for private repos)**
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your@email.com"
# Copy public key and add to GitHub
cat ~/.ssh/id_ed25519.pub

# Clone
cd /home/anifight/apps
git clone git@github.com:yourusername/AniFight.git
cd AniFight
```

### 3.4 Set Up Git Branch

```bash
# Create production branch
git checkout -b production

# Or use main branch
git checkout main
```

---

## 4. Database Setup

### 4.1 Switch to PostgreSQL User

```bash
sudo -i -u postgres
```

### 4.2 Create Database and User

```bash
# Open PostgreSQL prompt
psql

# Run these commands in psql:
CREATE DATABASE anifight_production;
CREATE USER anifight_user WITH PASSWORD 'your_secure_password_here';
ALTER ROLE anifight_user SET client_encoding TO 'utf8';
ALTER ROLE anifight_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE anifight_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE anifight_production TO anifight_user;

# Make anifight_user the owner of the database
ALTER DATABASE anifight_production OWNER TO anifight_user;

# Exit psql
\q

# Exit postgres user
exit
```

### 4.3 Configure PostgreSQL for Network Access (Optional)

```bash
# Edit pg_hba.conf
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Add this line (if needed for remote access):
# host    anifight_production    anifight_user    127.0.0.1/32    md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 4.4 Test Database Connection

```bash
psql -h localhost -U anifight_user -d anifight_production -W
# Enter password when prompted
# If successful, you'll see the psql prompt
# Exit with: \q
```

---

## 5. Backend Configuration

### 5.1 Navigate to Backend Directory

```bash
cd /home/anifight/apps/AniFight/backend
```

### 5.2 Create Virtual Environment

```bash
python3.9 -m venv venv
source venv/bin/activate
```

### 5.3 Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt

# Install additional production dependencies
pip install gunicorn
```

### 5.4 Create Production Environment File

```bash
cp .env.production .env
nano .env
```

**Edit the `.env` file with your actual values:**

```bash
# Django Settings
SECRET_KEY=generate-a-very-long-random-secret-key-here-use-at-least-50-characters
DEBUG=False
ALLOWED_HOSTS=questiz.com,www.questiz.com

# Database Configuration
DB_ENGINE=django.db.backends.postgresql
DB_NAME=anifight_production
DB_USER=anifight_user
DB_PASSWORD=your_secure_password_here
DB_HOST=localhost
DB_PORT=5432

# CORS Settings
CORS_ALLOWED_ORIGINS=https://questiz.com,https://www.questiz.com

# CSRF Trusted Origins
CSRF_TRUSTED_ORIGINS=https://questiz.com,https://www.questiz.com

# Google OAuth Configuration (Get from Google Cloud Console)
GOOGLE_OAUTH_CLIENT_ID=your-google-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-google-client-secret

# JWT Token Settings (in seconds)
JWT_ACCESS_TOKEN_LIFETIME=3600
JWT_REFRESH_TOKEN_LIFETIME=604800

# Redis Configuration
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### 5.5 Generate Django Secret Key

```bash
# Generate a secure secret key
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Copy the output and paste it as SECRET_KEY in .env
```

### 5.6 Run Database Migrations

```bash
# Make sure venv is activated
source venv/bin/activate

# Run migrations
python manage.py migrate

# If you get errors, check:
# 1. Database credentials in .env
# 2. PostgreSQL is running: sudo systemctl status postgresql
# 3. Database exists: psql -l
```

### 5.7 Create Superuser

```bash
python manage.py createsuperuser
# Enter username, email, and password
```

### 5.8 Collect Static Files

```bash
python manage.py collectstatic --noinput
```

### 5.9 Test Backend Server

```bash
# Test with Daphne (ASGI server for WebSocket)
daphne -b 0.0.0.0 -p 8000 anifight.asgi:application

# In another terminal, test:
curl http://localhost:8000/api/templates/

# Stop with Ctrl+C
```

---

## 6. Frontend Build

### 6.1 Navigate to Frontend Directory

```bash
cd /home/anifight/apps/AniFight/frontend
```

### 6.2 Create Production Environment File

```bash
cp .env.production .env
nano .env
```

**Edit with:**

```bash
# API Base URL (your backend domain)
VITE_API_URL=https://questiz.com

# Google OAuth Client ID (same as backend)
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 6.3 Install Dependencies

```bash
npm install
```

### 6.4 Build for Production

```bash
npm run build

# This creates a 'dist' folder with optimized production files
```

### 6.5 Verify Build

```bash
ls -la dist/
# Should see index.html, assets/, etc.
```

---

## 7. Nginx Configuration

### 7.1 Create Nginx Config File

```bash
sudo nano /etc/nginx/sites-available/questiz.com
```

**Paste this configuration:**

```nginx
# HTTP - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name questiz.com www.questiz.com;

    # For Let's Encrypt certificate verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS - Main Application
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name questiz.com www.questiz.com;

    # SSL certificates (will be added by Certbot)
    # ssl_certificate /etc/letsencrypt/live/questiz.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/questiz.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend - Serve React build
    location / {
        root /home/anifight/apps/AniFight/frontend/dist;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API - Proxy to Django
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Django Admin
    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket - Proxy to Daphne
    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Django static files
    location /static/ {
        alias /home/anifight/apps/AniFight/backend/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Django media files
    location /media/ {
        alias /home/anifight/apps/AniFight/backend/media/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Max upload size
    client_max_body_size 10M;
}
```

### 7.2 Enable the Site

```bash
# Create symlink to enable the site
sudo ln -s /etc/nginx/sites-available/questiz.com /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default
```

### 7.3 Test Nginx Configuration

```bash
sudo nginx -t

# Should output: "syntax is ok" and "test is successful"
```

### 7.4 Reload Nginx

```bash
sudo systemctl reload nginx
```

---

## 8. SSL Certificate

### 8.1 Obtain SSL Certificate

```bash
# Make sure your domain points to this server's IP first!
# Then run:
sudo certbot --nginx -d questiz.com -d www.questiz.com

# Follow the prompts:
# - Enter email address
# - Agree to terms
# - Choose whether to redirect HTTP to HTTPS (select 2 for redirect)
```

### 8.2 Auto-renewal Setup

```bash
# Test auto-renewal
sudo certbot renew --dry-run

# Certbot automatically installs a cron job for renewal
# Check it:
sudo systemctl status certbot.timer
```

---

## 9. Systemd Services

### 9.1 Create Daphne Service (Backend)

```bash
sudo nano /etc/systemd/system/anifight-daphne.service
```

**Paste:**

```ini
[Unit]
Description=AniFight Daphne ASGI Server
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=anifight
Group=anifight
WorkingDirectory=/home/anifight/apps/AniFight/backend
Environment="PATH=/home/anifight/apps/AniFight/backend/venv/bin"

ExecStart=/home/anifight/apps/AniFight/backend/venv/bin/daphne \
    -b 0.0.0.0 \
    -p 8000 \
    --access-log /var/log/anifight/daphne-access.log \
    --log-file /var/log/anifight/daphne-error.log \
    anifight.asgi:application

Restart=always
RestartSec=10

# Security
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### 9.2 Create Log Directory

```bash
sudo mkdir -p /var/log/anifight
sudo chown anifight:anifight /var/log/anifight
```

### 9.3 Enable and Start Services

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable services (start on boot)
sudo systemctl enable anifight-daphne

# Start services
sudo systemctl start anifight-daphne

# Check status
sudo systemctl status anifight-daphne
```

### 9.4 Check Logs

```bash
# View Daphne logs
sudo journalctl -u anifight-daphne -f

# View access logs
sudo tail -f /var/log/anifight/daphne-access.log

# View error logs
sudo tail -f /var/log/anifight/daphne-error.log
```

---

## 10. Deploy & Start

### 10.1 Final Checklist

```bash
# 1. Check PostgreSQL
sudo systemctl status postgresql

# 2. Check Redis
sudo systemctl status redis-server

# 3. Check Daphne (Backend)
sudo systemctl status anifight-daphne

# 4. Check Nginx
sudo systemctl status nginx

# 5. Check if port 8000 is listening
sudo netstat -tlnp | grep 8000

# 6. Check if ports 80 and 443 are listening
sudo netstat -tlnp | grep nginx
```

### 10.2 Test the Application

```bash
# Test backend API
curl https://questiz.com/api/templates/

# Test if frontend loads
curl -I https://questiz.com/

# Test WebSocket (manually from browser)
# Open https://questiz.com and try creating a multiplayer game
```

### 10.3 Common Issues After Deployment

**Issue 1: 502 Bad Gateway**
- Check if Daphne is running: `sudo systemctl status anifight-daphne`
- Check Daphne logs: `sudo journalctl -u anifight-daphne -n 50`
- Restart Daphne: `sudo systemctl restart anifight-daphne`

**Issue 2: Static files not loading**
- Run collectstatic again: `python manage.py collectstatic --noinput`
- Check Nginx config for correct paths
- Reload Nginx: `sudo systemctl reload nginx`

**Issue 3: Database connection errors**
- Verify `.env` file has correct database credentials
- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Test connection: `psql -U anifight_user -d anifight_production -h localhost`

**Issue 4: CORS errors**
- Verify `CORS_ALLOWED_ORIGINS` in backend `.env` includes `https://questiz.com`
- Verify `CSRF_TRUSTED_ORIGINS` includes `https://questiz.com`
- Restart Daphne: `sudo systemctl restart anifight-daphne`

---

## 11. Update Workflow

### 11.1 Pull Latest Changes

```bash
# SSH into server
ssh anifight@your_server_ip

# Navigate to project
cd /home/anifight/apps/AniFight

# Pull latest changes
git pull origin main  # or production branch
```

### 11.2 Update Backend

```bash
cd /home/anifight/apps/AniFight/backend

# Activate virtual environment
source venv/bin/activate

# Install new dependencies (if any)
pip install -r requirements.txt

# Run new migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Restart Daphne
sudo systemctl restart anifight-daphne
```

### 11.3 Update Frontend

```bash
cd /home/anifight/apps/AniFight/frontend

# Install new dependencies (if any)
npm install

# Build for production
npm run build

# Nginx will automatically serve the new build
# No restart needed for Nginx (unless config changed)
```

### 11.4 Verify Update

```bash
# Check if backend is running
sudo systemctl status anifight-daphne

# Check logs for errors
sudo journalctl -u anifight-daphne -n 50

# Visit your website
# https://questiz.com
```

### 11.5 Rollback (If Something Goes Wrong)

```bash
# Go to project directory
cd /home/anifight/apps/AniFight

# Find previous commit
git log --oneline -5

# Rollback to previous commit
git checkout <commit-hash>

# Rebuild frontend
cd frontend
npm run build

# Restart backend
sudo systemctl restart anifight-daphne
```

---

## 12. Troubleshooting

### 12.1 Check All Services

```bash
# Quick status check script
cat > /home/anifight/check_services.sh << 'EOF'
#!/bin/bash
echo "=== PostgreSQL ==="
sudo systemctl status postgresql | grep Active

echo ""
echo "=== Redis ==="
sudo systemctl status redis-server | grep Active

echo ""
echo "=== Daphne (Backend) ==="
sudo systemctl status anifight-daphne | grep Active

echo ""
echo "=== Nginx ==="
sudo systemctl status nginx | grep Active

echo ""
echo "=== Listening Ports ==="
sudo netstat -tlnp | grep -E ":(80|443|8000|6379|5432)"
EOF

chmod +x /home/anifight/check_services.sh
./check_services.sh
```

### 12.2 View Recent Logs

```bash
# Daphne logs (last 50 lines)
sudo journalctl -u anifight-daphne -n 50 --no-pager

# Nginx error log
sudo tail -50 /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -50 /var/log/postgresql/postgresql-15-main.log
```

### 12.3 Restart All Services

```bash
sudo systemctl restart postgresql
sudo systemctl restart redis-server
sudo systemctl restart anifight-daphne
sudo systemctl restart nginx
```

### 12.4 Database Migration Issues

**Problem: "relation does not exist"**
```bash
cd /home/anifight/apps/AniFight/backend
source venv/bin/activate

# Show migrations status
python manage.py showmigrations

# Run migrations
python manage.py migrate

# If still failing, check database:
psql -U anifight_user -d anifight_production
# In psql:
\dt  # List all tables
\q   # Quit
```

**Problem: "conflicts with existing table"**
```bash
# Fake the initial migration (only if table already exists)
python manage.py migrate --fake-initial
```

### 12.5 Permission Issues

```bash
# Fix ownership of project files
sudo chown -R anifight:anifight /home/anifight/apps/AniFight

# Fix media directory permissions
sudo chmod -R 755 /home/anifight/apps/AniFight/backend/media

# Fix log directory permissions
sudo chown -R anifight:anifight /var/log/anifight
```

### 12.6 WebSocket Connection Issues

**Check if WebSocket endpoint is accessible:**
```bash
# Test WebSocket URL
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Host: questiz.com" \
  -H "Origin: https://questiz.com" \
  https://questiz.com/ws/game/TEST/
```

**Common fixes:**
- Verify Nginx WebSocket configuration (`location /ws/`)
- Check Daphne is running and listening on port 8000
- Verify Redis is running
- Check firewall rules allow WebSocket connections

### 12.7 Performance Monitoring

```bash
# Check system resources
htop

# Check disk space
df -h

# Check memory usage
free -h

# Check active connections
sudo netstat -an | grep ESTABLISHED | wc -l

# Check Daphne process
ps aux | grep daphne
```

---

## 13. Maintenance Tasks

### 13.1 Database Backup

```bash
# Create backup script
cat > /home/anifight/backup_db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/anifight/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump -U anifight_user -h localhost anifight_production > $BACKUP_DIR/anifight_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "anifight_*.sql" -mtime +7 -delete

echo "Backup completed: anifight_$DATE.sql"
EOF

chmod +x /home/anifight/backup_db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add line:
# 0 2 * * * /home/anifight/backup_db.sh
```

### 13.2 Log Rotation

```bash
# Configure log rotation
sudo nano /etc/logrotate.d/anifight

# Paste:
/var/log/anifight/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 anifight anifight
    sharedscripts
    postrotate
        systemctl reload anifight-daphne > /dev/null 2>&1 || true
    endscript
}
```

### 13.3 Monitor Disk Space

```bash
# Check disk space
df -h

# Find large files
du -ah /home/anifight/apps/AniFight | sort -rh | head -20

# Clean up old logs
sudo journalctl --vacuum-time=7d
```

---

## 14. Security Best Practices

### 14.1 Firewall Setup (UFW)

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow OpenSSH

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Check status
sudo ufw status
```

### 14.2 Fail2Ban (Prevent Brute Force)

```bash
# Install fail2ban
sudo apt install -y fail2ban

# Create local config
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit config
sudo nano /etc/fail2ban/jail.local

# Enable and start
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 14.3 Regular Updates

```bash
# Update system packages weekly
sudo apt update
sudo apt upgrade -y

# Update Python packages
cd /home/anifight/apps/AniFight/backend
source venv/bin/activate
pip list --outdated
```

---

## 15. Quick Reference Commands

```bash
# Check service status
sudo systemctl status anifight-daphne
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status redis-server

# Restart services
sudo systemctl restart anifight-daphne
sudo systemctl restart nginx

# View logs
sudo journalctl -u anifight-daphne -f
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/anifight/daphne-error.log

# Update application
cd /home/anifight/apps/AniFight
git pull origin main
cd backend && source venv/bin/activate && python manage.py migrate && sudo systemctl restart anifight-daphne
cd ../frontend && npm run build

# Database backup
pg_dump -U anifight_user -h localhost anifight_production > backup_$(date +%Y%m%d).sql

# Restore database
psql -U anifight_user -h localhost anifight_production < backup_20240101.sql
```

---

## Support

If you encounter issues:
1. Check logs: `sudo journalctl -u anifight-daphne -n 100`
2. Verify all services are running
3. Check environment variables in `.env` files
4. Review Nginx configuration
5. Test database connection

For additional help, check:
- Project README.md
- Django documentation: https://docs.djangoproject.com/
- Nginx documentation: https://nginx.org/en/docs/

---

**Congratulations! Your AniFight application is now deployed on questiz.com** 🎉
