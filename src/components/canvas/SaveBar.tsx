"use client";
import { useState } from "react";
import { Check, Copy, Save, X } from "lucide-react";

export function SaveDialog({ defaultName, shareUrl, onSave, onClose }: {
  defaultName: string;
  shareUrl: string;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(defaultName);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-6">
      <div className="absolute inset-0 bg-ink/80" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-rule/40 bg-ink p-6">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-brass">Save room</div>
            <div className="font-display text-3xl">Name this plan</div>
          </div>
          <button onClick={onClose} className="rounded-full border border-rule/40 p-2 hover:border-brass"><X className="h-4 w-4" /></button>
        </div>

        <label className="block">
          <div className="text-[10px] uppercase tracking-[0.2em] text-ash">Room name</div>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && onSave(name.trim())}
            className="mt-2 w-full rounded-md border border-rule/40 bg-transparent px-3 py-3 text-lg outline-none focus:border-brass"
          />
        </label>

        <div className="divider my-6" />

        <div className="text-[10px] uppercase tracking-[0.2em] text-brass">Share link</div>
        <p className="mt-1 text-[12px] text-ash">The whole plan is encoded in the URL. No account, no server copy.</p>
        <div className="mt-3 flex gap-2">
          <input readOnly value={shareUrl} className="flex-1 truncate rounded-md border border-rule/40 bg-transparent px-3 py-2 font-mono text-[11px] text-ash outline-none" />
          <button onClick={copy} className="btn btn-brass whitespace-nowrap text-xs">
            {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
          </button>
        </div>

        <div className="mt-7 flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => name.trim() && onSave(name.trim())}>
            <Save className="h-3.5 w-3.5" /> Save to this browser
          </button>
        </div>
      </div>
    </div>
  );
}
