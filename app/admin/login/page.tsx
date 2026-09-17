"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLogin() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Correo o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    router.push("/admin/dashboard");
    router.refresh();
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white flex items-center justify-center px-5">

      {/* Fondo dinámico */}
      <div className="absolute inset-0 pointer-events-none">

        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-white/[0.025] blur-[100px]" />

        <div className="absolute -bottom-40 -right-40 w-[550px] h-[550px] rounded-full bg-white/[0.02] blur-[110px]" />

        <div className="absolute top-1/2 left-1/2 w-[700px] h-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.025]" />

        <div className="absolute top-1/2 left-1/2 w-[520px] h-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.02]" />

      </div>

      <div className="relative z-10 w-full max-w-[430px]">

        {/* Marca */}
        <div className="text-center mb-8">

          <div className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.025] px-5 py-2 backdrop-blur-xl">
            <span className="text-[10px] font-medium tracking-[0.45em] text-zinc-400 uppercase">
              Administration
            </span>
          </div>

          <h1 className="mt-7 text-4xl font-black tracking-[0.18em]">
            NEWCLOTHES
          </h1>

          <p className="mt-3 text-[10px] uppercase tracking-[0.35em] text-zinc-600">
            Premium Control System
          </p>

        </div>

        {/* Card principal */}
        <div className="relative rounded-[28px] border border-white/[0.09] bg-white/[0.035] p-[1px] shadow-[0_30px_100px_rgba(0,0,0,0.65)] backdrop-blur-2xl">

          {/* Brillo superior */}
          <div className="absolute left-[12%] right-[12%] top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          <div className="rounded-[27px] bg-[#0b0b0b]/95 px-7 py-8 sm:px-9 sm:py-10">

            {/* Encabezado */}
            <div className="mb-8">

              <div className="flex items-center gap-3 mb-5">
                <div className="h-px w-8 bg-white/30" />
                <span className="text-[9px] uppercase tracking-[0.3em] text-zinc-500">
                  Secure Access
                </span>
              </div>

              <h2 className="text-2xl font-semibold tracking-tight">
                Panel administrativo
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Gestiona productos, inventario, drops y contenido de
                NEWCLOTHES.
              </p>

            </div>

            <form onSubmit={handleLogin} className="space-y-5">

              {/* Email */}
              <div>

                <label className="mb-2 block text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                  Correo electrónico
                </label>

                <div className="group relative">

                  <div className="absolute inset-0 rounded-2xl bg-white/[0.025] opacity-0 blur-xl transition duration-500 group-focus-within:opacity-100" />

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@newclothes.com"
                    required
                    autoComplete="email"
                    className="relative w-full rounded-2xl border border-white/[0.08] bg-black/50 px-4 py-3.5 text-sm text-white placeholder:text-zinc-700 outline-none transition-all duration-300 hover:border-white/[0.15] focus:border-white/30 focus:bg-white/[0.035]"
                  />

                </div>

              </div>

              {/* Password */}
              <div>

                <label className="mb-2 block text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                  Contraseña
                </label>

                <div className="group relative">

                  <div className="absolute inset-0 rounded-2xl bg-white/[0.025] opacity-0 blur-xl transition duration-500 group-focus-within:opacity-100" />

                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    autoComplete="current-password"
                    className="relative w-full rounded-2xl border border-white/[0.08] bg-black/50 px-4 py-3.5 text-sm text-white placeholder:text-zinc-700 outline-none transition-all duration-300 hover:border-white/[0.15] focus:border-white/30 focus:bg-white/[0.035]"
                  />

                </div>

              </div>

              {/* Error */}
              {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Botón */}
              <button
                type="submit"
                disabled={loading}
                className="group relative mt-2 w-full overflow-hidden rounded-2xl bg-white px-5 py-4 text-xs font-bold uppercase tracking-[0.2em] text-black transition-all duration-300 hover:scale-[1.01] hover:bg-zinc-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >

                <span className="relative z-10">
                  {loading ? "Iniciando sesión..." : "Entrar al sistema"}
                </span>

                <div className="absolute inset-y-0 -left-20 w-20 skew-x-[-20deg] bg-white/40 blur-xl transition-all duration-700 group-hover:left-[120%]" />

              </button>

            </form>

            {/* Footer card */}
            <div className="mt-8 flex items-center justify-between border-t border-white/[0.06] pt-5">

              <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-700">
                NEWCLOTHES®
              </span>

              <span className="flex items-center gap-2 text-[9px] uppercase tracking-[0.15em] text-zinc-600">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500/70 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                System Secure
              </span>

            </div>

          </div>
        </div>

        {/* Texto inferior */}
        <div className="mt-7 text-center">

          <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-700">
            Authorized personnel only
          </p>

        </div>

      </div>

    </main>
  );
}