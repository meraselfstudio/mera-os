#!/bin/bash
set -e

echo "🚀 Starting Méra OS Deployment..."

# 1. Deploy the POS Dashboard (Vite)
echo "----------------------------------------"
echo "📦 1/2: Deploying POS Dashboard (Vite)"
echo "----------------------------------------"
cd apps/pos-dashboard
npx vercel build --prod --yes
npx vercel deploy --prebuilt --prod --yes --archive tgz
cd ../..

# 2. Deploy the Customer Portal (Next.js)
echo "----------------------------------------"
echo "📦 2/2: Deploying Customer Portal (Next.js)"
echo "----------------------------------------"
# Clean up previous deployment folder
rm -rf .deploy-portal

# Isolate the portal using pnpm deploy
# This bypasses Vercel's limitation with pnpm monorepo symlinks
pnpm --filter customer-portal deploy .deploy-portal

# Copy environment variables so Next.js can prerender pages
cp apps/customer-portal/.env.local .deploy-portal/.env.local
(cd .deploy-portal && npx vercel link --yes --project .deploy-portal)

# Build and deploy from the isolated directory
cd .deploy-portal
npx vercel build --prod --yes
npx vercel deploy --prebuilt --prod --yes --archive tgz
cd ..

echo "----------------------------------------"
echo "✅ Deployment Complete!"
echo "Your changes are now live on Vercel."
echo "----------------------------------------"
