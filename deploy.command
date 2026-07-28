#!/bin/bash
# Méra OS — Deploy Launcher
# Double-click this file to deploy to Vercel

MERA="$(dirname "$0")"
cd "$MERA"

echo ""
echo "======================================"
echo "  Méra OS — Full Deploy"
echo "======================================"
echo ""

bash deploy.sh

echo ""
read -p "Press Enter to close..." _
