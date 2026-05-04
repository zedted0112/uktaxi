# Deploy UKTaxi backend on EC2 (Ubuntu 24 + Nginx + Uvicorn)

Assumes: **MongoDB on Atlas** (not on this disk), **Ubuntu 24.04**, **2 GB RAM**, **12 GB** disk, security group allows **22 (your IP)**, **80**, **443**.

## Quick path (SSH works — do this on the server)

1. **Packages:** run [§2 System packages](#2-system-packages) (`apt update/upgrade`, install venv / pip / nginx / git).
2. **Code:** [§3](#3-app-code-on-the-server) — `git clone` to `~/uktaxi` **or** from your Mac `rsync` the `backend/` folder to `ubuntu@YOUR_ELASTIC_IP:~/uktaxi/backend/` (create `mkdir -p ~/uktaxi` on the server first if using rsync only).
3. **If `pip install` OOMs:** run the **swapfile** one-liner in §2, then retry `pip install`.
4. **Venv + deps:** [§4](#4-python-venv--dependencies).
5. **Secrets:** [§5](#5-production-env) — create `~/uktaxi/backend/.env` with real `MONGO_URL`, `JWT_SECRET_KEY`, `ENABLE_DEMO_MODE=false`, `CORS_ORIGINS`, `GOOGLE_WEB_CLIENT_ID`, etc.
6. **Atlas:** [§4b](#4b-mongodb-atlas-where-to-click) — allow EC2 **Elastic IP** `/32` + copy **connection string** for `.env`.
7. **Smoke test:** [§6](#6-smoke-test-manual) — `curl http://127.0.0.1:8000/api/` returns UKTaxi JSON.
8. **Production process:** [§7](#7-systemd-runs-api-on-boot) systemd, then [§8](#8-nginx-reverse-proxy) Nginx (set `server_name` to your API hostname). **Certbot** only after DNS points that hostname to this server.
9. **App:** set `EXPO_PUBLIC_BACKEND_URL` to your public HTTPS API base (see §9), rebuild.

---

## 0) After launch (AWS console)

1. **Elastic IP** → Allocate → Associate to this instance (so IP does not change).
2. **DNS** (optional now): point `api.yourdomain.com` A-record → Elastic IP.

## 1) SSH in

```bash
ssh -i /path/to/your-key.pem ubuntu@YOUR_ELASTIC_IP
```

## 2) System packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3.12-venv python3-pip nginx git
```

**2 GB RAM tip:** installing `pandas` / `numpy` can spike memory. If `pip install` gets killed, add swap once:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
```

## 3) App code on the server

Either **git clone** your repo (if private, use deploy key or HTTPS token):

```bash
cd ~
git clone https://github.com/YOUR_ORG/UKParivahan-sync.git uktaxi
cd uktaxi/backend
```

Or **rsync** from your laptop (example):

```bash
rsync -avz --exclude '.venv' --exclude '__pycache__' \
  ./backend/ ubuntu@YOUR_ELASTIC_IP:~/uktaxi/backend/
```

## 4) Python venv + dependencies

```bash
cd ~/uktaxi/backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## 4b) MongoDB Atlas (where to click)

Do this in the **browser** at [cloud.mongodb.com](https://cloud.mongodb.com) (not on EC2).

### A) Allow traffic from your EC2 public IP

1. Sign in → pick your **Organization** → pick your **Project** (the one that owns the cluster).
2. Left sidebar: **Security** → **Network Access** (or search “Network Access” in the top search bar).
3. **Add IP Address**.
4. For the API server: enter **`YOUR_ELASTIC_IP/32`** (example: `65.0.246.227/32`) — this is the **Elastic IP** from AWS, not the private `172.31.x.x` shown inside the instance.
5. Optional comment: `EC2 UKTaxi API` → **Confirm**.
6. Wait until the entry shows **Active** (can take a minute).

Your **laptop’s IP** is separate: only add it if you want to connect to Atlas **from your Mac** (e.g. Compass). The EC2 app needs the **EC2 Elastic IP** in the list (or `0.0.0.0/0` only for quick testing — not recommended for production).

### B) Connection string for `MONGO_URL`

1. Left sidebar: **Database** (Deployments).
2. On your cluster, click **Connect**.
3. **Drivers** → choose **Python** and version **3.12** (or latest) → **Copy** the URI.
4. Replace `<password>` with the **Database User** password (create user under **Security → Database Access** if you do not have one).
5. Paste the full URI into `MONGO_URL` in `.env` on the server (next section).

---

## 5) Production `.env`

**Where:** on the **EC2 box**, after SSH — edit this file:

```bash
nano ~/uktaxi/backend/.env
```

- Save in nano: **Ctrl+O**, Enter, then **Ctrl+X** to exit.

Set at least:

| Variable | Example / note |
|----------|------------------|
| `MONGO_URL` | Atlas connection string |
| `DB_NAME` | e.g. `uktaxi_prod` |
| `ENABLE_DEMO_MODE` | `false` |
| `CORS_ORIGINS` | Comma-separated origins; tighten for prod (avoid `*` if you use credentialed clients) |
| `JWT_SECRET_KEY` | long random string (not default) |
| `GOOGLE_WEB_CLIENT_ID` | Web client ID (same as native Google sign-in) |

Do **not** set `DEBUG_LOG_PATH` in production unless you want local NDJSON debug files.

## 6) Smoke test (manual)

```bash
cd ~/uktaxi/backend
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

From another terminal on the server:

```bash
curl -sS http://127.0.0.1:8000/api/
```

You should see JSON with `"message":"UKTaxi API"`. Ctrl+C to stop.

## 7) systemd (runs API on boot)

Copy the template and edit paths if your home directory is not `ubuntu`:

```bash
sudo cp ~/uktaxi/deploy/ec2/uktaxi-api.service /etc/systemd/system/uktaxi-api.service
sudo nano /etc/systemd/system/uktaxi-api.service   # check User/WorkingDirectory/ExecStart
sudo systemctl daemon-reload
sudo systemctl enable --now uktaxi-api
sudo systemctl status uktaxi-api
```

## 8) Nginx reverse proxy

1. Copy site config and replace `YOUR_API_DOMAIN`:

```bash
sudo cp ~/uktaxi/deploy/ec2/nginx-uktaxi-api.conf /etc/nginx/sites-available/uktaxi-api
sudo nano /etc/nginx/sites-available/uktaxi-api
sudo ln -sf /etc/nginx/sites-available/uktaxi-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

2. **TLS with Certbot** (needs DNS pointing to this server if you use a real hostname):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_API_DOMAIN
```

If you only have an **IP** (no domain), use HTTP only for testing or get a cheap domain first — Let’s Encrypt needs a hostname.

## 9) Point the mobile app

Set `EXPO_PUBLIC_BACKEND_URL` to:

`https://YOUR_API_DOMAIN/api` **or** `https://YOUR_API_DOMAIN` depending on how you configured Nginx `location` (this repo’s API lives under `/api/...`; the sample Nginx config proxies `/api/` to Uvicorn).

Rebuild the app after changing that env.

## 10) Updates after code changes

```bash
cd ~/uktaxi && git pull   # or rsync again
sudo systemctl restart uktaxi-api
```

---

## Troubleshooting

| Symptom | Check |
|--------|--------|
| `502` from Nginx | `sudo journalctl -u uktaxi-api -n 50 --no-pager` |
| Mongo errors | Atlas **Network Access** allows this server’s IP (or `0.0.0.0/0` only while testing) |
| CORS errors from a web client | `CORS_ORIGINS` must include the browser origin |
| Out of memory on pip | swapfile step above |
