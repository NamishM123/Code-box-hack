"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function AuthButton({ light = false }: { light?: boolean }) {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session?.user)));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) return null;
  return (
    <Link
      href={signedIn ? "/capture" : "/login"}
      className={`wordmark hidden text-[12px] uppercase tracking-[0.16em] transition-colors sm:inline ${
        light ? "text-white/70 hover:text-white" : "text-ash hover:text-ink"
      }`}
    >
      {signedIn ? "My rooms" : "Sign in"}
    </Link>
  );
}
