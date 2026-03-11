# Deploy IndyScan on Railway

Minimal deploy: **2 services** (Elasticsearch + IndyScan API+Webapp in one container). Optional 3rd service = daemon to scan a ledger.

**Who creates the Elasticsearch indices?** Only the **IndyScan daemon** creates and fills them. The Railway app runs **API + Webapp only** (no daemon), so indices are created when you run the daemon and point it at your ledger and the same Elasticsearch.

---

## Option A: Two services (recommended – super easy)

### 1. Create a Railway project

- New project → connect your IndyScan repo.
- Use branch **`railway-deploy`**.

### 2. Add Elasticsearch

- **New** → **Empty Service** (or **Database** if Railway offers Elasticsearch).
- If using a **Docker image**: set image to **`elasticsearch:7.17.9`** (Docker Hub official image; `docker.elastic.co/...` is often unavailable).
- **Required variables** (single-node + **development mode** so bootstrap checks only warn, no host `vm.max_map_count` needed):
  - `discovery.type` = `single-node`
  - `transport.host` = `127.0.0.1`
  - `http.host` = `0.0.0.0`
  - `xpack.security.enabled` = `false`
  - `ES_JAVA_OPTS` = `-Xms256m -Xmx256m`
- **Why dev mode:** With `transport.host=127.0.0.1`, Elasticsearch runs in development mode; bootstrap checks (e.g. `vm.max_map_count`, discovery) are logged as warnings and do not block startup. The app connects via HTTP (port 9200), so `http.host=0.0.0.0` is correct. Use this for dev/test only; for production, use a properly configured or managed Elasticsearch.
- Deploy. In the Elasticsearch service, copy the **private/internal URL** (e.g. `http://<service-name>.railway.internal:9200`). You will set this as `ES_URL` on the IndyScan app in step 3—use the hostname, not a raw IP.

**Persisting data (volume):** If you add a **volume** at `/usr/share/elasticsearch/data` and see **`AccessDeniedException: /usr/share/elasticsearch/data/nodes`**, use one of these:

- **Option 1 – Custom image (recommended):** Same repo + branch, set **Dockerfile path** to **`Dockerfile.elasticsearch.railway`**, same variables as above, then add the volume with **mount path** **`/usr/share/elasticsearch/data`**. That image runs an entrypoint that chowns the data dir before starting Elasticsearch.
- **Option 2 – Start command (only if the container runs as root):** If Railway runs this service as root, keep image **`elasticsearch:7.17.9`** and set **Start Command** to:  
  `sh -c 'chown -R 1000:0 /usr/share/elasticsearch/data /usr/share/elasticsearch/logs 2>/dev/null; exec /usr/local/bin/docker-entrypoint.sh elasticsearch'`  
  The official image usually runs as user `elasticsearch`, so `chown` often fails; Option 1 is more reliable. **Pre deploy** runs at build time and does not see the mounted volume, so it cannot fix permissions.

### 3. Add IndyScan app

- **New** → **GitHub Repo** → select IndyScan, branch `railway-deploy`.
- **Settings** → **Build** → **Dockerfile path**: `Dockerfile.railway`.
- **Variables**:
  - `ES_URL` = the **private** Elasticsearch URL from step 2 (e.g. `http://elasticsearch.railway.internal:9200`). Must be reachable from the app; use Railway’s internal hostname, not a public URL or raw IP.
- **Settings** → **Networking** → expose **Public networking** and set the port Railway expects (often `PORT` is set automatically; the app listens on `PORT`).
- Deploy.

### 4. Open the app

Use the generated public URL for the IndyScan service. The explorer will be **empty** until you run the daemon (see Optional: Daemon below)—the app does not run the daemon.

---

## Option B: Docker Compose (one project, two containers)

If your Railway plan supports **Docker Compose**:

1. Connect the repo and select branch `railway-deploy`.
2. Set the compose file to `docker-compose.railway.yml`.
3. Set **root directory** to repo root.
4. Add variable for the app service: `ES_URL=http://elasticsearch:9200` (or the hostname Railway assigns to the ES service).
5. Deploy; Railway will create one service per container (elasticsearch, app).

---

## Optional: Daemon (creates the indices and populates data)

The **daemon** is what creates the Elasticsearch indices and fills them with transactions from an Indy ledger. The app (API + Webapp) **does not** run the daemon—it only reads from ES. So to have data in the explorer you must run the daemon somewhere.

**Daemon Dockerfile location:** **`indyscan-daemon/Dockerfile`** (from repo root).

To **populate** the explorer:

1. Run the **IndyScan daemon** somewhere that can reach both your **ledger** (genesis + nodes) and the same **Elasticsearch** the app uses.

2. Configure the daemon with:
   - `ES_URL` = same Elasticsearch URL as the app (e.g. `http://elasticsearch.railway.internal:9200`).
   - `WORKER_CONFIGS` = path to a worker config JSON (defines network id, `esIndex` e.g. `txs-indyscanpool`, and genesis path or URL). See `start/app-configs-daemon/INDYSCANPOOL.json` and the daemon’s `app-configs/`.
   - **Genesis:** You can set `genesisPath` to either a **local file path** (e.g. `{{{cfgdir}}}/genesis/INDYSCANPOOL.txn`) or a **URL** (`http://...` or `https://...`). If it’s a URL, the daemon downloads it to a temp file and uses it (e.g. `https://your-von-network.up.railway.app/genesis` if your ledger serves the pool genesis there).

3. **As a 3rd Railway service:** New service from same repo, **Dockerfile path** = **`indyscan-daemon/Dockerfile`**. Set variables:
   - **`ES_URL`** = your Elasticsearch private URL (e.g. `http://elasticsearch.railway.internal:9200`).
   - **`GENESIS_URL`** = URL of the ledger’s genesis file (e.g. `http://von-network.railway.internal:8080/genesis`). The daemon downloads it at startup. **Important:** The genesis file lists the pool’s node addresses. The daemon must be able to connect to those **node ports** (9701, 9703, 9705, 9707) on that host—see **PoolLedgerTimeout** in Troubleshooting if the daemon times out connecting to the ledger.
   - **`WORKER_CONFIGS`** = **`app-configs/railway.json`** (uses `{{{GENESIS_URL}}}` and `{{{ES_URL}}}` from env). Optionally set **`ES_INDEX`** if you use a different index name (default in that config: `txs-indyscanpool`).

No genesis file mount or build needed when using `GENESIS_URL`.

Until the daemon has run and synced, the explorer will show no data.

---

## Naming the ledger

- **Display name (what users see in the UI):** Set **`INDY_NETWORK_DISPLAY`** on the **IndyScan app** service (e.g. `Von Network`, `My Testnet`). Optionally **`INDY_NETWORK_DESCRIPTION`** for the short description. No rebuild needed.
- **Internal id** (used in URLs and ES index): The default is **`INDYSCANPOOL`** with index **`txs-indyscanpool`**, defined in `config/networks-default.json` and `indyscan-daemon/app-configs/railway.json`. To use a different id (e.g. `VON_NETWORK`), change **`INDY_NETWORK`** and **`ES_INDEX`** in the daemon config (and env) and ensure the app’s networks config has the same `id` and `es.index` (e.g. by building a custom `networks.json` and setting `NETWORKS_CONFIG_PATH`).

---

## Troubleshooting

### `ConnectionError: connect ECONNREFUSED ... :9200` and 500 from `/api`

The IndyScan API talks to Elasticsearch. If you see **ECONNREFUSED** to an IP like `10.x.x.x:9200`, the app container cannot reach Elasticsearch.

**Do this:**

1. **Elasticsearch service must be running**  
   In Railway, open the **Elasticsearch** service and check **Deployments** and **Logs**. If it’s not running or keeps restarting, fix it first (e.g. use the dev-mode variables from step 2 above).

2. **Use the URL Railway gives you for Elasticsearch**  
   For the **IndyScan app** service, set `ES_URL` to the **internal** (private) URL of your Elasticsearch service:
   - In Railway, open the **Elasticsearch** service → **Variables** or **Connect** / **Networking**.
   - Copy the **private** URL (often like `http://<service-name>.railway.internal:9200` or a `RAILWAY_PRIVATE_DOMAIN`-style host). Use that as `ES_URL` for the app.
   - Do **not** paste a raw IP (e.g. `10.196.108.145`) into `ES_URL`; IPs can change on redeploy and may not be reachable between services.

3. **Both services in the same project**  
   The IndyScan app and Elasticsearch must be in the **same Railway project** so private networking between them works.

4. **Redeploy the app after changing `ES_URL`**  
   Update `ES_URL` on the app service, then trigger a redeploy so the new value is used at runtime.

After Elasticsearch is up and `ES_URL` is correct, `/api` should stop returning 500 and the explorer can load (empty until the daemon has synced).

### `AccessDeniedException: /usr/share/elasticsearch/data/nodes` (when using a volume)

The Elasticsearch process runs as user `elasticsearch` (uid 1000). A volume mounted at `/usr/share/elasticsearch/data` is often root-owned, so the process cannot create the `nodes` directory.

**Fix:** Use the custom image that fixes permissions on startup:

1. In the **Elasticsearch** service, set **Dockerfile path** to **`Dockerfile.elasticsearch.railway`** (repo root). Redeploy so Railway builds from this Dockerfile instead of pulling `elasticsearch:7.17.9`.
2. Keep the same variables and the volume mount path **`/usr/share/elasticsearch/data`**.
3. Redeploy. The custom entrypoint runs as root, chowns the data (and logs) directory to `elasticsearch`, then starts Elasticsearch.

If you don’t need persistence, you can instead remove the volume and use the default image so data is ephemeral.

### `PoolLedgerTimeout` when the daemon connects to the ledger

The daemon uses the **Indy SDK** to connect to the pool: it reads node addresses from the genesis file and opens TCP connections to **node ports** (typically **9701, 9703, 9705, 9707**), not just the HTTP genesis URL.

**Cause:** If your von-network (or other ledger) is deployed with **default settings**, its genesis file lists **`127.0.0.1`** for all nodes and only the **Ledger Browser port** (e.g. 8080) is exposed. The daemon runs in a **different** container, so it cannot reach `127.0.0.1:9701` (that’s inside the von-network container). Result: **PoolLedgerTimeout**.

**Fix:** The ledger service must:

1. **Generate genesis with a reachable hostname**  
   Set **`IP`** (or **`IPS`**) on the **von-network** service to the hostname the daemon can use (e.g. **`von-network.railway.internal`** so the daemon, in the same Railway project, can resolve and connect).

2. **Expose the Indy node ports**  
   The daemon must be able to open TCP connections to **9701, 9703, 9705, 9707** on that host. On Railway this usually means configuring the von-network service so these ports are exposed (Railway may support multiple ports or a custom TCP proxy; see Railway docs). If the platform only exposes one port, the daemon cannot reach the pool from another service unless you use a different topology (e.g. run the daemon where the nodes are reachable, or use a public testnet that already exposes node ports).

Until the daemon can reach the pool’s node ports, it will keep logging “Indy Network connection problem … PoolLedgerTimeout” and will retry; workers are built but the ledger-copy workers need an open pool to sync.

---

## Variables reference (app container)

| Variable | Required | Description |
|----------|----------|-------------|
| `ES_URL` | Yes | Elasticsearch URL (e.g. `http://elasticsearch:9200` or Railway ES service URL). |
| `NETWORKS_CONFIG_PATH` | No | Path to networks JSON; default `/app/config/networks.json` (baked single network). |
| `INDY_NETWORK_DISPLAY` | No | Display name for the ledger in the UI (e.g. `Von Network`). Overrides the first network’s `display` and `ui.display`. |
| `INDY_NETWORK_DESCRIPTION` | No | Short description for the ledger in the UI. Overrides the first network’s `ui.description`. |
| `PORT` | Set by Railway | Port the webapp listens on. |

---

## Summary

- **2 services** = Elasticsearch + IndyScan (API + Webapp in one container).  
- **1 app container** = API + Webapp only; daemon is optional and can be added as a 3rd service to scan a ledger.
