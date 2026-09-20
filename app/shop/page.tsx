"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  category: string;
  tag: string;
};

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [priceFilter, setPriceFilter] = useState("ALL");

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);

      const supabase = createClient();

      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          name,
          slug,
          price,
          image,
          category,
          limited,
          offer,
          exclusive_drop,
          is_new,
          published,
          active,
          created_at
        `)
        .eq("published", true)
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error cargando productos:", error);
        setProducts([]);
        setLoading(false);
        return;
      }

      const formattedProducts: Product[] = (data || []).map(
        (product) => {
          let tag = "";

          if (product.offer) {
            tag = "OFFER";
          } else if (product.exclusive_drop) {
            tag = "DROP";
          } else if (product.is_new) {
            tag = "NEW";
          } else if (product.limited) {
            tag = "LIMITED";
          }

          return {
            id: product.id,
            name: product.name,
            slug: product.slug,
            price: Number(product.price),
            image:
              product.image || "/images/placeholder.png",
            category:
              product.category || "T-SHIRTS",
            tag,
          };
        }
      );

      setProducts(formattedProducts);
      setLoading(false);
    };

    loadProducts();
  }, []);

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(products.map((product) => product.category))
    );

    return uniqueCategories;
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        product.name
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesCategory =
        category === "ALL" ||
        product.category === category;

      let matchesPrice = true;

      if (priceFilter === "UNDER_30") {
        matchesPrice = product.price < 30;
      }

      if (priceFilter === "30_50") {
        matchesPrice =
          product.price >= 30 &&
          product.price <= 50;
      }

      if (priceFilter === "50_80") {
        matchesPrice =
          product.price > 50 &&
          product.price <= 80;
      }

      if (priceFilter === "OVER_80") {
        matchesPrice = product.price > 80;
      }

      return (
        matchesSearch &&
        matchesCategory &&
        matchesPrice
      );
    });
  }, [
    products,
    search,
    category,
    priceFilter,
  ]);

  const formatPrice = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  return (
    <main className="min-h-screen bg-black text-white">
      {/* ============================================================
          HEADER
      ============================================================ */}

      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-black/90 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-[1500px] items-center justify-between px-5 md:px-8">

          {/* LOGO */}

          <Link
            href="/"
            className="text-xl font-black tracking-[-0.08em]"
          >
            NEWCLOTHES
          </Link>

          {/* NAVIGATION DESKTOP */}

          <nav className="hidden items-center gap-8 md:flex">
            <Link
              href="/"
              className="text-[9px] font-black tracking-[0.2em] text-white/45 transition hover:text-white"
            >
              HOME
            </Link>

            <Link
              href="/shop"
              className="text-[9px] font-black tracking-[0.2em] text-white transition"
            >
              SHOP
            </Link>

            <Link
              href="/drops"
              className="text-[9px] font-black tracking-[0.2em] text-white/45 transition hover:text-white"
            >
              DROPS
            </Link>

            <Link
              href="/#about"
              className="text-[9px] font-black tracking-[0.2em] text-white/45 transition hover:text-white"
            >
              ABOUT
            </Link>

            <Link
              href="/cart"
              className="rounded-full border border-white/10 px-4 py-2 text-[9px] font-black tracking-[0.2em] text-white/60 transition hover:border-white/30 hover:text-white"
            >
              CART
            </Link>
          </nav>

          {/* MOBILE */}

          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/"
              className="rounded-full border border-white/10 px-4 py-2 text-[8px] font-black tracking-[0.18em] text-white/60 transition hover:border-white/30 hover:text-white"
            >
              HOME
            </Link>

            <Link
              href="/cart"
              className="rounded-full border border-white/10 px-4 py-2 text-[8px] font-black tracking-[0.18em] text-white/60 transition hover:border-white/30 hover:text-white"
            >
              CART
            </Link>
          </div>

        </div>
      </header>

      {/* ============================================================
          SHOP HEADER
      ============================================================ */}

      <section className="border-b border-white/10 px-5 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-[1500px]">
          <p className="mb-5 text-[9px] font-black tracking-[0.4em] text-white/30">
            NEWCLOTHES / ONLINE STORE
          </p>

          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-6xl font-black uppercase leading-[0.82] tracking-[-0.08em] md:text-8xl">
                CATÁLOGO
                <br />
                NEWCLOTHES
              </h1>
            </div>

            <div className="max-w-md">
              <p className="text-sm leading-7 text-white/40">
                Explora todas las piezas disponibles de
                NEWCLOTHES. Busca por nombre, filtra por
                categoría o encuentra productos según su precio.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          FILTROS
      ============================================================ */}

      <section className="border-b border-white/10 bg-[#080808] px-5 py-7 md:px-8">
        <div className="mx-auto max-w-[1500px]">
          <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_auto]">

            {/* BUSCADOR */}

            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="BUSCAR PRODUCTO..."
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-5 pr-12 text-[10px] font-black tracking-[0.15em] text-white outline-none placeholder:text-white/20 transition focus:border-white/30"
              />

              <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-sm text-white/30">
                ⌕
              </span>
            </div>

            {/* CATEGORÍA */}

            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
              className="h-12 rounded-xl border border-white/10 bg-white/[0.03] px-5 text-[10px] font-black tracking-[0.15em] text-white outline-none transition focus:border-white/30"
            >
              <option
                value="ALL"
                className="bg-[#080808]"
              >
                TODAS LAS CATEGORÍAS
              </option>

              {categories.map((item) => (
                <option
                  key={item}
                  value={item}
                  className="bg-[#080808]"
                >
                  {item}
                </option>
              ))}
            </select>

            {/* PRECIO */}

            <select
              value={priceFilter}
              onChange={(event) =>
                setPriceFilter(event.target.value)
              }
              className="h-12 rounded-xl border border-white/10 bg-white/[0.03] px-5 text-[10px] font-black tracking-[0.15em] text-white outline-none transition focus:border-white/30"
            >
              <option
                value="ALL"
                className="bg-[#080808]"
              >
                CUALQUIER PRECIO
              </option>

              <option
                value="UNDER_30"
                className="bg-[#080808]"
              >
                MENOS DE $30
              </option>

              <option
                value="30_50"
                className="bg-[#080808]"
              >
                $30 — $50
              </option>

              <option
                value="50_80"
                className="bg-[#080808]"
              >
                $50 — $80
              </option>

              <option
                value="OVER_80"
                className="bg-[#080808]"
              >
                MÁS DE $80
              </option>
            </select>

            {/* LIMPIAR */}

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategory("ALL");
                setPriceFilter("ALL");
              }}
              className="h-12 rounded-xl border border-white/10 px-6 text-[9px] font-black tracking-[0.18em] text-white/45 transition hover:border-white/30 hover:text-white"
            >
              LIMPIAR
            </button>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <p className="text-[8px] font-black tracking-[0.25em] text-white/25">
              {filteredProducts.length}{" "}
              {filteredProducts.length === 1
                ? "PRODUCTO"
                : "PRODUCTOS"}
            </p>

            {(search ||
              category !== "ALL" ||
              priceFilter !== "ALL") && (
              <p className="text-[8px] font-black tracking-[0.2em] text-white/25">
                FILTROS ACTIVOS
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================
          PRODUCTOS
      ============================================================ */}

      <section className="px-5 py-12 md:px-8 md:py-16">
        <div className="mx-auto max-w-[1500px]">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-5">
              {Array.from({ length: 8 }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="aspect-[3/4] animate-pulse rounded-[1.5rem] bg-white/5"
                  />
                )
              )}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-5">
              {filteredProducts.map((product, index) => (
                <Link
                  key={product.id}
                  href={`/product/${product.slug}`}
                  className="group relative overflow-hidden rounded-[1.5rem] bg-[#0b0b0b]"
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  </div>

                  <div className="absolute left-4 top-4">
                    <span className="text-[8px] font-black tracking-[0.25em] text-white/45">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  {product.tag && (
                    <div className="absolute right-4 top-4">
                      <span className="rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[8px] font-black tracking-[0.18em] backdrop-blur-md">
                        {product.tag}
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                    <p className="mb-1 text-[8px] font-black tracking-[0.25em] text-white/40">
                      {product.category}
                    </p>

                    <div className="flex items-end justify-between gap-3">
                      <h2 className="text-sm font-black uppercase tracking-[-0.02em] md:text-base">
                        {product.name}
                      </h2>

                      <span className="shrink-0 text-xs font-black">
                        {formatPrice(product.price)}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                      <span className="text-[8px] font-black tracking-[0.2em] text-white/35">
                        VER PRODUCTO
                      </span>

                      <span className="text-sm transition-transform duration-300 group-hover:translate-x-1">
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] px-6 py-24 text-center">
              <p className="text-[9px] font-black tracking-[0.35em] text-white/25">
                SIN RESULTADOS
              </p>

              <h2 className="mt-5 text-3xl font-black uppercase tracking-[-0.05em] md:text-5xl">
                NO ENCONTRAMOS
                <br />
                ESE PRODUCTO.
              </h2>

              <p className="mx-auto mt-5 max-w-md text-xs leading-6 text-white/35">
                Intenta buscar otro nombre o elimina alguno de
                los filtros utilizados.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory("ALL");
                  setPriceFilter("ALL");
                }}
                className="mt-8 rounded-full bg-white px-7 py-4 text-[9px] font-black tracking-[0.2em] text-black transition hover:bg-white/90"
              >
                VER TODOS LOS PRODUCTOS
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ============================================================
          FOOTER
      ============================================================ */}

      <footer className="border-t border-white/10 px-5 py-10 md:px-8">
        <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="text-xl font-black tracking-[-0.08em]">
              NEWCLOTHES
            </p>

            <p className="mt-3 text-[8px] font-black tracking-[0.25em] text-white/25">
              STREETWEAR / VALENCIA / VENEZUELA
            </p>
          </div>

          <Link
            href="/"
            className="text-[8px] font-black tracking-[0.2em] text-white/40 transition hover:text-white"
          >
            VOLVER AL HOME ↑
          </Link>
        </div>

        <div className="mx-auto mt-10 max-w-[1500px] border-t border-white/10 pt-5">
          <p className="text-[8px] font-black tracking-[0.2em] text-white/20">
            © {new Date().getFullYear()} NEWCLOTHES. ALL RIGHTS RESERVED.
          </p>
        </div>
      </footer>
    </main>
  );
}