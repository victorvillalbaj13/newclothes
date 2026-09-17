"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const mainItems = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: "⌂",
  },
];

const managementItems = [
  {
    label: "Productos",
    href: "/admin/products",
    icon: "▣",
  },
  {
    label: "Inventario",
    href: "/admin/inventory",
    icon: "◫",
  },
  {
    label: "Ofertas",
    href: "/admin/offers",
    icon: "◇",
  },
  {
    label: "Drops",
    href: "/admin/drops",
    icon: "✦",
  },
  {
    label: "Ventas",
    href: "/admin/sales",
    icon: "▤",
  },
];

const contentItems = [
  {
    label: "Hero / Slides",
    href: "/admin/hero",
    icon: "▧",
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") {
      return pathname === href;
    }

    return pathname.startsWith(href);
  };

  const itemClass = (href: string) =>
    `group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
      isActive(href)
        ? "bg-white text-black shadow-lg shadow-white/5"
        : "text-white/50 hover:bg-white/[0.05] hover:text-white"
    }`;

  const handleLogout = async () => {
    await supabase.auth.signOut();

    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[250px] border-r border-white/[0.07] bg-[#080808] lg:flex lg:flex-col">
        {/* BRAND */}
        <div className="border-b border-white/[0.07] px-6 py-6">
          <Link href="/admin/dashboard" className="block">
            <div className="text-[15px] font-black tracking-[0.28em] text-white">
              NEWCLOTHES
            </div>

            <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.25em] text-white/30">
              Admin System
            </div>
          </Link>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 overflow-y-auto px-4 py-5">
          {/* PRINCIPAL */}
          <div className="mb-6">
            <div className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.25em] text-white/25">
              Principal
            </div>

            <div className="space-y-1">
              {mainItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={itemClass(item.href)}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm ${
                      isActive(item.href)
                        ? "bg-black/10 text-black"
                        : "bg-white/[0.04] text-white/50"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* GESTIÓN */}
          <div className="mb-6">
            <div className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.25em] text-white/25">
              Gestión
            </div>

            <div className="space-y-1">
              {managementItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={itemClass(item.href)}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm ${
                      isActive(item.href)
                        ? "bg-black/10 text-black"
                        : "bg-white/[0.04] text-white/50"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* CONTENIDO */}
          <div>
            <div className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.25em] text-white/25">
              Contenido
            </div>

            <div className="space-y-1">
              {contentItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={itemClass(item.href)}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm ${
                      isActive(item.href)
                        ? "bg-black/10 text-black"
                        : "bg-white/[0.04] text-white/50"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* PARTE INFERIOR */}
        <div className="border-t border-white/[0.07] p-4">
          <Link
            href="/admin/settings"
            className="mb-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white/50 transition hover:bg-white/[0.05] hover:text-white"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04]">
              ⚙
            </span>

            <span>Configuración</span>
          </Link>

          {/* CERRAR SESIÓN */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-white/35 transition hover:bg-white/[0.05] hover:text-white"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04]">
              ↪
            </span>

            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* MOBILE NAVIGATION */}
      <div className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#080808]/95 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/admin/dashboard">
            <div className="text-[13px] font-black tracking-[0.25em] text-white">
              NEWCLOTHES
            </div>

            <div className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.2em] text-white/30">
              Admin
            </div>
          </Link>

          {/* SALIR MOBILE */}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white/50 transition hover:border-white/20 hover:text-white"
          >
            Salir
          </button>
        </div>

        <div className="overflow-x-auto px-4 pb-3">
          <div className="flex min-w-max gap-2">
            {[...mainItems, ...managementItems, ...contentItems].map(
              (item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] transition ${
                    isActive(item.href)
                      ? "bg-white text-black"
                      : "border border-white/[0.08] text-white/40 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </>
  );
}