"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string;
  name: string;
  price: number;
  image: string | null;
  images: unknown;
  active: boolean;
};

type Variant = {
  id: string;
  product_id: string;
  color: string;
  size: string;
  stock: number;
};

type Offer = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  value: number;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  created_at: string;
  product_ids: string[];
};

type OrderItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  size: string;
  color: string;
  quantity: number;
  price: number;
  original_price: number | null;
  offer_id: string | null;
  offer_name: string | null;
};

type Order = {
  id: string;
  order_number: number;
  customer_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  payment: string | null;
  shipping: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
};

type DraftItem = {
  id: string;
  product_id: string;
  variant_id: string;
  product_name: string;
  product_image: string | null;
  size: string;
  color: string;
  quantity: number;
  price: number;
  original_price: number;
  offer_id: string | null;
  offer_name: string | null;
};

const STATUS_OPTIONS = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const SALE_STATUSES = [
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
];

export default function SalesAdmin() {
  const supabase = createClient();

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);

  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const [showCreateSale, setShowCreateSale] =
    useState(false);

  const [savingSale, setSavingSale] =
    useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [draftItems, setDraftItems] =
    useState<DraftItem[]>([]);

  const [selectedProductId, setSelectedProductId] =
    useState("");

  const [selectedVariantId, setSelectedVariantId] =
    useState("");

  const [productSearch, setProductSearch] =
    useState("");

  const [quantity, setQuantity] = useState(1);
  const [payment, setPayment] = useState("");
  const [shipping, setShipping] = useState("");

  useEffect(() => {
    loadOrders();
    loadCatalog();
  }, []);

  async function loadOrders() {
    setLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        order_number,
        customer_name,
        email,
        phone,
        status,
        payment,
        shipping,
        created_at,
        updated_at,
        order_items (
          id,
          product_id,
          size,
          color,
          quantity,
          price,
          original_price,
          offer_id,
          offer_name,
          products (
            name,
            image,
            images
          )
        )
      `
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);

      setMessage({
        type: "error",
        text: "No se pudieron cargar las ventas.",
      });

      setLoading(false);
      return;
    }

    const mappedOrders: Order[] = (data || []).map(
      (item: any) => {
        const mappedItems: OrderItem[] = (
          item.order_items || []
        ).map((orderItem: any) => {
          let image =
            orderItem.products?.image || null;

          if (
            !image &&
            Array.isArray(orderItem.products?.images) &&
            orderItem.products.images.length > 0
          ) {
            image = orderItem.products.images[0];
          }

          return {
            id: orderItem.id,
            product_id: orderItem.product_id || null,
            product_name:
              orderItem.products?.name ||
              "Producto eliminado",
            product_image: image,
            size: orderItem.size || "—",
            color: orderItem.color || "—",
            quantity: Number(orderItem.quantity || 0),
            price: Number(orderItem.price || 0),
            original_price:
              orderItem.original_price !== null &&
              orderItem.original_price !== undefined
                ? Number(orderItem.original_price)
                : null,
            offer_id: orderItem.offer_id || null,
            offer_name: orderItem.offer_name || null,
          };
        });

        return {
          id: item.id,
          order_number: Number(item.order_number),
          customer_name: item.customer_name || "",
          email: item.email || null,
          phone: item.phone || null,
          status: item.status || "PENDING",
          payment: item.payment || null,
          shipping: item.shipping || null,
          created_at: item.created_at,
          updated_at: item.updated_at,
          items: mappedItems,
        };
      }
    );

    setOrders(mappedOrders);
    setLoading(false);
  }

  async function loadCatalog() {
    setCatalogLoading(true);

    const [
      productsResult,
      variantsResult,
      offersResult,
      offerProductsResult,
    ] = await Promise.all([
      supabase
        .from("products")
        .select(
          "id, name, price, image, images, active"
        )
        .order("name", {
          ascending: true,
        }),

      supabase
        .from("product_variants")
        .select(
          "id, product_id, color, size, stock"
        )
        .order("size", {
          ascending: true,
        }),

      supabase
        .from("offers")
        .select(
          "id, name, description, type, value, start_date, end_date, active, created_at"
        )
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("offer_products")
        .select("offer_id, product_id"),
    ]);

    if (productsResult.error) {
      console.error(productsResult.error);
    }

    if (variantsResult.error) {
      console.error(variantsResult.error);
    }

    if (offersResult.error) {
      console.error(offersResult.error);
    }

    if (offerProductsResult.error) {
      console.error(offerProductsResult.error);
    }

    const offerProducts =
      (offerProductsResult.data || []) as {
        offer_id: string;
        product_id: string;
      }[];

    const mappedOffers: Offer[] = (
      offersResult.data || []
    ).map((offer: any) => ({
      id: offer.id,
      name: offer.name,
      description: offer.description || null,
      type: offer.type,
      value: Number(offer.value || 0),
      start_date: offer.start_date || null,
      end_date: offer.end_date || null,
      active: Boolean(offer.active),
      created_at: offer.created_at,
      product_ids: offerProducts
        .filter(
          (item) => item.offer_id === offer.id
        )
        .map((item) => item.product_id),
    }));

    setProducts(
      (productsResult.data || []) as Product[]
    );

    setVariants(
      (variantsResult.data || []) as Variant[]
    );

    setOffers(mappedOffers);

    setCatalogLoading(false);
  }

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !query ||
        String(order.order_number)
          .toLowerCase()
          .includes(query) ||
        order.items.some((item) =>
          item.product_name
            .toLowerCase()
            .includes(query)
        ) ||
        order.items.some((item) =>
          item.offer_name
            ?.toLowerCase()
            .includes(query)
        );

      const matchesFilter =
        filter === "ALL" ||
        order.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [orders, search, filter]);

  const pendingCount = orders.filter(
    (order) => order.status === "PENDING"
  ).length;

  const confirmedCount = orders.filter(
    (order) => order.status === "CONFIRMED"
  ).length;

  const shippedCount = orders.filter(
    (order) => order.status === "SHIPPED"
  ).length;

  const deliveredCount = orders.filter(
    (order) => order.status === "DELIVERED"
  ).length;

  const salesCount = orders.filter((order) =>
    SALE_STATUSES.includes(order.status)
  ).length;

  const totalRevenue = orders
    .filter((order) =>
      SALE_STATUSES.includes(order.status)
    )
    .reduce(
      (total, order) =>
        total + getOrderTotal(order),
      0
    );

  const selectedProduct =
    products.find(
      (product) => product.id === selectedProductId
    ) || null;

  const availableVariants = variants.filter(
    (variant) =>
      variant.product_id === selectedProductId
  );

  const selectedVariant =
    variants.find(
      (variant) => variant.id === selectedVariantId
    ) || null;

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();

    return products
      .filter((product) => product.active)
      .filter((product) => {
        if (!query) {
          return true;
        }

        return (
          product.name.toLowerCase().includes(query) ||
          product.id.toLowerCase().includes(query)
        );
      });
  }, [products, productSearch]);

  const draftTotal = draftItems.reduce(
    (total, item) =>
      total + item.price * item.quantity,
    0
  );

  function resetSaleForm() {
    setDraftItems([]);
    setSelectedProductId("");
    setSelectedVariantId("");
    setProductSearch("");
    setQuantity(1);
    setPayment("");
    setShipping("");
  }

  function openCreateSale() {
    resetSaleForm();
    setShowCreateSale(true);
  }

  function closeCreateSale() {
    if (savingSale) {
      return;
    }

    setShowCreateSale(false);
    resetSaleForm();
  }

  function handleProductChange(productId: string) {
    setSelectedProductId(productId);
    setSelectedVariantId("");
    setQuantity(1);
  }

  function getActiveOfferForProduct(
    productId: string
  ) {
    const today = new Date()
      .toISOString()
      .slice(0, 10);

    return (
      offers.find((offer) => {
        if (!offer.active) {
          return false;
        }

        if (!offer.product_ids.includes(productId)) {
          return false;
        }

        if (
          offer.start_date &&
          offer.start_date > today
        ) {
          return false;
        }

        if (
          offer.end_date &&
          offer.end_date < today
        ) {
          return false;
        }

        return true;
      }) || null
    );
  }

  function calculateOfferPrice(
    basePrice: number,
    offer: Offer | null
  ) {
    if (!offer) {
      return {
        price: Number(basePrice),
        originalPrice: Number(basePrice),
      };
    }

    const value = Number(offer.value || 0);

    if (offer.type === "percentage") {
      return {
        price: Math.max(
          0,
          Number(
            (
              basePrice -
              basePrice * (value / 100)
            ).toFixed(2)
          )
        ),
        originalPrice: Number(basePrice),
      };
    }

    if (
      offer.type === "fixed" ||
      offer.type === "amount"
    ) {
      return {
        price: Math.max(
          0,
          Number(
            (basePrice - value).toFixed(2)
          )
        ),
        originalPrice: Number(basePrice),
      };
    }

    return {
      price: Number(basePrice),
      originalPrice: Number(basePrice),
    };
  }

  function addDraftItem() {
    if (!selectedProduct || !selectedVariant) {
      setMessage({
        type: "error",
        text: "Selecciona un producto y una variante.",
      });

      return;
    }

    if (selectedVariant.stock <= 0) {
      setMessage({
        type: "error",
        text: "Esta variante no tiene stock disponible.",
      });

      return;
    }

    if (
      quantity < 1 ||
      quantity > selectedVariant.stock
    ) {
      setMessage({
        type: "error",
        text: `La cantidad máxima disponible es ${selectedVariant.stock}.`,
      });

      return;
    }

    const alreadyExists = draftItems.find(
      (item) => item.variant_id === selectedVariant.id
    );

    if (alreadyExists) {
      const newQuantity =
        alreadyExists.quantity + quantity;

      if (newQuantity > selectedVariant.stock) {
        setMessage({
          type: "error",
          text: `Solo hay ${selectedVariant.stock} unidades disponibles de esta variante.`,
        });

        return;
      }

      setDraftItems((current) =>
        current.map((item) =>
          item.variant_id === selectedVariant.id
            ? {
                ...item,
                quantity: newQuantity,
              }
            : item
        )
      );
    } else {
      const image = getProductImage(selectedProduct);
      const activeOffer =
        getActiveOfferForProduct(
          selectedProduct.id
        );

      const calculatedPrice =
        calculateOfferPrice(
          Number(selectedProduct.price),
          activeOffer
        );

      setDraftItems((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          product_id: selectedProduct.id,
          variant_id: selectedVariant.id,
          product_name: selectedProduct.name,
          product_image: image,
          size: selectedVariant.size || "—",
          color: selectedVariant.color || "—",
          quantity,
          price: calculatedPrice.price,
          original_price:
            calculatedPrice.originalPrice,
          offer_id: activeOffer?.id || null,
          offer_name:
            activeOffer?.name || null,
        },
      ]);
    }

    setSelectedVariantId("");
    setQuantity(1);
    setMessage(null);
  }

  function removeDraftItem(itemId: string) {
    setDraftItems((current) =>
      current.filter((item) => item.id !== itemId)
    );
  }

  function updateDraftQuantity(
    itemId: string,
    nextQuantity: number
  ) {
    const item = draftItems.find(
      (draftItem) => draftItem.id === itemId
    );

    if (!item) {
      return;
    }

    const variant = variants.find(
      (variantItem) =>
        variantItem.id === item.variant_id
    );

    const maxStock = variant?.stock ?? 999999;

    if (
      nextQuantity < 1 ||
      nextQuantity > maxStock
    ) {
      return;
    }

    setDraftItems((current) =>
      current.map((draftItem) =>
        draftItem.id === itemId
          ? {
              ...draftItem,
              quantity: nextQuantity,
            }
          : draftItem
      )
    );
  }

  async function createSale() {
    if (draftItems.length === 0) {
      setMessage({
        type: "error",
        text: "Agrega al menos un producto a la venta.",
      });

      return;
    }

    if (catalogLoading) {
      return;
    }

    setSavingSale(true);
    setMessage(null);

    const {
      data: createdOrder,
      error: orderError,
    } = await supabase
      .from("orders")
      .insert({
        customer_name: "Venta NEWCLOTHES",
        email: null,
        phone: null,
        status: "PENDING",
        payment: payment.trim() || null,
        shipping: shipping.trim() || null,
      })
      .select(
        `
        id,
        order_number,
        customer_name,
        email,
        phone,
        status,
        payment,
        shipping,
        created_at,
        updated_at
      `
      )
      .single();

    if (orderError || !createdOrder) {
      console.error(orderError);

      setMessage({
        type: "error",
        text:
          orderError?.message ||
          "No se pudo crear la venta.",
      });

      setSavingSale(false);
      return;
    }

    const orderItems = draftItems.map((item) => ({
      order_id: createdOrder.id,
      product_id: item.product_id,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      price: item.price,
      original_price: item.original_price,
      offer_id: item.offer_id,
      offer_name: item.offer_name,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error(itemsError);

      await supabase
        .from("orders")
        .delete()
        .eq("id", createdOrder.id);

      setMessage({
        type: "error",
        text:
          itemsError.message ||
          "No se pudieron guardar los productos de la venta.",
      });

      setSavingSale(false);
      return;
    }

    setMessage({
      type: "success",
      text: `Venta NWC-${String(
        createdOrder.order_number
      ).padStart(4, "0")} registrada correctamente.`,
    });

    setSavingSale(false);
    setShowCreateSale(false);
    resetSaleForm();

    await loadOrders();
  }

  async function updateOrderStatus(
    order: Order,
    status: string
  ) {
    if (order.status === status) {
      return;
    }

    if (
      status === "CANCELLED" &&
      order.status !== "CANCELLED"
    ) {
      const confirmed = window.confirm(
        `¿Seguro que quieres cancelar la venta #${order.order_number}?`
      );

      if (!confirmed) {
        return;
      }
    }

    setUpdating(order.id);
    setMessage(null);

    const updatedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from("orders")
      .update({
        status,
        updated_at: updatedAt,
      })
      .eq("id", order.id)
      .select(
        `
        id,
        order_number,
        customer_name,
        email,
        phone,
        status,
        payment,
        shipping,
        created_at,
        updated_at
        `
      )
      .single();

    if (error) {
      console.error(error);

      setMessage({
        type: "error",
        text:
          error.message ||
          "No se pudo actualizar la venta.",
      });

      setUpdating(null);
      return;
    }

    setOrders((current) =>
      current.map((item) =>
        item.id === order.id
          ? {
              ...item,
              status: data.status,
              updated_at: data.updated_at,
            }
          : item
      )
    );

    setSelectedOrder((current) =>
      current?.id === order.id
        ? {
            ...current,
            status: data.status,
            updated_at: data.updated_at,
          }
        : current
    );

    setMessage({
      type: "success",
      text:
        status === "CONFIRMED"
          ? `Venta #${order.order_number} confirmada.`
          : status === "CANCELLED"
            ? `Venta #${order.order_number} cancelada.`
            : `Venta #${order.order_number} actualizada.`,
    });

    setUpdating(null);

    setTimeout(() => {
      setMessage(null);
    }, 2500);
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
        <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="h-px w-8 bg-white/30" />

              <span className="text-[9px] font-medium uppercase tracking-[0.35em] text-zinc-500">
                Sales Management
              </span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Ventas
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
              Registra ventas, consulta productos y controla el estado de cada operación.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadOrders}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-400 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white disabled:opacity-40"
            >
              ↻ &nbsp; Actualizar
            </button>

            <button
              onClick={openCreateSale}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-[9px] font-bold uppercase tracking-[0.15em] text-black transition hover:bg-zinc-200"
            >
              ＋ Registrar venta
            </button>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="Pedidos"
            value={orders.length}
            detail="Total"
          />

          <StatCard
            label="Ventas"
            value={`$${totalRevenue.toFixed(2)}`}
            detail={`${salesCount} confirmadas`}
          />

          <StatCard
            label="Pendientes"
            value={pendingCount}
            detail="Por confirmar"
          />

          <StatCard
            label="Confirmadas"
            value={confirmedCount}
            detail="Ventas"
          />

          <StatCard
            label="Enviadas"
            value={shippedCount}
            detail="En tránsito"
          />

          <StatCard
            label="Entregadas"
            value={deliveredCount}
            detail="Completadas"
          />
        </div>

        <div className="mb-5 rounded-[24px] border border-white/[0.07] bg-white/[0.025] p-3 backdrop-blur-xl">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600">
                ⌕
              </span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Buscar venta, número o producto..."
                className="h-12 w-full rounded-2xl border border-white/[0.06] bg-black/40 pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/20"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto">
              <FilterButton
                active={filter === "ALL"}
                onClick={() => setFilter("ALL")}
              >
                Todas
              </FilterButton>

              <FilterButton
                active={filter === "PENDING"}
                onClick={() => setFilter("PENDING")}
              >
                Pendientes
              </FilterButton>

              <FilterButton
                active={filter === "CONFIRMED"}
                onClick={() => setFilter("CONFIRMED")}
              >
                Confirmadas
              </FilterButton>

              <FilterButton
                active={filter === "SHIPPED"}
                onClick={() => setFilter("SHIPPED")}
              >
                Enviadas
              </FilterButton>

              <FilterButton
                active={filter === "DELIVERED"}
                onClick={() => setFilter("DELIVERED")}
              >
                Entregadas
              </FilterButton>

              <FilterButton
                active={filter === "CANCELLED"}
                onClick={() => setFilter("CANCELLED")}
              >
                Canceladas
              </FilterButton>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[28px] border border-white/[0.07] bg-white/[0.025] px-6 py-20 text-center">
            <div className="mx-auto mb-4 h-7 w-7 animate-spin rounded-full border-2 border-white/10 border-t-white/70" />

            <p className="text-sm text-zinc-500">
              Cargando ventas...
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-20 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/[0.08] bg-white/[0.03] text-2xl text-zinc-600">
              $
            </div>

            <h3 className="text-lg font-medium">
              {orders.length === 0
                ? "No hay ventas todavía"
                : "No se encontraron ventas"}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
              {orders.length === 0
                ? "Registra tu primera venta para comenzar a gestionar tus pedidos."
                : "Prueba con otro filtro o término de búsqueda."}
            </p>

            {orders.length === 0 && (
              <button
                onClick={openCreateSale}
                className="mt-6 rounded-xl bg-white px-5 py-3 text-[9px] font-bold uppercase tracking-[0.15em] text-black transition hover:bg-zinc-200"
              >
                ＋ Registrar primera venta
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                updating={updating === order.id}
                onOpen={() =>
                  setSelectedOrder(order)
                }
                onStatusChange={(status) =>
                  updateOrderStatus(
                    order,
                    status
                  )
                }
              />
            ))}
          </div>
        )}

        <div className="mt-10 flex flex-col gap-2 border-t border-white/[0.05] pt-5 text-[8px] uppercase tracking-[0.25em] text-zinc-700 sm:flex-row sm:items-center sm:justify-between">
          <span>NEWCLOTHES® ADMIN SYSTEM</span>

          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500/70" />
            Supabase Connected
          </span>
        </div>
      </div>

      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          updating={updating === selectedOrder.id}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={(status) =>
            updateOrderStatus(
              selectedOrder,
              status
            )
          }
        />
      )}

      {showCreateSale && (
        <CreateSaleModal
          products={products}
          variants={variants}
          draftItems={draftItems}
          selectedProductId={selectedProductId}
          selectedVariantId={selectedVariantId}
          productSearch={productSearch}
          quantity={quantity}
          payment={payment}
          shipping={shipping}
          availableVariants={availableVariants}
          selectedVariant={selectedVariant}
          selectedProduct={selectedProduct}
          filteredProducts={filteredProducts}
          draftTotal={draftTotal}
          catalogLoading={catalogLoading}
          saving={savingSale}
          onClose={closeCreateSale}
          onProductSearch={setProductSearch}
          onProductChange={handleProductChange}
          onVariantChange={setSelectedVariantId}
          onQuantityChange={setQuantity}
          onPaymentChange={setPayment}
          onShippingChange={setShipping}
          onAddItem={addDraftItem}
          onRemoveItem={removeDraftItem}
          onUpdateQuantity={updateDraftQuantity}
          onCreate={createSale}
          getActiveOfferForProduct={
            getActiveOfferForProduct
          }
          calculateOfferPrice={
            calculateOfferPrice
          }
        />
      )}

      {message && (
        <div className="fixed bottom-5 left-1/2 z-[300] w-[calc(100%-32px)] max-w-[500px] -translate-x-1/2">
          <div
            className={`rounded-2xl border px-4 py-3 text-center text-sm shadow-2xl backdrop-blur-xl ${
              message.type === "success"
                ? "border-green-500/20 bg-[#101510]/95 text-green-400"
                : "border-red-500/20 bg-[#150c0c]/95 text-red-400"
            }`}
          >
            {message.text}
          </div>
        </div>
      )}
    </main>
  );
}

function CreateSaleModal({
  products,
  variants,
  draftItems,
  selectedProductId,
  selectedVariantId,
  productSearch,
  quantity,
  payment,
  shipping,
  availableVariants,
  selectedVariant,
  selectedProduct,
  filteredProducts,
  draftTotal,
  catalogLoading,
  saving,
  onClose,
  onProductSearch,
  onProductChange,
  onVariantChange,
  onQuantityChange,
  onPaymentChange,
  onShippingChange,
  onAddItem,
  onRemoveItem,
  onUpdateQuantity,
  onCreate,
  getActiveOfferForProduct,
  calculateOfferPrice,
}: {
  products: Product[];
  variants: Variant[];
  draftItems: DraftItem[];
  selectedProductId: string;
  selectedVariantId: string;
  productSearch: string;
  quantity: number;
  payment: string;
  shipping: string;
  availableVariants: Variant[];
  selectedVariant: Variant | null;
  selectedProduct: Product | null;
  filteredProducts: Product[];
  draftTotal: number;
  catalogLoading: boolean;
  saving: boolean;
  onClose: () => void;
  onProductSearch: (value: string) => void;
  onProductChange: (value: string) => void;
  onVariantChange: (value: string) => void;
  onQuantityChange: (value: number) => void;
  onPaymentChange: (value: string) => void;
  onShippingChange: (value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  onUpdateQuantity: (
    id: string,
    quantity: number
  ) => void;
  onCreate: () => void;
  getActiveOfferForProduct: (
    productId: string
  ) => Offer | null;
  calculateOfferPrice: (
    basePrice: number,
    offer: Offer | null
  ) => {
    price: number;
    originalPrice: number;
  };
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[94vh] w-full max-w-[1000px] flex-col overflow-hidden rounded-[30px] border border-white/[0.1] bg-[#0b0b0b] shadow-[0_40px_120px_rgba(0,0,0,0.8)]">
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-5 py-5 sm:px-7">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="h-px w-6 bg-white/30" />

              <span className="text-[8px] uppercase tracking-[0.3em] text-zinc-600">
                New Sale
              </span>
            </div>

            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Registrar venta
            </h2>

            <p className="mt-1 text-xs text-zinc-600">
              Selecciona visualmente los productos de la operación.
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={saving}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-lg text-zinc-500 transition hover:border-white/20 hover:text-white disabled:opacity-40"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-6 p-5 sm:p-7">
            <section className="rounded-[24px] border border-white/[0.07] bg-white/[0.025] p-5">
              <div className="mb-5 flex items-center gap-3">
                <span className="text-[8px] font-semibold uppercase tracking-[0.25em] text-zinc-600">
                  01
                </span>

                <div className="h-px flex-1 bg-white/[0.05]" />

                <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-300">
                  Seleccionar producto
                </h3>
              </div>

              {catalogLoading ? (
                <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-8 text-center">
                  <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-white/70" />

                  <p className="text-xs text-zinc-600">
                    Cargando catálogo...
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600">
                      ⌕
                    </span>

                    <input
                      value={productSearch}
                      onChange={(event) =>
                        onProductSearch(
                          event.target.value
                        )
                      }
                      placeholder="Buscar por nombre del producto..."
                      className="h-12 w-full rounded-2xl border border-white/[0.08] bg-black/50 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-white/20"
                    />

                    {productSearch && (
                      <button
                        type="button"
                        onClick={() =>
                          onProductSearch("")
                        }
                        className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-white/[0.05] hover:text-white"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {filteredProducts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/[0.07] bg-black/20 px-5 py-10 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.025] text-zinc-700">
                        ⌕
                      </div>

                      <p className="text-sm text-zinc-500">
                        No se encontraron productos.
                      </p>

                      <p className="mt-1 text-[10px] text-zinc-700">
                        Prueba con otro nombre.
                      </p>
                    </div>
                  ) : (
                    <div className="grid max-h-[360px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
                      {filteredProducts.map(
                        (product) => {
                          const image =
                            getProductImage(product);

                          const isSelected =
                            selectedProductId ===
                            product.id;

                          const productVariants =
                            variants.filter(
                              (variant) =>
                                variant.product_id ===
                                product.id
                            );

                          const stockAvailable =
                            productVariants.some(
                              (variant) =>
                                variant.stock > 0
                            );

                          const activeOffer =
                            getActiveOfferForProduct(
                              product.id
                            );

                          const offerPrice =
                            calculateOfferPrice(
                              Number(
                                product.price
                              ),
                              activeOffer
                            );

                          return (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() =>
                                onProductChange(
                                  product.id
                                )
                              }
                              className={`group overflow-hidden rounded-2xl border text-left transition ${
                                isSelected
                                  ? "border-white bg-white/[0.08] shadow-[0_0_0_1px_rgba(255,255,255,0.15)]"
                                  : "border-white/[0.07] bg-black/30 hover:border-white/20 hover:bg-white/[0.04]"
                              }`}
                            >
                              <div className="relative aspect-square overflow-hidden bg-[#111]">
                                {image ? (
                                  <img
                                    src={image}
                                    alt={product.name}
                                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-zinc-800">
                                    ◇
                                  </div>
                                )}

                                {isSelected && (
                                  <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-black shadow-lg">
                                    ✓
                                  </div>
                                )}

                                {!stockAvailable && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/65">
                                    <span className="rounded-full border border-white/10 bg-black/70 px-3 py-1.5 text-[7px] font-bold uppercase tracking-[0.15em] text-zinc-500">
                                      Sin stock
                                    </span>
                                  </div>
                                )}

                                {activeOffer && (
                                  <div className="absolute left-2 top-2 rounded-full border border-red-400/20 bg-red-500/80 px-2 py-1 text-[7px] font-bold uppercase tracking-[0.12em] text-white shadow-lg backdrop-blur-sm">
                                    Oferta
                                  </div>
                                )}
                              </div>

                              <div className="p-3">
                                <p className="truncate text-[10px] font-semibold text-zinc-300">
                                  {product.name}
                                </p>

                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  {activeOffer &&
                                  offerPrice.price <
                                    offerPrice.originalPrice ? (
                                    <>
                                      <span className="text-[9px] text-zinc-600 line-through">
                                        $
                                        {offerPrice.originalPrice.toFixed(
                                          2
                                        )}
                                      </span>

                                      <span className="text-[10px] font-semibold text-white">
                                        $
                                        {offerPrice.price.toFixed(
                                          2
                                        )}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-[10px] text-zinc-500">
                                      $
                                      {Number(
                                        product.price
                                      ).toFixed(2)}
                                    </span>
                                  )}
                                </div>

                                <div className="mt-1 flex items-center justify-between gap-2">
                                  {activeOffer ? (
                                    <span className="truncate text-[7px] uppercase tracking-[0.1em] text-red-400/80">
                                      {activeOffer.name}
                                    </span>
                                  ) : (
                                    <span />
                                  )}

                                  <span
                                    className={`text-[7px] uppercase tracking-[0.1em] ${
                                      stockAvailable
                                        ? "text-green-500/70"
                                        : "text-zinc-700"
                                    }`}
                                  >
                                    {stockAvailable
                                      ? "Disponible"
                                      : "Agotado"}
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        }
                      )}
                    </div>
                  )}

                  {selectedProduct && (
                    <div className="rounded-2xl border border-white/[0.07] bg-black/30 p-4">
                      {(() => {
                        const activeOffer =
                          getActiveOfferForProduct(
                            selectedProduct.id
                          );

                        const offerPrice =
                          calculateOfferPrice(
                            Number(
                              selectedProduct.price
                            ),
                            activeOffer
                          );

                        return (
                          <div className="mb-4 flex items-center gap-3">
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-black">
                              {getProductImage(
                                selectedProduct
                              ) ? (
                                <img
                                  src={
                                    getProductImage(
                                      selectedProduct
                                    ) as string
                                  }
                                  alt={
                                    selectedProduct.name
                                  }
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-zinc-800">
                                  ◇
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-semibold text-white">
                                  {selectedProduct.name}
                                </p>

                                {activeOffer && (
                                  <span className="rounded-full border border-red-400/20 bg-red-500/10 px-2 py-1 text-[7px] font-bold uppercase tracking-[0.1em] text-red-400">
                                    Oferta
                                  </span>
                                )}
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                {offerPrice.price <
                                offerPrice.originalPrice ? (
                                  <>
                                    <span className="text-[9px] text-zinc-600 line-through">
                                      $
                                      {offerPrice.originalPrice.toFixed(
                                        2
                                      )}
                                    </span>

                                    <span className="text-xs font-semibold text-white">
                                      $
                                      {offerPrice.price.toFixed(
                                        2
                                      )}
                                    </span>

                                    {activeOffer && (
                                      <span className="text-[8px] uppercase tracking-[0.1em] text-red-400/70">
                                        {activeOffer.name}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-xs text-zinc-500">
                                    $
                                    {Number(
                                      selectedProduct.price
                                    ).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="grid gap-3 md:grid-cols-[1fr_110px_auto]">
                        <SelectField
                          label="Talla / Color"
                          value={selectedVariantId}
                          onChange={
                            onVariantChange
                          }
                          disabled={
                            !selectedProductId
                          }
                        >
                          <option
                            value=""
                            className="bg-[#111]"
                          >
                            {availableVariants.length ===
                            0
                              ? "Sin variantes"
                              : "Seleccionar variante"}
                          </option>

                          {availableVariants.map(
                            (variant) => (
                              <option
                                key={variant.id}
                                value={variant.id}
                                disabled={
                                  variant.stock <= 0
                                }
                                className="bg-[#111]"
                              >
                                {variant.size} ·{" "}
                                {variant.color} ·{" "}
                                {variant.stock} stock
                              </option>
                            )
                          )}
                        </SelectField>

                        <InputField
                          label="Cantidad"
                          type="number"
                          min={1}
                          max={
                            selectedVariant?.stock ||
                            1
                          }
                          value={quantity}
                          onChange={(event) =>
                            onQuantityChange(
                              Number(
                                event.target.value
                              )
                            )
                          }
                        />

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={onAddItem}
                            disabled={
                              !selectedProductId ||
                              !selectedVariantId ||
                              !selectedVariant ||
                              selectedVariant.stock <=
                                0
                            }
                            className="h-11 w-full rounded-xl bg-white px-5 text-[9px] font-bold uppercase tracking-[0.12em] text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ＋ Agregar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-[24px] border border-white/[0.07] bg-white/[0.025] p-5">
              <div className="mb-5 flex items-center gap-3">
                <span className="text-[8px] font-semibold uppercase tracking-[0.25em] text-zinc-600">
                  02
                </span>

                <div className="h-px flex-1 bg-white/[0.05]" />

                <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-300">
                  Productos de la venta
                </h3>
              </div>

              {draftItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.07] bg-black/20 p-10 text-center">
                  <p className="text-sm text-zinc-600">
                    Todavía no has agregado productos.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {draftItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-black/20 p-3 sm:flex-row sm:items-center"
                    >
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/[0.07] bg-black">
                        {item.product_image ? (
                          <img
                            src={item.product_image}
                            alt={item.product_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-zinc-800">
                            ◇
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[11px] font-semibold text-zinc-300">
                            {item.product_name}
                          </p>

                          {item.offer_id && (
                            <span className="rounded-full border border-red-400/20 bg-red-500/10 px-2 py-0.5 text-[6px] font-bold uppercase tracking-[0.1em] text-red-400">
                              Oferta
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-zinc-600">
                          Talla {item.size} ·{" "}
                          {item.color}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {item.original_price >
                          item.price ? (
                            <>
                              <span className="text-[8px] text-zinc-700 line-through">
                                $
                                {item.original_price.toFixed(
                                  2
                                )}
                              </span>

                              <span className="text-[9px] font-semibold text-white">
                                $
                                {item.price.toFixed(
                                  2
                                )}{" "}
                                unidad
                              </span>

                              {item.offer_name && (
                                <span className="text-[7px] uppercase tracking-[0.08em] text-red-400/70">
                                  {item.offer_name}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-[9px] text-zinc-700">
                              ${item.price.toFixed(2)}{" "}
                              unidad
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(
                              item.id,
                              item.quantity - 1
                            )
                          }
                          disabled={
                            item.quantity <= 1
                          }
                          className="h-9 w-9 rounded-lg border border-white/[0.08] text-zinc-500 transition hover:border-white/20 hover:text-white disabled:opacity-20"
                        >
                          −
                        </button>

                        <span className="w-8 text-center text-xs font-semibold">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(
                              item.id,
                              item.quantity + 1
                            )
                          }
                          className="h-9 w-9 rounded-lg border border-white/[0.08] text-zinc-500 transition hover:border-white/20 hover:text-white"
                        >
                          +
                        </button>
                      </div>

                      <div className="w-24 text-right">
                        <p className="text-sm font-semibold">
                          $
                          {(
                            item.price *
                            item.quantity
                          ).toFixed(2)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          onRemoveItem(item.id)
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/10 bg-red-500/[0.03] text-sm text-red-500/60 transition hover:border-red-500/25 hover:text-red-400"
                        title="Eliminar"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_280px]">
              <div className="rounded-[24px] border border-white/[0.07] bg-white/[0.025] p-5">
                <div className="mb-5 flex items-center gap-3">
                  <span className="text-[8px] font-semibold uppercase tracking-[0.25em] text-zinc-600">
                    03
                  </span>

                  <div className="h-px flex-1 bg-white/[0.05]" />

                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-300">
                    Información
                  </h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <InputField
                    label="Método de pago"
                    value={payment}
                    onChange={(event) =>
                      onPaymentChange(
                        event.target.value
                      )
                    }
                    placeholder="Ej. Pago móvil"
                  />

                  <InputField
                    label="Método de envío"
                    value={shipping}
                    onChange={(event) =>
                      onShippingChange(
                        event.target.value
                      )
                    }
                    placeholder="Ej. Delivery"
                  />
                </div>
              </div>

              <div className="rounded-[24px] border border-white/[0.07] bg-white/[0.025] p-5">
                <p className="text-[8px] uppercase tracking-[0.2em] text-zinc-600">
                  Total de la venta
                </p>

                <p className="mt-3 text-3xl font-semibold tracking-tight">
                  ${draftTotal.toFixed(2)}
                </p>

                <p className="mt-2 text-[9px] uppercase tracking-[0.15em] text-zinc-700">
                  Estado inicial: Pendiente
                </p>
              </div>
            </section>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-white/[0.07] bg-[#0b0b0b] px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-6 py-3 text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500 transition hover:border-white/20 hover:text-white disabled:opacity-40"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onCreate}
            disabled={
              saving ||
              draftItems.length === 0
            }
            className="rounded-xl bg-white px-7 py-3 text-[9px] font-bold uppercase tracking-[0.15em] text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {saving
              ? "Registrando..."
              : "Registrar venta"}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderCard({
  order,
  updating,
  onOpen,
  onStatusChange,
}: {
  order: Order;
  updating: boolean;
  onOpen: () => void;
  onStatusChange: (status: string) => void;
}) {
  const total = getOrderTotal(order);

  const quantity = order.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const hasOffer = order.items.some(
    (item) => Boolean(item.offer_id)
  );

  const isPending =
    order.status === "PENDING";

  return (
    <div
      className={`group overflow-hidden rounded-[24px] border bg-white/[0.025] transition ${
        isPending
          ? "border-yellow-400/10 hover:border-yellow-400/20"
          : "border-white/[0.07] hover:border-white/[0.13]"
      }`}
    >
      <div className="flex flex-col gap-5 p-5 xl:flex-row xl:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40">
            {order.items[0]?.product_image ? (
              <img
                src={order.items[0].product_image}
                alt={
                  order.items[0].product_name ||
                  "Producto"
                }
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-sm font-semibold text-zinc-700">
                #
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onOpen}
                className="text-sm font-semibold tracking-tight transition hover:text-zinc-300"
              >
                NWC-
                {String(order.order_number).padStart(
                  4,
                  "0"
                )}
              </button>

              <StatusBadge status={order.status} />

              {hasOffer && (
                <span className="rounded-full border border-red-400/20 bg-red-500/10 px-2.5 py-1 text-[7px] font-semibold uppercase tracking-[0.12em] text-red-400">
                  Oferta
                </span>
              )}
            </div>

            <p className="mt-2 truncate text-xs text-zinc-500">
              {order.items.length === 1
                ? order.items[0]?.product_name
                : `${order.items.length} productos`}
            </p>

            <p className="mt-1 text-[9px] text-zinc-700">
              {formatDateTime(order.created_at)}
            </p>
          </div>
        </div>

        {order.items.length > 1 && (
          <div className="hidden shrink-0 items-center -space-x-2 lg:flex">
            {order.items.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="h-10 w-10 overflow-hidden rounded-xl border-2 border-[#080808] bg-black"
              >
                {item.product_image ? (
                  <img
                    src={item.product_image}
                    alt={item.product_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[8px] text-zinc-700">
                    ◇
                  </div>
                )}
              </div>
            ))}

            {order.items.length > 4 && (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#080808] bg-zinc-900 text-[8px] text-zinc-500">
                +{order.items.length - 4}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:w-[470px]">
          <MiniData
            label="Productos"
            value={String(quantity)}
          />

          <MiniData
            label="Total"
            value={`$${total.toFixed(2)}`}
          />

          <MiniData
            label="Pago"
            value={order.payment || "—"}
          />

          <MiniData
            label="Envío"
            value={order.shipping || "—"}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row xl:w-[350px] xl:justify-end">
          {isPending && (
            <>
              <button
                onClick={() =>
                  onStatusChange("CONFIRMED")
                }
                disabled={updating}
                className="h-11 rounded-xl bg-white px-4 text-[9px] font-bold uppercase tracking-[0.12em] text-black transition hover:bg-zinc-200 disabled:opacity-40"
              >
                {updating
                  ? "Actualizando..."
                  : "✓ Confirmar"}
              </button>

              <button
                onClick={() =>
                  onStatusChange("CANCELLED")
                }
                disabled={updating}
                className="h-11 rounded-xl border border-red-500/15 bg-red-500/[0.05] px-4 text-[9px] font-bold uppercase tracking-[0.12em] text-red-400 transition hover:border-red-500/30 hover:bg-red-500/10 disabled:opacity-40"
              >
                Cancelar
              </button>
            </>
          )}

          <button
            onClick={onOpen}
            className="flex h-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500 transition hover:border-white/20 hover:text-white"
          >
            Ver venta →
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderModal({
  order,
  updating,
  onClose,
  onStatusChange,
}: {
  order: Order;
  updating: boolean;
  onClose: () => void;
  onStatusChange: (status: string) => void;
}) {
  const total = getOrderTotal(order);

  const isPending =
    order.status === "PENDING";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative flex max-h-[94vh] w-full max-w-[1000px] flex-col overflow-hidden rounded-[30px] border border-white/[0.1] bg-[#0b0b0b] shadow-[0_40px_120px_rgba(0,0,0,0.8)]">
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-5 py-5 sm:px-7">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="h-px w-6 bg-white/30" />

              <span className="text-[8px] uppercase tracking-[0.3em] text-zinc-600">
                Sale Detail
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                NWC-
                {String(order.order_number).padStart(
                  4,
                  "0"
                )}
              </h2>

              <StatusBadge status={order.status} />

              {order.items.some(
                (item) => Boolean(item.offer_id)
              ) && (
                <span className="rounded-full border border-red-400/20 bg-red-500/10 px-2.5 py-1 text-[7px] font-semibold uppercase tracking-[0.12em] text-red-400">
                  Oferta
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-lg text-zinc-500 transition hover:border-white/20 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_0.7fr]">
            <div className="space-y-5">
              <DetailSection
                eyebrow="01"
                title="Productos"
              >
                <div className="space-y-2">
                  {order.items.map((item) => {
                    const hasDiscount =
                      item.original_price !== null &&
                      item.original_price >
                        item.price;

                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-black/20 p-3"
                      >
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/[0.07] bg-black">
                          {item.product_image ? (
                            <img
                              src={item.product_image}
                              alt={item.product_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-zinc-800">
                              ◇
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-[11px] font-semibold text-zinc-300">
                              {item.product_name}
                            </p>

                            {item.offer_id && (
                              <span className="rounded-full border border-red-400/20 bg-red-500/10 px-2 py-0.5 text-[6px] font-bold uppercase tracking-[0.1em] text-red-400">
                                Oferta
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-zinc-700">
                            Talla {item.size} ·{" "}
                            {item.color}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {hasDiscount ? (
                              <>
                                <span className="text-[8px] text-zinc-700 line-through">
                                  $
                                  {Number(
                                    item.original_price
                                  ).toFixed(2)}
                                </span>

                                <span className="text-[9px] font-semibold text-white">
                                  $
                                  {item.price.toFixed(
                                    2
                                  )}{" "}
                                  unidad
                                </span>

                                {item.offer_name && (
                                  <span className="text-[7px] uppercase tracking-[0.08em] text-red-400/70">
                                    {item.offer_name}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-[9px] text-zinc-600">
                                $
                                {item.price.toFixed(
                                  2
                                )}{" "}
                                unidad
                              </span>
                            )}

                            <span className="text-[8px] text-zinc-700">
                              · Cantidad:{" "}
                              {item.quantity}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-semibold">
                            $
                            {(
                              item.price *
                              item.quantity
                            ).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-end justify-between border-t border-white/[0.06] pt-4">
                  <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-600">
                    Total
                  </span>

                  <span className="text-2xl font-semibold tracking-tight">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </DetailSection>

              <DetailSection
                eyebrow="02"
                title="Estado"
              >
                {isPending && (
                  <div className="mb-4 rounded-2xl border border-yellow-400/10 bg-yellow-400/[0.035] p-4">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-yellow-300">
                      Venta pendiente
                    </p>

                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      Confirma la venta cuando la operación haya sido concretada.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      onClick={() =>
                        onStatusChange(status)
                      }
                      disabled={updating}
                      className={`rounded-xl border px-2 py-3 text-[8px] font-semibold uppercase tracking-[0.1em] transition ${
                        order.status === status
                          ? "border-white bg-white text-black"
                          : "border-white/[0.07] bg-black/20 text-zinc-600 hover:border-white/15 hover:text-zinc-300"
                      } disabled:opacity-40`}
                    >
                      {statusLabel(status)}
                    </button>
                  ))}
                </div>
              </DetailSection>
            </div>

            <div className="space-y-5">
              <DetailSection
                eyebrow="03"
                title="Información"
              >
                <div className="space-y-2">
                  <InfoRow
                    label="Número"
                    value={`NWC-${String(
                      order.order_number
                    ).padStart(4, "0")}`}
                  />

                  <InfoRow
                    label="Fecha"
                    value={formatDateTime(
                      order.created_at
                    )}
                  />

                  <InfoRow
                    label="Pago"
                    value={order.payment || "—"}
                  />

                  <InfoRow
                    label="Envío"
                    value={order.shipping || "—"}
                  />

                  <InfoRow
                    label="Estado"
                    value={statusLabel(order.status)}
                  />

                  <InfoRow
                    label="Actualizada"
                    value={formatDateTime(
                      order.updated_at
                    )}
                  />
                </div>
              </DetailSection>

              {order.items.some(
                (item) => Boolean(item.offer_id)
              ) && (
                <DetailSection
                  eyebrow="04"
                  title="Oferta aplicada"
                >
                  <div className="space-y-2">
                    {order.items
                      .filter(
                        (item) =>
                          Boolean(item.offer_id)
                      )
                      .map((item) => (
                        <div
                          key={`${item.id}-offer`}
                          className="rounded-2xl border border-red-400/10 bg-red-500/[0.035] p-4"
                        >
                          <p className="text-[8px] uppercase tracking-[0.18em] text-red-400/70">
                            Oferta registrada
                          </p>

                          <p className="mt-2 text-sm font-semibold text-red-300">
                            {item.offer_name ||
                              "Oferta aplicada"}
                          </p>

                          <p className="mt-2 text-[9px] leading-5 text-zinc-600">
                            El precio mostrado corresponde al
                            valor histórico guardado en la venta.
                          </p>
                        </div>
                      ))}
                  </div>
                </DetailSection>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-white/[0.07] bg-[#0b0b0b] px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          {isPending && (
            <>
              <button
                onClick={() =>
                  onStatusChange("CANCELLED")
                }
                disabled={updating}
                className="rounded-xl border border-red-500/15 bg-red-500/[0.05] px-6 py-3 text-[9px] font-bold uppercase tracking-[0.15em] text-red-400 transition hover:bg-red-500/10 disabled:opacity-40"
              >
                Cancelar venta
              </button>

              <button
                onClick={() =>
                  onStatusChange("CONFIRMED")
                }
                disabled={updating}
                className="rounded-xl bg-white px-7 py-3 text-[9px] font-bold uppercase tracking-[0.15em] text-black transition hover:bg-zinc-200 disabled:opacity-40"
              >
                {updating
                  ? "Actualizando..."
                  : "✓ Confirmar venta"}
              </button>
            </>
          )}

          <button
            onClick={onClose}
            className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-6 py-3 text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500 transition hover:border-white/20 hover:text-white"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailSection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-white/[0.07] bg-white/[0.025] p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className="text-[8px] font-semibold uppercase tracking-[0.25em] text-zinc-600">
          {eyebrow}
        </span>

        <div className="h-px flex-1 bg-white/[0.05]" />

        <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-300">
          {title}
        </h3>
      </div>

      {children}
    </section>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[8px] font-medium uppercase tracking-[0.18em] text-zinc-600">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        disabled={disabled}
        className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/50 px-3 text-[10px] text-zinc-300 outline-none transition focus:border-white/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {children}
      </select>
    </label>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  max,
}: {
  label: string;
  value: string | number;
  onChange: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
  placeholder?: string;
  type?: string;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[8px] font-medium uppercase tracking-[0.18em] text-zinc-600">
        {label}
      </span>

      <input
        type={type}
        value={value}
        min={min}
        max={max}
        onChange={onChange}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/50 px-3 text-[10px] text-white outline-none transition placeholder:text-zinc-700 focus:border-white/20"
      />
    </label>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-5 rounded-xl border border-white/[0.05] bg-black/20 px-4 py-3">
      <span className="text-[8px] uppercase tracking-[0.15em] text-zinc-700">
        {label}
      </span>

      <span className="max-w-[65%] truncate text-right text-[10px] text-zinc-400">
        {value}
      </span>
    </div>
  );
}

function MiniData({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[7px] uppercase tracking-[0.15em] text-zinc-700">
        {label}
      </p>

      <p className="mt-1 truncate text-[10px] font-medium text-zinc-400">
        {value}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/[0.07] bg-white/[0.025] p-5 transition hover:border-white/[0.12]">
      <p className="text-[8px] font-medium uppercase tracking-[0.25em] text-zinc-600">
        {label}
      </p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <span className="text-2xl font-semibold tracking-tight">
          {value}
        </span>

        <span className="text-right text-[8px] uppercase tracking-[0.15em] text-zinc-700">
          {detail}
        </span>
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-xl px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.14em] transition ${
        active
          ? "bg-white text-black"
          : "border border-white/[0.06] bg-white/[0.025] text-zinc-600 hover:border-white/15 hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const styles: Record<string, string> = {
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
      className={`rounded-full border px-2.5 py-1 text-[7px] font-semibold uppercase tracking-[0.12em] ${
        styles[status] ||
        "border-white/10 bg-white/[0.03] text-zinc-500"
      }`}
    >
      {statusLabel(status)}
    </span>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Pendiente",
    CONFIRMED: "Confirmada",
    SHIPPED: "Enviada",
    DELIVERED: "Entregada",
    CANCELLED: "Cancelada",
  };

  return labels[status] || status;
}

function getProductImage(product: Product) {
  if (product.image) {
    return product.image;
  }

  if (
    Array.isArray(product.images) &&
    product.images.length > 0
  ) {
    const first = product.images[0];

    if (typeof first === "string") {
      return first;
    }
  }

  return null;
}

function getOrderTotal(order: Order) {
  return order.items.reduce(
    (total, item) =>
      total + item.price * item.quantity,
    0
  );
}

function formatDateTime(date: string) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}