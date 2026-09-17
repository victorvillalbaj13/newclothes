import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Drop = {
  id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  launch_date: string | null;
  limited: boolean;
  active: boolean;
};

export default async function DropsPage() {
  const supabase = await createClient();

  const { data: drops, error } = await supabase
    .from("drops")
    .select(`
      id,
      name,
      description,
      cover_image,
      launch_date,
      limited,
      active
    `)
    .eq("active", true)
    .order("launch_date", {
      ascending: false,
      nullsFirst: false,
    });

  if (error) {
    console.error("Error cargando Drops:", error);
  }

  const activeDrops: Drop[] = drops || [];

  return (
    <main className="min-h-screen bg-black text-white">
      {/* =====================================
          NAVBAR
      ===================================== */}

      <header className="fixed left-0 right-0 top-0 z-50">
        <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between px-6 lg:px-10">
          <Link
            href="/"
            className="text-xl font-black tracking-[-0.05em]"
          >
            NEWCLOTHES
          </Link>

          <nav className="hidden items-center gap-10 text-[10px] font-bold uppercase tracking-[0.25em] text-white/60 md:flex">
            <Link
              href="/"
              className="transition hover:text-white"
            >
              Inicio
            </Link>

            <Link
              href="/drops"
              className="text-white"
            >
              Drops
            </Link>

            <Link
              href="/cart"
              className="transition hover:text-white"
            >
              Carrito
            </Link>
          </nav>

          <Link
            href="/cart"
            className="text-[10px] font-bold uppercase tracking-[0.22em] text-white transition hover:text-white/50"
          >
            Carrito +
          </Link>
        </div>
      </header>

      {/* =====================================
          INTRO
      ===================================== */}

      <section className="relative overflow-hidden px-6 pb-20 pt-36 lg:px-10 lg:pb-28 lg:pt-44">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-8 flex items-center gap-4">
            <span className="h-px w-10 bg-white/40" />

            <span className="text-[9px] font-bold uppercase tracking-[0.35em] text-white/40">
              NEWCLOTHES / RELEASES
            </span>
          </div>

          <h1 className="max-w-5xl text-[18vw] font-black uppercase leading-[0.72] tracking-[-0.09em] sm:text-[13vw] lg:text-[10rem]">
            DROPS
          </h1>

          <div className="mt-12 flex max-w-2xl items-start justify-between gap-10">
            <p className="max-w-md text-sm leading-7 text-white/45">
              Lanzamientos especiales, piezas limitadas y colecciones
              creadas para representar la identidad de NEWCLOTHES.
            </p>

            <span className="hidden text-[9px] font-bold uppercase tracking-[0.25em] text-white/25 sm:block">
              Scroll ↓
            </span>
          </div>
        </div>
      </section>

      {/* =====================================
          DROPS
      ===================================== */}

      <section className="px-6 pb-28 lg:px-10 lg:pb-40">
        <div className="mx-auto max-w-[1400px]">
          {activeDrops.length === 0 ? (
            <div className="py-32 text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-white/30">
                Próximamente
              </p>

              <h2 className="mt-5 text-3xl font-black uppercase tracking-[-0.04em]">
                Nuevos Drops
              </h2>

              <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-white/40">
                Estamos preparando nuevos lanzamientos.
              </p>
            </div>
          ) : (
            <div className="space-y-32 lg:space-y-48">
              {activeDrops.map((drop, index) => (
                <article key={drop.id}>
                  {/* =================================
                      DROP IMAGE
                  ================================= */}

                  <div className="relative overflow-hidden rounded-[2rem] bg-[#0b0b0b]">
                    <Link
                      href={`/drops/${drop.id}`}
                      className="group block"
                    >
                      <div className="relative aspect-[16/9] overflow-hidden sm:aspect-[2/1]">
                        {drop.cover_image ? (
                          <img
                            src={drop.cover_image}
                            alt={drop.name}
                            className="absolute inset-0 h-full w-full object-cover transition duration-1000 ease-out group-hover:scale-[1.035]"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-[#111]">
                            <span className="text-xs font-bold uppercase tracking-[0.3em] text-white/20">
                              NEWCLOTHES
                            </span>
                          </div>
                        )}

                        {/* GRADIENT */}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                        {/* NUMBER */}

                        <div className="absolute left-6 top-6 sm:left-10 sm:top-10">
                          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        </div>

                        {/* LIMITED */}

                        {drop.limited && (
                          <div className="absolute right-6 top-6 sm:right-10 sm:top-10">
                            <span className="rounded-full border border-white/25 bg-black/30 px-4 py-2 text-[8px] font-bold uppercase tracking-[0.25em] backdrop-blur-md">
                              Limited
                            </span>
                          </div>
                        )}

                        {/* =================================
                            DROP TITLE
                        ================================= */}

                        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 lg:p-14">
                          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                              <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.3em] text-white/50">
                                Exclusive Release
                              </p>

                              <h2 className="max-w-4xl text-4xl font-black uppercase leading-[0.85] tracking-[-0.055em] sm:text-6xl lg:text-8xl">
                                {drop.name}
                              </h2>
                            </div>

                            {/* CIRCLE ARROW */}

                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/30 text-xl transition duration-500 group-hover:bg-white group-hover:text-black sm:h-14 sm:w-14">
                              ↗
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>

                  {/* =================================
                      DROP INFO
                  ================================= */}

                  <div className="flex flex-col gap-8 px-2 pt-7 sm:flex-row sm:items-start sm:justify-between sm:px-5">
                    <div className="max-w-xl">
                      {drop.description && (
                        <p className="text-sm leading-7 text-white/45">
                          {drop.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-start gap-6 sm:items-end">
                      <div className="flex items-center gap-8">
                        {drop.launch_date && (
                          <div>
                            <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.25em] text-white/25">
                              Release
                            </p>

                            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/60">
                              {new Date(
                                `${drop.launch_date}T00:00:00`
                              ).toLocaleDateString("es-VE", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* =================================
                          EXPLORE BUTTON
                      ================================= */}

                      <Link
                        href={`/drops/${drop.id}`}
                        className="group/explore inline-flex items-center gap-4 rounded-full bg-white px-7 py-4 text-[9px] font-black uppercase tracking-[0.22em] text-black transition-all duration-300 hover:scale-105 hover:bg-white/90"
                      >
                        <span>
                          Explorar Drop
                        </span>

                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-sm text-white transition-transform duration-300 group-hover/explore:translate-x-1">
                          ↗
                        </span>
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* =====================================
          FOOTER
      ===================================== */}

      <footer className="border-t border-white/10 px-6 py-12 lg:px-10">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-black tracking-[-0.04em]">
            NEWCLOTHES
          </span>

          <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/25">
            © {new Date().getFullYear()} NEWCLOTHES
          </span>
        </div>
      </footer>
    </main>
  );
}