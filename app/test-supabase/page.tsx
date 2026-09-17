"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TestSupabasePage() {
  const [status, setStatus] = useState("Probando conexión...");

  useEffect(() => {
    async function testConnection() {
      const { error } = await supabase
        .from("products")
        .select("id")
        .limit(1);

      if (error) {
        setStatus(`Error: ${error.message}`);
        return;
      }

      setStatus("✅ Conexión con Supabase funcionando correctamente");
    }

    testConnection();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-10 text-center">
        <div className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-white/40">
          NEWCLOTHES
        </div>

        <h1 className="text-2xl font-bold">
          Supabase Connection Test
        </h1>

        <p className="mt-4 text-sm text-white/60">
          {status}
        </p>
      </div>
    </main>
  );
}