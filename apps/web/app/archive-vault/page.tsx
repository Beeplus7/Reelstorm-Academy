"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Block = {
  id: string;
  title: string;
  index: number;
  status: string;
  durationSec: number;
  projectId: string;
};

export default function ArchiveVaultPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [projectId, setProjectId] = useState("");
  const [uploadId, setUploadId] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  function load(pid?: string) {
    const q = pid ? `?projectId=${pid}` : "";
    api<{ blocks: Block[] }>(`/api/archive${q}`)
      .then((d) => setBlocks(d.blocks))
      .catch((e) => {
        setBlocks([]);
        setMsg((e as Error).message);
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function split() {
    if (!projectId || !uploadId) return setMsg("Need projectId + uploadId");
    setBusy(true);
    setMsg("");
    try {
      const res = await api<{ jobId: string }>("/api/archive/split", {
        method: "POST",
        body: JSON.stringify({ projectId, uploadId }),
      });
      setMsg(`Split job ${res.jobId} queued`);
      setTimeout(() => load(projectId), 1500);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-[1100px] space-y-6 forge-in">
      <div>
        <div className="mono text-[11px] text-orange mb-2">ARCHIVE VAULT // ARCHIVE5</div>
        <h1 className="display text-4xl">5-min IP blocks</h1>
        <p className="mt-3 text-white/60">
          Auto-split long uploads (30m+) into searchable, merge-ready ARCHIVE5 blocks.
        </p>
      </div>
      <div className="rounded-rs-xl border border-orange/30 bg-orange/10 px-4 py-3 text-sm text-white/75">
        <span className="mono text-[10px] text-orange mr-2">READY FOR PRODUCTION TESTING</span>
        List/refresh is live. Split needs a real Upload ID from Template Forge / upload. Then merge in{" "}
        <Link href="/merge-studio" className="text-cyan underline-offset-2 hover:underline">
          Merge Studio
        </Link>
        .
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          placeholder="Project ID"
          className="h-11 rounded-rs bg-panel border border-white/10 px-3 flex-1 min-w-[160px]"
        />
        <input
          value={uploadId}
          onChange={(e) => setUploadId(e.target.value)}
          placeholder="Upload ID"
          className="h-11 rounded-rs bg-panel border border-white/10 px-3 flex-1 min-w-[160px]"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void split()}
          className="h-11 px-5 rounded-rs bg-orange text-black font-bold text-sm disabled:opacity-40"
        >
          Split → ARCHIVE5
        </button>
        <button
          type="button"
          onClick={() => load(projectId || undefined)}
          className="h-11 px-4 rounded-rs border border-white/10 text-sm"
        >
          Refresh
        </button>
      </div>
      {msg && <div className="text-sm text-white/60">{msg}</div>}

      <div className="rounded-rs-xl border border-white/[0.08] bg-deep overflow-hidden">
        <div className="h-12 px-5 flex items-center justify-between border-b border-white/[0.06] bg-panel">
          <span className="mono text-[11px]">VAULT5</span>
          <span className="mono text-[9px] px-2 py-1 rounded-full bg-orange text-black font-bold">
            {blocks.length} BLOCKS
          </span>
        </div>
        <div className="divide-y divide-white/[0.06]">
          {blocks.length === 0 && <div className="p-8 text-white/40 text-sm">No blocks yet.</div>}
          {blocks.map((b) => (
            <div key={b.id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{b.title}</div>
                <div className="mono text-[9px] text-white/35 mt-1">
                  #{b.index} • {Math.round(b.durationSec)}s • {b.projectId.slice(0, 8)}…
                </div>
              </div>
              <span
                className={`mono text-[9px] px-2 py-1 rounded-full border ${
                  b.status === "ARCHIVED"
                    ? "bg-cyan/20 text-cyan border-cyan/30"
                    : b.status === "RENDERING"
                      ? "bg-orange/20 text-orange border-orange/30"
                      : "border-white/10 text-white/40"
                }`}
              >
                {b.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
