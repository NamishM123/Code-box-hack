"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, LogIn } from "lucide-react";
import { Nav } from "@/components/Nav";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/capture` }
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen">
      <Nav />
      <section className="mx-auto flex min-h-[70vh] max-w-xl items-center px-6 py-16">
        <div className="w-full border border-white/10 bg-card/60 p-8 sm:p-10">
          <Link href="/" className="mb-10 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-ash hover:text-ink"><ArrowLeft size={14} /> Back to Sightline</Link>
          <p className="text-xs uppercase tracking-[0.22em] text-brass">Your saved spaces</p>
          <h1 className="mt-4 font-display text-5xl leading-none text-ink">Sign in to Sightline.</h1>
          <p className="mt-5 leading-relaxed text-ash">Save room captures, return to layouts, and keep your furniture shortlist in one place.</p>

          {isSupabaseConfigured ? (
            <button onClick={signInWithGoogle} disabled={loading} className="btn btn-primary mt-8 flex w-full items-center justify-center gap-3 text-xs uppercase tracking-[0.18em] disabled:opacity-60">
              <LogIn size={16} /> {loading ? "Opening Google…" : "Continue with Google"}
            </button>
          ) : (
            <div className="mt-8 border border-brass/30 bg-brass/5 p-4 text-sm leading-relaxed text-ash">
              Sign-in is being configured. The room-mapping demo remains available without an account.
            </div>
          )}
          {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
        </div>
      </section>
    </main>
  );
}
