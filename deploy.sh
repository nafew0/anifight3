#!/bin/bash
# ============================================
# AniFight Production Deployment Script
# ============================================

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/home/anifight/apps/AniFight"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BRANCH="main"  # Change to 'production' if using a separate branch

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if we're in the right directory
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Project directory not found: $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

# Step 1: Git Pull
print_info "Pulling latest changes from Git..."
git fetch origin
git pull origin $BRANCH
print_success "Code updated"

# Step 2: Backend Update
print_info "Updating backend..."
cd "$BACKEND_DIR"

# Activate virtual environment
source venv/bin/activate

# Install/update dependencies
print_info "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
print_success "Dependencies installed"

# Run migrations
print_info "Running database migrations..."
python manage.py migrate --noinput
print_success "Migrations completed"

# Collect static files
print_info "Collecting static files..."
python manage.py collectstatic --noinput
print_success "Static files collected"

# Deactivate virtual environment
deactivate

# Step 3: Frontend Update
print_info "Updating frontend..."
cd "$FRONTEND_DIR"

# Install/update dependencies
print_info "Installing Node dependencies..."
npm install
print_success "Dependencies installed"

# Build for production
print_info "Building frontend..."
npm run build
print_success "Frontend built"

# Step 4: Restart Services
print_info "Restarting backend service..."
sudo systemctl restart anifight-daphne
print_success "Backend restarted"

# Wait for service to start
sleep 3

# Step 5: Verify Deployment
print_info "Verifying deployment..."

# Check if Daphne is running
if sudo systemctl is-active --quiet anifight-daphne; then
    print_success "Daphne service is running"
else
    print_error "Daphne service is not running!"
    sudo systemctl status anifight-daphne
    exit 1
fi

# Check if backend is responding
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/templates/ | grep -q "200"; then
    print_success "Backend API is responding"
else
    print_error "Backend API is not responding!"
    exit 1
fi

# Check if Nginx is running
if sudo systemctl is-active --quiet nginx; then
    print_success "Nginx is running"
else
    print_error "Nginx is not running!"
    exit 1
fi

echo ""
print_success "🎉 Deployment completed successfully!"
echo ""
print_info "Next steps:"
echo "  1. Visit https://questiz.com to verify"
echo "  2. Check logs: sudo journalctl -u anifight-daphne -f"
echo "  3. Monitor for errors in the first few minutes"
echo ""
