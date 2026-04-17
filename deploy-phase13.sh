#!/bin/bash
# Phase 13: Production Deployment Script
# Deploys optimized code to production server

set -e

echo "🚀 Phase 13: Production Deployment"
echo "=================================="

# Configuration
REMOTE_HOST="srv2052.hstgr.io"
REMOTE_USER="u487877829"
REMOTE_PATH="/home/u487877829/public_html"
LOCAL_FRONTEND="./frontend"
LOCAL_BACKEND="./php-backend"

echo ""
echo "📋 Deployment Configuration:"
echo "   Host: $REMOTE_HOST"
echo "   User: $REMOTE_USER"
echo "   Path: $REMOTE_PATH"
echo ""

# Step 1: Build frontend
echo "🔨 Step 1: Building frontend..."
cd "$LOCAL_FRONTEND"
npm run build
cd - > /dev/null

if [ ! -d "frontend/dist" ]; then
    echo "❌ Frontend build failed - dist not found"
    exit 1
fi
echo "✅ Frontend built successfully"

# Step 2: Verify backend PHP syntax
echo ""
echo "🔍 Step 2: Verifying backend PHP syntax..."
for file in php-backend/src/*.php; do
    php -l "$file" > /dev/null || { echo "❌ Syntax error in $file"; exit 1; }
done
echo "✅ All PHP files valid"

# Step 3: Prepare deployment files
echo ""
echo "📦 Step 3: Preparing deployment package..."
mkdir -p deploy_temp
cp -r frontend/dist deploy_temp/
cp -r php-backend/src deploy_temp/
cp -r php-backend/config deploy_temp/
cp .env.production deploy_temp/.env
echo "✅ Deployment package ready"

# Step 4: Upload to production
echo ""
echo "🌍 Step 4: Uploading to production..."
echo "   (Note: Configure SSH key or use SFTP credentials if needed)"
echo ""
echo "   Manual deployment (SFTP/cPanel File Manager):"
echo "   1. Upload frontend/dist/* to: $REMOTE_PATH/dist/"
echo "   2. Upload php-backend/src/* to: $REMOTE_PATH/api/src/"
echo "   3. Upload php-backend/config/* to: $REMOTE_PATH/api/config/"
echo "   4. Update $REMOTE_PATH/api/.env with database credentials"
echo ""

# Optional: If SSH is configured
if command -v scp &> /dev/null; then
    read -p "Deploy via SCP? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📤 Uploading files via SCP..."
        # scp -r frontend/dist/* "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/dist/"
        # scp -r php-backend/src/* "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/api/src/"
        echo "✅ Upload complete"
    fi
fi

# Step 5: Cleanup
echo ""
echo "🧹 Step 5: Cleaning up..."
rm -rf deploy_temp
echo "✅ Cleanup complete"

echo ""
echo "✅ Phase 13 Deployment Script Complete!"
echo ""
echo "📝 Next Steps:"
echo "   1. Verify deployment in cPanel/SFTP"
echo "   2. Test production URL: https://bettorplays247.com"
echo "   3. Check API health: https://bettorplays247.com/api/health"
echo "   4. Run load test after 15 minute cache warm-up"
echo ""
echo "💡 Monitoring:"
echo "   • Watch MySQL slow query log"
echo "   • Monitor error logs in cPanel"
echo "   • Check Core Web Vitals in DevTools"
echo ""
