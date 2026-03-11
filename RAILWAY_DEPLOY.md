# Deploy IndyScan on Railway

Minimal deploy: **2 services** (Elasticsearch + IndyScan API+Webapp in one container). Optional 3rd service = daemon to scan a ledger.

---

## Option A: Two services (recommended – super easy)

### 1. Create a Railway project

- New project → connect your IndyScan repo.
- Use branch **`railway-deploy`**.

### 2. Add Elasticsearch

- **New** → **Empty Service** (or **Database** if Railway offers Elasticsearch).
- If using a **Docker image**: set image to `docker.elastic.co/elasticsearch/elasticsearch:7.17.9`.
- Variables:
  - `discovery.type` = `single-node`
  - `xpack.security.enabled` = `false`
  - `ES_JAVA_OPTS` = `-Xms256m -Xmx256m`
- Deploy. Note the **internal URL** (e.g. `http://elasticsearch.railway.internal:9200` or the URL Railway shows).

### 3. Add IndyScan app

- **New** → **GitHub Repo** → select IndyScan, branch `railway-deploy`.
- **Settings** → **Build** → **Dockerfile path**: `Dockerfile.railway`.
- **Variables**:
  - `ES_URL` = Elasticsearch URL from step 2 (must be reachable from the app; use Railway’s internal hostname or the public URL if no private networking).
- **Settings** → **Networking** → expose **Public networking** and set the port Railway expects (often `PORT` is set automatically; the app listens on `PORT`).
- Deploy.

### 4. Open the app

Use the generated public URL for the IndyScan service. The explorer will be **empty** until you run the daemon (see Optional: Daemon below) or point it at an existing IndyScan API.

---

## Option B: Docker Compose (one project, two containers)

If your Railway plan supports **Docker Compose**:

1. Connect the repo and select branch `railway-deploy`.
2. Set the compose file to `docker-compose.railway.yml`.
3. Set **root directory** to repo root.
4. Add variable for the app service: `ES_URL=http://elasticsearch:9200` (or the hostname Railway assigns to the ES service).
5. Deploy; Railway will create one service per container (elasticsearch, app).

---

## Optional: Daemon (to scan a ledger)

To **populate** the explorer with transactions from an Indy ledger (e.g. your von-network):

1. Run the **IndyScan daemon** somewhere that can reach both:
   - Your **ledger** (genesis + node addresses), and  
   - The same **Elasticsearch** the app uses.

2. Configure the daemon with:
   - `ES_URL` = same Elasticsearch URL as the app (e.g. Railway ES URL if reachable, or a shared ES).
   - Worker config pointing at your **genesis file** and network id (see `start/app-configs-daemon/` for examples).

3. You can run the daemon as a **3rd Railway service** using the existing `indyscan-daemon` Dockerfile and the same `ES_URL`, plus genesis/config mounted or built into the image.

Until the daemon has run and synced, the explorer will show no data.

---

## Variables reference (app container)

| Variable | Required | Description |
|----------|----------|-------------|
| `ES_URL` | Yes | Elasticsearch URL (e.g. `http://elasticsearch:9200` or Railway ES service URL). |
| `NETWORKS_CONFIG_PATH` | No | Path to networks JSON; default `/app/config/networks.json` (baked single network). |
| `PORT` | Set by Railway | Port the webapp listens on. |

---

## Summary

- **2 services** = Elasticsearch + IndyScan (API + Webapp in one container).  
- **1 app container** = API + Webapp only; daemon is optional and can be added as a 3rd service to scan a ledger.
