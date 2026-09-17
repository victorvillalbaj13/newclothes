"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CartItem = {
  slug: string;
  name: string;
  price: string;
  image: string;
  size: string;
  quantity: number;
  color?: string;
  variantId?: string;
};

type DeliveryMethod =
  | "personal"
  | "national"
  | "";

type PaymentMethod =
  | "pagomovil"
  | "efectivo"
  | "";

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

type ProductData = {
  id: string;
  slug: string;
  name: string;
};

type CreatedOrder = {
  id: string;
  order_number: number;
  status: string;
  created_at: string;
};

const supabase = createClient();

function getTodayString() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isOfferCurrentlyValid(offer: Offer) {
  if (!offer.active) {
    return false;
  }

  const today = getTodayString();

  if (offer.start_date && offer.start_date > today) {
    return false;
  }

  if (offer.end_date && offer.end_date < today) {
    return false;
  }

  return true;
}

function calculateOfferPrice(
  originalPrice: number,
  offer: Offer
) {
  if (offer.type === "percentage") {
    return Math.max(
      0,
      originalPrice -
        (originalPrice * Number(offer.value)) / 100
    );
  }

  return Math.max(
    0,
    originalPrice - Number(offer.value)
  );
}

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);

  const [customerName, setCustomerName] = useState("");

  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>("");

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("");

  const [checkoutLoading, setCheckoutLoading] =
    useState(false);

  const [checkoutError, setCheckoutError] =
    useState("");

  const [offers, setOffers] = useState<
    Record<string, Offer>
  >({});

  const [offersLoading, setOffersLoading] =
    useState(true);

  /*
   * ============================================================
   * CARGAR CARRITO
   * ============================================================
   */

  useEffect(() => {
    const savedCart = JSON.parse(
      localStorage.getItem("newclothes-cart") || "[]"
    );

    const grouped: CartItem[] = [];

    savedCart.forEach((item: CartItem) => {
      const existing = grouped.find(
        (product) =>
          product.slug === item.slug &&
          product.size === item.size &&
          product.color === item.color
      );

      if (existing) {
        existing.quantity += item.quantity || 1;
      } else {
        grouped.push({
          ...item,
          quantity: item.quantity || 1,
        });
      }
    });

    setCart(grouped);

    localStorage.setItem(
      "newclothes-cart",
      JSON.stringify(grouped)
    );
  }, []);

  /*
   * ============================================================
   * BUSCAR OFERTAS ACTIVAS
   * ============================================================
   */

  useEffect(() => {
    async function loadOffers() {
      setOffersLoading(true);

      try {
        const {
          data: offerRows,
          error: offersError,
        } = await supabase
          .from("offers")
          .select(
            `
              id,
              name,
              description,
              type,
              value,
              start_date,
              end_date,
              active
            `
          )
          .eq("active", true);

        if (offersError) {
          console.error(
            "Error buscando ofertas:",
            offersError
          );

          setOffers({});
          return;
        }

        const validOffers = (
          (offerRows || []) as Offer[]
        ).filter(isOfferCurrentlyValid);

        if (validOffers.length === 0) {
          setOffers({});
          return;
        }

        const offerIds = validOffers.map(
          (offer) => offer.id
        );

        const {
          data: relationRows,
          error: relationError,
        } = await supabase
          .from("offer_products")
          .select(
            "offer_id, product_id"
          )
          .in("offer_id", offerIds);

        if (relationError) {
          console.error(
            "Error buscando productos de ofertas:",
            relationError
          );

          setOffers({});
          return;
        }

        const cartSlugs = cart.map(
          (item) => item.slug
        );

        if (cartSlugs.length === 0) {
          setOffers({});
          return;
        }

        const {
          data: products,
          error: productsError,
        } = await supabase
          .from("products")
          .select(
            "id, slug, name"
          )
          .in("slug", cartSlugs);

        if (productsError) {
          console.error(
            "Error buscando productos para ofertas:",
            productsError
          );

          setOffers({});
          return;
        }

        const productMap = new Map(
          ((products || []) as ProductData[]).map(
            (product) => [
              product.id,
              product,
            ]
          )
        );

        const validOfferMap: Record<
          string,
          Offer
        > = {};

        (
          (relationRows || []) as OfferProduct[]
        ).forEach((relation) => {
          const product =
            productMap.get(
              relation.product_id
            );

          const offer =
            validOffers.find(
              (item) =>
                item.id ===
                relation.offer_id
            );

          if (!product || !offer) {
            return;
          }

          if (!validOfferMap[product.slug]) {
            validOfferMap[product.slug] =
              offer;
          }
        });

        setOffers(validOfferMap);
      } catch (error) {
        console.error(
          "Error cargando ofertas:",
          error
        );

        setOffers({});
      } finally {
        setOffersLoading(false);
      }
    }

    if (cart.length > 0) {
      loadOffers();
    } else {
      setOffers({});
      setOffersLoading(false);
    }
  }, [cart]);

  /*
   * ============================================================
   * ACTUALIZAR CANTIDAD
   * ============================================================
   */

  function updateQuantity(
    index: number,
    change: number
  ) {
    const updatedCart = [...cart];

    updatedCart[index].quantity += change;

    if (updatedCart[index].quantity <= 0) {
      updatedCart.splice(index, 1);
    }

    setCart(updatedCart);

    localStorage.setItem(
      "newclothes-cart",
      JSON.stringify(updatedCart)
    );

    window.dispatchEvent(
      new Event("newclothes-cart-updated")
    );
  }

  /*
   * ============================================================
   * ELIMINAR PRODUCTO
   * ============================================================
   */

  function removeItem(index: number) {
    const updatedCart = cart.filter(
      (_, i) => i !== index
    );

    setCart(updatedCart);

    localStorage.setItem(
      "newclothes-cart",
      JSON.stringify(updatedCart)
    );

    window.dispatchEvent(
      new Event("newclothes-cart-updated")
    );
  }

  /*
   * ============================================================
   * SUBTOTAL NORMAL
   * ============================================================
   */

  const subtotal = cart.reduce(
    (sum, item) => {
      const price = parseFloat(
        item.price.replace("$", "")
      );

      return sum + price * item.quantity;
    },
    0
  );

  /*
   * ============================================================
   * TOTAL ITEMS
   * ============================================================
   */

  const totalItems = cart.reduce(
    (sum, item) =>
      sum + item.quantity,
    0
  );

  /*
   * ============================================================
   * DESCUENTO POR OFERTAS
   *
   * SOLAMENTE PAGO MÓVIL
   * ============================================================
   */

  const offersDiscount =
    paymentMethod === "pagomovil"
      ? cart.reduce(
          (sum, item) => {
            const originalPrice =
              parseFloat(
                item.price.replace("$", "")
              );

            const offer =
              offers[item.slug];

            if (!offer) {
              return sum;
            }

            const offerPrice =
              calculateOfferPrice(
                originalPrice,
                offer
              );

            return (
              sum +
              (originalPrice -
                offerPrice) *
                item.quantity
            );
          },
          0
        )
      : 0;

  /*
   * ============================================================
   * DESCUENTO EFECTIVO
   *
   * 12%
   * ============================================================
   */

  const cashDiscount =
    paymentMethod === "efectivo"
      ? subtotal * 0.12
      : 0;

  /*
   * ============================================================
   * TOTAL FINAL
   * ============================================================
   */

  const finalTotal =
    subtotal -
    offersDiscount -
    cashDiscount;

  /*
   * ============================================================
   * DESCUENTO TOTAL
   * ============================================================
   */

  const totalDiscount =
    offersDiscount +
    cashDiscount;

  /*
   * ============================================================
   * VALIDAR CHECKOUT
   * ============================================================
   */

  const canCheckout =
    customerName.trim().length > 0 &&
    deliveryMethod !== "" &&
    paymentMethod !== "" &&
    cart.length > 0 &&
    !checkoutLoading;

  /*
   * ============================================================
   * CHECKOUT WHATSAPP
   * ============================================================
   */

  async function checkoutWhatsApp() {
    if (!canCheckout) {
      return;
    }

    setCheckoutError("");
    setCheckoutLoading(true);

    try {
      const siteUrl =
        typeof window !== "undefined"
          ? window.location.origin
          : "";

      const sessionId =
        typeof window !== "undefined"
          ? localStorage.getItem(
              "newclothes-analytics-session"
            )
          : null;

      const deliveryText =
        deliveryMethod === "personal"
          ? "Entrega personal en Valencia"
          : "Envío nacional";

      const paymentText =
        paymentMethod === "pagomovil"
          ? "Pago Móvil / Bolívares"
          : "Efectivo Divisa";

      /*
       * ========================================================
       * 1. VERIFICAR OFERTAS NUEVAMENTE
       * ========================================================
       */

      const {
        data: freshOfferRows,
        error: freshOffersError,
      } = await supabase
        .from("offers")
        .select(
          `
            id,
            name,
            description,
            type,
            value,
            start_date,
            end_date,
            active
          `
        )
        .eq("active", true);

      if (freshOffersError) {
        console.error(
          "Error verificando ofertas:",
          freshOffersError
        );

        throw new Error(
          "No se pudieron verificar las ofertas actuales."
        );
      }

      const validFreshOffers = (
        (freshOfferRows || []) as Offer[]
      ).filter(isOfferCurrentlyValid);

      let checkoutOffers: Record<
        string,
        Offer
      > = {};

      if (
        paymentMethod === "pagomovil" &&
        validFreshOffers.length > 0
      ) {
        const freshOfferIds =
          validFreshOffers.map(
            (offer) => offer.id
          );

        const {
          data: freshRelations,
          error: freshRelationError,
        } = await supabase
          .from("offer_products")
          .select(
            "offer_id, product_id"
          )
          .in(
            "offer_id",
            freshOfferIds
          );

        if (freshRelationError) {
          throw new Error(
            "No se pudieron verificar los productos en oferta."
          );
        }

        const slugs = cart.map(
          (item) => item.slug
        );

        const {
          data: freshProducts,
          error: freshProductsError,
        } = await supabase
          .from("products")
          .select(
            "id, slug, name"
          )
          .in("slug", slugs);

        if (freshProductsError) {
          throw new Error(
            "No se pudieron verificar los productos."
          );
        }

        const productMap = new Map(
          (
            (freshProducts ||
              []) as ProductData[]
          ).map((product) => [
            product.id,
            product,
          ])
        );

        (
          (freshRelations ||
            []) as OfferProduct[]
        ).forEach((relation) => {
          const product =
            productMap.get(
              relation.product_id
            );

          const offer =
            validFreshOffers.find(
              (item) =>
                item.id ===
                relation.offer_id
            );

          if (
            product &&
            offer &&
            !checkoutOffers[
              product.slug
            ]
          ) {
            checkoutOffers[
              product.slug
            ] = offer;
          }
        });
      }

      /*
       * ========================================================
       * 2. PREPARAR PRODUCTOS
       * ========================================================
       */

      const orderItems = cart.map(
        (item) => {
          const originalPrice =
            parseFloat(
              item.price.replace("$", "")
            );

          const offer =
            paymentMethod === "pagomovil"
              ? checkoutOffers[
                  item.slug
                ]
              : undefined;

          const finalUnitPrice =
            offer
              ? calculateOfferPrice(
                  originalPrice,
                  offer
                )
              : originalPrice;

          return {
            product_id:
              null as string | null,

            size: item.size,

            color:
              item.color || null,

            quantity:
              item.quantity,

            price:
              finalUnitPrice,

            original_price:
              originalPrice,

            offer_id:
              offer?.id || null,

            offer_name:
              offer?.name || null,

            slug:
              item.slug,

            name:
              item.name,

            variant_id:
              item.variantId || null,
          };
        }
      );

      /*
       * ========================================================
       * 3. BUSCAR PRODUCTOS REALES
       * ========================================================
       */

      const slugs = cart.map(
        (item) => item.slug
      );

      const {
        data: products,
        error: productsError,
      } = await supabase
        .from("products")
        .select(
          "id, slug, name"
        )
        .in("slug", slugs);

      if (productsError) {
        console.error(
          "Error buscando productos:",
          productsError
        );

        throw new Error(
          "No se pudieron verificar los productos."
        );
      }

      if (
        !products ||
        products.length === 0
      ) {
        throw new Error(
          "No se encontraron los productos del carrito."
        );
      }

      /*
       * ========================================================
       * 4. ASIGNAR PRODUCT ID
       * ========================================================
       */

      const finalOrderItems =
        orderItems.map(
          (item) => {
            const product =
              products.find(
                (product) =>
                  product.slug ===
                  item.slug
              );

            if (!product) {
              throw new Error(
                `No se encontró el producto "${item.name}".`
              );
            }

            return {
              order_id: "",

              product_id:
                product.id,

              size:
                item.size,

              color:
                item.color,

              quantity:
                item.quantity,

              price:
                item.price,

              original_price:
                item.original_price,

              offer_id:
                item.offer_id,

              offer_name:
                item.offer_name,

              slug:
                item.slug,

              name:
                item.name,

              variant_id:
                item.variant_id,
            };
          }
        );

      /*
       * ========================================================
       * 5. CREAR ORDEN
       *
       * CORRECCIÓN RLS
       *
       * Ya NO usamos:
       *
       * .from("orders")
       * .insert(...)
       * .select(...)
       *
       * Usamos la función segura de Supabase:
       *
       * create_checkout_order
       *
       * Esto permite crear la orden desde un visitante
       * sin darle acceso público para leer las órdenes.
       * ========================================================
       */

      const {
        data: createdOrderData,
        error: orderError,
      } = await supabase.rpc(
        "create_checkout_order",
        {
          p_customer_name:
            customerName.trim(),

          p_payment:
            paymentText,

          p_shipping:
            deliveryText,
        }
      );

      if (
        orderError ||
        !createdOrderData ||
        !Array.isArray(createdOrderData) ||
        createdOrderData.length === 0
      ) {
        console.error(
          "Error creando venta:",
          orderError
        );

        throw new Error(
          orderError?.message ||
            "No se pudo crear la venta."
        );
      }

      const order =
        createdOrderData[0] as CreatedOrder;

      /*
       * ========================================================
       * 6. INSERTAR ORDER ITEMS
       * ========================================================
       */

      const itemsToInsert =
        finalOrderItems.map(
          (item) => ({
            order_id:
              order.id,

            product_id:
              item.product_id,

            size:
              item.size,

            color:
              item.color,

            quantity:
              item.quantity,

            /*
             * PRECIO FINAL DE VENTA
             */
            price:
              item.price,

            /*
             * PRECIO ORIGINAL
             */
            original_price:
              item.original_price,

            /*
             * OFERTA APLICADA
             */
            offer_id:
              item.offer_id,

            offer_name:
              item.offer_name,
          })
        );

      const {
        error: orderItemsError,
      } = await supabase
        .from("order_items")
        .insert(
          itemsToInsert
        );

      if (
        orderItemsError
      ) {
        console.error(
          "Error creando order_items:",
          orderItemsError
        );

        /*
         * Intentamos eliminar la orden si
         * la creación de items falla.
         */
        await supabase
          .from("orders")
          .delete()
          .eq(
            "id",
            order.id
          );

        throw new Error(
          orderItemsError.message ||
            "No se pudieron guardar los productos de la venta."
        );
      }

      /*
       * ========================================================
       * 7. ANALYTICS
       * ========================================================
       */

      const analyticsItems =
        orderItems.map(
          (item) => ({
            slug:
              item.slug,

            name:
              item.name,

            size:
              item.size,

            color:
              item.color ||
              null,

            quantity:
              item.quantity,

            original_price:
              item.original_price,

            final_unit_price:
              item.price,

            offer_id:
              item.offer_id,

            offer_name:
              item.offer_name,

            variant_id:
              item.variant_id ||
              null,
          })
        );

      const {
        error: analyticsError,
      } = await supabase
        .from("store_events")
        .insert({
          event_type:
            "WHATSAPP_CLICK",

          product_id:
            null,

          session_id:
            sessionId,

          metadata: {
            order_id:
              order.id,

            order_number:
              order.order_number,

            customer_name:
              customerName.trim(),

            customer_name_provided:
              true,

            delivery_method:
              deliveryMethod,

            payment_method:
              paymentMethod,

            total_items:
              totalItems,

            subtotal:
              subtotal,

            offer_discount:
              offersDiscount,

            cash_discount:
              cashDiscount,

            discount:
              totalDiscount,

            final_total:
              finalTotal,

            items:
              analyticsItems,
          },
        });

      if (
        analyticsError
      ) {
        console.error(
          "Analytics WHATSAPP_CLICK error:",
          analyticsError
        );
      }

      /*
       * ========================================================
       * 8. MENSAJE WHATSAPP
       * ========================================================
       */

      const productsMessage =
        orderItems
          .map((item) => {
            const productUrl =
              `${siteUrl}/product/${item.slug}`;

            const colorText =
              item.color
                ? ` | Color: ${item.color}`
                : "";

            const originalTotal =
              item.original_price *
              item.quantity;

            const finalItemTotal =
              item.price *
              item.quantity;

            const offer =
              item.offer_id
                ? checkoutOffers[
                    item.slug
                  ]
                : undefined;

            let priceText =
              `$${finalItemTotal.toFixed(
                2
              )}`;

            if (
              offer &&
              paymentMethod ===
                "pagomovil"
            ) {
              const offerLabel =
                offer.type ===
                "percentage"
                  ? `-${Number(
                      offer.value
                    )}%`
                  : `-$${Number(
                      offer.value
                    ).toFixed(2)}`;

              priceText =
                `Precio normal: $${originalTotal.toFixed(
                  2
                )}\n` +
                `OFERTA ${offerLabel}: $${finalItemTotal.toFixed(
                  2
                )}`;
            }

            return `• ${item.name} | Talla: ${item.size}${colorText} | Cantidad: ${item.quantity} | ${priceText}
  Ver producto: ${productUrl}`;
          })
          .join("\n\n");

      let discountMessage =
        "";

      if (
        paymentMethod ===
          "pagomovil" &&
        offersDiscount > 0
      ) {
        discountMessage =
          `Descuento por ofertas: -$${offersDiscount.toFixed(
            2
          )}`;
      }

      if (
        paymentMethod ===
        "efectivo"
      ) {
        discountMessage =
          `Descuento Efectivo Divisa (12%): -$${cashDiscount.toFixed(
            2
          )}`;
      }

      const orderNumber =
        `NWC-${String(
          order.order_number
        ).padStart(
          4,
          "0"
        )}`;

      const message = `Hola NEWCLOTHES 👋

Quiero realizar el siguiente pedido:

PEDIDO: ${orderNumber}

CLIENTE: ${customerName.trim()}

ENTREGA: ${deliveryText}

MÉTODO DE PAGO: ${paymentText}

PRODUCTOS:

${productsMessage}

Total de productos: ${totalItems}
Subtotal: $${subtotal.toFixed(2)}
${discountMessage}
TOTAL A PAGAR: $${finalTotal.toFixed(2)}

Quedo atento para coordinar el pago y la entrega.`;

      const whatsappUrl =
        `https://wa.me/584124373329?text=${encodeURIComponent(
          message
        )}`;

      /*
       * ========================================================
       * 9. LIMPIAR CARRITO
       * ========================================================
       */

      localStorage.removeItem(
        "newclothes-cart"
      );

      setCart([]);

      window.dispatchEvent(
        new Event(
          "newclothes-cart-updated"
        )
      );

      /*
       * ========================================================
       * 10. ABRIR WHATSAPP
       * ========================================================
       */

      window.open(
        whatsappUrl,
        "_blank"
      );
    } catch (error) {
      console.error(
        "ERROR CHECKOUT NEWCLOTHES:",
        error
      );

      setCheckoutError(
        error instanceof Error
          ? error.message
          : "No se pudo registrar el pedido."
      );
    } finally {
      setCheckoutLoading(
        false
      );
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">

      {/* NAVBAR */}

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur-xl">

        <div className="mx-auto flex h-[72px] max-w-[1500px] items-center justify-between px-5 md:px-8">

          <Link
            href="/"
            className="text-xl font-black tracking-[-0.08em] transition-opacity hover:opacity-60 md:text-2xl"
          >
            NEWCLOTHES
          </Link>

          <Link
            href="/"
            className="hidden text-[9px] font-black tracking-[0.25em] text-white/50 transition hover:text-white sm:block"
          >
            ← CONTINUE SHOPPING
          </Link>

          <div className="text-[9px] font-black tracking-[0.2em]">
            BAG (
            {String(totalItems).padStart(
              2,
              "0"
            )}
            )
          </div>

        </div>

      </header>

      {/* CART */}

      <section className="px-5 pb-24 pt-[125px] md:px-8 md:pt-[145px]">

        <div className="mx-auto max-w-[1500px]">

          {/* HEADER */}

          <div className="mb-12 md:mb-16">

            <p className="mb-5 text-[9px] font-black tracking-[0.45em] text-white/30">
              NEWCLOTHES / SHOPPING BAG
            </p>

            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">

              <h1 className="text-6xl font-black leading-[0.8] tracking-[-0.09em] md:text-8xl">
                YOUR
                <br />
                BAG.
              </h1>

              {cart.length > 0 && (
                <p className="max-w-xs text-[10px] font-bold leading-5 tracking-[0.15em] text-white/35">
                  {totalItems}{" "}
                  {totalItems === 1
                    ? "PIECE"
                    : "PIECES"}{" "}
                  SELECTED
                  <br />
                  READY TO COMPLETE YOUR ORDER.
                </p>
              )}

            </div>

          </div>

          {/* EMPTY BAG */}

          {cart.length === 0 ? (

            <div className="border-y border-white/10 py-24 text-center md:py-32">

              <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">

                <span className="text-2xl font-black">
                  0
                </span>

              </div>

              <p className="text-[10px] font-black tracking-[0.3em] text-white/40">
                YOUR BAG IS CURRENTLY EMPTY.
              </p>

              <p className="mx-auto mt-4 max-w-sm text-xs leading-6 text-white/25">
                Discover the latest NEWCLOTHES pieces and find
                something that fits your identity.
              </p>

              <Link
                href="/"
                className="mt-9 inline-flex items-center gap-6 rounded-full bg-white px-8 py-4 text-[9px] font-black tracking-[0.22em] text-black transition hover:bg-white/80"
              >
                SHOP PRODUCTS

                <span className="text-base">
                  →
                </span>

              </Link>

            </div>

          ) : (

            <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-16">

              {/* PRODUCTS */}

              <div>

                <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">

                  <p className="text-[8px] font-black tracking-[0.3em] text-white/30">
                    SELECTED PRODUCTS
                  </p>

                  <p className="text-[8px] font-bold tracking-[0.2em] text-white/20">
                    {String(
                      cart.length
                    ).padStart(
                      2,
                      "0"
                    )}{" "}
                    ITEMS
                  </p>

                </div>

                <div>

                  {cart.map(
                    (
                      item,
                      index
                    ) => {

                      const originalPrice =
                        parseFloat(
                          item.price.replace(
                            "$",
                            ""
                          )
                        );

                      const offer =
                        paymentMethod ===
                        "pagomovil"
                          ? offers[
                              item.slug
                            ]
                          : undefined;

                      const displayUnitPrice =
                        offer
                          ? calculateOfferPrice(
                              originalPrice,
                              offer
                            )
                          : originalPrice;

                      const displayItemTotal =
                        displayUnitPrice *
                        item.quantity;

                      return (
                        <div
                          key={`${item.slug}-${item.size}-${item.color || "default"}`}
                          className="group flex gap-5 border-b border-white/10 py-6 md:gap-7 md:py-8"
                        >

                          {/* IMAGE */}

                          <Link
                            href={`/product/${item.slug}`}
                            className="relative h-36 w-28 shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-[#111] md:h-48 md:w-36"
                          >

                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                            />

                            <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />

                            <div className="absolute bottom-3 left-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-[9px] text-white/70 backdrop-blur-md">
                              ↗
                            </div>

                          </Link>

                          {/* INFO */}

                          <div className="flex min-w-0 flex-1 flex-col justify-between">

                            <div>

                              <div className="flex items-start justify-between gap-4">

                                <div className="min-w-0">

                                  <Link
                                    href={`/product/${item.slug}`}
                                    className="block text-base font-black tracking-[-0.03em] transition hover:text-white/50 md:text-xl"
                                  >
                                    {item.name}
                                  </Link>

                                  <p className="mt-2 text-[8px] font-bold tracking-[0.22em] text-white/25">
                                    NEWCLOTHES / STREETWEAR
                                  </p>

                                  {offer &&
                                    paymentMethod ===
                                      "pagomovil" && (
                                      <span className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-[7px] font-black tracking-[0.15em] text-black">
                                        OFERTA ESPECIAL
                                      </span>
                                    )}

                                </div>

                                <div className="shrink-0 text-right">

                                  {offer &&
                                  paymentMethod ===
                                    "pagomovil" ? (
                                    <>

                                      <p className="text-[9px] font-bold text-white/25 line-through">
                                        $
                                        {(
                                          originalPrice *
                                          item.quantity
                                        ).toFixed(
                                          2
                                        )}
                                      </p>

                                      <p className="mt-1 text-sm font-black md:text-base">
                                        $
                                        {displayItemTotal.toFixed(
                                          2
                                        )}
                                      </p>

                                    </>
                                  ) : (

                                    <p className="text-sm font-black md:text-base">
                                      $
                                      {displayItemTotal.toFixed(
                                        2
                                      )}
                                    </p>

                                  )}

                                </div>

                              </div>

                              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">

                                <div>

                                  <p className="text-[7px] font-bold tracking-[0.25em] text-white/25">
                                    FIT
                                  </p>

                                  <p className="mt-1 text-[9px] font-black tracking-[0.1em]">
                                    OVERSIZE
                                  </p>

                                </div>

                                <div>

                                  <p className="text-[7px] font-bold tracking-[0.25em] text-white/25">
                                    SIZE
                                  </p>

                                  <p className="mt-1 text-[9px] font-black tracking-[0.1em]">
                                    {item.size}
                                  </p>

                                </div>

                                {item.color && (
                                  <div>

                                    <p className="text-[7px] font-bold tracking-[0.25em] text-white/25">
                                      COLOR
                                    </p>

                                    <p className="mt-1 text-[9px] font-black tracking-[0.1em]">
                                      {item.color}
                                    </p>

                                  </div>
                                )}

                                <div>

                                  <p className="text-[7px] font-bold tracking-[0.25em] text-white/25">
                                    UNIT
                                  </p>

                                  {offer &&
                                  paymentMethod ===
                                    "pagomovil" ? (

                                    <div className="mt-1 flex items-center gap-2">

                                      <span className="text-[9px] font-black">
                                        $
                                        {displayUnitPrice.toFixed(
                                          2
                                        )}
                                      </span>

                                      <span className="text-[8px] font-bold text-white/25 line-through">
                                        {item.price}
                                      </span>

                                    </div>

                                  ) : (

                                    <p className="mt-1 text-[9px] font-black tracking-[0.1em]">
                                      {item.price}
                                    </p>

                                  )}

                                </div>

                              </div>

                            </div>

                            {/* QUANTITY */}

                            <div className="mt-6 flex items-center justify-between gap-4">

                              <div className="flex items-center overflow-hidden rounded-full border border-white/15 bg-white/[0.03]">

                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(
                                      index,
                                      -1
                                    )
                                  }
                                  className="flex h-9 w-9 cursor-pointer items-center justify-center text-sm text-white/50 transition hover:bg-white hover:text-black"
                                >
                                  −
                                </button>

                                <span className="flex h-9 min-w-10 items-center justify-center border-x border-white/10 px-2 text-[10px] font-black">
                                  {String(
                                    item.quantity
                                  ).padStart(
                                    2,
                                    "0"
                                  )}
                                </span>

                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(
                                      index,
                                      1
                                    )
                                  }
                                  className="flex h-9 w-9 cursor-pointer items-center justify-center text-sm text-white/50 transition hover:bg-white hover:text-black"
                                >
                                  +
                                </button>

                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  removeItem(
                                    index
                                  )
                                }
                                className="cursor-pointer text-[8px] font-black tracking-[0.2em] text-white/25 underline underline-offset-4 transition hover:text-white"
                              >
                                REMOVE
                              </button>

                            </div>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              </div>

              {/* SUMMARY */}

              <div className="h-fit lg:sticky lg:top-[105px]">

                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]">

                  {/* SUMMARY HEADER */}

                  <div className="border-b border-white/10 px-6 py-6">

                    <div className="flex items-center justify-between">

                      <p className="text-[9px] font-black tracking-[0.3em]">
                        ORDER SUMMARY
                      </p>

                      <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-[8px] font-black text-black">
                        {String(
                          totalItems
                        ).padStart(
                          2,
                          "0"
                        )}
                      </span>

                    </div>

                  </div>

                  {/* CUSTOMER INFORMATION */}

                  <div className="border-b border-white/10 px-6 py-6">

                    <p className="mb-5 text-[8px] font-black tracking-[0.3em] text-white/35">
                      CUSTOMER INFORMATION
                    </p>

                    <label className="block">

                      <span className="mb-2 block text-[8px] font-bold tracking-[0.2em] text-white/30">
                        NAME
                      </span>

                      <input
                        type="text"
                        value={customerName}
                        onChange={(event) =>
                          setCustomerName(
                            event.target.value
                          )
                        }
                        placeholder="YOUR NAME"
                        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-[10px] font-bold tracking-[0.08em] text-white outline-none transition placeholder:text-white/20 focus:border-white/30"
                      />

                    </label>

                  </div>

                  {/* DELIVERY */}

                  <div className="border-b border-white/10 px-6 py-6">

                    <p className="mb-4 text-[8px] font-black tracking-[0.3em] text-white/35">
                      DELIVERY METHOD
                    </p>

                    <div className="space-y-2">

                      <button
                        type="button"
                        onClick={() =>
                          setDeliveryMethod(
                            "personal"
                          )
                        }
                        className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-4 text-left transition ${
                          deliveryMethod ===
                          "personal"
                            ? "border-white bg-white text-black"
                            : "border-white/10 bg-white/[0.03] text-white hover:border-white/25"
                        }`}
                      >

                        <div>

                          <p className="text-[9px] font-black tracking-[0.08em]">
                            ENTREGA PERSONAL
                          </p>

                          <p
                            className={`mt-1 text-[7px] font-bold tracking-[0.1em] ${
                              deliveryMethod ===
                              "personal"
                                ? "text-black/50"
                                : "text-white/25"
                            }`}
                          >
                            VALENCIA
                          </p>

                        </div>

                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border text-[9px] ${
                            deliveryMethod ===
                            "personal"
                              ? "border-black bg-black text-white"
                              : "border-white/20"
                          }`}
                        >
                          {deliveryMethod ===
                          "personal"
                            ? "✓"
                            : ""}
                        </span>

                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setDeliveryMethod(
                            "national"
                          )
                        }
                        className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-4 text-left transition ${
                          deliveryMethod ===
                          "national"
                            ? "border-white bg-white text-black"
                            : "border-white/10 bg-white/[0.03] text-white hover:border-white/25"
                        }`}
                      >

                        <div>

                          <p className="text-[9px] font-black tracking-[0.08em]">
                            ENVÍO NACIONAL
                          </p>

                          <p
                            className={`mt-1 text-[7px] font-bold tracking-[0.1em] ${
                              deliveryMethod ===
                              "national"
                                ? "text-black/50"
                                : "text-white/25"
                            }`}
                          >
                            VENEZUELA
                          </p>

                        </div>

                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border text-[9px] ${
                            deliveryMethod ===
                            "national"
                              ? "border-black bg-black text-white"
                              : "border-white/20"
                          }`}
                        >
                          {deliveryMethod ===
                          "national"
                            ? "✓"
                            : ""}
                        </span>

                      </button>

                    </div>

                  </div>

                  {/* PAYMENT */}

                  <div className="border-b border-white/10 px-6 py-6">

                    <p className="mb-4 text-[8px] font-black tracking-[0.3em] text-white/35">
                      PAYMENT METHOD
                    </p>

                    <div className="space-y-2">

                      {/* PAGO MOVIL */}

                      <button
                        type="button"
                        onClick={() =>
                          setPaymentMethod(
                            "pagomovil"
                          )
                        }
                        className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-4 text-left transition ${
                          paymentMethod ===
                          "pagomovil"
                            ? "border-white bg-white text-black"
                            : "border-white/10 bg-white/[0.03] text-white hover:border-white/25"
                        }`}
                      >

                        <div>

                          <div className="flex flex-wrap items-center gap-2">

                            <p className="text-[9px] font-black tracking-[0.08em]">
                              PAGO MÓVIL
                            </p>

                            {Object.keys(
                              offers
                            ).length >
                              0 && (
                              <span
                                className={`rounded-full px-2 py-1 text-[6px] font-black tracking-[0.12em] ${
                                  paymentMethod ===
                                  "pagomovil"
                                    ? "bg-black text-white"
                                    : "bg-white text-black"
                                }`}
                              >
                                OFERTAS VÁLIDAS
                              </span>
                            )}

                          </div>

                          <p
                            className={`mt-1 text-[7px] font-bold tracking-[0.1em] ${
                              paymentMethod ===
                              "pagomovil"
                                ? "text-black/50"
                                : "text-white/25"
                            }`}
                          >
                            PAGO EN BOLÍVARES
                          </p>

                        </div>

                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border text-[9px] ${
                            paymentMethod ===
                            "pagomovil"
                              ? "border-black bg-black text-white"
                              : "border-white/20"
                          }`}
                        >
                          {paymentMethod ===
                          "pagomovil"
                            ? "✓"
                            : ""}
                        </span>

                      </button>

                      {/* EFECTIVO DIVISA */}

                      <button
                        type="button"
                        onClick={() =>
                          setPaymentMethod(
                            "efectivo"
                          )
                        }
                        className={`relative flex w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-4 text-left transition ${
                          paymentMethod ===
                          "efectivo"
                            ? "border-white bg-white text-black"
                            : "border-white/10 bg-white/[0.03] text-white hover:border-white/25"
                        }`}
                      >

                        <div>

                          <div className="flex items-center gap-2">

                            <p className="text-[9px] font-black tracking-[0.08em]">
                              EFECTIVO DIVISA
                            </p>

                            <span
                              className={`rounded-full px-2 py-1 text-[6px] font-black tracking-[0.12em] ${
                                paymentMethod ===
                                "efectivo"
                                  ? "bg-black text-white"
                                  : "bg-white text-black"
                              }`}
                            >
                              -12%
                            </span>

                          </div>

                          <p
                            className={`mt-1 text-[7px] font-bold tracking-[0.1em] ${
                              paymentMethod ===
                              "efectivo"
                                ? "text-black/50"
                                : "text-white/25"
                            }`}
                          >
                            DESCUENTO ESPECIAL
                            {!offersLoading &&
                              Object.keys(
                                offers
                              ).length >
                                0 &&
                              " · NO ACUMULABLE CON OFERTAS"}
                          </p>

                        </div>

                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border text-[9px] ${
                            paymentMethod ===
                            "efectivo"
                              ? "border-black bg-black text-white"
                              : "border-white/20"
                          }`}
                        >
                          {paymentMethod ===
                          "efectivo"
                            ? "✓"
                            : ""}
                        </span>

                      </button>

                    </div>

                  </div>

                  {/* ERROR */}

                  {checkoutError && (
                    <div className="border-b border-red-500/20 bg-red-500/5 px-6 py-5">

                      <p className="text-[8px] font-black tracking-[0.15em] text-red-400">
                        ERROR AL REGISTRAR PEDIDO
                      </p>

                      <p className="mt-2 text-[9px] leading-5 text-red-300/70">
                        {checkoutError}
                      </p>

                    </div>
                  )}

                  {/* TOTALS */}

                  <div className="px-6">

                    <div className="flex justify-between border-b border-white/[0.07] py-5 text-[9px] font-bold tracking-[0.12em]">

                      <span className="text-white/40">
                        ITEMS
                      </span>

                      <span>
                        {totalItems}
                      </span>

                    </div>

                    <div className="flex justify-between border-b border-white/[0.07] py-5 text-[9px] font-bold tracking-[0.12em]">

                      <span className="text-white/40">
                        SUBTOTAL
                      </span>

                      <span>
                        $
                        {subtotal.toFixed(
                          2
                        )}
                      </span>

                    </div>

                    {paymentMethod ===
                      "pagomovil" &&
                      offersDiscount >
                        0 && (
                        <div className="flex justify-between border-b border-white/[0.07] py-5 text-[9px] font-bold tracking-[0.12em]">

                          <span className="text-white/40">
                            OFERTAS ESPECIALES
                          </span>

                          <span className="font-black text-white">
                            -$
                            {offersDiscount.toFixed(
                              2
                            )}
                          </span>

                        </div>
                      )}

                    {paymentMethod ===
                      "efectivo" && (
                      <div className="flex justify-between border-b border-white/[0.07] py-5 text-[9px] font-bold tracking-[0.12em]">

                        <span className="text-white/40">
                          DESCUENTO 12%
                        </span>

                        <span className="font-black text-white">
                          -$
                          {cashDiscount.toFixed(
                            2
                          )}
                        </span>

                      </div>
                    )}

                    <div className="flex justify-between border-b border-white/[0.07] py-5 text-[9px] font-bold tracking-[0.12em]">

                      <span className="text-white/40">
                        SHIPPING
                      </span>

                      <span className="max-w-[150px] text-right text-[8px] leading-4 text-white/25">
                        CALCULATED AT CHECKOUT
                      </span>

                    </div>

                    {/* TOTAL */}

                    <div className="flex items-end justify-between py-7">

                      <div>

                        <p className="text-[8px] font-black tracking-[0.25em] text-white/35">
                          TOTAL
                        </p>

                        <p className="mt-2 text-3xl font-black tracking-[-0.05em]">
                          $
                          {finalTotal.toFixed(
                            2
                          )}
                        </p>

                        {paymentMethod ===
                          "pagomovil" &&
                          offersDiscount >
                            0 && (
                            <p className="mt-2 text-[7px] font-black tracking-[0.15em] text-white/30">
                              PRECIO ESPECIAL POR PAGO EN BOLÍVARES
                            </p>
                          )}

                        {paymentMethod ===
                          "efectivo" && (
                          <p className="mt-2 text-[7px] font-black tracking-[0.15em] text-white/30">
                            PRECIO CON 12% DESCUENTO
                          </p>
                        )}

                      </div>

                      <span className="mb-1 text-[8px] font-bold tracking-[0.2em] text-white/20">
                        USD
                      </span>

                    </div>

                    {/* CHECKOUT */}

                    <button
                      type="button"
                      onClick={
                        checkoutWhatsApp
                      }
                      disabled={
                        !canCheckout
                      }
                      className={`mb-6 flex w-full items-center justify-between rounded-full px-6 py-4 text-[9px] font-black tracking-[0.18em] transition ${
                        canCheckout
                          ? "cursor-pointer bg-white text-black hover:bg-white/80"
                          : "cursor-not-allowed bg-white/10 text-white/25"
                      }`}
                    >

                      <span>
                        {checkoutLoading
                          ? "REGISTRANDO PEDIDO..."
                          : "CHECKOUT VIA WHATSAPP"}
                      </span>

                      <span className="text-base">
                        →
                      </span>

                    </button>

                    <p className="mb-6 text-center text-[7px] font-bold leading-4 tracking-[0.15em] text-white/20">

                      {checkoutLoading
                        ? "CREANDO TU PEDIDO EN NEWCLOTHES..."
                        : "COMPLETE YOUR INFORMATION"}

                      <br />

                      {checkoutLoading
                        ? "POR FAVOR ESPERA."
                        : "TO CONTINUE TO WHATSAPP"}

                    </p>

                  </div>

                </div>

                {/* TRUST INFO */}

                <div className="mt-5 grid grid-cols-3 gap-2">

                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-4 text-center">

                    <p className="text-[7px] font-black tracking-[0.12em] text-white/30">
                      SECURE
                    </p>

                    <p className="mt-1 text-[7px] font-bold tracking-[0.1em] text-white/15">
                      ORDER
                    </p>

                  </div>

                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-4 text-center">

                    <p className="text-[7px] font-black tracking-[0.12em] text-white/30">
                      DIRECT
                    </p>

                    <p className="mt-1 text-[7px] font-bold tracking-[0.1em] text-white/15">
                      CONTACT
                    </p>

                  </div>

                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-4 text-center">

                    <p className="text-[7px] font-black tracking-[0.12em] text-white/30">
                      FAST
                    </p>

                    <p className="mt-1 text-[7px] font-bold tracking-[0.1em] text-white/15">
                      RESPONSE
                    </p>

                  </div>

                </div>

              </div>

            </div>

          )}

        </div>

      </section>

      {/* FOOTER */}

      <footer className="border-t border-white/10 bg-black px-5 py-10 md:px-8">

        <div className="mx-auto flex max-w-[1500px] flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-xl font-black tracking-[-0.08em]">
            NEWCLOTHES
          </p>

          <p className="text-[8px] font-bold tracking-[0.3em] text-white/20">
            STREETWEAR / WORLDWIDE
          </p>

          <p className="text-[8px] font-bold tracking-[0.2em] text-white/20">
            © 2026 NEWCLOTHES
          </p>

        </div>

      </footer>

    </main>
  );
}