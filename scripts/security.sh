#!/bin/bash
set -e

echo "Securing KuroPanel..."

# Generate new secrets
NEW_JWT=$(openssl rand -base64 32)
NEW_APP_KEY=$(openssl rand -base64 32)

# Update .env
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$NEW_JWT/" /opt/kuropanel/.env
sed -i "s/APP_KEY=.*/APP_KEY=$NEW_APP_KEY/" /opt/kuropanel/.env

# Setup firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
ufw allow 5000/tcp
ufw --force enable

# Fail2ban
apt install -y fail2ban
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[kuropanel-auth]
enabled = true
port = http,https
filter = kuropanel-auth
logpath = /opt/kuropanel/backend/logs/auth.log
maxretry = 5
EOF

systemctl restart fail2ban

echo "Security hardening complete!"