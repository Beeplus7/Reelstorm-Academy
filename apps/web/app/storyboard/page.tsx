"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Frame = { id: string; shotIndex: number; prompt: string | null; approved: boolean };

export default function StoryboardPage() {
  const [projectId, setProjectId] = useState("");
  const [frames, setFrames] = useState<Frame[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function generate() {
    if (!projectId.trim()) return setMsg("Project ID required");
    setBusy(true);
    setMsg("");
    try {
      const { frames: f } = await api<{ frames: Frame[] }>("/api/storyboard/generate", {
        method: "POST",
        body: JSON.stringify({ projectId: projectId.trim() }),
      });
      setFrames(f);
      setMsg(`Board ready — ${f.length} shots. Approve frames before Studio.`);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function approve(id: string) {
    try {
      await api(`/api/storyboard/${id}/approve`, { method: "POST" });
      setFrames((prev) => prev.map((f) => (f.id === id ? { ...f, approved: true } : f)));
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <div className="max-w-[1100px] space-y-6 forge-in">
      <div>
        <div className="mono text-[11px] text-cyan mb-2">STORYBOARD // FIRST FRAME LOCK</div>
        <h1 className="display text-4xl">Lock the first frames</h1>
        <p className="mt-3 text-white/60">If the first frame is wrong, everything is wrong.</p>
      </div>
      <div className="rounded-rs-xl border border-orange/30 bg-orange/10 px-4 py-3 text-sm text-white/75">
        <span className="mono text-[10px] text-orange mr-2">READY FOR PRODUCTION TESTING</span>
        Needs a project with a <strong className="text-white/90">script</strong> (PATCH /api/projects/:id). Prefer{" "}
        <Link href="/studio-set" className="text-cyan underline-offset-2 hover:underline">
          Studio Set Apply
        </Link>{" "}
        first. Soft-launch boards may use LLM/fallback shot prompts.
      </div>
      <div className="flex gap-2">
        <input
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          placeholder="Project ID"
          className="h-11 flex-1 rounded-rs bg-panel border border-white/10 px-3"
        />
        <button
          type="button"
          onClick={() => void generate()}
          disabled={busy || !projectId}
          className="h-11 px-5 rounded-rs bg-cyan text-black font-bold text-sm disabled:opacity-40"
        >
          {busy ? "Generating…" : "Generate Board"}
        </button>
      </div>
      {msg && <div className="text-sm text-white/65 border border-white/10 rounded-rs px-4 py-3 bg-panel">{msg}</div>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {frames.map((f) => (
          <div key={f.id} className="rounded-rs border border-white/[0.08] bg-deep p-3">
            <div className="aspect-video rounded-[12px] bg-void border border-white/10 grid place-items-center mono text-[10px] text-white/30">
              SHOT {f.shotIndex + 1}
            </div>
            <p className="mt-2 text-xs text-white/70 line-clamp-2">{f.prompt}</p>
            <button
              onClick={() => approve(f.id)}
              disabled={f.approved}
              className={`mt-3 w-full h-9 rounded-[12px] text-xs font-bold ${f.approved ? "bg-cyan/20 text-cyan" : "bg-orange text-black"}`}
            >
              {f.approved ? "LOCKED" : "Approve Frame"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
