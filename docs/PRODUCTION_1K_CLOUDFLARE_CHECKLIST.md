# PRODUCTION 1K — Cloudflare R2 + RunPod + app.reelstorm.uk

**Goal:** `app.reelstorm.uk/studio-set` → Generate → real R2 video at `https://videos.reelstorm.uk/videos/….mp4`

Account: `b006c0d60f24fcc912e6b96450ffa0ef`

## Live status (agent probe, Oct 10)

| Check | Status |
|---|---|
| Buckets `reelstorm-videos` + `reelstorm-weights` | ✅ exist |
| Objects under `videos/` | ✅ 2 files (dashboard “0 B” was stale) |
| Test object `…0b38629b….mp4` | ✅ 8224 B, `video/mp4` |
| New generate `…c7be0996….mp4` | ✅ `real_r2:true` via RunPod |
| R2 CORS for app/marketing | ✅ applied |
| RunPod saver health | ✅ `r2_ok:true` `mode:REAL` |
| Public `saver-health` on app | ✅ 200 |
| Zone NS on Cloudflare | ✅ `lauryn.ns` / `mark.ns` (zone active) |
| `videos.reelstorm.uk` DNS | ✅ resolves via Cloudflare |
| R2 custom domain Active | ✅ connected (`ownership_status: active`; SSL pending→working HTTPS 200) |
| Public MP4 probe | ✅ `HTTP/2 200` `video/mp4` on test objects |
| VPS `.env` S3_* → R2 (readiness) | ❌ `object_storage` fail (agent has no SSH to `87.106.103.43`) |
| Studio route | ✅ use `POST /api/studio/generate` (not `generate-set`) |
| GPU / SkyReels | ⚠️ still `engine: r2-upload-placeholder` |

## Phase 1 — you must click (blocking)

Cloudflare MCP auth in this agent session is still unavailable; do this in the dashboard:

1. **Cloudflare Dashboard → Domains → Add domain → `reelstorm.uk`**
2. Copy the two Cloudflare nameservers.
3. **IONOS (current registrar DNS)** → change NS from `*.ui-dns.*` → Cloudflare NS → wait until zone Active.
4. **R2 → `reelstorm-videos` → Settings → Custom Domains → Add `videos.reelstorm.uk` → Connect** until Status = Active.
5. Optional temp: enable **R2.dev subdomain** on the same bucket; set `R2_PUBLIC_URL` / `S3_PUBLIC_URL` to that `pub-….r2.dev` until custom domain is Active.
6. Verify: `curl -I https://videos.reelstorm.uk/videos/0b38629b428140499c1305916ec98314.mp4` → `200` + `video/mp4`.

CORS already set to:

- Origins: `https://app.reelstorm.uk`, `https://reelstorm.uk`, `http://localhost:3000`
- Methods: `GET`, `HEAD`

## Phase 2–3 — VPS (needs SSH)

Agent cannot SSH to `87.106.103.43` with keys on this machine. On the VPS, align `/opt/reelstorm-os/.env` with R2 (`S3_ENDPOINT` = account R2 endpoint, `S3_BUCKET=reelstorm-videos`, `S3_REGION=auto`, same access keys, `S3_PUBLIC_URL=https://videos.reelstorm.uk`), then:

```bash
pm2 restart reelstorm-api --update-env
curl -s http://127.0.0.1:4017/api/studio/saver-health
curl -s https://app.reelstorm.uk/api/readiness   # want object_storage pass
```

## Phase 4 — Studio Set UI

- Open `https://app.reelstorm.uk/studio-set`
- Generate plates; URLs must be `https://videos.reelstorm.uk/videos/….mp4` (not `.svg`)

## Phase 5 — GPU (next)

Wire saver → ComfyUI `:8188` / SkyReels (replace `r2-upload-placeholder`).

## Security

R2 keys were pasted into chat — **rotate** after this test (R2 → Manage R2 API Tokens → delete + recreate).
