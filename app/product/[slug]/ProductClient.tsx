"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type ProductVariant = {
  id?: string;
  color?: string;
  size: string;
  stock: number;
};

type Product = {
  id?: string;
  slug: string;
  name: string;
  price: string;
  priceValue?: number;
  image: string;
  images?: string[];
  description: string;
  category?: string;
  collection?: string;
  sku?: string;
  limited?: boolean;
  offer?: boolean;
  exclusiveDrop?: boolean;
  isNew?: boolean;
  featured?: boolean;
  sizes?: string[];
  colors?: string[];
  stock?: number;
  variants?: ProductVariant[];
};

export default function ProductClient({
  product,
}: {
  product: Product;
}) {
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [hydrated, setHydrated] = useState(false);

  /*
   * ANALYTICS
   *
   * Crea o recupera una sesión anónima para
   * relacionar las interacciones del visitante.
   */
  useEffect(() => {
    setHydrated(true);

    let cancelled = false;

    const trackProductView = async () => {
      try {
        if (cancelled) return;

        const sessionKey =
          "newclothes-analytics-session";

        let sessionId =
          localStorage.getItem(sessionKey);

        if (!sessionId) {
          sessionId = crypto.randomUUID();

          localStorage.setItem(
            sessionKey,
            sessionId
          );
        }

        /*
         * EVITAR PRODUCT_VIEW DUPLICADO
         *
         * React/Next.js puede ejecutar los efectos
         * dos veces durante el desarrollo.
         *
         * sessionStorage permite registrar una nueva
         * visita si el usuario vuelve después de unos
         * segundos, pero evita duplicados inmediatos.
         */
        const viewKey =
          `newclothes-product-view-${product.id}`;

        const lastView =
          sessionStorage.getItem(viewKey);

        const now = Date.now();

        if (lastView) {
          const lastViewTime =
            Number(lastView);

          if (
            Number.isFinite(lastViewTime) &&
            now - lastViewTime < 5000
          ) {
            return;
          }
        }

        sessionStorage.setItem(
          viewKey,
          String(now)
        );

        const { error } = await supabase
          .from("store_events")
          .insert({
            event_type: "PRODUCT_VIEW",
            product_id: product.id || null,
            session_id: sessionId,
            metadata: {
              slug: product.slug,
              product_name: product.name,
            },
          });

        if (error) {
          console.error(
            "Analytics PRODUCT_VIEW error:",
            error
          );
        }
      } catch (error) {
        console.error(
          "Analytics PRODUCT_VIEW error:",
          error
        );
      }
    };

    trackProductView();

    return () => {
      cancelled = true;
    };
  }, [
    product.id,
    product.slug,
    product.name,
  ]);

  /*
   * COLORES DISPONIBLES
   */
  const colors = useMemo(() => {
    if (
      product.colors &&
      product.colors.length > 0
    ) {
      return product.colors;
    }

    const variantColors = Array.from(
      new Set(
        (product.variants || [])
          .map((variant) => variant.color)
          .filter(
            (color): color is string =>
              typeof color === "string" &&
              color.trim().length > 0
          )
      )
    );

    return variantColors;
  }, [product.colors, product.variants]);

  /*
   * TALLAS DISPONIBLES
   */
  const sizes = useMemo(() => {
    if (
      product.sizes &&
      product.sizes.length > 0
    ) {
      return product.sizes;
    }

    const variantSizes = Array.from(
      new Set(
        (product.variants || [])
          .map((variant) => variant.size)
          .filter(
            (size): size is string =>
              typeof size === "string" &&
              size.trim().length > 0
          )
      )
    );

    return variantSizes.length > 0
      ? variantSizes
      : ["XS", "S", "M", "L", "XL"];
  }, [product.sizes, product.variants]);

  /*
   * BUSCAR VARIANTE EXACTA
   * COLOR + TALLA
   */
  function getVariant(
    color: string,
    size: string
  ) {
    return product.variants?.find((variant) => {
      const variantColor =
        (variant.color || "")
          .trim()
          .toUpperCase();

      const variantSize =
        (variant.size || "")
          .trim()
          .toUpperCase();

      return (
        variantColor ===
          color.trim().toUpperCase() &&
        variantSize ===
          size.trim().toUpperCase()
      );
    });
  }

  /*
   * STOCK REAL DE UNA COMBINACIÓN
   */
  function getStockForCombination(
    color: string,
    size: string
  ) {
    const variant = getVariant(
      color,
      size
    );

    if (!variant) {
      return 0;
    }

    return Number(
      variant.stock || 0
    );
  }

  /*
   * DETERMINAR SI COLOR + TALLA ESTÁ DISPONIBLE
   */
  function isCombinationAvailable(
    color: string,
    size: string
  ) {
    return (
      getStockForCombination(
        color,
        size
      ) > 0
    );
  }

  /*
   * STOCK TOTAL
   */
  const totalStock =
    product.variants &&
    product.variants.length > 0
      ? product.variants.reduce(
          (total, variant) =>
            total +
            Number(
              variant.stock || 0
            ),
          0
        )
      : Number(
          product.stock || 0
        );

  const hasVariants =
    !!product.variants &&
    product.variants.length > 0;

  /*
   * SI SOLO EXISTE UN COLOR,
   * LO SELECCIONAMOS AUTOMÁTICAMENTE.
   */
  useEffect(() => {
    if (
      colors.length === 1 &&
      !selectedColor
    ) {
      setSelectedColor(
        colors[0]
      );
    }
  }, [
    colors,
    selectedColor,
  ]);

  /*
   * CUANDO CAMBIA EL COLOR,
   * REVISAMOS SI LA TALLA ACTUAL SIGUE DISPONIBLE.
   */
  useEffect(() => {
    if (
      selectedColor &&
      selectedSize &&
      hasVariants
    ) {
      const available =
        isCombinationAvailable(
          selectedColor,
          selectedSize
        );

      if (!available) {
        setSelectedSize("");
      }
    }
  }, [
    selectedColor,
    selectedSize,
    hasVariants,
  ]);

  /*
   * VARIANTE SELECCIONADA
   */
  const selectedVariant =
    selectedColor &&
    selectedSize
      ? getVariant(
          selectedColor,
          selectedSize
        )
      : undefined;

  /*
   * STOCK DE LA VARIANTE SELECCIONADA
   */
  const selectedStock =
    selectedVariant
      ? Number(
          selectedVariant.stock || 0
        )
      : 0;

  /*
   * AGREGAR AL CARRITO
   */
  async function addToBag() {
    if (
      hasVariants &&
      colors.length > 0
    ) {
      if (!selectedColor) {
        alert(
          "PLEASE SELECT A COLOR"
        );
        return;
      }
    }

    if (!selectedSize) {
      alert(
        "PLEASE SELECT A SIZE"
      );
      return;
    }

    let variantId:
      | string
      | undefined;

    let variantColor =
      selectedColor;

    let variantStock =
      totalStock;

    if (hasVariants) {
      const variant =
        getVariant(
          selectedColor,
          selectedSize
        );

      if (
        !variant ||
        Number(variant.stock) <= 0
      ) {
        alert(
          "THIS SIZE IS SOLD OUT"
        );
        return;
      }

      variantId = variant.id;

      variantColor =
        variant.color ||
        selectedColor;

      variantStock = Number(
        variant.stock || 0
      );
    }

    if (variantStock <= 0) {
      alert(
        "THIS PRODUCT IS SOLD OUT"
      );
      return;
    }

    /*
     * ANALYTICS
     *
     * Registrar BUY_CLICK solamente después
     * de confirmar que el producto, talla y color
     * están disponibles.
     */
    const sessionId =
      localStorage.getItem(
        "newclothes-analytics-session"
      );

    const {
      error: analyticsError,
    } = await supabase
      .from("store_events")
      .insert({
        event_type: "BUY_CLICK",
        product_id:
          product.id || null,
        session_id: sessionId,
        metadata: {
          slug: product.slug,
          product_name:
            product.name,
          size: selectedSize,
          color: variantColor,
          variant_id:
            variantId || null,
          price:
            product.priceValue ||
            null,
        },
      });

    if (analyticsError) {
      console.error(
        "Analytics BUY_CLICK error:",
        analyticsError
      );
    }

    /*
     * PRODUCTO PARA EL CARRITO
     */
    const cartItem = {
      slug: product.slug,
      name: product.name,
      price: product.price,
      priceValue:
        product.priceValue,
      image: product.image,
      size: selectedSize,
      color: variantColor,
      quantity: 1,
      variantId,
    };

    const existingCart =
      JSON.parse(
        localStorage.getItem(
          "newclothes-cart"
        ) || "[]"
      );

    localStorage.setItem(
      "newclothes-cart",
      JSON.stringify([
        ...existingCart,
        cartItem,
      ])
    );

    window.dispatchEvent(
      new Event(
        "newclothes-cart-updated"
      )
    );

    window.location.href =
      "/cart";
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      {/* JAVASCRIPT STATUS */}
      <div className="fixed bottom-4 left-4 z-[999999] rounded-full border border-white/10 bg-black/90 px-4 py-2 text-[10px] font-bold tracking-widest text-white/60 backdrop-blur-md">
        {hydrated
          ? "SYSTEM READY"
          : "LOADING..."}
      </div>

      {/* NAVBAR */}
      <header className="fixed left-0 top-0 z-50 w-full border-b border-white/[0.07] bg-[#080808]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-6">
          <Link
            href="/"
            className="text-lg font-black tracking-[-0.07em] transition-opacity hover:opacity-60 sm:text-xl"
          >
            NEWCLOTHES
          </Link>

          <div className="hidden items-center gap-8 text-[11px] font-bold tracking-[0.18em] text-white/50 md:flex">
            <Link
              href="/"
              className="transition-colors hover:text-white"
            >
              HOME
            </Link>

            <Link
              href="/#drop"
              className="transition-colors hover:text-white"
            >
              SHOP
            </Link>
          </div>

          <Link
            href="/cart"
            className="rounded-full border border-white/10 px-4 py-2 text-[10px] font-black tracking-[0.18em] transition-all hover:border-white/30 hover:bg-white hover:text-black sm:px-5"
          >
            BAG
          </Link>
        </div>
      </header>

      <section className="px-4 pb-24 pt-[110px] sm:px-6 sm:pt-[125px]">
        <div className="mx-auto max-w-7xl">
          {/* BREADCRUMB */}
          <div className="mb-7 flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-white/35">
            <Link
              href="/"
              className="transition-colors hover:text-white"
            >
              HOME
            </Link>

            <span>/</span>

            <Link
              href="/#drop"
              className="transition-colors hover:text-white"
            >
              SHOP
            </Link>

            <span>/</span>

            <span className="text-white/70">
              {product.name}
            </span>
          </div>

          {/* PRODUCT */}
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
            {/* IMAGE */}
            <div className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111]">
              <div className="absolute left-4 top-4 z-10">
                <span className="rounded-full bg-white px-4 py-2 text-[9px] font-black tracking-[0.18em] text-black">
                  NEW
                </span>
              </div>

              <div className="aspect-[4/5] overflow-hidden bg-[#151515]">
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
                  draggable={false}
                />
              </div>

              <div className="flex items-center justify-between border-t border-white/[0.07] px-5 py-4">
                <span className="text-[10px] font-bold tracking-[0.18em] text-white/40">
                  NEWCLOTHES®
                </span>

                <span className="text-[10px] font-bold tracking-[0.18em] text-white/30">
                  COLLECTION 001
                </span>
              </div>
            </div>

            {/* INFO */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#111] p-6 sm:p-8 lg:p-10">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold tracking-[0.28em] text-white/35">
                    NEWCLOTHES / COLLECTION 001
                  </p>

                  <span className="rounded-full border border-white/10 px-3 py-1.5 text-[9px] font-black tracking-[0.15em] text-white/50">
                    DROP
                  </span>
                </div>

                <h1 className="mt-6 text-5xl font-black tracking-[-0.065em] text-white sm:text-6xl lg:text-7xl">
                  {product.name}
                </h1>

                <div className="mt-5 flex items-center gap-3">
                  <p className="text-2xl font-bold tracking-tight text-white">
                    {product.price}
                  </p>

                  <span
                    className={`rounded-full px-3 py-1.5 text-[9px] font-bold tracking-[0.15em] ${
                      totalStock > 0
                        ? "bg-white/[0.06] text-white/40"
                        : "bg-white/[0.04] text-white/25"
                    }`}
                  >
                    {totalStock > 0
                      ? "IN STOCK"
                      : "SOLD OUT"}
                  </span>
                </div>

                <p className="mt-7 max-w-xl text-sm leading-7 text-white/50">
                  {product.description}
                </p>

                <div className="my-8 h-px bg-white/[0.07]" />

                {/* COLOR */}
                {hasVariants &&
                  colors.length > 0 && (
                    <div className="mb-7">
                      <div className="mb-4 flex items-center justify-between">
                        <p className="text-[10px] font-black tracking-[0.2em] text-white">
                          SELECT COLOR
                        </p>

                        {selectedColor && (
                          <span className="text-[10px] font-bold tracking-[0.12em] text-white/35">
                            {selectedColor}
                          </span>
                        )}
                      </div>

                      <div
                        className={`grid gap-2 ${
                          colors.length === 1
                            ? "grid-cols-1"
                            : colors.length === 2
                            ? "grid-cols-2"
                            : colors.length === 3
                            ? "grid-cols-3"
                            : "grid-cols-2 sm:grid-cols-4"
                        }`}
                      >
                        {colors.map(
                          (color) => {
                            const colorStock =
                              (
                                product.variants ||
                                []
                              )
                                .filter(
                                  (
                                    variant
                                  ) =>
                                    (
                                      variant.color ||
                                      ""
                                    )
                                      .trim()
                                      .toUpperCase() ===
                                    color
                                      .trim()
                                      .toUpperCase()
                                )
                                .reduce(
                                  (
                                    total,
                                    variant
                                  ) =>
                                    total +
                                    Number(
                                      variant.stock ||
                                        0
                                    ),
                                  0
                                );

                            const colorAvailable =
                              colorStock >
                              0;

                            return (
                              <button
                                type="button"
                                key={color}
                                disabled={
                                  !colorAvailable
                                }
                                onClick={() => {
                                  if (
                                    colorAvailable
                                  ) {
                                    setSelectedColor(
                                      color
                                    );
                                  }
                                }}
                                className={`rounded-xl border py-4 text-[10px] font-black tracking-[0.1em] transition-all duration-200 ${
                                  selectedColor ===
                                  color
                                    ? "border-white bg-white text-black shadow-[0_0_25px_rgba(255,255,255,0.08)]"
                                    : colorAvailable
                                    ? "cursor-pointer border-white/10 bg-[#151515] text-white/60 hover:border-white/30 hover:bg-[#1b1b1b] hover:text-white"
                                    : "cursor-not-allowed border-white/[0.05] bg-[#101010] text-white/20"
                                }`}
                              >
                                <span>
                                  {color}
                                </span>

                                {!colorAvailable && (
                                  <span className="ml-2 text-[8px] tracking-[0.08em]">
                                    SOLD OUT
                                  </span>
                                )}
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}

                {/* SIZE */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-[10px] font-black tracking-[0.2em] text-white">
                      SELECT SIZE
                    </p>

                    <button
                      type="button"
                      className="cursor-pointer text-[10px] font-bold tracking-[0.12em] text-white/40 underline underline-offset-4 transition-colors hover:text-white"
                    >
                      SIZE GUIDE
                    </button>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {sizes.map(
                      (size) => {
                        const available =
                          !hasVariants
                            ? totalStock >
                              0
                            : selectedColor
                            ? isCombinationAvailable(
                                selectedColor,
                                size
                              )
                            : false;

                        return (
                          <button
                            type="button"
                            key={size}
                            disabled={
                              !available
                            }
                            onClick={() => {
                              if (
                                available
                              ) {
                                setSelectedSize(
                                  size
                                );
                              }
                            }}
                            className={`relative rounded-xl border py-4 text-[10px] font-black tracking-[0.1em] transition-all duration-200 ${
                              selectedSize ===
                              size
                                ? "border-white bg-white text-black shadow-[0_0_25px_rgba(255,255,255,0.08)]"
                                : available
                                ? "cursor-pointer border-white/10 bg-[#151515] text-white/60 hover:border-white/30 hover:bg-[#1b1b1b] hover:text-white"
                                : "cursor-not-allowed border-white/[0.05] bg-[#101010] text-white/20"
                            }`}
                          >
                            {size}

                            {hasVariants &&
                              !available && (
                                <span className="absolute inset-0 flex items-center justify-center">
                                  <span className="h-px w-8 rotate-[-25deg] bg-white/20" />
                                </span>
                              )}
                          </button>
                        );
                      }
                    )}
                  </div>

                  <div className="mt-4 flex min-h-5 items-center">
                    {selectedSize ? (
                      <p className="text-[10px] font-bold tracking-[0.15em] text-white/40">
                        SIZE SELECTED:{" "}
                        <span className="text-white">
                          {selectedSize}
                        </span>

                        {selectedColor && (
                          <>
                            {" "}
                            / COLOR:{" "}
                            <span className="text-white">
                              {
                                selectedColor
                              }
                            </span>
                          </>
                        )}

                        {hasVariants && (
                          <>
                            {" "}
                            / STOCK:{" "}
                            <span className="text-white">
                              {
                                selectedStock
                              }
                            </span>
                          </>
                        )}
                      </p>
                    ) : (
                      <p className="text-[10px] tracking-[0.12em] text-white/25">
                        {hasVariants &&
                        colors.length >
                          0 &&
                        !selectedColor
                          ? "SELECT A COLOR TO CONTINUE"
                          : "SELECT A SIZE TO CONTINUE"}
                      </p>
                    )}
                  </div>
                </div>

                {/* ADD TO BAG */}
                <button
                  type="button"
                  onClick={addToBag}
                  disabled={
                    totalStock <=
                      0 ||
                    (hasVariants &&
                      colors.length >
                        0 &&
                      !selectedColor) ||
                    !selectedSize ||
                    (hasVariants &&
                      selectedStock <=
                        0)
                  }
                  className={`mt-7 flex w-full items-center justify-center rounded-full py-5 text-[10px] font-black tracking-[0.24em] transition-all duration-300 ${
                    totalStock <=
                      0 ||
                    (hasVariants &&
                      colors.length >
                        0 &&
                      !selectedColor) ||
                    !selectedSize ||
                    (hasVariants &&
                      selectedStock <=
                        0)
                      ? "cursor-not-allowed bg-white/10 text-white/20"
                      : "cursor-pointer bg-white text-black hover:scale-[1.01] hover:bg-white/90 active:scale-[0.99]"
                  }`}
                >
                  {totalStock <= 0
                    ? "SOLD OUT"
                    : !selectedColor &&
                      hasVariants &&
                      colors.length >
                        0
                    ? "SELECT COLOR"
                    : !selectedSize
                    ? "SELECT SIZE"
                    : "ADD TO BAG"}
                </button>

                {/* FEATURES */}
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-white/[0.07] bg-[#151515] px-3 py-4 text-center">
                    <p className="text-[9px] font-black tracking-[0.12em] text-white/60">
                      OVERSIZE
                    </p>

                    <p className="mt-1 text-[9px] text-white/25">
                      FIT
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/[0.07] bg-[#151515] px-3 py-4 text-center">
                    <p className="text-[9px] font-black tracking-[0.12em] text-white/60">
                      COTTON
                    </p>

                    <p className="mt-1 text-[9px] text-white/25">
                      MATERIAL
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/[0.07] bg-[#151515] px-3 py-4 text-center">
                    <p className="text-[9px] font-black tracking-[0.12em] text-white/60">
                      NEW
                    </p>

                    <p className="mt-1 text-[9px] text-white/25">
                      RELEASE
                    </p>
                  </div>
                </div>

                {/* PRODUCT DETAILS */}
                <div className="mt-7 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0d0d0d]">
                  <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
                    <span className="text-[10px] font-black tracking-[0.15em]">
                      PRODUCT DETAILS
                    </span>

                    <span className="text-white/30">
                      +
                    </span>
                  </div>

                  <div className="divide-y divide-white/[0.07]">
                    <div className="flex justify-between px-5 py-4 text-xs">
                      <span className="font-bold text-white/70">
                        FIT
                      </span>

                      <span className="text-white/35">
                        OVERSIZE
                      </span>
                    </div>

                    <div className="flex justify-between px-5 py-4 text-xs">
                      <span className="font-bold text-white/70">
                        MATERIAL
                      </span>

                      <span className="text-white/35">
                        PREMIUM COTTON
                      </span>
                    </div>

                    <div className="flex justify-between px-5 py-4 text-xs">
                      <span className="font-bold text-white/70">
                        BRAND
                      </span>

                      <span className="text-white/35">
                        NEWCLOTHES
                      </span>
                    </div>
                  </div>
                </div>

                {/* SHIPPING */}
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#0d0d0d] px-5 py-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black">
                    <span className="text-xs">
                      ↗
                    </span>
                  </div>

                  <div>
                    <p className="text-[10px] font-black tracking-[0.12em]">
                      READY TO SHIP
                    </p>

                    <p className="mt-1 text-[10px] text-white/35">
                      Your order will be prepared after confirmation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM NAVIGATION */}
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Link
              href="/"
              className="group flex min-h-[150px] items-end justify-between rounded-2xl border border-white/[0.07] bg-[#111] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20"
            >
              <div>
                <p className="text-[9px] font-bold tracking-[0.2em] text-white/30">
                  BACK TO
                </p>

                <p className="mt-2 text-2xl font-black tracking-[-0.04em]">
                  SHOP
                </p>
              </div>

              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-white/60 transition-all group-hover:bg-white group-hover:text-black">
                →
              </span>
            </Link>

            <Link
              href="/cart"
              className="group flex min-h-[150px] items-end justify-between rounded-2xl border border-white/[0.07] bg-white p-6 text-black transition-all duration-300 hover:-translate-y-1"
            >
              <div>
                <p className="text-[9px] font-bold tracking-[0.2em] text-black/40">
                  YOUR
                </p>

                <p className="mt-2 text-2xl font-black tracking-[-0.04em]">
                  BAG
                </p>
              </div>

              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}