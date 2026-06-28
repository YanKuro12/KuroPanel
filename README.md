
# KuroPanel

Infrastructure Management Panel — Deploy game servers, manage nodes, run tasks, file manager, real-time monitoring, and more.

[![Go](https://img.shields.io/badge/Go-1.25-00ADD8?style=flat-square&logo=go)](https://golang.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=next.js)](https://nextjs.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-3.3-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-✓-2496ED?style=flat-square&logo=docker)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

---

## Features

| Feature | Description |
|---------|-------------|
| Game Servers | Deploy Minecraft, Rust, CS:GO, Valheim, Palworld, Terraria, GMod, ARK |
| Nodes | Manage multiple servers/nodes with real-time status |
| Tasks | Queue and execute commands, scripts, Docker containers |
| File Manager | Edit, upload, download, zip, unzip, chmod, rename, delete |
| Dashboard | Real-time monitoring with charts and stats |
| Users | Multi-user support with Admin/User roles |
| Backup | Automated database backup and restore |
| WebSocket | Real-time communication with agents |
| API | REST API with Swagger documentation |
| Docker | One-click deployment with Docker Compose |
| Responsive | Works on Windows, macOS, Linux, Android, iOS |

---

## Quick Install

```bash
git clone https://github.com/YanKuro12/kuropanel.git
cd kuropanel
chmod +x scripts/install.sh
sudo ./scripts/install.sh
```

Or using Docker:

```bash
cd docker
docker-compose up -d --build
```

---

| Requirement | Minimum |
|-------------|---------|
| OS Ubuntu | 22.04 / 24.04 |
| CPU | 2 Cores |
| RAM | 2 GB |
| Storage | 20 GB |
| Docker | 24.0+ |
| Go | 1.25+ (for build) |
| Node.js | 20+ (for frontend) |

---

# Supported Games & Services

---

## SteamCMD Games

| Game | Port |
|------|------|
| 7 Days to Die | 26900 |
| ARK: Survival Evolved | 7777 |
| Arma 3 2302 |
| Counter Strike (CS:GO / CS2) | 27015 |
| DayZ | 2302 |
| Enshrouded | 15636 |
| Left 4 Dead 2 | 27015 |
| Palworld 8211 |
| Project Zomboid | 16261 |
| Rust | 28015 |
| Satisfactory | 7777 |
| Sons of the Forest | 8766 |
| Squad | 7787 |
| Starbound | 21025 |
| Team Fortress 2 | 27015 |

---

## Minecraft & Variants

| Game | Port |
|------|------|
| Minecraft (Vanilla) | 25565 |
| Minecraft (Paper) | 25565 |
| Minecraft (Sponge) | 25565 |
| Minecraft (Bungeecord) | 25565 |
| Minecraft (Waterfall) | 25565 |
| Pocketmine MP | 19132 |

---

## Standalone Games

Game Port
Among Us 22023
Factorio 34197
FTL 8080
Garry's Mod 27015
GTA (FiveM) 30120
Kerbal Space Program 8080
Mindustry 6567
Rimworld 25565
San Andreas: MP 7777
Starmade 4242
Terraria 7777
Valheim 2456
Xonotic 26000

---

## Voice Servers

Service Port 
Mumble 64738
TeamSpeak 3 9987
Lavalink 2333

---

## Discord Bots & Services

Service Port
Redbot -
JMusicBot -
Dynamica -
Discord ATLBot -
Node.js Bots -
Python Bots -

---

## Software & Databases

Service Port
Elasticsearch 9200
Gitea 3000
Grafana 3000
Prometheus 9090
Loki 3100
RabbitMQ 5672
Redis 6379
MariaDB 3306
PostgreSQL 5432
MongoDB 27017
S3 Storage -
SFTP Share 22

---

## Programming Runtimes

| Runtime | Port |
|---------|------|
| Node.js | - |
| Python | - |
| Java | - |
| C# (.NET) | - |

---

### Default Login

```Field Value
URL http://your-server-ip:3000
Email admin@kuropanel.com
Password admin123
```

### CHANGE PASSWORD IMMEDIATELY AFTER FIRST LOGIN


---

## Environment Variables

```Variable Description Default
DB_PASSWORD PostgreSQL password (required)
REDIS_PASSWORD Redis password (required)
JWT_SECRET JWT signing secret (required)
APP_KEY Application encryption key (required)
NODE_ENV Environment mode production
PORT API port 5000
```

---

Tech Stack

Layer Technology
Backend Go (Fiber)
Agent Go
Frontend Next.js 14 + Tailwind CSS
Database PostgreSQL 15
Cache/Queue Redis 7
Realtime WebSocket
Deployment Docker + Traefik

---

Commands

```bash
# Start panel
cd /opt/kuropanel/docker
docker-compose up -d

# View logs
docker-compose logs -f

# Stop panel
docker-compose down

# Restart panel
docker-compose restart

# Backup database
cd /opt/kuropanel
./scripts/backup.sh
```

---

Upcoming Game Support

Based on industry trends and community requests, KuroPanel will support these games in the upcoming v1.1.0 / v2.0.0 update:

Game Type ETA
KYORA Sandbox Adventure Q3 2026
Anno 117: Pax Romana Strategy Q4 2026
Dune: Awakening Survival MMO Q3 2026
Borderlands 4 FPS Q3 2026
Doom: The Dark Ages FPS Q3 2026
Assassin's Creed Shadows Action RPG Q3 2026
Monster Hunter Wilds Action RPG Q3 2026
Kingdom Come: Deliverance II RPG Q3 2026
Mafia: The Old Country Action Q3 2026
Titan Quest II ARPG Q4 2026
Vampire: The Masquerade - Bloodlines 2 RPG Q4 2026
Cronos: The New Dawn Survival Horror Q4 2026
Hell Is Us Action Q4 2026
Of Ash and Steel RPG Q4 2026
The Outer Worlds 2 RPG Q4 2026

Notes:

· Game support will be added through Docker images and pre-configured eggs
· Some games may require SteamCMD authentication
· All upcoming games will be free to deploy on KuroPanel
· Community can request additional games via GitHub Issues

Want a game added? Open an issue at https://github.com/YanKuro12/kuropanel/issues

---

Roadmap

v1.0.0 (Current)

· Core features complete
· Game server management
· File manager
· User management

v2.0.0 (Current)

· Plugin System
· Multi-language
· Custom themes
· Advanced analytics

v3.0.0 (ComingSoon)

- Plugin Marketplace
- Web Terminal Update
- Webhook System
- Api Update
- Security Update
- Visual Ui Update
