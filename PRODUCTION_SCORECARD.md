# REELSTORM ACADEMY OS — Production Build Scorecard

**Version:** v1.6.2 (Studio Set + World Builder — ready for production testing)  
**Live UI:** `/scorecard` · `/studio-set` · `/world-builder`  
**Artifact view:** [`artifacts/project-scorecard.html`](artifacts/project-scorecard.html) — full scorecard + architecture + system tiers (A/B/C/infra)  
**API probe:** `GET /api/readiness` → `production1k`  
**Git:** `Beeplus7/Reelstorm-Academy` `main`  
**Live deploy:** **LIVE** on `app.reelstorm.uk`  
**Production testing:** **READY** — live E2E verified 2026-10-10 (seed → plates → imagery → Apply; World Builder soul/room)

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
**Ready for production testing** of the lock flow + readiness + Apply to Director.  
**Not** ship-ready photoreal imagery yet.

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
