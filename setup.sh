#!/bin/bash

# IndiaNext Full Stack Setup Script
# This script sets up and runs the entire IndiaNext platform

set -e

echo "🚀 IndiaNext Full Stack Setup"
echo "=============================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 16+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed. Please install npm${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm -v)${NC}"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}⚠ Python3 is not installed. Some features may not work${NC}"
else
    echo -e "${GREEN}✓ Python $(python3 --version)${NC}"
fi

# Check Docker (optional)
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker $(docker --version)${NC}"
else
    echo -e "${YELLOW}⚠ Docker is not installed. You can use docker-compose up to run everything${NC}"
fi

echo ""
echo -e "${YELLOW}Setting up directories...${NC}"

# Create logs directory
mkdir -p logs

# Verify directory structure
if [ ! -d "backend" ]; then
    echo -e "${RED}backend directory not found${NC}"
    exit 1
fi

if [ ! -d "frontend" ]; then
    echo -e "${RED}frontend directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Directories verified${NC}"

echo ""
echo -e "${YELLOW}Installing dependencies...${NC}"

# Install backend dependencies
cd backend
echo "Installing backend dependencies..."
npm install 2>/dev/null || npm install
cd ..
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

# Install frontend dependencies
cd frontend
echo "Installing frontend dependencies..."
npm install 2>/dev/null || npm install
cd ..
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

echo ""
echo -e "${YELLOW}Checking environment files...${NC}"

# Check backend .env
if [ ! -f "backend/.env" ]; then
    echo "Creating backend/.env from .env.example..."
    cp backend/.env.example backend/.env 2>/dev/null || echo "backend/.env.example not found"
    echo -e "${YELLOW}⚠ Please fill in backend/.env with your credentials${NC}"
fi
echo -e "${GREEN}✓ Backend .env exists${NC}"

# Check frontend .env
if [ ! -f "frontend/.env" ]; then
    echo "Creating frontend/.env from .env.example..."
    cp frontend/.env.example frontend/.env 2>/dev/null || echo "frontend/.env.example not found"
fi
echo -e "${GREEN}✓ Frontend .env exists${NC}"

echo ""
echo -e "${GREEN}=============================="
echo "Setup Complete! 🎉"
echo "=============================${NC}"
echo ""

echo "Next steps:"
echo ""
echo "Option 1: Run with npm (3 terminals needed):"
echo "  Terminal 1: cd backend && npm run dev"
echo "  Terminal 2: cd frontend && npm run dev"
echo "  Terminal 3: Wait for servers to start"
echo ""
echo "Option 2: Run with Docker Compose (Recommended):"
echo "  docker-compose up"
echo ""
echo "Then open http://localhost:5173 in your browser"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo "1. Update backend/.env with your MongoDB URI"
echo "2. Update backend/.env with your Hugging Face API token (if using HF API mode)"
echo "3. Ensure MongoDB is running (locally or via Atlas)"
echo ""
echo "For more details, see INTEGRATION_GUIDE.md"
