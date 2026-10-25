#!/usr/bin/env node
/**
 * Turn Meta AI motion + locked season into a real cold-open master.
 *
 * Beat map (walk-in → assembly → seat/gavel energy):
 *   ep1_s01  hallway / doors push-in
 *   ep1_s02  judge walk / face lock (stand energy until jury Seedance)
 *   ep1_s03  AQNk walk to bench
 *   ep1_s04  AQNk reused as gavel-adjacent (or regenerate with Seedance later)
 *
 * Usage:
 *   API_BASE=https://app.reelstorm.uk SEASON_ID=cmvnbjt7z000yjxbju5avitny \
 *     OWNER_EMAIL=you@x.com node scripts/assemble-court-coldopen.mjs
 *
 * Optional: ENGINE=seedance to re-shoot missing beats with I2V after attach.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const META = path.join(ROOT, "artifacts/cinema/court-george/motion/meta");
const API = (process.env.API_BASE || "https://app.reelstorm.uk").replace(/\/$/, "");
const TOKEN = process.env.TOKEN || "";
const OWNER = process.env.OWNER_EMAIL || "olabamijikola.balogun@gmail.com";
const SEASON_ID = process.env.SEASON_ID || "";
const ENGINE = process.env.ENGINE || "attach"; // attach | seedance

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
  if (!res.ok) throw new Error(`${pathname} ${res.status}: ${JSON.stringify(data).slice(0, 500)}`);
  return data;
}

async function uploadVideo(filePath, label) {
  const buf = await readFile(filePath);
  const fd = new FormData();
  fd.append("video", new Blob([buf], { type: "video/mp4" }), path.basename(filePath));
  fd.append("label", label);
  const res = await fetch(`${API}/api/cinema/assets/upload-video`, {
    method: "POST",
    headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`upload ${label}: ${JSON.stringify(data)}`);
  console.log("uploaded", label, data.url);
  return data.url;
}

async function main() {
  let seasonId = SEASON_ID;
  if (!seasonId) {
    const created = await api("/api/cinema/seasons", {
      method: "POST",
      body: JSON.stringify({
        template: "social_correction_court",
        spineId: "social_correction_court",
        title: "Social Correction Court · Cold Open",
        ownerEmail: OWNER,
      }),
    });
    seasonId = created.season.id;
    console.log("created season", seasonId);
  }

  const hallway = await uploadVideo(path.join(META, "01_hallway_entrance.mp4"), "ep1_s01_hallway");
  const face = await uploadVideo(path.join(META, "03_judge_face_ref.mp4"), "ep1_s02_face");
  const toBench = await uploadVideo(path.join(META, "AQNk.mp4"), "ep1_s03_to_bench");

  await api(`/api/cinema/seasons/${seasonId}/clips/attach`, {
    method: "POST",
    body: JSON.stringify({
      clips: [
        { stillId: "ep1_s01", videoUrl: hallway, engine: "meta-ai" },
        { stillId: "ep1_s02", videoUrl: face, engine: "meta-ai" },
        { stillId: "ep1_s03", videoUrl: toBench, engine: "meta-ai" },
        // s04: same clip end-energy until Seedance gavel — attach for continuous cut
        { stillId: "ep1_s04", videoUrl: toBench, engine: "meta-ai" },
      ],
    }),
  });
  console.log("clips attached");

  if (ENGINE === "seedance") {
    console.log("Seedance re-shoot (overwrites Meta where I2V succeeds)…");
    const shot = await api(`/api/cinema/seasons/${seasonId}/shoot`, {
      method: "POST",
      body: JSON.stringify({ engine: "seedance", skipRtc: true }),
    });
    console.log("shoot", shot.shotSummary);
  }

  const cut = await api(`/api/cinema/seasons/${seasonId}/cut`, {
    method: "POST",
    body: JSON.stringify({ skipRtc: true }),
  });
  console.log(
    JSON.stringify(
      {
        seasonId,
        masterUrl: cut.masterUrl,
        cliffhanger: cut.cliffhanger,
        note: "Real Meta AI motion cut — jury-stand + sit + clean gavel still need Seedance I2V from locked stills",
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
