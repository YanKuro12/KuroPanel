#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════╗
║   ██╗  ██╗██╗   ██╗██████╗  ██████╗     ║
║   ██║ ██╔╝██║   ██║██╔══██╗██╔═══██╗    ║
║   █████╔╝ ██║   ██║██████╔╝██║   ██║    ║
║   ██╔═██╗ ██║   ██║██╔══██╗██║   ██║    ║
║   ██║  ██╗╚██████╔╝██║  ██║╚██████╔╝    ║
║   ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝     ║
║         KUROPANEL INSTALLER              ║
╚═══════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${GREEN}[1/7] Checking system...${NC}"
if ! grep -q "Ubuntu" /etc/os-release; then
    echo -e "${RED}Only Ubuntu supported${NC}"
    exit 1
fi

echo -e "${GREEN}[2/7] Installing dependencies...${NC}"
sudo apt update -y
sudo apt install -y curl wget git build-essential

echo -e "${GREEN}[3/7] Installing Go...${NC}"
if ! command -v go &> /dev/null; then
    wget -q https://go.dev/dl/go1.25.0.linux-amd64.tar.gz
    sudo tar -C /usr/local -xzf go1.25.0.linux-amd64.tar.gz
    echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
    export PATH=$PATH:/usr/local/go/bin
fi

echo -e "${GREEN}[4/7] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
fi

if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

echo -e "${GREEN}[5/7] Cloning repository...${NC}"
mkdir -p /opt/kuropanel
cd /opt/kuropanel
git clone https://github.com/kuropanel/kuropanel.git .

echo -e "${GREEN}[6/7] Setting up environment...${NC}"
cp .env.example .env
sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$(openssl rand -base64 32)/" .env
sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$(openssl rand -base64 32)/" .env
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$(openssl rand -base64 32)/" .env

echo -e "${GREEN}[7/7] Starting services...${NC}"
cd docker
docker-compose up -d --build

echo -e "${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════╗
║         INSTALLATION COMPLETE            ║
╚═══════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${BLUE}"
echo "Access: http://$(curl -s ifconfig.me):3000"
echo ""
echo "Login:"
echo "  Email: admin@kuropanel.com"
echo "  Password: admin123"
echo ""
echo "CHANGE PASSWORD IMMEDIATELY"
echo -e "${NC}"

echo -e "${YELLOW}Commands:${NC}"
echo "  cd /opt/kuropanel/docker"
echo "  docker-compose logs -f"
echo "  docker-compose down"
echo "  docker-compose up -d"