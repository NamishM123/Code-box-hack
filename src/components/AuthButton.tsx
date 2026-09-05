"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function AuthButton() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session?.user)));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) return null;
  return <Link href={signedIn ? "/capture" : "/login"} className="hidden text-xs uppercase tracking-[0.18em] text-ash hover:text-paper sm:inline">{signedIn ? "My rooms" : "Sign in"}</Link>;
}
