#!/bin/bash

echo "Installing dependencies..."
npm install
npm install --save-dev @types/node

echo "Cleaning old builds..."
rm -rf dist

echo "Building project..."
npm run build

echo "Done! Check for any remaining errors above."
