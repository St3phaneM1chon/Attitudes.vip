#!/bin/bash

# Test Watch Script - Run tests in watch mode
# Attitudes.vip

echo "🧪 Starting Jest in watch mode..."
echo "Press 'q' to quit, 'a' to run all tests"
echo ""

# Run Jest in watch mode with coverage
npx jest --watch --coverage --coverageReporters=text