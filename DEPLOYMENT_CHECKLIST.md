# Production Deployment Checklist

Quick checklist for deploying AniFight to questiz.com

## Pre-Deployment

### 1. Domain Setup
- [ ] Domain `questiz.com` purchased and active
- [ ] DNS A record points to server IP address
- [ ] DNS propagated (check with: `dig questiz.com`)
- [ ] Wait 5-10 minutes for DNS propagation

### 2. Server Access
- [ ] Ubuntu 20.04 LTS server ready
- [ ] SSH access configured: `ssh root@your_server_ip`
- [ ] Server has at least 2GB RAM, 20GB storage

### 3. Local Repository
- [ ] Code pushed to GitHub/GitLab
- [ ] `.gitignore` excludes `.env`, `node_modules/`, `venv/`, `dist/`
- [ ] All changes committed and pushed
- [ ] Repository accessible from server

---

## Server Setup Phase

### 4. System Preparation
```bash
ssh root@your_server_ip
apt update && apt upgrade -y
adduser anifight
usermod -aG sudo anifight
su - anifight
```
- [ ] System updated
- [ ] User `anifight` created
- [ ] User added to sudo group

### 5. Dependencies Installation
```bash
# Python
sudo apt install -y python3.9 python3.9-venv python3-pip

# PostgreSQL 15
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-15 postgresql-contrib-15

# Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Nginx
sudo apt install -y nginx
sudo systemctl enable nginx

# Certbot
sudo apt install -y certbot python3-certbot-nginx

# Git
sudo apt install -y git
```
- [ ] Python 3.9+ installed
- [ ] PostgreSQL 15 installed and running
- [ ] Redis installed and running
- [ ] Node.js 18 installed
- [ ] Nginx installed
- [ ] Certbot installed
- [ ] Git installed

### 6. Database Setup
```bash
sudo -i -u postgres
psql
```
```sql
CREATE DATABASE anifight_production;
CREATE USER anifight_user WITH PASSWORD 'CHANGE_THIS_PASSWORD';
ALTER ROLE anifight_user SET client_encoding TO 'utf8';
ALTER ROLE anifight_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE anifight_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE anifight_production TO anifight_user;
ALTER DATABASE anifight_production OWNER TO anifight_user;
\q
exit
```
- [ ] Database `anifight_production` created
- [ ] User `anifight_user` created with strong password
- [ ] Permissions granted
- [ ] Connection tested: `psql -h localhost -U anifight_user -d anifight_production`

---

## Code Deployment Phase

### 7. Clone Repository
```bash
cd /home/anifight/apps
git clone https://github.com/yourusername/AniFight.git
cd AniFight
```
- [ ] Repository cloned successfully
- [ ] In correct directory: `/home/anifight/apps/AniFight`

### 8. Backend Configuration
```bash
cd /home/anifight/apps/AniFight/backend
python3.9 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```
- [ ] Virtual environment created
- [ ] Dependencies installed
- [ ] No installation errors

### 9. Environment Variables - Backend
```bash
cd /home/anifight/apps/AniFight/backend
cp .env.production .env
nano .env
```
**Update these values:**
- [ ] `SECRET_KEY` - Generate with: `python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`
- [ ] `DEBUG=False`
- [ ] `ALLOWED_HOSTS=questiz.com,www.questiz.com`
- [ ] `DB_NAME=anifight_production`
- [ ] `DB_USER=anifight_user`
- [ ] `DB_PASSWORD=your_actual_password`
- [ ] `CORS_ALLOWED_ORIGINS=https://questiz.com,https://www.questiz.com`
- [ ] `CSRF_TRUSTED_ORIGINS=https://questiz.com,https://www.questiz.com`
- [ ] `GOOGLE_OAUTH_CLIENT_ID` - Your actual Google OAuth client ID
- [ ] `GOOGLE_OAUTH_CLIENT_SECRET` - Your actual Google OAuth client secret

### 10. Database Migrations
```bash
cd /home/anifight/apps/AniFight/backend
source venv/bin/activate
python manage.py migrate
```
- [ ] All migrations applied successfully
- [ ] No errors in output
- [ ] Tables created (verify with: `psql -U anifight_user -d anifight_production -c "\dt"`)

### 11. Create Superuser
```bash
python manage.py createsuperuser
```
- [ ] Superuser created
- [ ] Username and password saved securely

### 12. Collect Static Files
```bash
python manage.py collectstatic --noinput
```
- [ ] Static files collected to `staticfiles/` directory

### 13. Test Backend
```bash
daphne -b 0.0.0.0 -p 8000 anifight.asgi:application
# In another terminal:
curl http://localhost:8000/api/templates/
# Should return JSON
# Press Ctrl+C to stop
```
- [ ] Backend starts without errors
- [ ] API responds to requests

### 14. Frontend Configuration
```bash
cd /home/anifight/apps/AniFight/frontend
cp .env.production .env
nano .env
```
**Update these values:**
- [ ] `VITE_API_URL=https://questiz.com`
- [ ] `VITE_GOOGLE_CLIENT_ID` - Same as backend

### 15. Build Frontend
```bash
cd /home/anifight/apps/AniFight/frontend
npm install
npm run build
```
- [ ] Dependencies installed
- [ ] Build completed successfully
- [ ] `dist/` directory created
- [ ] `dist/index.html` exists

---

## Nginx & SSL Phase

### 16. Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/questiz.com
```
- [ ] Configuration file created (copy from DEPLOYMENT_GUIDE_PRODUCTION.md)
- [ ] Paths correct: `/home/anifight/apps/AniFight/`
- [ ] Domain correct: `questiz.com`
```bash
sudo ln -s /etc/nginx/sites-available/questiz.com /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```
- [ ] Site enabled
- [ ] Nginx configuration test passed
- [ ] Nginx reloaded

### 17. SSL Certificate
```bash
sudo certbot --nginx -d questiz.com -d www.questiz.com
```
- [ ] Email entered
- [ ] Terms accepted
- [ ] Certificate obtained successfully
- [ ] Auto-renewal configured
- [ ] Test renewal: `sudo certbot renew --dry-run`

---

## Service Configuration Phase

### 18. Systemd Service
```bash
sudo nano /etc/systemd/system/anifight-daphne.service
```
- [ ] Service file created (copy from DEPLOYMENT_GUIDE_PRODUCTION.md)
```bash
sudo mkdir -p /var/log/anifight
sudo chown anifight:anifight /var/log/anifight
sudo systemctl daemon-reload
sudo systemctl enable anifight-daphne
sudo systemctl start anifight-daphne
```
- [ ] Log directory created
- [ ] Service enabled
- [ ] Service started
- [ ] Service running: `sudo systemctl status anifight-daphne`

---

## Verification Phase

### 19. Service Status Check
```bash
sudo systemctl status postgresql      # Should be active
sudo systemctl status redis-server    # Should be active
sudo systemctl status anifight-daphne # Should be active
sudo systemctl status nginx           # Should be active
```
- [ ] PostgreSQL running
- [ ] Redis running
- [ ] Daphne (backend) running
- [ ] Nginx running

### 20. Port Check
```bash
sudo netstat -tlnp | grep -E ":(80|443|8000|6379|5432)"
```
- [ ] Port 80 (HTTP) - nginx
- [ ] Port 443 (HTTPS) - nginx
- [ ] Port 8000 - daphne
- [ ] Port 6379 - redis
- [ ] Port 5432 - postgresql

### 21. Log Check
```bash
sudo journalctl -u anifight-daphne -n 50
sudo tail -f /var/log/nginx/error.log
```
- [ ] No critical errors in backend logs
- [ ] No errors in Nginx logs

### 22. API Test
```bash
curl https://questiz.com/api/templates/
```
- [ ] Returns JSON data
- [ ] No SSL errors
- [ ] Status code 200

### 23. Website Test
- [ ] Visit https://questiz.com in browser
- [ ] Homepage loads correctly
- [ ] No console errors (F12 → Console)
- [ ] Can navigate between pages
- [ ] Login page accessible
- [ ] Registration page accessible

### 24. Feature Testing
- [ ] Can create a game (single player)
- [ ] Can draw characters
- [ ] Can place characters in roles
- [ ] Can see results
- [ ] Can create multiplayer room
- [ ] Can join multiplayer room
- [ ] WebSocket connects (check browser console)
- [ ] Multiplayer game works

### 25. Admin Panel
- [ ] Visit https://questiz.com/admin/
- [ ] Can log in with superuser
- [ ] Can view models (Anime, Characters, etc.)
- [ ] Can add test data

---

## Post-Deployment

### 26. Google OAuth Setup
- [ ] Go to https://console.cloud.google.com/apis/credentials
- [ ] Create OAuth 2.0 Client ID (Web application)
- [ ] Add authorized redirect URIs:
  - `https://questiz.com/api/auth/google/callback/`
  - `https://www.questiz.com/api/auth/google/callback/`
- [ ] Add authorized JavaScript origins:
  - `https://questiz.com`
  - `https://www.questiz.com`
- [ ] Copy Client ID and Secret to `.env` files
- [ ] Restart backend: `sudo systemctl restart anifight-daphne`
- [ ] Test Google login

### 27. Security Hardening
```bash
sudo ufw enable
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw status
```
- [ ] Firewall enabled
- [ ] SSH allowed
- [ ] HTTP/HTTPS allowed

### 28. Monitoring Setup
```bash
# Create backup script
nano /home/anifight/backup_db.sh
# Copy content from DEPLOYMENT_GUIDE_PRODUCTION.md
chmod +x /home/anifight/backup_db.sh
crontab -e
# Add: 0 2 * * * /home/anifight/backup_db.sh
```
- [ ] Backup script created
- [ ] Backup cron job added
- [ ] Test backup: `./backup_db.sh`

### 29. Documentation
- [ ] Server IP address documented
- [ ] Database password saved in password manager
- [ ] Superuser credentials saved securely
- [ ] Google OAuth credentials saved
- [ ] DNS settings documented

### 30. Deployment Script Setup
```bash
cd /home/anifight/apps/AniFight
chmod +x deploy.sh
./deploy.sh  # Test it
```
- [ ] Script executable
- [ ] Script runs successfully
- [ ] Updates work correctly

---

## Final Checks

### ✅ Everything Working?

- [ ] Website loads at https://questiz.com
- [ ] SSL certificate valid (padlock in browser)
- [ ] All pages accessible
- [ ] Single-player game works
- [ ] Multiplayer game works
- [ ] Google OAuth login works
- [ ] Admin panel accessible
- [ ] No errors in logs
- [ ] Services restart on reboot (test with: `sudo reboot`)

---

## Troubleshooting

If something doesn't work:

1. **502 Bad Gateway**: Check if Daphne is running (`sudo systemctl status anifight-daphne`)
2. **Database errors**: Check credentials in `.env`, test connection
3. **WebSocket fails**: Check Redis is running, check Nginx WebSocket config
4. **Static files not loading**: Run `python manage.py collectstatic --noinput`
5. **CORS errors**: Check `CORS_ALLOWED_ORIGINS` in backend `.env`

**View logs:**
```bash
# Backend
sudo journalctl -u anifight-daphne -f

# Nginx
sudo tail -f /var/log/nginx/error.log

# All services status
sudo systemctl status anifight-daphne nginx postgresql redis-server
```

---

## Contact

If you get stuck, refer to:
- [DEPLOYMENT_GUIDE_PRODUCTION.md](DEPLOYMENT_GUIDE_PRODUCTION.md) - Detailed guide
- [GIT_WORKFLOW.md](GIT_WORKFLOW.md) - Git and update procedures

---

**Deployment Date:** _________________

**Deployed By:** _____________________

**Server IP:** _______________________

**Status:** ⬜ In Progress  ⬜ Completed  ⬜ Issues Found
