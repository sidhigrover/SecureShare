# Railway Deployment Script
echo "Setting up Railway deployment..."

# First, create a railway.json file in your server directory
cat > railway.json << 'EOF'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
EOF

echo "Railway configuration created!"
echo "Next steps:"
echo "1. Push your code to GitHub"
echo "2. Connect Railway to your GitHub repo"
echo "3. Deploy automatically!"