"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { api, getApiBase } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Progress = {
  stage: string;
  pct: number;
  castLocked: boolean;
  worldLocked: boolean;
  voiceLocked: boolean;
  boardApproved: boolean;
  shotReady: boolean;
  cutReady: boolean;
};

type Bible = {
  title: string;
  spine: string;
  logline: string;
  characters: Array<{
    id: string;
    name: string;
    role: string;
    faceUrl?: string;
    voiceId?: string;
    locked: boolean;
    wardrobeDay0?: string;
    angleUrls?: { front?: string; threeQuarter?: string; entrance?: string };
  }>;
  worlds: Array<{
    id: string;
    name: string;
    description: string;
    plateKey?: string;
    plateUrl?: string;
    locked: boolean;
  }>;
  episodes: Array<{
    index: number;
    title: string;
    synopsis: string;
    cliffhanger: string;
    status: string;
    masterUrl?: string;
    stills: Array<{
      id: string;
      prompt: string;
      dialogue?: string;
      stillUrl?: string;
      approved: boolean;
      framing: string;
      durationSec: number;
    }>;
    clips: Array<{ stillId: string; status: string; videoUrl?: string; engine?: string; error?: string }>;
  }>;
};

const STEPS = [
  { id: "cast", label: "Cast" },
  { id: "world", label: "World" },
  { id: "voice", label: "Voice" },
  { id: "board", label: "Board" },
  { id: "shoot", label: "Shoot" },
  { id: "cut", label: "Cut" },
] as const;

const WORLD_PLATE_LABELS: Record<string, string> = {
  entrance_hall: "Entrance hall",
  court_wide: "Court wide",
  bench: "Bench hero",
  from_bench: "From the bench",
};

async function uploadCinemaAsset(file: File, kind: string, label: string) {
  const fd = new FormData();
  fd.append("image", file);
  fd.append("kind", kind);
  fd.append("label", label);
  const token = typeof window !== "undefined" ? localStorage.getItem("rs_access_token") : null;
  const res = await fetch(`${getApiBase()}/api/cinema/assets/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Upload failed ${res.status}`);
  return data as { url: string };
}

export default function CinemaPage() {
  useAuth();
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [bible, setBible] = useState<Bible | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [masterUrl, setMasterUrl] = useState<string | null>(null);
  const [continuity, setContinuity] = useState<{ pass: boolean; issues: string[] } | null>(null);
  const [rtcInfo, setRtcInfo] = useState<{ shoot: number; cut: number } | null>(null);
  const [judgeFaceUrl, setJudgeFaceUrl] = useState<string | null>(null);
  const [judgeEntranceUrl, setJudgeEntranceUrl] = useState<string | null>(null);
  const [worldPlates, setWorldPlates] = useState<Record<string, string>>({});

  const refresh = useCallback(async (id: string) => {
    const data = await api<{
      bible: Bible;
      progress: Progress;
      continuity?: { pass: boolean; issues: string[] };
      rtc?: { shoot: number; cut: number };
    }>(`/api/cinema/seasons/${id}`);
    setBible(data.bible);
    setProgress(data.progress);
    setContinuity(data.continuity || null);
    setRtcInfo(data.rtc || null);
    setMasterUrl(data.bible.episodes?.[0]?.masterUrl || null);
    const judge = data.bible.characters.find((c) => c.id === "char_judge_george" || c.role === "lead_a");
    if (judge?.faceUrl) setJudgeFaceUrl(judge.faceUrl);
    if (judge?.angleUrls?.entrance) setJudgeEntranceUrl(judge.angleUrls.entrance);
    const plates: Record<string, string> = {};
    for (const w of data.bible.worlds) {
      if (w.plateKey && w.plateUrl) plates[w.plateKey] = w.plateUrl;
    }
    if (Object.keys(plates).length) setWorldPlates(plates);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const list = await api<{ seasons: Array<{ id: string; spine?: string }> }>("/api/cinema/seasons");
        const court = list.seasons?.find((s) => s.spine === "social_correction_court") || list.seasons?.[0];
        if (court) {
          setSeasonId(court.id);
          await refresh(court.id);
        }
      } catch {
        /* empty */
      }
    })();
  }, [refresh]);

  async function createCourt() {
    setBusy(true);
    setMsg(null);
    try {
      const data = await api<{ season: { id: string }; bible: Bible; progress: Progress }>(
        "/api/cinema/seasons",
        {
          method: "POST",
          body: JSON.stringify({
            template: "social_correction_court",
            spineId: "social_correction_court",
            title: "Social Correction Court",
          }),
        },
      );
      setSeasonId(data.season.id);
      setBible(data.bible);
      setProgress(data.progress);
      setJudgeFaceUrl(null);
      setJudgeEntranceUrl(null);
      setWorldPlates({});
      setMsg("Social Correction Court created — upload Judge George + court plates, then Lock Cast/World.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onJudgeUpload(file: File | null, which: "face" | "entrance") {
    if (!file) return;
    setBusy(true);
    try {
      const { url } = await uploadCinemaAsset(file, "cast", which === "face" ? "judge_george" : "judge_entrance");
      if (which === "face") setJudgeFaceUrl(url);
      else setJudgeEntranceUrl(url);
      setMsg(`Uploaded Judge ${which}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onWorldUpload(file: File | null, plateKey: string) {
    if (!file) return;
    setBusy(true);
    try {
      const { url } = await uploadCinemaAsset(file, "world", plateKey);
      setWorldPlates((p) => ({ ...p, [plateKey]: url }));
      setMsg(`Uploaded plate · ${WORLD_PLATE_LABELS[plateKey] || plateKey}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function lockCast() {
    if (!seasonId) return;
    setBusy(true);
    setMsg(null);
    try {
      const leadId = bible?.characters.find((c) => c.role === "lead_a")?.id || "char_judge_george";
      const data = await api<{
        bible: Bible;
        progress: Progress;
        continuity?: { pass: boolean; issues: string[] };
      }>(`/api/cinema/seasons/${seasonId}/cast/lock`, {
        method: "POST",
        body: JSON.stringify({
          characters: [
            {
              id: leadId,
              name: "Judge George",
              faceUrl: judgeFaceUrl || undefined,
              angleUrls: {
                front: judgeFaceUrl || undefined,
                entrance: judgeEntranceUrl || undefined,
              },
            },
          ],
        }),
      });
      setBible(data.bible);
      setProgress(data.progress);
      setContinuity(data.continuity || null);
      setMsg("Cast locked · Judge George");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function lockWorld() {
    if (!seasonId) return;
    setBusy(true);
    setMsg(null);
    try {
      const worlds = (bible?.worlds || []).map((w) => ({
        id: w.id,
        plateKey: w.plateKey,
        plateUrl: (w.plateKey && worldPlates[w.plateKey]) || w.plateUrl,
      }));
      const data = await api<{
        bible: Bible;
        progress: Progress;
        continuity?: { pass: boolean; issues: string[] };
      }>(`/api/cinema/seasons/${seasonId}/world/lock`, {
        method: "POST",
        body: JSON.stringify({ worlds }),
      });
      setBible(data.bible);
      setProgress(data.progress);
      setContinuity(data.continuity || null);
      setMsg("World locked · court plates");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function lock(kind: "voice") {
    if (!seasonId) return;
    setBusy(true);
    try {
      const data = await api<{
        bible: Bible;
        progress: Progress;
        continuity?: { pass: boolean; issues: string[] };
      }>(`/api/cinema/seasons/${seasonId}/voice/lock`, { method: "POST", body: "{}" });
      setBible(data.bible);
      setProgress(data.progress);
      setContinuity(data.continuity || null);
      setMsg("Voice locked");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function approveAll() {
    if (!seasonId) return;
    setBusy(true);
    try {
      const data = await api<{
        bible: Bible;
        progress: Progress;
        rtcRequiredToShoot?: number;
      }>(`/api/cinema/seasons/${seasonId}/board/approve`, {
        method: "POST",
        body: JSON.stringify({ all: true }),
      });
      setBible(data.bible);
      setProgress(data.progress);
      setMsg(
        `Board approved${data.rtcRequiredToShoot ? ` · ${data.rtcRequiredToShoot} RTC to shoot` : ""}`,
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function shoot(engine: "seedance" | "kenburns" = "seedance") {
    if (!seasonId) return;
    setBusy(true);
    setMsg(
      engine === "seedance"
        ? "Shooting real motion (Seedance I2V from locked stills)… may take several minutes"
        : "Shooting Ken Burns fallback…",
    );
    try {
      const data = await api<{
        bible: Bible;
        progress: Progress;
        continuity?: { pass: boolean; issues: string[] };
        shotSummary?: {
          ready: number;
          total: number;
          qcPass?: number;
          rtcCharged?: number;
          enginePref?: string;
        };
      }>(`/api/cinema/seasons/${seasonId}/shoot`, {
        method: "POST",
        body: JSON.stringify({ quick: false, engine }),
      });
      setBible(data.bible);
      setProgress(data.progress);
      setContinuity(data.continuity || null);
      setMsg(
        `Shoot · ${data.shotSummary?.ready}/${data.shotSummary?.total} · engine ${data.shotSummary?.enginePref || engine} · QC ${data.shotSummary?.qcPass ?? "—"}`,
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function attachMetaClip(stillId: string, file: File | null) {
    if (!seasonId || !file) return;
    setBusy(true);
    setMsg(`Uploading motion for ${stillId}…`);
    try {
      const fd = new FormData();
      fd.append("video", file);
      fd.append("label", stillId);
      const token = typeof window !== "undefined" ? localStorage.getItem("rs_access_token") : null;
      const up = await fetch(`${getApiBase()}/api/cinema/assets/upload-video`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const uploaded = await up.json();
      if (!up.ok) throw new Error(uploaded?.error || "video upload failed");
      const data = await api<{ bible: Bible; progress: Progress }>(
        `/api/cinema/seasons/${seasonId}/clips/attach`,
        {
          method: "POST",
          body: JSON.stringify({
            clips: [{ stillId, videoUrl: uploaded.url, engine: "meta-ai" }],
          }),
        },
      );
      setBible(data.bible);
      setProgress(data.progress);
      setMsg(`Attached Meta clip → ${stillId}. Cut when all shots ready.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function cut() {
    if (!seasonId) return;
    setBusy(true);
    try {
      const data = await api<{ bible: Bible; progress: Progress; masterUrl: string; cliffhanger: string }>(
        `/api/cinema/seasons/${seasonId}/cut`,
        { method: "POST", body: "{}" },
      );
      setBible(data.bible);
      setProgress(data.progress);
      setMasterUrl(data.masterUrl);
      setMsg(`Master · ${data.cliffhanger}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const ep = bible?.episodes?.[0];
  const plateKeysFromBible = (bible?.worlds || [])
    .map((w) => w.plateKey)
    .filter((k): k is string => Boolean(k));
  const plateKeys =
    plateKeysFromBible.length > 0
      ? plateKeysFromBible
      : ["entrance_hall", "court_wide", "bench", "from_bench"];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <header className="space-y-2">
        <div className="mono text-[10px] text-cyan tracking-[0.16em]">CINEMA · SOCIAL CORRECTION COURT</div>
        <h1 className="display text-3xl md:text-4xl">REELSTORM CINEMA</h1>
        <p className="text-white/60 text-sm max-w-2xl">
          Lock Judge George + Afro-Baroque court from your stills. Cast · World · Voice · Board · Shoot · Cut.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={createCourt}
          className="px-4 py-2.5 rounded-rs bg-violet/90 hover:bg-violet text-sm font-semibold"
        >
          New Social Correction Court
        </button>
        <Link href="/dashboard" className="px-4 py-2.5 rounded-rs border border-white/10 text-sm text-white/60">
          Factory Mode
        </Link>
      </div>

      {progress ? (
        <div className="rounded-rs border border-white/10 bg-panel/80 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="mono text-[10px] text-white/50">PROGRESS · {progress.stage}</span>
            <span className="text-cyan font-semibold">{progress.pct}%</span>
          </div>
          <div className="flex flex-wrap gap-3 text-[11px] text-white/55 mb-3">
            {rtcInfo ? (
              <span>
                RTC shoot {rtcInfo.shoot} · cut {rtcInfo.cut}
              </span>
            ) : null}
            {continuity ? (
              <span className={continuity.pass ? "text-cyan" : "text-orange"}>
                Continuity {continuity.pass ? "PASS" : `OPEN (${continuity.issues.length})`}
              </span>
            ) : null}
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet to-cyan" style={{ width: `${progress.pct}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-2">
            {STEPS.map((s) => {
              const ok =
                (s.id === "cast" && progress.castLocked) ||
                (s.id === "world" && progress.worldLocked) ||
                (s.id === "voice" && progress.voiceLocked) ||
                (s.id === "board" && progress.boardApproved) ||
                (s.id === "shoot" && progress.shotReady) ||
                (s.id === "cut" && progress.cutReady);
              return (
                <div
                  key={s.id}
                  className={clsx(
                    "rounded-lg border px-2 py-2 text-center text-xs",
                    ok ? "border-cyan/40 bg-cyan/10 text-cyan" : "border-white/10 text-white/40",
                  )}
                >
                  {s.label}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {bible ? (
        <div className="grid lg:grid-cols-2 gap-4">
          <section className="rounded-rs border border-white/10 p-4 space-y-4">
            <div>
              <h2 className="display text-lg">{bible.title}</h2>
              <p className="text-sm text-white/65 mt-1">{bible.logline}</p>
              <p className="mono text-[10px] text-orange mt-2">SPINE · {bible.spine}</p>
            </div>

            <div className="space-y-2 border-t border-white/10 pt-3">
              <div className="mono text-[10px] text-cyan">CAST · JUDGE GEORGE</div>
              <label className="block text-xs text-white/50">
                Primary portrait (Image 7)
                <input
                  type="file"
                  accept="image/*"
                  disabled={busy}
                  className="mt-1 block w-full text-xs"
                  onChange={(e) => onJudgeUpload(e.target.files?.[0] || null, "face")}
                />
              </label>
              {judgeFaceUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={judgeFaceUrl} alt="Judge" className="w-28 h-40 object-cover rounded-lg" />
              ) : null}
              <label className="block text-xs text-white/50">
                Entrance / wardrobe angle (optional)
                <input
                  type="file"
                  accept="image/*"
                  disabled={busy}
                  className="mt-1 block w-full text-xs"
                  onChange={(e) => onJudgeUpload(e.target.files?.[0] || null, "entrance")}
                />
              </label>
              <button
                type="button"
                disabled={busy || !judgeFaceUrl}
                onClick={lockCast}
                className="px-3 py-1.5 rounded-[10px] border border-white/12 bg-white/[0.04] text-xs disabled:opacity-40"
              >
                1 · Lock Cast
              </button>
            </div>

            <div className="space-y-2 border-t border-white/10 pt-3">
              <div className="mono text-[10px] text-cyan">WORLD · COURT PLATES</div>
              {plateKeys.map((key) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="flex-1 text-xs text-white/50">
                    {WORLD_PLATE_LABELS[key] || key}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={busy}
                      className="mt-1 block w-full text-xs"
                      onChange={(e) => onWorldUpload(e.target.files?.[0] || null, key)}
                    />
                  </label>
                  {worldPlates[key] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={worldPlates[key]} alt={key} className="w-14 h-20 object-cover rounded" />
                  ) : null}
                </div>
              ))}
              <button
                type="button"
                disabled={busy}
                onClick={lockWorld}
                className="px-3 py-1.5 rounded-[10px] border border-white/12 bg-white/[0.04] text-xs"
              >
                2 · Lock World
              </button>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => lock("voice")}
                className="px-3 py-1.5 rounded-[10px] border border-white/12 text-xs"
              >
                3 · Lock Voice
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={approveAll}
                className="px-3 py-1.5 rounded-[10px] border border-white/12 text-xs"
              >
                4 · Approve Board
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => shoot("seedance")}
                className="px-3 py-1.5 rounded-[10px] border border-cyan/35 text-cyan text-xs"
              >
                5 · Shoot real motion (Seedance)
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => shoot("kenburns")}
                className="px-3 py-1.5 rounded-[10px] border border-white/12 text-xs text-white/50"
              >
                Shoot Ken Burns only
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={cut}
                className="px-3 py-1.5 rounded-[10px] border border-cyan/35 text-cyan text-xs"
              >
                6 · Cut master
              </button>
            </div>
            <div className="space-y-2 border-t border-white/10 pt-3">
              <div className="mono text-[10px] text-cyan">IMPORT META AI CLIPS (walk-in → stand → seat → gavel)</div>
              <p className="text-[11px] text-white/45">
                Attach your Meta MP4s to each beat, then Cut. Or leave empty and Seedance will animate locked
                stills.
              </p>
              {(ep?.stills || []).map((s) => (
                <label key={s.id} className="block text-xs text-white/50">
                  {s.id} · {s.dialogue || s.prompt.slice(0, 48)}…
                  <input
                    type="file"
                    accept="video/mp4,video/*"
                    disabled={busy}
                    className="mt-1 block w-full text-xs"
                    onChange={(e) => attachMetaClip(s.id, e.target.files?.[0] || null)}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-rs border border-white/10 p-4 space-y-3">
            <h3 className="display text-base">Ep1 · {ep?.title}</h3>
            <p className="text-sm text-white/60">{ep?.synopsis}</p>
            <p className="text-xs text-orange/90">Cliffhanger: {ep?.cliffhanger}</p>
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {ep?.stills.map((s) => {
                const clip = ep.clips.find((c) => c.stillId === s.id);
                return (
                  <div key={s.id} className="flex gap-3 rounded-lg border border-white/10 p-2">
                    {s.stillUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.stillUrl} alt="" className="w-16 h-28 object-cover rounded" />
                    ) : (
                      <div className="w-16 h-28 bg-white/5 rounded" />
                    )}
                    <div className="flex-1 text-xs space-y-1">
                      <div className="font-medium">{s.dialogue || s.prompt.slice(0, 90)}</div>
                      <div className="text-white/40">
                        {s.framing} · {s.durationSec}s · {s.approved ? "approved" : "pending"}
                      </div>
                      {clip ? (
                        <div className="text-cyan/80">
                          {clip.status}
                          {clip.engine ? ` · ${clip.engine}` : ""}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            {masterUrl ? (
              <div className="pt-2 space-y-2">
                <div className="mono text-[10px] text-cyan">MASTER</div>
                <video src={masterUrl} controls className="w-full max-h-96 rounded-lg bg-black" />
                <a href={masterUrl} target="_blank" rel="noreferrer" className="text-sm text-cyan underline">
                  Open master
                </a>
              </div>
            ) : null}
          </section>
        </div>
      ) : (
        <div className="rounded-rs border border-dashed border-white/15 p-10 text-center text-white/50">
          Create <strong className="text-white/80">Social Correction Court</strong>, then upload Judge George
          portrait + court plates.
        </div>
      )}

      {msg ? <p className="text-sm text-white/70 border-t border-white/10 pt-4">{msg}</p> : null}
    </div>
  );
}
