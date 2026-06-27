#!/bin/bash
set -e

cd /opt/kuropanel

echo "Pulling latest changes..."
git pull

echo "Building backend..."
cd backend
go build -o kuropanel ./cmd/server

echo "Building frontend..."
cd ../frontend
npm install
npm run build

echo "Restarting services..."
pm2 restart kuropanel-backend || pm2 start backend/kuropanel --name kuropanel-backend
pm2 restart kuropanel-frontend || pm2 start "npm start --prefix frontend" --name kuropanel-frontend

echo "Deployment complete!"