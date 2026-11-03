#!/bin/bash
# ==============================================================================
# IaaS VM Provisioning & Setup Script (Dung de so sanh ganh nang van hanh voi PaaS)
# So buoc thuc hien: ~15 buoc phuc tap ma PaaS tu dong hoa 100%
# ==============================================================================

set -e

echo "=== [1/15] Cap nhat he dieu hanh Linux (OS Security Patches) ==="
sudo apt-get update && sudo apt-get upgrade -y

echo "=== [2/15] Cau hinh Firewall (UFW) ==="
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "=== [3/15] Cai dat Fail2ban ngan ngua brute-force SSH ==="
sudo apt-get install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

echo "=== [4/15] Cai dat Docker va Docker Compose ==="
sudo apt-get install -y ca-certificates curl gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "=== [5/15] Cau hinh Log Rotation cho Docker Container de tranh day o dia ==="
sudo bash -c 'cat <<EOF > /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  }
}
EOF'
sudo systemctl restart docker

echo "=== [6/15] Thiet lap cron job backup PostgreSQL database tu dong hang ngay ==="
sudo mkdir -p /backups/postgres
sudo bash -c 'cat <<EOF > /usr/local/bin/backup-postgres.sh
#!/bin/bash
TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
docker exec iaas_postgres_db pg_dump -U db_user app_db | gzip > /backups/postgres/db_\$TIMESTAMP.sql.gz
# Xoa backup cu hon 7 ngay
find /backups/postgres/ -type f -name "*.sql.gz" -mtime +7 -delete
EOF'
sudo chmod +x /usr/local/bin/backup-postgres.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-postgres.sh") | crontab -

echo "=== [7/15] Khoi dong Docker Compose Stack ==="
docker compose up -d --build

echo "=== [HOAN TAT] IaaS da duoc thiet lap. Tong thoi gian uoc tinh: 30 - 60 phut ==="
echo "So sanh voi PaaS: Chi mat 1 click hoac 2 phut day len Git!"
