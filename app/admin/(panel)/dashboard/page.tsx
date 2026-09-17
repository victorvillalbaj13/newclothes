"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Order = {
  id: string;
  order_number: number;
  customer_name: string;
  email: string | null;
  status: string;
  created_at: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
  image: string | null;
  published: boolean;
  active: boolean;
};

type Variant = {
  product_id: string;
  stock: number;
};

type OrderItem = {
  product_id: string | null;
  quantity: number;
  price: number;
  order_id: string;
};

type StoreEvent = {
  id: string;
  event_type:
    | "PAGE_VIEW"
    | "PRODUCT_VIEW"
    | "BUY_CLICK"
    | "WHATSAPP_CLICK";
  product_id: string | null;
  session_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type WhatsAppItem = {
  slug?: string;
  name?: string;
  size?: string;
  color?: string;
  quantity?: number;
  price?: number;
  variant_id?: string;
};

type DashboardData = {
  orders: Order[];
  products: Product[];
  variants: Variant[];
  orderItems: OrderItem[];
  events: StoreEvent[];

  totalOrders: number;
  pendingOrders: number;

  activeDrops: number;
  activeOffers: number;
  activeSlides: number;
};

type ProductAnalytics = Product & {
  productViews: number;
  buyClicks: number;
  whatsappClicks: number;
  sold: number;
  revenue: number;
  intentRate: number;
  saleRate: number;
};

const supabase = createClient();

const initialData: DashboardData = {
  orders: [],
  products: [],
  variants: [],
  orderItems: [],
  events: [],

  totalOrders: 0,
  pendingOrders: 0,

  activeDrops: 0,
  activeOffers: 0,
  activeSlides: 0,
};

export default function DashboardAdmin() {
  const [data, setData] =
    useState<DashboardData>(initialData);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard(manual = false) {
    if (manual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const [
        recentOrdersResult,
        totalOrdersResult,
        pendingOrdersResult,
        productsResult,
        variantsResult,
        orderItemsResult,
        eventsResult,
        dropsResult,
        offersResult,
        slidesResult,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "id,order_number,customer_name,email,status,created_at"
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(6),

        supabase
          .from("orders")
          .select("id", {
            count: "exact",
            head: true,
          })
          .neq("status", "CANCELLED"),

        supabase
          .from("orders")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("status", "PENDING"),

        supabase
          .from("products")
          .select(
            "id,name,price,image,published,active"
          )
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("product_variants")
          .select(
            "product_id,stock"
          ),

        supabase
          .from("order_items")
          .select(
            "product_id,quantity,price,order_id"
          ),

        supabase
          .from("store_events")
          .select(
            "id,event_type,product_id,session_id,metadata,created_at"
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(1000),

        supabase
          .from("drops")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("active", true),

        supabase
          .from("offers")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("active", true),

        supabase
          .from("hero_slides")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("active", true),
      ]);

      const results = [
        recentOrdersResult,
        totalOrdersResult,
        pendingOrdersResult,
        productsResult,
        variantsResult,
        orderItemsResult,
        eventsResult,
        dropsResult,
        offersResult,
        slidesResult,
      ];

      const firstError = results.find(
        (result) => result.error
      );

      if (firstError?.error) {
        console.error(
          "Dashboard Supabase error:",
          firstError.error
        );

        setError(
          "No se pudieron cargar todos los datos del dashboard."
        );
      }

      setData({
        orders:
          (recentOrdersResult.data ||
            []) as Order[],

        products:
          (productsResult.data ||
            []) as Product[],

        variants:
          (variantsResult.data ||
            []) as Variant[],

        orderItems:
          (orderItemsResult.data ||
            []) as OrderItem[],

        events:
          (eventsResult.data ||
            []) as StoreEvent[],

        totalOrders:
          totalOrdersResult.count || 0,

        pendingOrders:
          pendingOrdersResult.count || 0,

        activeDrops:
          dropsResult.count || 0,

        activeOffers:
          offersResult.count || 0,

        activeSlides:
          slidesResult.count || 0,
      });
    } catch (error) {
      console.error(
        "Error inesperado cargando Dashboard:",
        error
      );

      setError(
        "Ocurrió un error al cargar el dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  /*
   * =========================================================
   * ESTADÍSTICAS GENERALES
   * =========================================================
   */

  const stats = useMemo(() => {
    /*
     * Los pedidos que cuentan como venta real:
     *
     * CONFIRMED
     * SHIPPED
     * DELIVERED
     *
     * No contamos:
     * PENDING
     * CANCELLED
     */

    const confirmedOrderIds = new Set(
      data.orders
        .filter((order) =>
          [
            "CONFIRMED",
            "SHIPPED",
            "DELIVERED",
          ].includes(order.status)
        )
        .map((order) => order.id)
    );

    /*
     * IMPORTANTE:
     *
     * La consulta de pedidos recientes está limitada
     * a 6 registros.
     *
     * Por eso el cálculo de ventas generales utiliza
     * todos los order_items solamente cuando podemos
     * relacionarlos con un pedido confirmado que esté
     * disponible en los datos cargados.
     *
     * Si posteriormente quieres un reporte financiero
     * histórico completo, conviene mover este cálculo
     * a una consulta/RPC específica.
     */

    const totalRevenue =
      data.orderItems.reduce(
        (sum, item) => {
          if (
            !confirmedOrderIds.has(
              item.order_id
            )
          ) {
            return sum;
          }

          return (
            sum +
            Number(item.price || 0) *
              Number(item.quantity || 0)
          );
        },
        0
      );

    const totalUnits =
      data.variants.reduce(
        (sum, variant) =>
          sum +
          Number(variant.stock || 0),
        0
      );

    const lowStockVariants =
      data.variants.filter(
        (variant) =>
          Number(variant.stock) > 0 &&
          Number(variant.stock) <= 5
      ).length;

    const soldOutVariants =
      data.variants.filter(
        (variant) =>
          Number(variant.stock) === 0
      ).length;

    const publishedProducts =
      data.products.filter(
        (product) =>
          product.published &&
          product.active
      ).length;

    const pageViews =
      data.events.filter(
        (event) =>
          event.event_type ===
          "PAGE_VIEW"
      ).length;

    const productViews =
      data.events.filter(
        (event) =>
          event.event_type ===
          "PRODUCT_VIEW"
      ).length;

    const buyClicks =
      data.events.filter(
        (event) =>
          event.event_type ===
          "BUY_CLICK"
      ).length;

    const whatsappClicks =
      data.events.filter(
        (event) =>
          event.event_type ===
          "WHATSAPP_CLICK"
      ).length;

    const uniqueSessions =
      new Set(
        data.events
          .map(
            (event) =>
              event.session_id
          )
          .filter(Boolean)
      ).size;

    return {
      totalRevenue,
      totalUnits,
      lowStockVariants,
      soldOutVariants,
      publishedProducts,

      pageViews,
      productViews,
      buyClicks,
      whatsappClicks,
      uniqueSessions,

      confirmedOrderIds,
    };
  }, [data]);

  /*
   * =========================================================
   * ANALYTICS POR PRODUCTO
   * =========================================================
   */

  const productAnalytics =
    useMemo(() => {
      const views = new Map<
        string,
        number
      >();

      const buyClicks = new Map<
        string,
        number
      >();

      const whatsappClicks =
        new Map<string, number>();

      const sold = new Map<
        string,
        number
      >();

      const revenue = new Map<
        string,
        number
      >();

      /*
       * PRODUCT_VIEW y BUY_CLICK
       *
       * Estos eventos tienen product_id
       * directamente.
       */

      data.events.forEach(
        (event) => {
          if (!event.product_id) {
            return;
          }

          if (
            event.event_type ===
            "PRODUCT_VIEW"
          ) {
            views.set(
              event.product_id,
              (views.get(
                event.product_id
              ) || 0) + 1
            );
          }

          if (
            event.event_type ===
            "BUY_CLICK"
          ) {
            buyClicks.set(
              event.product_id,
              (buyClicks.get(
                event.product_id
              ) || 0) + 1
            );
          }

          /*
           * Si en algún momento WHATSAPP_CLICK
           * viene con product_id también lo usamos.
           */
          if (
            event.event_type ===
            "WHATSAPP_CLICK"
          ) {
            whatsappClicks.set(
              event.product_id,
              (whatsappClicks.get(
                event.product_id
              ) || 0) + 1
            );
          }
        }
      );

      /*
       * WHATSAPP_CLICK
       *
       * Actualmente el carrito registra:
       *
       * product_id: null
       *
       * y guarda los productos dentro de:
       *
       * metadata.items
       *
       * Por eso tenemos que reconstruir la atribución
       * por slug/nombre.
       */

      data.events.forEach(
        (event) => {
          if (
            event.event_type !==
            "WHATSAPP_CLICK"
          ) {
            return;
          }

          const rawItems =
            event.metadata?.items;

          if (
            !Array.isArray(
              rawItems
            )
          ) {
            return;
          }

          rawItems.forEach(
            (rawItem) => {
              if (
                !rawItem ||
                typeof rawItem !==
                  "object"
              ) {
                return;
              }

              const item =
                rawItem as WhatsAppItem;

              const slug =
                typeof item.slug ===
                "string"
                  ? item.slug
                  : "";

              const name =
                typeof item.name ===
                "string"
                  ? item.name
                  : "";

              const product =
                data.products.find(
                  (currentProduct) =>
                    currentProduct.name ===
                      name ||
                    currentProduct.name
                      .toLowerCase()
                      .replace(
                        /\s+/g,
                        "-"
                      ) === slug
                );

              if (!product) {
                return;
              }

              whatsappClicks.set(
                product.id,
                (whatsappClicks.get(
                  product.id
                ) || 0) + 1
              );
            }
          );
        }
      );

      /*
       * VENTAS REALES
       *
       * Solamente:
       * CONFIRMED
       * SHIPPED
       * DELIVERED
       */

      data.orderItems.forEach(
        (item) => {
          if (
            !item.product_id ||
            !stats.confirmedOrderIds.has(
              item.order_id
            )
          ) {
            return;
          }

          const quantity =
            Number(
              item.quantity || 0
            );

          const itemRevenue =
            Number(
              item.price || 0
            ) * quantity;

          sold.set(
            item.product_id,
            (sold.get(
              item.product_id
            ) || 0) + quantity
          );

          revenue.set(
            item.product_id,
            (revenue.get(
              item.product_id
            ) || 0) +
              itemRevenue
          );
        }
      );

      return data.products
        .map(
          (product) => {
            const productViews =
              views.get(
                product.id
              ) || 0;

            const productBuyClicks =
              buyClicks.get(
                product.id
              ) || 0;

            const productWhatsapp =
              whatsappClicks.get(
                product.id
              ) || 0;

            const productSold =
              sold.get(
                product.id
              ) || 0;

            const productRevenue =
              revenue.get(
                product.id
              ) || 0;

            const intentRate =
              productViews > 0
                ? (productBuyClicks /
                    productViews) *
                  100
                : 0;

            const saleRate =
              productViews > 0
                ? (productSold /
                    productViews) *
                  100
                : 0;

            return {
              ...product,
              productViews,
              buyClicks:
                productBuyClicks,
              whatsappClicks:
                productWhatsapp,
              sold:
                productSold,
              revenue:
                productRevenue,
              intentRate,
              saleRate,
            };
          }
        )
        .filter(
          (product) =>
            product.productViews >
              0 ||
            product.buyClicks >
              0 ||
            product.whatsappClicks >
              0 ||
            product.sold >
              0
        );
    }, [
      data.products,
      data.events,
      data.orderItems,
      stats.confirmedOrderIds,
    ]);

  /*
   * =========================================================
   * PRODUCTOS CON MAYOR INTERÉS
   * =========================================================
   *
   * Ordenamos por intención de compra:
   *
   * BUY_CLICK + WHATSAPP_CLICK
   *
   * No mezclamos arbitrariamente las vistas con
   * los clics porque una vista no representa la
   * misma intención que un contacto.
   */

  const interestProducts =
    useMemo(() => {
      return [
        ...productAnalytics,
      ]
        .sort(
          (a, b) => {
            const intentA =
              a.buyClicks +
              a.whatsappClicks;

            const intentB =
              b.buyClicks +
              b.whatsappClicks;

            if (
              intentB !==
              intentA
            ) {
              return (
                intentB -
                intentA
              );
            }

            return (
              b.productViews -
              a.productViews
            );
          }
        )
        .slice(0, 6);
    }, [productAnalytics]);

  /*
   * =========================================================
   * PRODUCTOS MÁS VENDIDOS
   * =========================================================
   */

  const bestProducts =
    useMemo(() => {
      return [
        ...productAnalytics,
      ]
        .filter(
          (product) =>
            product.sold > 0
        )
        .sort(
          (a, b) =>
            b.sold -
            a.sold
        )
        .slice(0, 5);
    }, [productAnalytics]);

  /*
   * =========================================================
   * STOCK
   * =========================================================
   */

  const stockByProduct =
    useMemo(() => {
      const map =
        new Map<
          string,
          number
        >();

      data.variants.forEach(
        (variant) => {
          const current =
            map.get(
              variant.product_id
            ) || 0;

          map.set(
            variant.product_id,
            current +
              Number(
                variant.stock || 0
              )
          );
        }
      );

      return map;
    }, [data.variants]);

  /*
   * =========================================================
   * ACTIVIDAD 7 DÍAS
   * =========================================================
   */

  const activityDays =
    useMemo(() => {
      const days: {
        key: string;
        label: string;
        pageViews: number;
        productViews: number;
        buyClicks: number;
        whatsapp: number;
      }[] = [];

      for (
        let i = 6;
        i >= 0;
        i--
      ) {
        const date =
          new Date();

        date.setHours(
          0,
          0,
          0,
          0
        );

        date.setDate(
          date.getDate() -
            i
        );

        const key =
          getDateKey(date);

        const dayEvents =
          data.events.filter(
            (event) =>
              getDateKey(
                new Date(
                  event.created_at
                )
              ) === key
          );

        days.push({
          key,
          label:
            date.toLocaleDateString(
              "es-VE",
              {
                weekday:
                  "short",
              }
            ),

          pageViews:
            dayEvents.filter(
              (event) =>
                event.event_type ===
                "PAGE_VIEW"
            ).length,

          productViews:
            dayEvents.filter(
              (event) =>
                event.event_type ===
                "PRODUCT_VIEW"
            ).length,

          buyClicks:
            dayEvents.filter(
              (event) =>
                event.event_type ===
                "BUY_CLICK"
            ).length,

          whatsapp:
            dayEvents.filter(
              (event) =>
                event.event_type ===
                "WHATSAPP_CLICK"
            ).length,
        });
      }

      return days;
    }, [data.events]);

  /*
   * =========================================================
   * ÚLTIMAS INTERACCIONES
   * =========================================================
   */

  const latestEvents =
    useMemo(() => {
      return data.events.slice(
        0,
        8
      );
    }, [data.events]);

  const maxActivity =
    Math.max(
      1,
      ...activityDays.map(
        (day) =>
          day.pageViews +
          day.productViews +
          day.buyClicks +
          day.whatsapp
      )
    );

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-9">

        {/* HEADER */}

        <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="h-px w-8 bg-white/30" />

              <span className="text-[9px] font-medium uppercase tracking-[0.35em] text-zinc-500">
                NEWCLOTHES CONTROL
              </span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Dashboard
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
              Control de tienda, interacción y
              comportamiento de compra.
            </p>
          </div>

          <button
            onClick={() =>
              loadDashboard(true)
            }
            disabled={refreshing}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-400 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white disabled:opacity-40"
          >
            {refreshing
              ? "Actualizando..."
              : "↻  Actualizar datos"}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/[0.04] px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* =====================================================
                ANALYTICS
            ====================================================== */}

            <section className="mb-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                  Store Analytics
                </span>

                <div className="h-px flex-1 bg-white/[0.05]" />
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

                <AnalyticsCard
                  label="Visitas"
                  value={stats.pageViews}
                  detail="Visitas registradas"
                  icon="◉"
                />

                <AnalyticsCard
                  label="Vistas producto"
                  value={
                    stats.productViews
                  }
                  detail="Interés en productos"
                  icon="◇"
                />

                <AnalyticsCard
                  label="WhatsApp"
                  value={
                    stats.whatsappClicks
                  }
                  detail="Clics de contacto"
                  icon="↗"
                />

                <AnalyticsCard
                  label="Intención"
                  value={
                    stats.buyClicks +
                    stats.whatsappClicks
                  }
                  detail="Acciones de compra"
                  icon="◎"
                />

              </div>
            </section>

            {/* =====================================================
                ACTIVITY CHART
            ====================================================== */}

            <section className="mb-5 rounded-[28px] border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6">
              <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                    Last 7 days
                  </p>

                  <h2 className="mt-2 text-lg font-semibold">
                    Actividad de la tienda
                  </h2>
                </div>

                <div className="flex flex-wrap gap-4 text-[7px] uppercase tracking-[0.12em] text-zinc-600">
                  <span>
                    Visitas
                  </span>

                  <span>
                    Productos
                  </span>

                  <span>
                    Comprar
                  </span>

                  <span>
                    WhatsApp
                  </span>
                </div>
              </div>

              <div className="flex h-52 items-end gap-2 sm:gap-4">
                {activityDays.map(
                  (day) => {
                    const total =
                      day.pageViews +
                      day.productViews +
                      day.buyClicks +
                      day.whatsapp;

                    const height =
                      total === 0
                        ? 3
                        : Math.max(
                            8,
                            Math.round(
                              (total /
                                maxActivity) *
                                100
                            )
                          );

                    return (
                      <div
                        key={
                          day.key
                        }
                        className="flex h-full flex-1 flex-col items-center justify-end gap-3"
                      >
                        <div className="flex h-full w-full max-w-12 items-end justify-center">
                          <div
                            className="w-full rounded-t-lg bg-white/[0.09] transition hover:bg-white/[0.16]"
                            style={{
                              height: `${height}%`,
                            }}
                            title={`${total} interacciones`}
                          />
                        </div>

                        <span className="text-[7px] uppercase text-zinc-700">
                          {day.label.replace(
                            ".",
                            ""
                          )}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            </section>

            {/* =====================================================
                MAIN ANALYTICS
            ====================================================== */}

            <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">

              {/* PRODUCT INTEREST */}

              <section className="rounded-[28px] border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                      Product Interest
                    </p>

                    <h2 className="mt-2 text-lg font-semibold">
                      Productos con mayor interés
                    </h2>
                  </div>

                  <a
                    href="/admin/products"
                    className="text-[8px] font-semibold uppercase tracking-[0.15em] text-zinc-600 transition hover:text-white"
                  >
                    Productos →
                  </a>
                </div>

                {interestProducts.length ===
                0 ? (
                  <EmptyMini
                    icon="◇"
                    title="Todavía no hay interacción"
                    text="Cuando los visitantes vean productos aparecerán aquí."
                  />
                ) : (
                  <div className="space-y-2">
                    {interestProducts.map(
                      (
                        product,
                        index
                      ) => (
                        <InterestProduct
                          key={
                            product.id
                          }
                          product={
                            product
                          }
                          index={
                            index
                          }
                        />
                      )
                    )}
                  </div>
                )}
              </section>

              {/* WHATSAPP */}

              <section className="rounded-[28px] border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6">
                <div className="mb-6">
                  <p className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                    Purchase Intent
                  </p>

                  <h2 className="mt-2 text-lg font-semibold">
                    Clics hacia WhatsApp
                  </h2>
                </div>

                <div className="mb-5 rounded-2xl border border-white/[0.06] bg-black/20 p-5">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[8px] uppercase tracking-[0.16em] text-zinc-700">
                        Total
                      </p>

                      <p className="mt-2 text-4xl font-semibold">
                        {
                          stats.whatsappClicks
                        }
                      </p>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.07] text-lg text-zinc-500">
                      ↗
                    </div>
                  </div>

                  <p className="mt-4 text-[8px] leading-5 text-zinc-700">
                    Personas que iniciaron el
                    contacto para consultar o
                    comprar.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MiniMetric
                    label="Comprar"
                    value={
                      stats.buyClicks
                    }
                  />

                  <MiniMetric
                    label="WhatsApp"
                    value={
                      stats.whatsappClicks
                    }
                  />

                  <MiniMetric
                    label="Sesiones"
                    value={
                      stats.uniqueSessions
                    }
                  />

                  <MiniMetric
                    label="Pedidos"
                    value={
                      data.totalOrders
                    }
                  />
                </div>
              </section>
            </div>

            {/* =====================================================
                PRODUCT PERFORMANCE
            ====================================================== */}

            <section className="mt-5 rounded-[28px] border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6">

              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                    Product Analytics
                  </p>

                  <h2 className="mt-2 text-lg font-semibold">
                    Rendimiento por producto
                  </h2>

                  <p className="mt-2 max-w-2xl text-[8px] leading-5 text-zinc-700">
                    Aquí puedes ver qué productos reciben visitas,
                    cuáles generan intención, cuáles llevan a WhatsApp
                    y cuáles ya tienen ventas confirmadas.
                  </p>
                </div>

                <span className="text-[8px] uppercase tracking-[0.15em] text-zinc-700">
                  {productAnalytics.length} productos con actividad
                </span>
              </div>

              {productAnalytics.length ===
              0 ? (
                <EmptyMini
                  icon="◎"
                  title="Sin datos de producto todavía"
                  text="Las métricas aparecerán cuando los visitantes interactúen con tus productos."
                />
              ) : (
                <div className="space-y-2">
                  {productAnalytics
                    .sort(
                      (a, b) => {
                        if (
                          b.buyClicks +
                            b.whatsappClicks !==
                          a.buyClicks +
                            a.whatsappClicks
                        ) {
                          return (
                            b.buyClicks +
                            b.whatsappClicks -
                            (a.buyClicks +
                              a.whatsappClicks)
                          );
                        }

                        return (
                          b.productViews -
                          a.productViews
                        );
                      }
                    )
                    .map(
                      (
                        product
                      ) => (
                        <ProductAnalyticsRow
                          key={
                            product.id
                          }
                          product={
                            product
                          }
                        />
                      )
                    )}
                </div>
              )}
            </section>

            {/* =====================================================
                SECONDARY STORE STATS
            ====================================================== */}

            <div className="mt-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                  Store
                </span>

                <div className="h-px flex-1 bg-white/[0.05]" />
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

                <StatCard
                  label="Ventas"
                  value={`$${stats.totalRevenue.toFixed(
                    2
                  )}`}
                  detail="Ventas confirmadas"
                  icon="$"
                />

                <StatCard
                  label="Pedidos"
                  value={
                    data.totalOrders
                  }
                  detail={`${data.pendingOrders} pendientes`}
                  icon="↗"
                />

                <StatCard
                  label="Productos"
                  value={
                    data.products.length
                  }
                  detail={`${stats.publishedProducts} publicados`}
                  icon="◇"
                />

                <StatCard
                  label="Stock"
                  value={
                    stats.totalUnits
                  }
                  detail={
                    stats.lowStockVariants >
                    0
                      ? `${stats.lowStockVariants} variantes bajas`
                      : "Inventario disponible"
                  }
                  icon="▦"
                />

              </div>
            </div>

            {/* =====================================================
                ORDERS + INVENTORY
            ====================================================== */}

            <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">

              {/* ORDERS */}

              <section className="rounded-[28px] border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                      Orders
                    </p>

                    <h2 className="mt-2 text-lg font-semibold">
                      Pedidos recientes
                    </h2>
                  </div>

                  <a
                    href="/admin/sales"
                    className="text-[8px] font-semibold uppercase tracking-[0.15em] text-zinc-600 transition hover:text-white"
                  >
                    Ver todos →
                  </a>
                </div>

                {data.orders.length ===
                0 ? (
                  <EmptyMini
                    icon="↗"
                    title="Todavía no hay pedidos"
                    text="Cuando tus clientes realicen compras aparecerán aquí."
                  />
                ) : (
                  <div className="space-y-2">
                    {data.orders.map(
                      (order) => (
                        <RecentOrder
                          key={
                            order.id
                          }
                          order={
                            order
                          }
                        />
                      )
                    )}
                  </div>
                )}
              </section>

              {/* INVENTORY */}

              <section className="rounded-[28px] border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6">
                <div className="mb-6">
                  <p className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                    Inventory
                  </p>

                  <h2 className="mt-2 text-lg font-semibold">
                    Estado del stock
                  </h2>
                </div>

                <div className="space-y-3">
                  <InventoryRow
                    label="Unidades disponibles"
                    value={
                      stats.totalUnits
                    }
                    icon="▦"
                  />

                  <InventoryRow
                    label="Variantes con poco stock"
                    value={
                      stats.lowStockVariants
                    }
                    icon="!"
                  />

                  <InventoryRow
                    label="Variantes agotadas"
                    value={
                      stats.soldOutVariants
                    }
                    icon="×"
                  />

                  <InventoryRow
                    label="Productos publicados"
                    value={
                      stats.publishedProducts
                    }
                    icon="●"
                  />
                </div>

                <a
                  href="/admin/inventory"
                  className="mt-5 flex h-11 items-center justify-center rounded-xl border border-white/[0.07] bg-black/20 text-[8px] font-semibold uppercase tracking-[0.15em] text-zinc-500 transition hover:border-white/15 hover:text-white"
                >
                  Administrar inventario
                </a>
              </section>
            </div>

            {/* =====================================================
                RECENT INTERACTIONS
            ====================================================== */}

            <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">

              {/* LIVE ACTIVITY */}

              <section className="rounded-[28px] border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6">
                <div className="mb-6">
                  <p className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                    Live Activity
                  </p>

                  <h2 className="mt-2 text-lg font-semibold">
                    Últimas interacciones
                  </h2>
                </div>

                {latestEvents.length ===
                0 ? (
                  <EmptyMini
                    icon="◎"
                    title="Sin interacciones todavía"
                    text="Los eventos aparecerán cuando los usuarios comiencen a navegar por la tienda."
                  />
                ) : (
                  <div className="space-y-2">
                    {latestEvents.map(
                      (event) => (
                        <EventRow
                          key={
                            event.id
                          }
                          event={
                            event
                          }
                          product={
                            data.products.find(
                              (
                                product
                              ) =>
                                product.id ===
                                event.product_id
                            )
                          }
                        />
                      )
                    )}
                  </div>
                )}
              </section>

              {/* CAMPAIGNS */}

              <section className="rounded-[28px] border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6">
                <div className="mb-6">
                  <p className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                    Content & Campaigns
                  </p>

                  <h2 className="mt-2 text-lg font-semibold">
                    Actividad de tienda
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-3">

                  <ActivityCard
                    label="Drops activos"
                    value={
                      data.activeDrops
                    }
                    href="/admin/drops"
                  />

                  <ActivityCard
                    label="Ofertas activas"
                    value={
                      data.activeOffers
                    }
                    href="/admin/offers"
                  />

                  <ActivityCard
                    label="Slides activos"
                    value={
                      data.activeSlides
                    }
                    href="/admin/hero"
                  />

                  <ActivityCard
                    label="Pedidos pendientes"
                    value={
                      data.pendingOrders
                    }
                    href="/admin/sales"
                  />

                </div>

                <div className="mt-5 rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-green-500/10 bg-green-500/[0.04] text-xs text-green-400">
                      ✓
                    </div>

                    <div>
                      <p className="text-[9px] font-medium text-zinc-400">
                        Supabase conectado
                      </p>

                      <p className="mt-1 text-[8px] text-zinc-700">
                        Datos de tienda y analítica
                        sincronizados
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* =====================================================
                BEST PRODUCTS
            ====================================================== */}

            <section className="mt-5 rounded-[28px] border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                    Performance
                  </p>

                  <h2 className="mt-2 text-lg font-semibold">
                    Productos más vendidos
                  </h2>
                </div>

                <a
                  href="/admin/products"
                  className="text-[8px] font-semibold uppercase tracking-[0.15em] text-zinc-600 transition hover:text-white"
                >
                  Productos →
                </a>
              </div>

              {bestProducts.length ===
              0 ? (
                <EmptyMini
                  icon="◇"
                  title="Sin ventas todavía"
                  text="Los productos aparecerán aquí cuando comiencen las ventas."
                />
              ) : (
                <div className="grid gap-2 lg:grid-cols-2">
                  {bestProducts.map(
                    (
                      product,
                      index
                    ) => (
                      <BestProduct
                        key={
                          product.id
                        }
                        product={
                          product
                        }
                        index={
                          index
                        }
                        stock={
                          stockByProduct.get(
                            product.id
                          ) || 0
                        }
                      />
                    )
                  )}
                </div>
              )}
            </section>

            {/* FOOTER */}

            <div className="mt-10 flex flex-col gap-2 border-t border-white/[0.05] pt-5 text-[8px] uppercase tracking-[0.25em] text-zinc-700 sm:flex-row sm:items-center sm:justify-between">
              <span>
                NEWCLOTHES® ADMIN SYSTEM
              </span>

              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500/70" />
                Live Data
              </span>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

/* =========================================================
   ANALYTICS CARD
========================================================= */

function AnalyticsCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: string;
}) {
  return (
    <div className="group rounded-[24px] border border-white/[0.07] bg-white/[0.025] p-5 transition hover:border-white/[0.13] hover:bg-white/[0.035]">
      <div className="flex items-start justify-between">
        <p className="text-[8px] font-medium uppercase tracking-[0.25em] text-zinc-600">
          {label}
        </p>

        <span className="text-xs text-zinc-700 transition group-hover:text-zinc-400">
          {icon}
        </span>
      </div>

      <div className="mt-4">
        <span className="text-2xl font-semibold tracking-tight">
          {value}
        </span>

        <p className="mt-2 text-[8px] uppercase tracking-[0.12em] text-zinc-700">
          {detail}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/[0.07] bg-white/[0.025] p-5 transition hover:border-white/[0.12]">
      <div className="flex items-start justify-between">
        <p className="text-[8px] font-medium uppercase tracking-[0.25em] text-zinc-600">
          {label}
        </p>

        <span className="text-xs text-zinc-700">
          {icon}
        </span>
      </div>

      <div className="mt-4">
        <span className="text-2xl font-semibold tracking-tight">
          {value}
        </span>

        <p className="mt-2 text-[8px] uppercase tracking-[0.12em] text-zinc-700">
          {detail}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   INTEREST PRODUCT
========================================================= */

function InterestProduct({
  product,
  index,
}: {
  product: ProductAnalytics;
  index: number;
}) {
  const intent =
    product.buyClicks +
    product.whatsappClicks;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-black/20 p-3">
      <span className="w-5 text-center text-[9px] text-zinc-700">
        0{index + 1}
      </span>

      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/[0.06] bg-black">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-800">
            ◇
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-medium text-zinc-300">
          {product.name}
        </p>

        <p className="mt-1 text-[8px] uppercase tracking-[0.1em] text-zinc-700">
          {product.productViews} vistas ·{" "}
          {product.buyClicks} comprar ·{" "}
          {product.whatsappClicks} WhatsApp
        </p>
      </div>

      <div className="text-right">
        <p className="text-[10px] font-medium text-zinc-500">
          {intent}
        </p>

        <p className="mt-1 text-[6px] uppercase tracking-[0.1em] text-zinc-700">
          intención
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   PRODUCT ANALYTICS ROW
========================================================= */

function ProductAnalyticsRow({
  product,
}: {
  product: ProductAnalytics;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-black/20 p-4">

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">

        {/* PRODUCT */}

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/[0.06] bg-black">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-800">
                ◇
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-zinc-300">
              {product.name}
            </p>

            <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-zinc-700">
              ${Number(product.price).toFixed(2)}
            </p>
          </div>
        </div>

        {/* METRICS */}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[620px] lg:grid-cols-4">

          <ProductMetric
            label="Vistas"
            value={
              product.productViews
            }
            icon="◇"
          />

          <ProductMetric
            label="Intención"
            value={
              product.buyClicks
            }
            icon="◎"
          />

          <ProductMetric
            label="WhatsApp"
            value={
              product.whatsappClicks
            }
            icon="↗"
          />

          <ProductMetric
            label="Ventas"
            value={
              product.sold
            }
            icon="✓"
          />

        </div>

      </div>

      {/* CONVERSION DETAILS */}

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.05] pt-3">

        <span className="text-[7px] uppercase tracking-[0.12em] text-zinc-700">
          Vista → intención:
          <strong className="ml-1 text-zinc-500">
            {product.intentRate.toFixed(1)}%
          </strong>
        </span>

        <span className="text-[7px] uppercase tracking-[0.12em] text-zinc-700">
          Vista → venta:
          <strong className="ml-1 text-zinc-500">
            {product.saleRate.toFixed(1)}%
          </strong>
        </span>

        <span className="text-[7px] uppercase tracking-[0.12em] text-zinc-700">
          Ingresos:
          <strong className="ml-1 text-zinc-500">
            ${product.revenue.toFixed(2)}
          </strong>
        </span>

      </div>
    </div>
  );
}

/* =========================================================
   PRODUCT METRIC
========================================================= */

function ProductMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[6px] uppercase tracking-[0.12em] text-zinc-700">
          {label}
        </p>

        <span className="text-[8px] text-zinc-800">
          {icon}
        </span>
      </div>

      <p className="mt-2 text-sm font-semibold text-zinc-300">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   WHATSAPP MINI METRIC
========================================================= */

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
      <p className="text-[7px] uppercase tracking-[0.15em] text-zinc-700">
        {label}
      </p>

      <p className="mt-3 text-xl font-semibold text-zinc-300">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   EVENT ROW
========================================================= */

function EventRow({
  event,
  product,
}: {
  event: StoreEvent;
  product?: Product;
}) {
  const config: Record<
    StoreEvent["event_type"],
    {
      label: string;
      icon: string;
    }
  > = {
    PAGE_VIEW: {
      label: "Visita",
      icon: "◉",
    },

    PRODUCT_VIEW: {
      label: "Vio producto",
      icon: "◇",
    },

    BUY_CLICK: {
      label: "Clic en comprar",
      icon: "◎",
    },

    WHATSAPP_CLICK: {
      label: "WhatsApp",
      icon: "↗",
    },
  };

  const item =
    config[event.event_type];

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-black/20 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-xs text-zinc-600">
        {item.icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-medium text-zinc-400">
          {item.label}
        </p>

        <p className="mt-1 truncate text-[8px] text-zinc-700">
          {product?.name ||
            getEventProductName(
              event
            )}
        </p>
      </div>

      <span className="shrink-0 text-[7px] uppercase text-zinc-800">
        {formatTime(
          event.created_at
        )}
      </span>
    </div>
  );
}

/* =========================================================
   EVENT PRODUCT NAME
========================================================= */

function getEventProductName(
  event: StoreEvent
) {
  const metadata =
    event.metadata;

  if (
    event.event_type ===
    "WHATSAPP_CLICK"
  ) {
    const items =
      metadata?.items;

    if (
      Array.isArray(items) &&
      items.length > 0
    ) {
      const first =
        items[0];

      if (
        first &&
        typeof first ===
          "object" &&
        "name" in first
      ) {
        const name =
          (first as {
            name?: unknown;
          }).name;

        if (
          typeof name ===
          "string"
        ) {
          return name;
        }
      }

      return "Carrito → WhatsApp";
    }
  }

  if (
    typeof metadata?.product_name ===
    "string"
  ) {
    return metadata.product_name;
  }

  return "Tienda NEWCLOTHES";
}

/* =========================================================
   RECENT ORDER
========================================================= */

function RecentOrder({
  order,
}: {
  order: Order;
}) {
  return (
    <a
      href="/admin/sales"
      className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-black/20 p-3 transition hover:border-white/[0.12] hover:bg-white/[0.03]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-[9px] text-zinc-600">
        #
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-semibold text-zinc-300">
            NWC-
            {String(
              order.order_number
            ).padStart(4, "0")}
          </p>

          <StatusBadge
            status={
              order.status
            }
          />
        </div>

        <p className="mt-1 truncate text-[9px] text-zinc-600">
          {order.customer_name}
        </p>
      </div>

      <div className="text-right">
        <p className="text-[8px] text-zinc-700">
          {formatDate(
            order.created_at
          )}
        </p>

        <span className="mt-1 block text-[8px] text-zinc-800">
          →
        </span>
      </div>
    </a>
  );
}

/* =========================================================
   BEST PRODUCT
========================================================= */

function BestProduct({
  product,
  index,
  stock,
}: {
  product: ProductAnalytics;
  index: number;
  stock: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-black/20 p-3">
      <span className="w-5 text-center text-[9px] text-zinc-700">
        0{index + 1}
      </span>

      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/[0.06] bg-black">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-800">
            ◇
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-medium text-zinc-300">
          {product.name}
        </p>

        <p className="mt-1 text-[8px] uppercase tracking-[0.1em] text-zinc-700">
          {product.sold} vendidos ·{" "}
          {stock} stock
        </p>
      </div>

      <p className="text-[10px] font-medium text-zinc-500">
        $
        {Number(
          product.price
        ).toFixed(2)}
      </p>
    </div>
  );
}

/* =========================================================
   INVENTORY
========================================================= */

function InventoryRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-black/20 px-4 py-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-[9px] text-zinc-600">
        {icon}
      </span>

      <span className="flex-1 text-[9px] text-zinc-500">
        {label}
      </span>

      <span className="text-sm font-semibold text-zinc-300">
        {value}
      </span>
    </div>
  );
}

/* =========================================================
   ACTIVITY CARD
========================================================= */

function ActivityCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <a
      href={href}
      className="group rounded-2xl border border-white/[0.06] bg-black/20 p-4 transition hover:border-white/[0.13] hover:bg-white/[0.03]"
    >
      <p className="text-[8px] uppercase tracking-[0.15em] text-zinc-700">
        {label}
      </p>

      <div className="mt-4 flex items-end justify-between">
        <span className="text-2xl font-semibold tracking-tight text-zinc-300">
          {value}
        </span>

        <span className="text-[9px] text-zinc-800 transition group-hover:text-zinc-400">
          →
        </span>
      </div>
    </a>
  );
}

/* =========================================================
   EMPTY
========================================================= */

function EmptyMini({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.07] bg-black/20 px-5 py-10 text-center">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.07] text-sm text-zinc-700">
        {icon}
      </div>

      <p className="text-[10px] font-medium text-zinc-500">
        {title}
      </p>

      <p className="mx-auto mt-2 max-w-xs text-[8px] leading-5 text-zinc-700">
        {text}
      </p>
    </div>
  );
}

/* =========================================================
   STATUS
========================================================= */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const styles: Record<
    string,
    string
  > = {
    PENDING:
      "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",

    CONFIRMED:
      "border-blue-400/20 bg-blue-400/10 text-blue-300",

    SHIPPED:
      "border-purple-400/20 bg-purple-400/10 text-purple-300",

    DELIVERED:
      "border-green-400/20 bg-green-400/10 text-green-300",

    CANCELLED:
      "border-red-400/20 bg-red-400/10 text-red-300",
  };

  return (
    <span
      className={`rounded-full border px-2 py-1 text-[6px] font-semibold uppercase tracking-[0.1em] ${
        styles[status] ||
        "border-white/10 bg-white/[0.03] text-zinc-600"
      }`}
    >
      {statusLabel(status)}
    </span>
  );
}

function statusLabel(
  status: string
) {
  const labels: Record<
    string,
    string
  > = {
    PENDING: "Pendiente",
    CONFIRMED: "Confirmado",
    SHIPPED: "Enviado",
    DELIVERED: "Entregado",
    CANCELLED: "Cancelado",
  };

  return (
    labels[status] || status
  );
}

/* =========================================================
   DATE HELPERS
========================================================= */

function getDateKey(
  date: Date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(
  date: string
) {
  const parsed =
    new Date(date);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return "—";
  }

  return parsed.toLocaleDateString(
    "es-VE",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatTime(
  date: string
) {
  const parsed =
    new Date(date);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return "—";
  }

  return parsed.toLocaleTimeString(
    "es-VE",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

/* =========================================================
   SKELETON
========================================================= */

function DashboardSkeleton() {
  return (
    <div className="space-y-5">

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({
          length: 4,
        }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-[24px] border border-white/[0.05] bg-white/[0.02]"
          />
        ))}
      </div>

      <div className="h-72 animate-pulse rounded-[28px] border border-white/[0.05] bg-white/[0.02]" />

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="h-[360px] animate-pulse rounded-[28px] border border-white/[0.05] bg-white/[0.02]" />

        <div className="h-[360px] animate-pulse rounded-[28px] border border-white/[0.05] bg-white/[0.02]" />
      </div>

      <div className="h-[400px] animate-pulse rounded-[28px] border border-white/[0.05] bg-white/[0.02]" />

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="h-[420px] animate-pulse rounded-[28px] border border-white/[0.05] bg-white/[0.02]" />

        <div className="h-[420px] animate-pulse rounded-[28px] border border-white/[0.05] bg-white/[0.02]" />
      </div>
    </div>
  );
}