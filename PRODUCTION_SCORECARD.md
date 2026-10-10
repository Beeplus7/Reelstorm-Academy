# REELSTORM ACADEMY OS — Production Build Scorecard

**Version:** v1.6.5 (Cloudflare R2 public CDN · videos.reelstorm.uk live)  
**Live UI:** `/` · `/scorecard` · `/studio-set` · `/world-builder` · `/storyboard` · `/studio` · `/sound-studio` · `/archive-vault` · `/merge-studio`  
**Artifact view:** [`artifacts/project-scorecard.html`](artifacts/project-scorecard.html) — full scorecard + architecture + system tiers (A/B/C/infra)  
**API probe:** `GET /api/readiness` → `production1k` (**C** ~72% — still blocks on VPS `S3_*` + `video_gen`)  
**Git:** `Beeplus7/Reelstorm-Academy` `main`  
**Live deploy:** **LIVE** on `app.reelstorm.uk` / `reelstorm.uk` · media CDN `videos.reelstorm.uk`  
**Cloudflare:** zone `reelstorm.uk` active (`lauryn`/`mark` NS) · account `b006c0d60f24fcc912e6b96450ffa0ef`  
**Production testing:** Pipeline rooms marked below — soft-launch OK unless noted  
**R2 checklist:** [`docs/PRODUCTION_1K_CLOUDFLARE_CHECKLIST.md`](docs/PRODUCTION_1K_CLOUDFLARE_CHECKLIST.md)

### Pipeline production-test matrix (2026-10-11)

| Surface | Status | Notes |
|---------|--------|-------|
| Landing `/` | **READY** | Hero Studio Set layer · Lock Studio Set CTA · pipeline infographic |
| Studio Set `/studio-set` | **READY** | E2E seed→Apply 100%; plates still SVG until GPU wire |
| World Builder `/world-builder` | **READY** | Soul/Room + deep-link |
| Storyboard `/storyboard` | **READY** | Needs project **script**; generate+approve E2E |
| Studio `/studio` | **READY** | Queues `/api/generate` / `POST /api/studio/generate` |
| Sound Studio `/sound-studio` | **READY** | Library + demo bed; ElevenLabs optional |
| Archive Vault `/archive-vault` | **READY** | List live; split needs uploadId |
| Merge Studio `/merge-studio` | **READY** | Queue live; needs vault blockIds |
| `/generate` RunPod saver | **READY** | Pod `xuvnute4l51iog` · `r2_ok:true` · `mode:REAL` · public saver-health 200 |
| Cloudflare R2 CDN | **READY** | Buckets + CORS + custom domain; public MP4 `HTTP/2 200` |
| Ship-ready video/R2 (gate) | **PARTIAL** | CDN live; VPS readiness still fails `object_storage` (MinIO `S3_*`) + `video_gen` (no Seedance key); engine=`r2-upload-placeholder` until Comfy/SkyReels |

### Cloudflare / R2 probe (2026-10-11 ~00:26 UTC+1)

| Check | Result |
|-------|--------|
| Zone NS | ✅ `lauryn.ns.cloudflare.com` / `mark.ns.cloudflare.com` |
| Custom domain | ✅ `videos.reelstorm.uk` → `reelstorm-videos` (Wrangler; ownership active) |
| Public object | ✅ `curl -I …/videos/0b38629b….mp4` → **200** `video/mp4` 8224 B |
| CORS | ✅ `app.reelstorm.uk` + `reelstorm.uk` (+ localhost) GET/HEAD |
| Buckets | ✅ `reelstorm-videos` · `reelstorm-weights` |
| Saver health | ✅ `https://app.reelstorm.uk/api/studio/saver-health` → `r2_ok:true` |
| VPS `S3_*` → R2 | ❌ still `http://127.0.0.1:9000` on readiness (`prod_object_storage` fail) |

## Gaps closed in v1.6.5

| Gap | Fix |
|-----|-----|
| `videos.reelstorm.uk` NXDOMAIN | Zone on Cloudflare; R2 custom domain via `wrangler r2 bucket domain add` |
| Dashboard Custom Domain Add button dead | Wrangler CLI path with zone `2a22fb6ea7210b7769408cfde6cd204c` |
| R2 “empty bucket” false alarm | API list confirmed objects under `videos/`; public CDN serves them |
| No CORS on `reelstorm-videos` | S3 `PutBucketCors` for app + marketing origins |
| RunPod saver R2 path unverified | Live generate `real_r2:true` + public MP4 200 |

## Gaps closed in v1.6.4

| Gap | Fix |
|-----|-----|
| Marketing hero still said WORLD / GPU only | Hero SET frames · Room·Artist·Imagery copy · CTA → `/studio-set` |
| Pipeline infographic WORLD stub | Step 02 = **STUDIO SET**; landing Studio Set section |
| Scorecard silent on marketing surface | Static row `landingHero` pass |

## Gaps closed in v1.6.3

| Gap | Fix |
|-----|-----|
| Rest of factory untested vs Studio Set | Live API E2E + UI banners + STORM Guide for Storyboard→Merge |
| Silent Storyboard/Archive/Merge errors | try/catch + operator messages |
| Scorecard silent on pipeline | Static rows for storyboard/studio/sound/archive-merge + RunPod partial |

## Gaps closed in v1.6.2

| Gap | Fix |
|-----|-----|
| Studio Set / World Builder untested on live | Live E2E on `app.reelstorm.uk` — Courtroom seed 100% ready → Apply to Director |
| World Builder 500 on bad projectId | API returns 404; UI try/catch + busy states |
| Scorecard overstated / understated deploy | Scorecard marks both surfaces **READY FOR PRODUCTION TESTING** (soft-launch plates) |

## Gaps closed in v1.6.1

| Gap | Fix |
|-----|-----|
| Artist plates stuck on `pending` | `POST /api/studio-set/artists/:id/generate` + UI Generate + auto-gen on manual import |
| Imagery created duplicate packs | Imagery upsert + refresh **all** room plates from customized prompt |
| No plate preview in UI | `PlateCell` thumbs for Room/Artist when URL exists |
| Weak World Builder handoff | `/studio-set?projectId=` deep-link |

## Gaps closed in v1.6

| Gap | Fix |
|-----|-----|
| World Builder stub plates only | Full Studio Set — Room · Artist · Imagery |
| No multi-angle courtroom / set design | Courtroom Drama seed pack + prompt plate generate |
| No artist import from URL | `POST /api/studio-set/artists/import` (image/video) |
| Weak Director feed | Apply to Director → Soul + RoomPlate + Blueprint.worldBible.studioSet |
| No camera coach for amateurs | STORM Guide layers on `/studio-set` |

## Soft-launch note (Studio Set)

Plates are SVG / URL-stamped placeholders until real still gen (RunPod / Comfy).  
RunPod can already upload real (placeholder-frame) MP4s to R2 at `https://videos.reelstorm.uk/videos/….mp4`.  
**Ready for production testing** of the lock flow + readiness + Apply to Director + R2 playback URL.  
**Not** ship-ready photoreal / SkyReels cinematic yet — wire Comfy next; flip VPS `S3_*` to R2 for readiness grade.

### Manual test checklist

1. Create project → copy ID  
2. `/studio-set` → Load / Seed Courtroom → readiness green  
3. Artist Generate · Imagery save (refreshes rooms)  
4. Apply to Director (or Force soft launch)  
5. Optional: `/world-builder` quick Soul/Room, then Open Studio Set

## Gaps closed in v1.5

| Gap | Fix |
|-----|-----|
| Smoke + production API scripts PARTIAL | `scripts/smoke.sh` full live probes · `check-production-apis.sh` offline + `--live` |

## Gaps closed in v1.4

| Gap | Fix |
|-----|-----|
| Template Forge stuck at 0% | VPS `apt install ffmpeg` + ffprobe path wiring |
| Redis DB 17 out of range | `databases 32` in redis.conf |
| Forge buttons / WS dead | Same-origin `getApiBase` / `getWsBase` + nginx `/ws/` |
| Scorecard offline on app host | Scorecard uses `getApiBase()` not hard-coded api DNS |
| No 1k visibility | Production 1k gate panel + blocking chips |

## Gaps closed in v1.3

| Gap | Fix |
|-----|-----|
| No 1k API gate | `packages/domain/src/production.ts` + readiness `production1k` |
| Mock video forced on VPS | `MOCK_VIDEO_GEN=0` in deploy + stamp script |
| Worker scale | `WORKER_CONCURRENCY=8` (prod default) |
| MinIO-only storage | S3/R2 probe; docs for Cloudflare R2 |
| Stripe webhook path | nginx `/api/` proxy on app host |

## Launch (production 1k)

```bash
bash scripts/stamp-production-1k-env.sh
# fill DASHSCOPE_API_KEY, ELEVENLABS_API_KEY, sk_live_*, R2 S3_*
npm run check:apis
npm run check:apis:live
API_URL=https://app.reelstorm.uk WEB_URL=https://app.reelstorm.uk npm run smoke
curl -sS https://app.reelstorm.uk/api/readiness | jq .production1k
```

See [docs/PRODUCTION_APIS_1K.md](docs/PRODUCTION_APIS_1K.md).
