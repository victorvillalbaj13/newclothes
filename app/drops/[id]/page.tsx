import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type DropProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  images: unknown;
  category: string;
  collection: string;
  limited: boolean;
  offer: boolean;
  is_new: boolean;
  position: number;
};

type Drop = {
  id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  launch_date: string | null;
  limited: boolean;
  active: boolean;
};

export default async function DropDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  // -----------------------------------------
  // DROP
  // -----------------------------------------

  const { data: drop, error: dropError } = await supabase
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
    .eq("id", id)
    .eq("active", true)
    .maybeSingle();

  if (dropError) {
    console.error("Error cargando Drop:", dropError);
  }

  if (!drop) {
    notFound();
  }

  // -----------------------------------------
  // PRODUCTOS DEL DROP
  // -----------------------------------------

  const { data: dropProducts, error: productsError } =
    await supabase
      .from("drop_products")
      .select(`
        position,
        product:products (
          id,
          name,
          slug,
          price,
          image,
          images,
          category,
          collection,
          limited,
          offer,
          is_new
        )
      `)
      .eq("drop_id", id)
      .order("position", {
        ascending: true,
      });

  if (productsError) {
    console.error(
      "Error cargando productos del Drop:",
      productsError
    );
  }

  const products: DropProduct[] = (dropProducts || [])
    .filter((item: any) => item.product)
    .map((item: any) => ({
      ...item.product,
      price: Number(item.product.price || 0),
      position: Number(item.position || 0),
    }));

  // -----------------------------------------
  // FECHA
  // -----------------------------------------

  const launchDate = drop.launch_date
    ? new Date(`${drop.launch_date}T00:00:00`).toLocaleDateString(
        "es-VE",
        {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }
      )
    : null;

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

          <nav className="hidden items-center gap-10 text-[10px] font-bold uppercase tracking-[0.25em] text-white/50 md:flex">
            <Link
              href="/"
              className="transition hover:text-white"
            >
              Inicio
            </Link>

            <Link
              href="/drops"
              className="text-white transition hover:text-white/50"
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
          HERO DEL DROP
      ===================================== */}

      <section className="px-6 pb-20 pt-28 lg:px-10 lg:pb-28 lg:pt-32">
        <div className="mx-auto max-w-[1400px]">
          {/* VOLVER */}

          <Link
            href="/drops"
            className="mb-10 inline-flex items-center gap-3 text-[9px] font-bold uppercase tracking-[0.3em] text-white/40 transition hover:text-white"
          >
            ← Volver a Drops
          </Link>

          {/* IMAGEN */}

          <div className="relative overflow-hidden rounded-[2rem] bg-[#0b0b0b]">
            <div className="relative aspect-[16/10] overflow-hidden sm:aspect-[2/1] lg:aspect-[2.15/1]">
              {drop.cover_image ? (
                <img
                  src={drop.cover_image}
                  alt={drop.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[#111]">
                  <span className="text-xs font-bold uppercase tracking-[0.3em] text-white/20">
                    NEWCLOTHES
                  </span>
                </div>
              )}

              {/* GRADIENT */}

              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

              {/* LIMITED */}

              {drop.limited && (
                <div className="absolute right-6 top-6 sm:right-10 sm:top-10">
                  <span className="rounded-full border border-white/25 bg-black/40 px-4 py-2 text-[8px] font-bold uppercase tracking-[0.25em] backdrop-blur-md">
                    Limited Drop
                  </span>
                </div>
              )}

              {/* TEXTO */}

              <div className="absolute bottom-0 left-0 right-0 p-7 sm:p-10 lg:p-16">
                <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.35em] text-white/50">
                  NEWCLOTHES / EXCLUSIVE RELEASE
                </p>

                <h1 className="max-w-6xl text-5xl font-black uppercase leading-[0.82] tracking-[-0.06em] sm:text-7xl lg:text-[9rem]">
                  {drop.name}
                </h1>
              </div>
            </div>
          </div>

          {/* INFO */}

          <div className="mt-8 flex flex-col gap-8 px-2 sm:flex-row sm:items-start sm:justify-between sm:px-5">
            <div className="max-w-2xl">
              {drop.description && (
                <p className="text-sm leading-7 text-white/45">
                  {drop.description}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-8">
              {launchDate && (
                <div>
                  <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.25em] text-white/25">
                    Release
                  </p>

                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/60">
                    {launchDate}
                  </p>
                </div>
              )}

              <div>
                <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.25em] text-white/25">
                  Pieces
                </p>

                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/60">
                  {products.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================
          PRODUCTOS
      ===================================== */}

      <section className="px-6 pb-32 lg:px-10 lg:pb-44">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-12 flex items-end justify-between border-b border-white/10 pb-6">
            <div>
              <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.35em] text-white/30">
                The collection
              </p>

              <h2 className="text-3xl font-black uppercase tracking-[-0.05em] sm:text-4xl">
                Piezas del Drop
              </h2>
            </div>

            <span className="hidden text-[9px] font-bold uppercase tracking-[0.25em] text-white/25 sm:block">
              {String(products.length).padStart(2, "0")} PIEZAS
            </span>
          </div>

          {products.length === 0 ? (
            <div className="py-32 text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-white/30">
                Próximamente
              </p>

              <h3 className="mt-5 text-3xl font-black uppercase tracking-[-0.04em]">
                Este Drop aún no tiene productos
              </h3>

              <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-white/40">
                Las piezas de este lanzamiento aparecerán aquí
                cuando sean agregadas desde el panel administrativo.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-6 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product, index) => {
                const images = Array.isArray(product.images)
                  ? product.images.filter(
                      (image): image is string =>
                        typeof image === "string"
                    )
                  : [];

                const productImage =
                  product.image ||
                  images[0] ||
                  "/images/placeholder.png";

                return (
                  <article key={product.id}>
                    <Link
                      href={`/product/${product.slug}`}
                      className="group block"
                    >
                      {/* IMAGEN */}

                      <div className="relative overflow-hidden rounded-[1.5rem] bg-[#0b0b0b]">
                        <div className="relative aspect-[4/5] overflow-hidden">
                          <img
                            src={productImage}
                            alt={product.name}
                            className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.035]"
                          />

                          {/* GRADIENT */}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70" />

                          {/* NUMERO */}

                          <div className="absolute left-5 top-5">
                            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/60">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                          </div>

                          {/* TAGS */}

                          <div className="absolute right-5 top-5 flex flex-col items-end gap-2">
                            {product.is_new && (
                              <span className="rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-[7px] font-bold uppercase tracking-[0.2em] backdrop-blur-md">
                                New
                              </span>
                            )}

                            {product.limited && (
                              <span className="rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-[7px] font-bold uppercase tracking-[0.2em] backdrop-blur-md">
                                Limited
                              </span>
                            )}

                            {product.offer && (
                              <span className="rounded-full bg-white px-3 py-1.5 text-[7px] font-bold uppercase tracking-[0.2em] text-black">
                                Offer
                              </span>
                            )}
                          </div>

                          {/* FLECHA */}

                          <div className="absolute bottom-5 right-5 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/20 text-lg backdrop-blur-md transition duration-500 group-hover:bg-white group-hover:text-black">
                            ↗
                          </div>
                        </div>
                      </div>

                      {/* INFORMACIÓN */}

                      <div className="flex items-start justify-between gap-5 px-1 pt-5">
                        <div>
                          <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.25em] text-white/25">
                            {product.collection || "NEWCLOTHES"}
                          </p>

                          <h3 className="text-base font-black uppercase tracking-[-0.03em] transition group-hover:text-white/60">
                            {product.name}
                          </h3>

                          <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">
                            {product.category}
                          </p>
                        </div>

                        <span className="shrink-0 text-sm font-bold tracking-[-0.02em] text-white/80">
                          ${product.price.toFixed(2)}
                        </span>
                      </div>
                    </Link>
                  </article>
                );
              })}
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