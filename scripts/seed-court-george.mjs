#!/usr/bin/env node
/**
 * Operator seed: upload court-george pack → create Social Correction Court →
 * lock Cast / World / Voice → approve board. Prints continuity result.
 *
 * Usage:
 *   API_BASE=https://api.reelstorm.uk TOKEN=... node scripts/seed-court-george.mjs
 *   API_BASE=http://127.0.0.1:4017 OWNER_EMAIL=you@x.com node scripts/seed-court-george.mjs
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PACK = path.join(ROOT, "artifacts/cinema/court-george");
const API = (process.env.API_BASE || "http://127.0.0.1:4017").replace(/\/$/, "");
const TOKEN = process.env.TOKEN || "";
const OWNER = process.env.OWNER_EMAIL || "olabamijikola.balogun@gmail.com";

function headers(json = true) {
  const h = {};
  if (json) h["Content-Type"] = "application/json";
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  return h;
}

async function api(pathname, init = {}) {
  const res = await fetch(`${API}${pathname}`, {
    ...init,
    headers: { ...headers(!(init.body instanceof FormData)), ...init.headers },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) throw new Error(`${pathname} ${res.status}: ${JSON.stringify(data).slice(0, 400)}`);
  return data;
}

async function upload(filePath, kind, label) {
  const buf = await readFile(filePath);
  const fd = new FormData();
  const blob = new Blob([buf], {
    type: filePath.endsWith(".webp") ? "image/webp" : "image/jpeg",
  });
  fd.append("image", blob, path.basename(filePath));
  fd.append("kind", kind);
  fd.append("label", label);
  const res = await fetch(`${API}/api/cinema/assets/upload`, {
    method: "POST",
    headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`upload ${label}: ${JSON.stringify(data)}`);
  console.log("uploaded", label, data.url?.slice(0, 80));
  return data.url;
}

async function main() {
  console.log("API", API, "pack", PACK);

  const face = await upload(
    path.join(PACK, "cast/07_judge_portrait_primary.jpg"),
    "cast",
    "judge_george",
  );
  const entrance = await upload(
    path.join(PACK, "cast/06_judge_hallway_hero.jpg"),
    "cast",
    "judge_entrance",
  );

  const worldMap = {
    entrance_hall: "cast/06_judge_hallway_hero.jpg",
    court_wide: "world/01_court_wide_standing.jpg",
    bench: "world/03_bench_gavel_hero.jpg",
    from_bench: "world/08_court_from_bench.jpg",
  };

  const plates = {};
  for (const [key, rel] of Object.entries(worldMap)) {
    plates[key] = await upload(path.join(PACK, rel), "world", key);
  }

  const created = await api("/api/cinema/seasons", {
    method: "POST",
    body: JSON.stringify({
      template: "social_correction_court",
      spineId: "social_correction_court",
      title: "Social Correction Court",
      ownerEmail: OWNER,
    }),
  });
  const id = created.season.id;
  console.log("season", id);

  await api(`/api/cinema/seasons/${id}/cast/lock`, {
    method: "POST",
    body: JSON.stringify({
      characters: [
        {
          id: "char_judge_george",
          name: "Judge George",
          faceUrl: face,
          angleUrls: { front: face, entrance },
        },
      ],
    }),
  });
  console.log("cast locked");

  const worlds = (created.bible?.worlds || []).map((w) => ({
    id: w.id,
    plateKey: w.plateKey,
    plateUrl: plates[w.plateKey] || plates.court_wide,
  }));
  await api(`/api/cinema/seasons/${id}/world/lock`, {
    method: "POST",
    body: JSON.stringify({ worlds }),
  });
  console.log("world locked");

  await api(`/api/cinema/seasons/${id}/voice/lock`, {
    method: "POST",
    body: "{}",
  });
  console.log("voice locked");

  const status = await api(`/api/cinema/seasons/${id}`);
  console.log(
    "continuity",
    status.continuity?.pass ? "PASS" : "OPEN",
    status.continuity?.issues || [],
  );
  console.log("progress", status.progress);

  await api(`/api/cinema/seasons/${id}/board/approve`, {
    method: "POST",
    body: JSON.stringify({ all: true }),
  });
  console.log("board approved");

  const final = await api(`/api/cinema/seasons/${id}`);
  console.log(
    JSON.stringify(
      {
        seasonId: id,
        continuity: final.continuity,
        progress: final.progress,
        judgeFace: final.bible.characters?.[0]?.faceUrl?.slice(0, 90),
        plates: final.bible.worlds?.map((w) => ({
          id: w.id,
          locked: w.locked,
          plate: w.plateUrl?.slice(0, 70),
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
