"use client";

import CartButton from "./components/CartButton";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: string;
  originalPrice: number;
  tag: string;
  image: string;
  category: string;
};

type HeroSlide = {
  id: string;
  image: string;
  eyebrow: string;
  title: string;
  description: string;
  button: string;
  link: string;
};

type Drop = {
  id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  launch_date: string | null;
  limited: boolean;
};

type Offer = {
  id: string;
  name: string;
  description: string | null;
  type: "percentage" | "fixed";
  value: number;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
};

type OfferProduct = {
  offer_id: string;
  product_id: string;
};

type ProductOffer = {
  offer: Offer;
  product: Product;
  finalPrice: number;
};

type AboutContent = {
  id: string;
  image_url: string | null;
  eyebrow: string | null;
  title: string | null;
  intro: string | null;
  description: string | null;
  custom_description: string | null;
  active: boolean;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [offers, setOffers] = useState<ProductOffer[]>([]);
  const [about, setAbout] = useState<AboutContent | null>(null);

  const [currentSlide, setCurrentSlide] = useState(0);

  const [scrolled, setScrolled] = useState(false);
  const [navbarVisible, setNavbarVisible] = useState(true);

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingSlides, setLoadingSlides] = useState(true);
  const [loadingDrops, setLoadingDrops] = useState(true);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [loadingAbout, setLoadingAbout] = useState(true);

  /*
  |--------------------------------------------------------------------------
  | NAVBAR / SCROLL
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      /*
      |--------------------------------------------------------------------------
      | Tamaño / apariencia
      |--------------------------------------------------------------------------
      */

      setScrolled(currentScrollY > 30);

      /*
      |--------------------------------------------------------------------------
      | Mostrar / ocultar navbar
      |--------------------------------------------------------------------------
      */

      // Siempre visible cuando estamos prácticamente arriba.
      if (currentScrollY <= 20) {
        setNavbarVisible(true);
        lastScrollY = currentScrollY;
        return;
      }

      // Scroll hacia abajo → ocultar navbar.
      if (currentScrollY > lastScrollY + 5) {
        setNavbarVisible(false);
      }

      // Scroll hacia arriba → mostrar navbar.
      if (currentScrollY < lastScrollY - 5) {
        setNavbarVisible(true);
      }

      lastScrollY = currentScrollY;
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | SMOOTH SCROLL
  |--------------------------------------------------------------------------
  */

  const scrollToSection = (id: string) => {
    const section = document.getElementById(id);

    if (!section) return;

    const headerHeight = scrolled ? 64 : 80;

    const sectionPosition =
      section.getBoundingClientRect().top + window.scrollY;

    const offsetPosition = Math.max(
      0,
      sectionPosition - headerHeight
    );

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  };

  const handleAnchorClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    if (!href.startsWith("#")) return;

    event.preventDefault();

    const id = href.substring(1);

    if (!id) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    scrollToSection(id);
  };

  /*
  |--------------------------------------------------------------------------
  | HERO / SLIDES
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const loadSlides = async () => {
      setLoadingSlides(true);

      const supabase = createClient();

      const { data, error } = await supabase
        .from("hero_slides")
        .select(`
          id,
          image,
          eyebrow,
          title,
          subtitle,
          button_text,
          button_link
        `)
        .eq("active", true)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error cargando slides:", error);
        setSlides([]);
        setLoadingSlides(false);
        return;
      }

      const formattedSlides: HeroSlide[] = (data || [])
        .map((slide) => ({
          id: slide.id,
          image: slide.image || "",
          eyebrow: slide.eyebrow || "NEWCLOTHES",
          title: slide.title || "",
          description: slide.subtitle || "",
          button: slide.button_text || "EXPLORAR",
          link: slide.button_link || "#shop",
        }))
        .filter(
          (slide) =>
            slide.image.trim().length > 0 &&
            slide.title.trim().length > 0
        );

      setSlides(formattedSlides);
      setCurrentSlide(0);
      setLoadingSlides(false);
    };

    loadSlides();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | PRODUCTS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const loadProducts = async () => {
      setLoadingProducts(true);

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
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) {
        console.error("Error cargando productos:", error);
        setProducts([]);
        setLoadingProducts(false);
        return;
      }

      const formattedProducts: Product[] = (data || []).map((product) => {
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
          originalPrice: Number(product.price),
          price: `$${Number(product.price).toFixed(2)}`,
          tag,
          image: product.image || "/images/placeholder.png",
          category: product.category || "T-SHIRTS",
        };
      });

      setProducts(formattedProducts);
      setLoadingProducts(false);
    };

    loadProducts();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | OFFERS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const loadOffers = async () => {
      setLoadingOffers(true);

      const supabase = createClient();

      try {
        const [
          { data: offerRows, error: offersError },
          { data: relationRows, error: relationsError },
        ] = await Promise.all([
          supabase
            .from("offers")
            .select(`
              id,
              name,
              description,
              type,
              value,
              start_date,
              end_date,
              active
            `)
            .eq("active", true)
            .order("created_at", { ascending: false }),

          supabase
            .from("offer_products")
            .select(`
              offer_id,
              product_id
            `),
        ]);

        if (offersError) {
          throw new Error(
            `Error cargando ofertas: ${offersError.message}`
          );
        }

        if (relationsError) {
          throw new Error(
            `Error cargando productos de ofertas: ${relationsError.message}`
          );
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeOffers: Offer[] = (offerRows || [])
          .map((offer) => ({
            id: offer.id,
            name: offer.name,
            description: offer.description,
            type:
              offer.type === "fixed"
                ? ("fixed" as const)
                : ("percentage" as const),
            value: Number(offer.value),
            start_date: offer.start_date,
            end_date: offer.end_date,
            active: Boolean(offer.active),
          }))
          .filter((offer) => {
            if (!offer.active) return false;

            if (offer.start_date) {
              const startDate = new Date(
                `${offer.start_date.slice(0, 10)}T00:00:00`
              );

              if (today < startDate) {
                return false;
              }
            }

            if (offer.end_date) {
              const endDate = new Date(
                `${offer.end_date.slice(0, 10)}T23:59:59`
              );

              if (today > endDate) {
                return false;
              }
            }

            return true;
          });

        const relations = (relationRows || []) as OfferProduct[];

        const result: ProductOffer[] = [];

        for (const relation of relations) {
          const offer = activeOffers.find(
            (item) => item.id === relation.offer_id
          );

          if (!offer) continue;

          const product = products.find(
            (item) => item.id === relation.product_id
          );

          if (!product) continue;

          let finalPrice = product.originalPrice;

          if (offer.type === "percentage") {
            finalPrice =
              product.originalPrice -
              (product.originalPrice * offer.value) / 100;
          } else {
            finalPrice = offer.value;
          }

          finalPrice = Math.max(0, finalPrice);

          result.push({
            offer,
            product,
            finalPrice,
          });
        }

        setOffers(result);
      } catch (error) {
        console.error(error);
        setOffers([]);
      } finally {
        setLoadingOffers(false);
      }
    };

    if (!loadingProducts) {
      loadOffers();
    }
  }, [products, loadingProducts]);

  /*
  |--------------------------------------------------------------------------
  | DROPS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const loadDrops = async () => {
      setLoadingDrops(true);

      const supabase = createClient();

      const { data, error } = await supabase
        .from("drops")
        .select(`
          id,
          name,
          description,
          cover_image,
          launch_date,
          limited
        `)
        .eq("active", true)
        .order("launch_date", {
          ascending: false,
          nullsFirst: false,
        });

      if (error) {
        console.error("Error cargando drops:", error);
        setDrops([]);
        setLoadingDrops(false);
        return;
      }

      setDrops((data || []) as Drop[]);
      setLoadingDrops(false);
    };

    loadDrops();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | ABOUT
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const loadAbout = async () => {
      setLoadingAbout(true);

      const supabase = createClient();

      const { data, error } = await supabase
        .from("about_content")
        .select(`
          id,
          image_url,
          eyebrow,
          title,
          intro,
          description,
          custom_description,
          active
        `)
        .eq("active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error cargando About:", error);
        setAbout(null);
        setLoadingAbout(false);
        return;
      }

      setAbout(data as AboutContent | null);
      setLoadingAbout(false);
    };

    loadAbout();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | AUTO SLIDER
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (slides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((previous) =>
        previous === slides.length - 1 ? 0 : previous + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [slides.length]);

  const activeSlide = slides[currentSlide];

  /*
  |--------------------------------------------------------------------------
  | HELPERS
  |--------------------------------------------------------------------------
  */

  const formatPrice = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  const getDiscountLabel = (offer: Offer) => {
    if (offer.type === "percentage") {
      return `${offer.value}% OFF`;
    }

    return "SPECIAL PRICE";
  };

  const getOfferForProduct = (productId: string) => {
    return offers.find(
      (item) => item.product.id === productId
    );
  };

  /*
  |--------------------------------------------------------------------------
  | DATE FORMAT
  |--------------------------------------------------------------------------
  */

  const formatDate = (date: string | null) => {
    if (!date) return "PRÓXIMAMENTE";

    const parsedDate = new Date(`${date}T00:00:00`);

    if (Number.isNaN(parsedDate.getTime())) {
      return "PRÓXIMAMENTE";
    }

    return parsedDate
      .toLocaleDateString("es-VE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(".", "")
      .toUpperCase();
  };

  /*
  |--------------------------------------------------------------------------
  | HOME
  |--------------------------------------------------------------------------
  */

  return (
    <>
      {/* ================================================================
          NAVBAR
      ================================================================= */}

      <header
        className={`fixed left-0 right-0 top-0 z-[99999] w-full pointer-events-auto border-b transition-all duration-500 ease-in-out ${
          navbarVisible
            ? "translate-y-0"
            : "-translate-y-[110%]"
        } ${
          scrolled
            ? "border-white/[0.07] bg-black/95 shadow-2xl shadow-black/30 backdrop-blur-2xl"
            : "border-white/10 bg-black/80 backdrop-blur-xl"
        }`}
      >
        <div
          className={`mx-auto flex w-full max-w-[1500px] items-center justify-between px-5 transition-all duration-500 ease-out md:px-8 ${
            scrolled ? "h-16" : "h-20"
          }`}
        >
          <a
            href="/"
            className={`shrink-0 font-black tracking-[-0.08em] text-white transition-all duration-500 ease-out ${
              scrolled ? "text-lg" : "text-xl"
            }`}
          >
            NEWCLOTHES
          </a>

          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="/"
              className="text-[10px] font-black tracking-[0.25em] text-white transition hover:text-white/50"
            >
              HOME
            </a>

            <a
              href="#shop"
              onClick={(event) =>
                handleAnchorClick(event, "#shop")
              }
              className="text-[10px] font-black tracking-[0.25em] text-white/60 transition hover:text-white"
            >
              SHOP
            </a>

            <a
              href="#drops"
              onClick={(event) =>
                handleAnchorClick(event, "#drops")
              }
              className="text-[10px] font-black tracking-[0.25em] text-white/60 transition hover:text-white"
            >
              DROPS
            </a>

            <a
              href="#about"
              onClick={(event) =>
                handleAnchorClick(event, "#about")
              }
              className="text-[10px] font-black tracking-[0.25em] text-white/60 transition hover:text-white"
            >
              ABOUT
            </a>
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <CartButton />
          </div>
        </div>
      </header>

      {/* ================================================================
          CONTENIDO PRINCIPAL
      ================================================================= */}

      <main className="min-h-screen bg-black text-white">
        {/* ================================================================
            HERO
        ================================================================= */}

        <section className="relative min-h-screen overflow-hidden bg-black">
          {loadingSlides ? (
            <div className="flex min-h-screen items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border border-white/20 border-t-white" />
            </div>
          ) : activeSlide ? (
            <>
              <div className="absolute inset-0">
                <img
                  src={activeSlide.image}
                  alt={activeSlide.title}
                  className="h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-black/35" />

                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/30" />

                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/10 to-transparent" />
              </div>

              <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1500px] flex-col justify-between px-6 pb-8 pt-32 sm:px-8 md:px-12 lg:px-16 md:pb-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[9px] font-black tracking-[0.4em] text-white/60">
                      {activeSlide.eyebrow}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[9px] font-black tracking-[0.3em] text-white/50">
                      NEW DROP
                    </p>

                    <p className="mt-1 text-[9px] font-black tracking-[0.3em] text-white/30">
                      001 / 2026
                    </p>
                  </div>
                </div>

                <div className="w-full max-w-4xl -translate-x-2 sm:-translate-x-3 md:-translate-x-5 lg:-translate-x-7">
                  <h1 className="max-w-5xl text-6xl font-black uppercase leading-[0.84] tracking-[-0.08em] md:text-8xl lg:text-[9rem]">
                    {activeSlide.title}
                  </h1>

                  {activeSlide.description && (
                    <p className="mt-7 max-w-md text-sm leading-6 text-white/65 md:text-base">
                      {activeSlide.description}
                    </p>
                  )}

                  <div className="mt-8">
                    <a
                      href={activeSlide.link}
                      onClick={(event) =>
                        handleAnchorClick(
                          event,
                          activeSlide.link
                        )
                      }
                      className="inline-flex items-center gap-4 rounded-full bg-white px-7 py-4 text-[10px] font-black tracking-[0.2em] text-black transition hover:scale-[1.03] hover:bg-white/90"
                    >
                      {activeSlide.button}

                      <span className="text-sm">
                        →
                      </span>
                    </a>
                  </div>
                </div>

                <div className="flex items-end justify-between border-t border-white/20 pt-5">
                  <div className="flex gap-8">
                    <div>
                      <p className="text-[8px] font-black tracking-[0.3em] text-white/30">
                        LOCATION
                      </p>

                      <p className="mt-1 text-[9px] font-black tracking-[0.2em]">
                        VALENCIA
                      </p>
                    </div>

                    <div>
                      <p className="text-[8px] font-black tracking-[0.3em] text-white/30">
                        CATEGORY
                      </p>

                      <p className="mt-1 text-[9px] font-black tracking-[0.2em]">
                        STREETWEAR
                      </p>
                    </div>

                    <div>
                      <p className="text-[8px] font-black tracking-[0.3em] text-white/30">
                        RELEASE
                      </p>

                      <p className="mt-1 text-[9px] font-black tracking-[0.2em]">
                        001
                      </p>
                    </div>
                  </div>

                  {slides.length > 1 && (
                    <div className="flex gap-2">
                      {slides.map((slide, index) => (
                        <button
                          key={slide.id}
                          type="button"
                          onClick={() =>
                            setCurrentSlide(index)
                          }
                          className={`h-1 transition-all ${
                            index === currentSlide
                              ? "w-10 bg-white"
                              : "w-4 bg-white/30"
                          }`}
                          aria-label={`Ir al slide ${index + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-screen items-center justify-center px-5">
              <div className="text-center">
                <p className="text-[10px] font-black tracking-[0.4em] text-white/30">
                  NEWCLOTHES
                </p>

                <h1 className="mt-5 text-6xl font-black tracking-[-0.08em] md:text-8xl">
                  STREETWEAR.
                </h1>

                <a
                  href="#shop"
                  onClick={(event) =>
                    handleAnchorClick(event, "#shop")
                  }
                  className="mt-8 inline-flex rounded-full bg-white px-7 py-4 text-[10px] font-black tracking-[0.2em] text-black"
                >
                  TIENDA ONLINE →
                </a>
              </div>
            </div>
          )}
        </section>

        {/* ================================================================
            MARQUEE
        ================================================================= */}

        <section className="overflow-hidden border-y border-white/10 bg-white py-3 text-black">
          <div className="whitespace-nowrap">
            <div className="animate-[marquee_22s_linear_infinite] text-xl font-black tracking-[-0.04em] sm:text-2xl md:text-3xl">
              NEWCLOTHES — STREETWEAR — NEWCLOTHES — STREETWEAR — NEWCLOTHES —
              STREETWEAR — NEWCLOTHES — STREETWEAR —
            </div>
          </div>
        </section>

        {/* ================================================================
            TIENDA ONLINE
        ================================================================= */}

        <section
          id="shop"
          className="scroll-mt-20 bg-black px-5 py-20 md:px-8 md:py-28"
        >
          <div className="mx-auto max-w-[1500px]">
            <div className="mb-12 flex flex-col justify-between gap-8 md:flex-row md:items-end">
              <div>
                <p className="mb-4 text-[9px] font-black tracking-[0.4em] text-white/30">
                  001 / ONLINE STORE
                </p>

                <h2 className="text-5xl font-black uppercase leading-[0.86] tracking-[-0.07em] md:text-7xl">
                  TIENDA
                  <br />
                  ONLINE.
                </h2>
              </div>

              <div className="max-w-xs">
                <p className="text-xs leading-6 text-white/40">
                  Explora las piezas disponibles de NEWCLOTHES.
                  Diseños exclusivos, identidad urbana y unidades
                  seleccionadas.
                </p>
              </div>
            </div>

            {loadingProducts ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="aspect-[3/4] animate-pulse rounded-[1.5rem] bg-white/5"
                  />
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
                {products.map((product, index) => {
                  const productOffer =
                    getOfferForProduct(product.id);

                  return (
                    <a
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

                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-70" />
                      </div>

                      <div className="absolute left-4 top-4">
                        <span className="text-[9px] font-black tracking-[0.25em] text-white/60">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>

                      {productOffer ? (
                        <div className="absolute right-4 top-4">
                          <span className="rounded-full border border-white/30 bg-white px-3 py-1.5 text-[8px] font-black tracking-[0.18em] text-black backdrop-blur-md">
                            OFERTA
                          </span>
                        </div>
                      ) : product.tag ? (
                        <div className="absolute right-4 top-4">
                          <span className="rounded-full border border-white/20 bg-black/50 px-3 py-1.5 text-[8px] font-black tracking-[0.18em] backdrop-blur-md">
                            {product.tag}
                          </span>
                        </div>
                      ) : null}

                      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                        <p className="mb-1 text-[8px] font-black tracking-[0.25em] text-white/40">
                          {product.category}
                        </p>

                        <div className="flex items-end justify-between gap-3">
                          <h3 className="text-sm font-black uppercase tracking-[-0.02em] md:text-lg">
                            {product.name}
                          </h3>

                          {productOffer ? (
                            <div className="shrink-0 text-right">
                              <div className="text-[9px] font-bold text-white/35 line-through">
                                {formatPrice(
                                  product.originalPrice
                                )}
                              </div>

                              <div className="text-xs font-black text-white">
                                {formatPrice(
                                  productOffer.finalPrice
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="shrink-0 text-xs font-black">
                              {product.price}
                            </span>
                          )}
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                          <span className="text-[8px] font-black tracking-[0.2em] text-white/35">
                            {productOffer
                              ? getDiscountLabel(
                                  productOffer.offer
                                )
                              : "VIEW PRODUCT"}
                          </span>

                          <span className="text-sm transition-transform duration-300 group-hover:translate-x-1">
                            →
                          </span>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] px-6 py-20 text-center">
                <p className="text-[10px] font-black tracking-[0.35em] text-white/30">
                  PRÓXIMAMENTE
                </p>

                <h3 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                  NUEVAS PIEZAS.
                </h3>
              </div>
            )}

            <div className="mt-10 flex justify-end">
              <a
                href="#shop"
                onClick={(event) =>
                  handleAnchorClick(event, "#shop")
                }
                className="group inline-flex items-center gap-4 border-b border-white/30 pb-2 text-[9px] font-black tracking-[0.25em] transition hover:border-white"
              >
                VER PRODUCTOS

                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </a>
            </div>
          </div>
        </section>

        {/* ================================================================
            DROPS EXCLUSIVOS
        ================================================================= */}

        <section
          id="drops"
          className="scroll-mt-20 border-t border-white/10 bg-[#080808] px-5 py-20 md:px-8 md:py-28"
        >
          <div className="mx-auto max-w-[1500px]">
            <div className="mb-12 flex flex-col justify-between gap-8 md:flex-row md:items-end">
              <div>
                <p className="mb-4 text-[9px] font-black tracking-[0.4em] text-white/30">
                  002 / EXCLUSIVE RELEASES
                </p>

                <h2 className="text-5xl font-black uppercase leading-[0.86] tracking-[-0.07em] md:text-7xl">
                  DROPS
                  <br />
                  EXCLUSIVOS.
                </h2>
              </div>

              <div className="max-w-sm">
                <p className="text-xs leading-6 text-white/40">
                  Lanzamientos especiales, piezas limitadas y colecciones
                  creadas para representar la identidad de NEWCLOTHES.
                </p>

                <a
                  href="/drops"
                  className="group mt-7 inline-flex items-center gap-4 rounded-full bg-white px-6 py-4 text-[9px] font-black tracking-[0.2em] text-black transition hover:scale-[1.03]"
                >
                  VER TODOS LOS DROPS

                  <span className="text-sm transition-transform duration-300 group-hover:translate-x-1">
                    ↗
                  </span>
                </a>
              </div>
            </div>

            {loadingDrops ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="aspect-[1.15/1] animate-pulse rounded-[2rem] bg-white/5"
                  />
                ))}
              </div>
            ) : drops.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {drops.slice(0, 4).map((drop, index) => (
                  <a
                    key={drop.id}
                    href={`/drops/${drop.id}`}
                    className="group block"
                  >
                    <div className="relative overflow-hidden rounded-[2rem] bg-[#0b0b0b]">
                      <div className="relative aspect-[1.15/1] overflow-hidden">
                        {drop.cover_image ? (
                          <img
                            src={drop.cover_image}
                            alt={drop.name}
                            className="h-full w-full object-cover transition duration-1000 ease-out group-hover:scale-[1.045]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-white/[0.03]">
                            <span className="text-[10px] font-black tracking-[0.35em] text-white/20">
                              NEWCLOTHES
                            </span>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent" />

                        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
                      </div>

                      <div className="absolute left-5 top-5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/65 text-[8px] font-black tracking-[0.15em] backdrop-blur-md">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>

                      {drop.limited && (
                        <div className="absolute right-5 top-5">
                          <span className="rounded-full border border-white/20 bg-black/55 px-4 py-2 text-[8px] font-black tracking-[0.2em] backdrop-blur-md">
                            LIMITED
                          </span>
                        </div>
                      )}

                      <div className="absolute bottom-5 right-5">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black transition duration-300 group-hover:scale-110">
                          <span className="text-base">
                            ↗
                          </span>
                        </span>
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
                        <p className="mb-2 text-[8px] font-black tracking-[0.3em] text-white/45">
                          EXCLUSIVE RELEASE
                        </p>

                        <h3 className="max-w-[82%] text-2xl font-black uppercase leading-[0.92] tracking-[-0.05em] md:text-4xl">
                          {drop.name}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-b border-white/10 px-1 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-[8px] font-black tracking-[0.18em] text-white/35">
                          {drop.description ||
                            "EXCLUSIVO DROP - NEWCLOTHES"}
                        </p>

                        <p className="mt-2 text-[7px] font-black tracking-[0.25em] text-white/20">
                          RELEASE {formatDate(drop.launch_date)}
                        </p>
                      </div>

                      <span className="ml-4 shrink-0 text-[8px] font-black tracking-[0.2em] text-white/40 transition group-hover:text-white">
                        EXPLORAR →
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] px-6 py-24 text-center">
                <p className="text-[9px] font-black tracking-[0.35em] text-white/30">
                  EXCLUSIVE RELEASES
                </p>

                <h3 className="mt-5 text-4xl font-black uppercase tracking-[-0.06em] md:text-6xl">
                  PRÓXIMAMENTE.
                </h3>

                <p className="mx-auto mt-5 max-w-md text-xs leading-6 text-white/35">
                  Nuevos drops exclusivos de NEWCLOTHES estarán
                  disponibles próximamente.
                </p>
              </div>
            )}

            {drops.length > 4 && (
              <div className="mt-10 flex justify-end">
                <a
                  href="/drops"
                  className="group inline-flex items-center gap-4 border-b border-white/30 pb-2 text-[9px] font-black tracking-[0.25em] transition hover:border-white"
                >
                  VER TODOS LOS DROPS

                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </a>
              </div>
            )}
          </div>
        </section>

        {/* ================================================================
            BRAND STATEMENT
        ================================================================= */}

        <section className="px-5 py-24 md:px-8 md:py-36">
          <div className="mx-auto max-w-[1500px]">
            <div className="grid gap-12 md:grid-cols-[1.2fr_0.8fr] md:items-end">
              <h2 className="text-4xl font-black uppercase leading-[0.88] tracking-[-0.06em] md:text-7xl">
                NO SE TRATA
                <br />
                DE SEGUIR
                <br />
                TENDENCIAS.
              </h2>

              <div>
                <p className="max-w-md text-sm leading-7 text-white/45">
                  NEWCLOTHES nace para quienes construyen su propia
                  identidad. Streetwear, cultura y diseño en una sola
                  dirección.
                </p>

                <div className="mt-8 h-px w-20 bg-white/30" />
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            OFERTAS ESPECIALES
        ================================================================= */}

        <section className="border-t border-white/10 bg-[#080808] px-5 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-[1500px]">
            <div className="mb-12 flex flex-col justify-between gap-8 md:flex-row md:items-end">
              <div>
                <p className="mb-4 text-[9px] font-black tracking-[0.4em] text-white/30">
                  003 / SPECIAL OFFERS
                </p>

                <h2 className="text-5xl font-black uppercase leading-[0.86] tracking-[-0.07em] md:text-7xl">
                  OFERTAS
                  <br />
                  ESPECIALES.
                </h2>
              </div>

              <div className="max-w-sm">
                <p className="text-xs leading-6 text-white/40">
                  Selección especial de piezas NEWCLOTHES con precios
                  promocionales por tiempo limitado.
                </p>
              </div>
            </div>

            {loadingOffers ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="aspect-[3/4] animate-pulse rounded-[1.5rem] bg-white/5"
                  />
                ))}
              </div>
            ) : offers.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
                {offers.slice(0, 6).map((item) => (
                  <a
                    key={`${item.offer.id}-${item.product.id}`}
                    href={`/product/${item.product.slug}`}
                    className="group relative overflow-hidden rounded-[1.5rem] bg-[#0b0b0b]"
                  >
                    <div className="aspect-[3/4] overflow-hidden">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    </div>

                    <div className="absolute left-4 top-4">
                      <span className="rounded-full bg-white px-3 py-1.5 text-[8px] font-black tracking-[0.18em] text-black">
                        OFERTA ESPECIAL
                      </span>
                    </div>

                    <div className="absolute right-4 top-4">
                      <span className="rounded-full border border-white/25 bg-black/60 px-3 py-1.5 text-[8px] font-black tracking-[0.18em] backdrop-blur-md">
                        {getDiscountLabel(item.offer)}
                      </span>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                      <p className="mb-1 text-[8px] font-black tracking-[0.25em] text-white/40">
                        {item.product.category}
                      </p>

                      <h3 className="text-sm font-black uppercase tracking-[-0.02em] md:text-lg">
                        {item.product.name}
                      </h3>

                      <div className="mt-3 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[9px] font-bold text-white/35 line-through">
                            {formatPrice(
                              item.product.originalPrice
                            )}
                          </p>

                          <p className="text-lg font-black md:text-xl">
                            {formatPrice(item.finalPrice)}
                          </p>
                        </div>

                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition duration-300 group-hover:scale-110">
                          →
                        </span>
                      </div>

                      <div className="mt-4 border-t border-white/10 pt-3">
                        <span className="text-[8px] font-black tracking-[0.2em] text-white/40">
                          {item.offer.name}
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] px-6 py-20 text-center">
                <p className="text-[9px] font-black tracking-[0.35em] text-white/30">
                  SPECIAL OFFERS
                </p>

                <h3 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                  PRÓXIMAMENTE.
                </h3>

                <p className="mx-auto mt-4 max-w-md text-xs leading-6 text-white/35">
                  Las próximas ofertas especiales de NEWCLOTHES
                  aparecerán aquí.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ================================================================
            SHOP BY CATEGORY
        ================================================================= */}

        <section className="border-t border-white/10 px-5 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-[1500px]">
            <div className="mb-12">
              <p className="mb-4 text-[9px] font-black tracking-[0.4em] text-white/30">
                003 / CATEGORIES
              </p>

              <h2 className="text-4xl font-black uppercase leading-[0.9] tracking-[-0.06em] md:text-6xl">
                SHOP BY
                <br />
                CATEGORY.
              </h2>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  title: "T-SHIRTS",
                  number: "01",
                },
                {
                  title: "HOODIES",
                  number: "02",
                },
                {
                  title: "ESSENTIALS",
                  number: "03",
                },
              ].map((category) => (
                <a
                  key={category.title}
                  href="#shop"
                  onClick={(event) =>
                    handleAnchorClick(event, "#shop")
                  }
                  className="group relative flex min-h-[260px] items-end overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0a0a0a] p-6 transition hover:bg-white hover:text-black md:min-h-[360px]"
                >
                  <div className="absolute right-5 top-5 text-[9px] font-black tracking-[0.2em] text-white/20 transition group-hover:text-black/30">
                    {category.number}
                  </div>

                  <div>
                    <p className="mb-3 text-[8px] font-black tracking-[0.3em] text-white/30 transition group-hover:text-black/40">
                      NEWCLOTHES
                    </p>

                    <h3 className="text-3xl font-black tracking-[-0.05em] md:text-4xl">
                      {category.title}
                    </h3>

                    <div className="mt-5 flex items-center gap-3 text-[8px] font-black tracking-[0.2em]">
                      EXPLORE

                      <span className="transition-transform duration-300 group-hover:translate-x-1">
                        →
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            ABOUT — WHO WE ARE
        ================================================================= */}

        <section
          id="about"
          className="scroll-mt-20 relative overflow-hidden border-t border-black/10 bg-white text-black"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 top-0 select-none text-[32vw] font-black leading-none tracking-[-0.12em] text-black/[0.035] md:-right-20 md:text-[24rem]"
          >
            004
          </div>

          <div className="relative mx-auto max-w-[1500px] px-5 py-24 md:px-8 md:py-32">
            <div className="mb-16 flex items-start justify-between border-b border-black/10 pb-5 md:mb-20">
              <p className="text-[9px] font-black tracking-[0.45em] text-black/35">
                004 / ABOUT NEWCLOTHES
              </p>

              <p className="hidden text-[8px] font-black tracking-[0.3em] text-black/30 sm:block">
                STREETWEAR / VALENCIA / VENEZUELA
              </p>
            </div>

            <div className="grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-20">
              <div className="group relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-[#e9e9e9]">
                {loadingAbout ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border border-black/10 border-t-black" />
                  </div>
                ) : about?.image_url ? (
                  <img
                    src={about.image_url}
                    alt={about.title || "NEWCLOTHES"}
                    className="h-full w-full object-cover transition duration-1000 ease-out group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-[9px] font-black tracking-[0.4em] text-black/25">
                        NEWCLOTHES
                      </p>

                      <p className="mt-3 text-[8px] font-black tracking-[0.3em] text-black/15">
                        ABOUT / BRAND
                      </p>
                    </div>
                  </div>
                )}

                <div className="absolute left-5 top-5">
                  <span className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-[8px] font-black tracking-[0.2em] backdrop-blur-md">
                    004
                  </span>
                </div>

                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
                  <span className="text-[8px] font-black tracking-[0.25em] text-black/30">
                    PREMIUM STREETWEAR
                  </span>

                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white transition duration-500 group-hover:rotate-45">
                    ↗
                  </span>
                </div>
              </div>

              <div>
                <p className="mb-6 text-[9px] font-black tracking-[0.4em] text-black/35">
                  {about?.eyebrow || "QUIÉNES SOMOS"}
                </p>

                <h2 className="max-w-3xl text-6xl font-black uppercase leading-[0.8] tracking-[-0.09em] md:text-8xl">
                  {(about?.title || "VISTE TU IDENTIDAD.")
                    .split("\n")
                    .map((line, index) => (
                      <span key={index} className="block">
                        {line}
                      </span>
                    ))}
                </h2>

                <div className="mt-10 h-px w-16 bg-black/20" />

                {about?.intro ? (
                  <p className="mt-8 max-w-lg whitespace-pre-line text-lg font-bold uppercase leading-[1.2] tracking-[-0.03em] md:text-2xl">
                    {about.intro}
                  </p>
                ) : (
                  <p className="mt-8 max-w-lg text-lg font-bold uppercase leading-[1.2] tracking-[-0.03em] md:text-2xl">
                    ROPA STREETWEAR
                    <br />
                    TOTALMENTE PREMIUM.
                    <br />
                    HECHA PARA TI.
                  </p>
                )}

                {about?.description ? (
                  <p className="mt-7 max-w-lg whitespace-pre-line text-sm leading-7 text-black/50">
                    {about.description}
                  </p>
                ) : (
                  <p className="mt-7 max-w-lg text-sm leading-7 text-black/50">
                    En NEWCLOTHES creamos y seleccionamos prendas
                    streetwear premium para quienes buscan vestir
                    diferente. Nos enfocamos en diseños con carácter,
                    calidad y una estética que se adapta a cada persona.
                  </p>
                )}

                {about?.custom_description ? (
                  <p className="mt-5 max-w-lg whitespace-pre-line text-sm leading-7 text-black/50">
                    {about.custom_description}
                  </p>
                ) : (
                  <p className="mt-5 max-w-lg text-sm leading-7 text-black/50">
                    También hacemos ropa personalizada, llevando
                    tus ideas a prendas creadas totalmente a tu estilo.
                    Tú imaginas el diseño. Nosotros lo convertimos
                    en una pieza que representa quién eres.
                  </p>
                )}

                <a
                  href="#shop"
                  onClick={(event) =>
                    handleAnchorClick(event, "#shop")
                  }
                  className="group mt-9 inline-flex items-center gap-4 rounded-full bg-black px-7 py-4 text-[9px] font-black tracking-[0.2em] text-white transition duration-300 hover:scale-[1.03] hover:bg-black/85"
                >
                  DESCUBRIR NEWCLOTHES

                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </a>
              </div>
            </div>

            <div className="mt-20 border-t border-black/10 pt-6 md:mt-28">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                <p className="text-[8px] font-black tracking-[0.3em] text-black/30">
                  PREMIUM STREETWEAR / CUSTOM DESIGN
                </p>

                <p className="text-[8px] font-black tracking-[0.3em] text-black/30 md:text-right">
                  VISTE TU IDENTIDAD
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            NEWSLETTER
        ================================================================= */}

        <section className="border-t border-white/10 px-5 py-24 md:px-8 md:py-32">
          <div className="mx-auto max-w-[900px] text-center">
            <p className="text-[9px] font-black tracking-[0.4em] text-white/30">
              STAY UPDATED
            </p>

            <h2 className="mt-5 text-4xl font-black uppercase leading-[0.88] tracking-[-0.06em] md:text-6xl">
              BE PART OF
              <br />
              THE DROP.
            </h2>

            <p className="mx-auto mt-6 max-w-md text-xs leading-6 text-white/40">
              Mantente al día con nuevos productos, drops exclusivos
              y novedades de NEWCLOTHES.
            </p>

            <form
              className="mx-auto mt-10 flex max-w-lg flex-col gap-3 sm:flex-row"
              onSubmit={(event) =>
                event.preventDefault()
              }
            >
              <input
                type="email"
                placeholder="TU EMAIL"
                className="h-14 flex-1 rounded-full border border-white/10 bg-white/[0.03] px-6 text-[10px] font-black tracking-[0.15em] text-white outline-none placeholder:text-white/20 focus:border-white/30"
              />

              <button
                type="submit"
                className="h-14 rounded-full bg-white px-7 text-[9px] font-black tracking-[0.2em] text-black transition hover:bg-white/90"
              >
                SUSCRIBIRME →
              </button>
            </form>
          </div>
        </section>

        {/* ================================================================
            FOOTER
        ================================================================= */}

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

            <div className="flex flex-wrap gap-6">
              <a
                href="/"
                className="text-[8px] font-black tracking-[0.2em] text-white/40 transition hover:text-white"
              >
                HOME
              </a>

              <a
                href="#shop"
                onClick={(event) =>
                  handleAnchorClick(event, "#shop")
                }
                className="text-[8px] font-black tracking-[0.2em] text-white/40 transition hover:text-white"
              >
                SHOP
              </a>

              <a
                href="#drops"
                onClick={(event) =>
                  handleAnchorClick(event, "#drops")
                }
                className="text-[8px] font-black tracking-[0.2em] text-white/40 transition hover:text-white"
              >
                DROPS
              </a>

              <a
                href="#about"
                onClick={(event) =>
                  handleAnchorClick(event, "#about")
                }
                className="text-[8px] font-black tracking-[0.2em] text-white/40 transition hover:text-white"
              >
                ABOUT
              </a>
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-[1500px] border-t border-white/10 pt-5">
            <p className="text-[8px] font-black tracking-[0.2em] text-white/20">
              © {new Date().getFullYear()} NEWCLOTHES. ALL RIGHTS RESERVED.
            </p>
          </div>
        </footer>
      </main>

      {/* ================================================================
          MARQUEE ANIMATION
      ================================================================= */}

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          padding: 0;
        }

        @keyframes marquee {
          0% {
            transform: translateX(0);
          }

          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </>
  );
}