# Git Workflow for AniFight Deployment

This guide explains how to use Git for easy updates and deployments of AniFight.

---

## Table of Contents
1. [Initial Setup](#1-initial-setup)
2. [Development Workflow](#2-development-workflow)
3. [Deployment Workflow](#3-deployment-workflow)
4. [Rollback Procedure](#4-rollback-procedure)
5. [Branch Strategy](#5-branch-strategy)
6. [Common Git Commands](#6-common-git-commands)

---

## 1. Initial Setup

### 1.1 Create Repository on GitHub

1. Go to https://github.com/new
2. Repository name: `AniFight` (or your preferred name)
3. Set to Private (if you want)
4. Don't initialize with README (we already have one)
5. Click "Create repository"

### 1.2 Push Existing Code to GitHub

```bash
# On your local machine (where you developed the project)
cd "/Users/nafew/Documents/Web Projects/AniFight"

# Initialize git (if not already done)
git init

# Create .gitignore file
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/
*.egg-info/
.pytest_cache/
.coverage

# Django
*.log
*.pot
*.pyc
db.sqlite3
media/
staticfiles/
.env
.env.local
.env.production

# Node.js
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*
dist/
build/

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Temporary files
*.tmp
.cache/
EOF

# Add all files
git add .

# Initial commit
git commit -m "Initial commit: AniFight project"

# Add remote repository (replace with your GitHub URL)
git remote add origin https://github.com/yourusername/AniFight.git

# Or with SSH:
# git remote add origin git@github.com:yourusername/AniFight.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 1.3 Clone on Production Server

```bash
# SSH into your production server
ssh anifight@your_server_ip

# Navigate to apps directory
cd /home/anifight/apps

# Clone repository
git clone https://github.com/yourusername/AniFight.git
cd AniFight

# Set up branch tracking (if using a separate production branch)
git checkout -b production origin/production
```

---

## 2. Development Workflow

### 2.1 Make Changes Locally

```bash
# On your local machine
cd "/Users/nafew/Documents/Web Projects/AniFight"

# Create a feature branch (optional but recommended)
git checkout -b feature/new-feature

# Make your changes to the code
# Edit files, add features, fix bugs, etc.

# Check what files changed
git status

# View changes
git diff
```

### 2.2 Test Changes Locally

```bash
# Test backend
cd backend
source venv/bin/activate
python manage.py migrate
python manage.py runserver

# Test frontend
cd ../frontend
npm run dev

# Run tests (if you have them)
python manage.py test
npm test
```

### 2.3 Commit Changes

```bash
# Add specific files
git add backend/api/views.py
git add frontend/src/components/NewComponent.jsx

# Or add all changes
git add .

# Commit with descriptive message
git commit -m "Add new feature: multiplayer leaderboard

- Added leaderboard API endpoint
- Created LeaderboardPage component
- Updated navigation menu
- Added database migrations for player stats"

# Push to GitHub
git push origin feature/new-feature
```

### 2.4 Merge to Main Branch

```bash
# Option A: Using GitHub Pull Request (Recommended)
# 1. Go to GitHub repository
# 2. Click "Pull Requests" > "New Pull Request"
# 3. Select feature/new-feature -> main
# 4. Review changes and merge

# Option B: Merge locally
git checkout main
git merge feature/new-feature
git push origin main

# Delete feature branch (cleanup)
git branch -d feature/new-feature
git push origin --delete feature/new-feature
```

---

## 3. Deployment Workflow

### 3.1 Manual Deployment

```bash
# SSH into production server
ssh anifight@your_server_ip

# Navigate to project
cd /home/anifight/apps/AniFight

# Pull latest changes
git pull origin main

# Run deployment script
chmod +x deploy.sh  # First time only
./deploy.sh
```

### 3.2 Using Deployment Script

The `deploy.sh` script automates the entire deployment:

```bash
cd /home/anifight/apps/AniFight
./deploy.sh
```

**What it does:**
1. ✅ Pulls latest code from Git
2. ✅ Installs/updates backend dependencies
3. ✅ Runs database migrations
4. ✅ Collects static files
5. ✅ Installs/updates frontend dependencies
6. ✅ Builds frontend for production
7. ✅ Restarts backend service
8. ✅ Verifies deployment

### 3.3 Manual Deployment Steps (if script fails)

```bash
# 1. Pull code
git pull origin main

# 2. Update backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
deactivate

# 3. Update frontend
cd ../frontend
npm install
npm run build

# 4. Restart services
sudo systemctl restart anifight-daphne

# 5. Check status
sudo systemctl status anifight-daphne
```

### 3.4 Verify Deployment

```bash
# Check service status
sudo systemctl status anifight-daphne

# Check logs
sudo journalctl -u anifight-daphne -n 50

# Test API
curl https://questiz.com/api/templates/

# Visit website
# https://questiz.com
```

---

## 4. Rollback Procedure

### 4.1 Find Previous Version

```bash
# View commit history
git log --oneline -10

# Output example:
# a1b2c3d (HEAD -> main) Add leaderboard feature
# e4f5g6h Fix bug in character selection
# i7j8k9l Update frontend styling
# m0n1o2p Add multiplayer rooms
```

### 4.2 Rollback to Previous Commit

```bash
# Method 1: Hard reset (destructive)
git reset --hard e4f5g6h
git push origin main --force

# Method 2: Revert commit (safe, creates new commit)
git revert a1b2c3d
git push origin main

# Method 3: Create new branch from old commit
git checkout -b rollback-temp e4f5g6h
git checkout main
git reset --hard rollback-temp
git push origin main --force
```

### 4.3 Redeploy Old Version

```bash
# After rolling back in Git
./deploy.sh

# Or manually:
cd backend
source venv/bin/activate
python manage.py migrate
python manage.py collectstatic --noinput
deactivate

cd ../frontend
npm run build

sudo systemctl restart anifight-daphne
```

### 4.4 Quick Rollback (One-liner)

```bash
# Rollback to previous commit and deploy
git reset --hard HEAD~1 && ./deploy.sh
```

---

## 5. Branch Strategy

### 5.1 Recommended Branch Structure

```
main (or master)
  ↓
  - Always production-ready
  - Protected branch (require pull request reviews)
  - Deploys to questiz.com

production (optional)
  ↓
  - Exact copy of what's running on server
  - Only merge from main after testing

feature/* branches
  ↓
  - feature/user-authentication
  - feature/leaderboard
  - feature/new-game-mode

bugfix/* branches
  ↓
  - bugfix/websocket-disconnect
  - bugfix/character-loading

hotfix/* branches
  ↓
  - hotfix/critical-security-patch
  - Merge directly to main and production
```

### 5.2 Using Production Branch

```bash
# Create production branch (one time)
git checkout -b production main
git push origin production

# On production server, track production branch
cd /home/anifight/apps/AniFight
git checkout production
git pull origin production

# Deployment workflow with production branch:
# 1. Develop on feature branches
# 2. Merge to main
# 3. Test main on staging server (if available)
# 4. Merge main to production
git checkout production
git merge main
git push origin production

# 5. Deploy production branch
ssh anifight@your_server_ip
cd /home/anifight/apps/AniFight
git pull origin production
./deploy.sh
```

---

## 6. Common Git Commands

### 6.1 Check Status

```bash
# See current branch and modified files
git status

# See commit history
git log --oneline -10

# See what changed in a file
git diff backend/api/views.py

# See branches
git branch -a
```

### 6.2 Branch Management

```bash
# Create new branch
git checkout -b feature/new-feature

# Switch to existing branch
git checkout main

# Delete branch locally
git branch -d feature/old-feature

# Delete branch on GitHub
git push origin --delete feature/old-feature

# Update branch list from remote
git fetch --prune
```

### 6.3 Stash Changes (Save Work in Progress)

```bash
# Save current changes without committing
git stash

# See stashed changes
git stash list

# Apply stashed changes
git stash pop

# Apply specific stash
git stash apply stash@{0}

# Clear all stashes
git stash clear
```

### 6.4 View Changes

```bash
# See uncommitted changes
git diff

# See changes in staged files
git diff --staged

# See changes between commits
git diff e4f5g6h a1b2c3d

# See files changed in last commit
git show --name-only
```

### 6.5 Undo Changes

```bash
# Undo changes to a file (not staged)
git checkout -- backend/api/views.py

# Unstage a file
git reset HEAD backend/api/views.py

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Amend last commit message
git commit --amend -m "New commit message"
```

---

## 7. Automated Deployment (Advanced)

### 7.1 Using Git Hooks (Deploy on Push)

```bash
# On production server
cd /home/anifight/apps/AniFight/.git/hooks

# Create post-receive hook
cat > post-receive << 'EOF'
#!/bin/bash
cd /home/anifight/apps/AniFight
git --work-tree=/home/anifight/apps/AniFight --git-dir=/home/anifight/apps/AniFight/.git checkout -f
./deploy.sh
EOF

chmod +x post-receive
```

### 7.2 Using GitHub Actions (CI/CD)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - name: Deploy to server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SERVER_IP }}
        username: anifight
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /home/anifight/apps/AniFight
          git pull origin main
          ./deploy.sh
```

---

## 8. Troubleshooting Git Issues

### 8.1 Merge Conflicts

```bash
# When you see merge conflict
git status  # Shows conflicted files

# Edit conflicted files manually
# Look for:
# <<<<<<< HEAD
# Your changes
# =======
# Their changes
# >>>>>>> branch-name

# After fixing conflicts
git add .
git commit -m "Resolve merge conflicts"
```

### 8.2 Reset to Remote State

```bash
# Discard all local changes and match remote
git fetch origin
git reset --hard origin/main
```

### 8.3 Authentication Issues

```bash
# Use SSH instead of HTTPS
git remote set-url origin git@github.com:yourusername/AniFight.git

# Or update HTTPS credentials
git config --global credential.helper store
```

---

## 9. Best Practices

### ✅ Do's

1. **Commit often** with descriptive messages
2. **Test locally** before pushing
3. **Use branches** for new features
4. **Pull before push** to avoid conflicts
5. **Review changes** before committing (`git diff`)
6. **Backup database** before major deployments
7. **Tag releases** (`git tag v1.0.0`)
8. **Keep .gitignore updated**

### ❌ Don'ts

1. **Don't commit** `.env` files (use `.env.example`)
2. **Don't commit** large binary files
3. **Don't commit** `node_modules/` or `venv/`
4. **Don't force push** to main branch
5. **Don't deploy** without testing
6. **Don't commit** database backups or media files

---

## 10. Quick Reference

```bash
# Daily workflow
git pull origin main           # Get latest changes
git checkout -b feature/xyz    # Create feature branch
# ... make changes ...
git add .                      # Stage changes
git commit -m "Description"    # Commit
git push origin feature/xyz    # Push to GitHub
# ... create pull request on GitHub ...
git checkout main              # Switch to main
git pull origin main           # Update main

# Deployment
ssh anifight@server
cd /home/anifight/apps/AniFight
git pull origin main
./deploy.sh

# Rollback
git reset --hard HEAD~1
./deploy.sh
```

---

**Remember:** Always test locally before deploying to production! 🚀
