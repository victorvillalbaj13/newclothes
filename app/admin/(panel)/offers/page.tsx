"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string;
  name: string;
  price: number;
  image: string | null;
  images: unknown;
  active: boolean;
  published: boolean;
};

type OfferType = "percentage" | "fixed";

type Offer = {
  id: string;
  name: string;
  description: string | null;
  type: OfferType;
  value: number;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  productIds: string[];
  products: Product[];
};

type OfferRow = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  value: number | string;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
};

type OfferProductRow = {
  offer_id: string;
  product_id: string;
};

type ProductRow = {
  id: string;
  name: string;
  price: number | string;
  image: string | null;
  images: unknown;
  active: boolean;
  published: boolean;
};

function getProductImage(product: Product | ProductRow) {
  if (
    typeof product.image === "string" &&
    product.image.trim() !== ""
  ) {
    return product.image;
  }

  if (Array.isArray(product.images)) {
    const firstImage = product.images.find(
      (item): item is string =>
        typeof item === "string" && item.trim() !== ""
    );

    if (firstImage) return firstImage;
  }

  return null;
}

function calculateFinalPrice(
  price: number,
  type: OfferType,
  value: number
) {
  if (type === "percentage") {
    return Math.max(0, price - (price * value) / 100);
  }

  return Math.max(0, value);
}

function formatPrice(value: number) {
  return `$${value.toFixed(2)}`;
}

function formatDate(date: string | null) {
  if (!date) return "Sin fecha";

  const parts = date.split("-");

  if (parts.length !== 3) return date;

  const [year, month, day] = parts;

  return `${day}/${month}/${year}`;
}

function normalizeDate(value: string | null) {
  if (!value) return "";

  return value.slice(0, 10);
}

function normalizeOfferType(value: string): OfferType {
  return value.toLowerCase() === "fixed"
    ? "fixed"
    : "percentage";
}

function emptyOffer(): Offer {
  return {
    id: "",
    name: "",
    description: "",
    type: "percentage",
    value: 20,
    startDate: "",
    endDate: "",
    active: true,
    productIds: [],
    products: [],
  };
}

export default function OffersPage() {
  const supabase = useMemo(() => createClient(), []);

  const [offers, setOffers] = useState<Offer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [editing, setEditing] = useState<Offer | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ALL");

  const [productSearch, setProductSearch] = useState("");

  const [form, setForm] = useState<Offer>(emptyOffer());

  const [message, setMessage] = useState<string | null>(null);

  /*
   * ============================================================
   * CARGAR PRODUCTOS Y OFERTAS DESDE SUPABASE
   * ============================================================
   */
  async function loadData() {
    setLoading(true);
    setMessage(null);

    try {
      /*
       * IMPORTANTE:
       *
       * Aquí se consulta directamente la tabla products.
       *
       * NO usamos productos locales.
       *
       * Tampoco filtramos por active ni published porque queremos
       * que el administrador pueda ver TODOS los productos que
       * existen en la base de datos.
       */
      const productsResponse = await supabase
        .from("products")
        .select(
          "id,name,price,image,images,active,published"
        )
        .order("created_at", {
          ascending: false,
        });

      if (productsResponse.error) {
        throw new Error(
          `Error cargando productos: ${productsResponse.error.message}`
        );
      }

      /*
       * Cargar ofertas.
       */
      const offersResponse = await supabase
        .from("offers")
        .select(
          "id,name,description,type,value,start_date,end_date,active"
        )
        .order("created_at", {
          ascending: false,
        });

      if (offersResponse.error) {
        throw new Error(
          `Error cargando ofertas: ${offersResponse.error.message}`
        );
      }

      /*
       * Cargar relaciones oferta -> producto.
       */
      const relationsResponse = await supabase
        .from("offer_products")
        .select("offer_id,product_id");

      if (relationsResponse.error) {
        throw new Error(
          `Error cargando productos de ofertas: ${relationsResponse.error.message}`
        );
      }

      /*
       * Normalizar productos.
       */
      const normalizedProducts: Product[] = (
        (productsResponse.data ?? []) as ProductRow[]
      ).map((product) => ({
        id: String(product.id),
        name: product.name,
        price: Number(product.price) || 0,
        image: product.image,
        images: product.images,
        active: Boolean(product.active),
        published: Boolean(product.published),
      }));

      /*
       * Relaciones.
       */
      const relations = (
        relationsResponse.data ?? []
      ) as OfferProductRow[];

      /*
       * Normalizar ofertas.
       */
      const normalizedOffers: Offer[] = (
        (offersResponse.data ?? []) as OfferRow[]
      ).map((offer) => {
        const productIds = relations
          .filter(
            (relation) =>
              String(relation.offer_id) === String(offer.id)
          )
          .map((relation) => String(relation.product_id));

        const selectedProducts =
          normalizedProducts.filter((product) =>
            productIds.includes(String(product.id))
          );

        return {
          id: String(offer.id),
          name: offer.name,
          description: offer.description,
          type: normalizeOfferType(offer.type),
          value: Number(offer.value) || 0,
          startDate: normalizeDate(offer.start_date),
          endDate: normalizeDate(offer.end_date),
          active: Boolean(offer.active),
          productIds,
          products: selectedProducts,
        };
      });

      /*
       * Guardar productos reales de Supabase.
       */
      setProducts(normalizedProducts);

      /*
       * Guardar ofertas reales de Supabase.
       */
      setOffers(normalizedOffers);
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las ofertas."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  /*
   * ============================================================
   * ESTADÍSTICAS
   * ============================================================
   */

  const activeOffers = offers.filter(
    (offer) => offer.active
  );

  const productsOnOffer = new Set(
    offers.flatMap((offer) => offer.productIds)
  ).size;

  const totalDiscountedValue = useMemo(() => {
    return offers
      .filter((offer) => offer.active)
      .reduce((total, offer) => {
        return (
          total +
          offer.products.reduce((sum, product) => {
            const finalPrice = calculateFinalPrice(
              product.price,
              offer.type,
              offer.value
            );

            return sum + (product.price - finalPrice);
          }, 0)
        );
      }, 0);
  }, [offers]);

  /*
   * ============================================================
   * FILTRAR OFERTAS
   * ============================================================
   */

  const filteredOffers = offers.filter((offer) => {
    const searchValue = search.trim().toLowerCase();

    const matchesSearch =
      !searchValue ||
      offer.name.toLowerCase().includes(searchValue) ||
      (offer.description ?? "")
        .toLowerCase()
        .includes(searchValue) ||
      offer.products.some((product) =>
        product.name.toLowerCase().includes(searchValue)
      );

    const matchesFilter =
      filter === "ALL" ||
      (filter === "ACTIVE" && offer.active) ||
      (filter === "INACTIVE" && !offer.active);

    return matchesSearch && matchesFilter;
  });

  /*
   * ============================================================
   * PRODUCTOS DE SUPABASE PARA EL SELECTOR
   * ============================================================
   *
   * Este es el punto importante.
   *
   * "products" viene directamente de:
   *
   * supabase.from("products")
   *
   * No existe ningún arreglo local de productos.
   *
   * Todos los productos de la tabla aparecen aquí.
   */

  const filteredProducts = products.filter((product) => {
    const value = productSearch.trim().toLowerCase();

    if (!value) return true;

    return (
      product.name.toLowerCase().includes(value) ||
      String(product.id)
        .toLowerCase()
        .includes(value)
    );
  });

  /*
   * ============================================================
   * NUEVA OFERTA
   * ============================================================
   */

  function openNewOffer() {
    setEditing(null);
    setProductSearch("");
    setMessage(null);

    const today = new Date()
      .toISOString()
      .slice(0, 10);

    setForm({
      ...emptyOffer(),
      startDate: today,
      endDate: "",
    });

    setShowForm(true);
  }

  /*
   * ============================================================
   * EDITAR OFERTA
   * ============================================================
   */

  function openEditOffer(offer: Offer) {
    setEditing(offer);
    setProductSearch("");
    setMessage(null);

    setForm({
      ...offer,
      productIds: [...offer.productIds],
      products: [...offer.products],
    });

    setShowForm(true);
  }

  /*
   * ============================================================
   * CERRAR MODAL
   * ============================================================
   */

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditing(null);
    setProductSearch("");
  }

  /*
   * ============================================================
   * SELECCIONAR / DESELECCIONAR PRODUCTO
   * ============================================================
   */

  function toggleProduct(productId: string) {
    setForm((current) => {
      const exists =
        current.productIds.includes(productId);

      const productIds = exists
        ? current.productIds.filter(
            (id) => id !== productId
          )
        : [...current.productIds, productId];

      /*
       * IMPORTANTE:
       *
       * Buscamos el producto nuevamente dentro de "products",
       * que viene de Supabase.
       */
      const selectedProducts = products.filter(
        (product) => productIds.includes(product.id)
      );

      return {
        ...current,
        productIds,
        products: selectedProducts,
      };
    });
  }

  /*
   * ============================================================
   * GUARDAR OFERTA
   * ============================================================
   */

  async function saveOffer() {
    if (saving) return;

    const name = form.name.trim();

    if (!name) {
      setMessage("Escribe un nombre para la oferta.");
      return;
    }

    if (form.productIds.length === 0) {
      setMessage("Selecciona al menos un producto.");
      return;
    }

    if (form.value <= 0) {
      setMessage(
        "El valor del descuento debe ser mayor a 0."
      );
      return;
    }

    if (
      form.type === "percentage" &&
      form.value > 100
    ) {
      setMessage(
        "El descuento no puede superar el 100%."
      );
      return;
    }

    if (
      form.startDate &&
      form.endDate &&
      form.endDate < form.startDate
    ) {
      setMessage(
        "La fecha de finalización no puede ser anterior a la fecha de inicio."
      );
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      let offerId = editing?.id ?? "";

      const offerPayload = {
        name,
        description:
          form.description?.trim() || null,
        type: form.type,
        value: form.value,
        start_date: form.startDate || null,
        end_date: form.endDate || null,
        active: form.active,
      };

      /*
       * ACTUALIZAR
       */
      if (editing) {
        const { error } = await supabase
          .from("offers")
          .update(offerPayload)
          .eq("id", editing.id);

        if (error) {
          throw new Error(
            `No se pudo actualizar la oferta: ${error.message}`
          );
        }

        offerId = editing.id;

        /*
         * Eliminamos relaciones anteriores.
         */
        const {
          error: deleteRelationsError,
        } = await supabase
          .from("offer_products")
          .delete()
          .eq("offer_id", offerId);

        if (deleteRelationsError) {
          throw new Error(
            `No se pudieron actualizar los productos de la oferta: ${deleteRelationsError.message}`
          );
        }
      } else {
        /*
         * CREAR
         */
        const { data, error } = await supabase
          .from("offers")
          .insert(offerPayload)
          .select(
            "id,name,description,type,value,start_date,end_date,active"
          )
          .single();

        if (error) {
          throw new Error(
            `No se pudo crear la oferta: ${error.message}`
          );
        }

        offerId = String(data.id);
      }

      /*
       * Crear relaciones con los productos seleccionados.
       */
      const relationRows = form.productIds.map(
        (productId) => ({
          offer_id: offerId,
          product_id: productId,
        })
      );

      const {
        error: relationsError,
      } = await supabase
        .from("offer_products")
        .insert(relationRows);

      if (relationsError) {
        /*
         * Si era una oferta nueva y falló la relación,
         * eliminamos la oferta creada para no dejar basura.
         */
        if (!editing) {
          await supabase
            .from("offers")
            .delete()
            .eq("id", offerId);
        }

        throw new Error(
          `No se pudieron guardar los productos de la oferta: ${relationsError.message}`
        );
      }

      setShowForm(false);
      setEditing(null);
      setProductSearch("");

      await loadData();

      setMessage(
        editing
          ? "Oferta actualizada correctamente."
          : "Oferta creada correctamente."
      );
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la oferta."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * ============================================================
   * ELIMINAR OFERTA
   * ============================================================
   */

  async function deleteOffer(id: string) {
    if (deletingId) return;

    const confirmed = window.confirm(
      "¿Seguro que quieres eliminar esta oferta? Esta acción no se puede deshacer."
    );

    if (!confirmed) return;

    setDeletingId(id);
    setMessage(null);

    try {
      /*
       * Primero eliminamos las relaciones.
       */
      const {
        error: relationError,
      } = await supabase
        .from("offer_products")
        .delete()
        .eq("offer_id", id);

      if (relationError) {
        throw new Error(
          `No se pudieron eliminar los productos asociados: ${relationError.message}`
        );
      }

      /*
       * Después eliminamos la oferta.
       */
      const { error } = await supabase
        .from("offers")
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error(
          `No se pudo eliminar la oferta: ${error.message}`
        );
      }

      setOffers((current) =>
        current.filter(
          (offer) => offer.id !== id
        )
      );

      setMessage(
        "Oferta eliminada correctamente."
      );
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la oferta."
      );
    } finally {
      setDeletingId(null);
    }
  }

  /*
   * ============================================================
   * ACTIVAR / DESACTIVAR
   * ============================================================
   */

  async function toggleOffer(id: string) {
    if (togglingId) return;

    const offer = offers.find(
      (item) => item.id === id
    );

    if (!offer) return;

    setTogglingId(id);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("offers")
        .update({
          active: !offer.active,
        })
        .eq("id", id);

      if (error) {
        throw new Error(
          `No se pudo cambiar el estado: ${error.message}`
        );
      }

      setOffers((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                active: !item.active,
              }
            : item
        )
      );

      setMessage(
        !offer.active
          ? "Oferta activada correctamente."
          : "Oferta desactivada correctamente."
      );
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el estado de la oferta."
      );
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      {/* HEADER */}
      <header className="border-b border-white/[0.07] bg-[#080808]">
        <div className="px-5 py-6 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/30">
                  Offers System
                </span>
              </div>

              <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                Ofertas
              </h1>

              <p className="mt-2 max-w-xl text-sm text-white/35">
                Crea descuentos, precios especiales y
                promociones para tus productos.
              </p>
            </div>

            <button
              onClick={openNewOffer}
              className="rounded-full bg-white px-6 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-black transition hover:bg-white/90"
            >
              + Nueva oferta
            </button>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="px-5 py-6 sm:px-8 lg:px-10">
        {/* MESSAGE */}
        {message && (
          <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#111] px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />

              <span className="text-xs font-medium text-white/60">
                {message}
              </span>
            </div>

            <button
              onClick={() => setMessage(null)}
              className="text-lg text-white/25 transition hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* STATS */}
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/[0.07] bg-[#111] p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                Total ofertas
              </span>

              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.05] text-sm">
                ◇
              </span>
            </div>

            <div className="text-3xl font-black">
              {loading ? "—" : offers.length}
            </div>

            <div className="mt-2 text-[10px] text-white/25">
              promociones creadas
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#111] p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                Activas
              </span>

              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                ✓
              </span>
            </div>

            <div className="text-3xl font-black">
              {loading ? "—" : activeOffers.length}
            </div>

            <div className="mt-2 text-[10px] text-white/25">
              ofertas actualmente activas
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#111] p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                Productos
              </span>

              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-400/10 text-purple-400">
                ▣
              </span>
            </div>

            <div className="text-3xl font-black">
              {loading ? "—" : productsOnOffer}
            </div>

            <div className="mt-2 text-[10px] text-white/25">
              productos incluidos
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#111] p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                Ahorro
              </span>

              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-yellow-400/10 text-yellow-400">
                %
              </span>
            </div>

            <div className="text-3xl font-black">
              {loading
                ? "—"
                : formatPrice(
                    totalDiscountedValue
                  )}
            </div>

            <div className="mt-2 text-[10px] text-white/25">
              valor promocional activo
            </div>
          </div>
        </section>

        {/* TOOLBAR */}
        <section className="mt-8 rounded-2xl border border-white/[0.07] bg-[#111] p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative flex-1 xl:max-w-md">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/25">
                ⌕
              </span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Buscar oferta..."
                className="w-full rounded-xl border border-white/[0.07] bg-[#080808] py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/20"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto">
              {[
                ["ALL", "Todas"],
                ["ACTIVE", "Activas"],
                ["INACTIVE", "Inactivas"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() =>
                    setFilter(
                      value as
                        | "ALL"
                        | "ACTIVE"
                        | "INACTIVE"
                    )
                  }
                  className={`whitespace-nowrap rounded-full px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.12em] transition ${
                    filter === value
                      ? "bg-white text-black"
                      : "border border-white/[0.08] text-white/35 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* OFFERS */}
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">
              Promociones
            </div>

            <div className="text-[10px] text-white/25">
              {loading
                ? "Cargando..."
                : `${filteredOffers.length} resultados`}
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="h-[360px] animate-pulse rounded-2xl border border-white/[0.07] bg-[#111]"
                />
              ))}
            </div>
          ) : filteredOffers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#111] px-6 py-16 text-center">
              <div className="text-3xl text-white/15">
                ◇
              </div>

              <div className="mt-3 text-sm font-bold text-white/40">
                {offers.length === 0
                  ? "No hay ofertas creadas"
                  : "No hay ofertas"}
              </div>

              <div className="mt-1 text-xs text-white/20">
                {offers.length === 0
                  ? "Crea tu primera promoción para comenzar."
                  : "Prueba con otro término de búsqueda o filtro."}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredOffers.map((offer) => {
                const selectedProducts =
                  offer.products;

                return (
                  <article
                    key={offer.id}
                    className="group overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111] transition-all hover:border-white/15"
                  >
                    {/* OFFER TOP */}
                    <div className="border-b border-white/[0.07] p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[8px] font-black tracking-[0.1em] ${
                                offer.active
                                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                                  : "border-white/10 bg-white/[0.04] text-white/30"
                              }`}
                            >
                              {offer.active
                                ? "ACTIVA"
                                : "INACTIVA"}
                            </span>

                            <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[8px] font-black tracking-[0.1em] text-white/35">
                              {offer.type ===
                              "percentage"
                                ? `${offer.value}% OFF`
                                : "PRECIO ESPECIAL"}
                            </span>
                          </div>

                          <h2 className="mt-3 truncate text-xl font-black tracking-[-0.02em]">
                            {offer.name}
                          </h2>

                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/30">
                            {offer.description ||
                              "Promoción especial NEWCLOTHES."}
                          </p>
                        </div>

                        <div className="shrink-0 rounded-2xl bg-white px-4 py-3 text-center text-black">
                          <div className="text-2xl font-black leading-none">
                            {offer.type ===
                            "percentage"
                              ? `${offer.value}%`
                              : formatPrice(
                                  offer.value
                                )}
                          </div>

                          <div className="mt-1 text-[7px] font-black uppercase tracking-[0.15em]">
                            {offer.type ===
                            "percentage"
                              ? "Descuento"
                              : "Precio"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PRODUCTS */}
                    <div className="p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">
                          Productos incluidos
                        </div>

                        <div className="text-[9px] text-white/20">
                          {selectedProducts.length}{" "}
                          productos
                        </div>
                      </div>

                      {selectedProducts.length ===
                      0 ? (
                        <div className="rounded-xl border border-dashed border-white/10 bg-[#080808] p-6 text-center text-xs text-white/20">
                          Sin productos asociados
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {selectedProducts.map(
                            (product) => {
                              const finalPrice =
                                calculateFinalPrice(
                                  product.price,
                                  offer.type,
                                  offer.value
                                );

                              const productImage =
                                getProductImage(
                                  product
                                );

                              return (
                                <div
                                  key={product.id}
                                  className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#080808]"
                                >
                                  <div className="aspect-square overflow-hidden bg-[#111]">
                                    {productImage ? (
                                      <img
                                        src={
                                          productImage
                                        }
                                        alt={
                                          product.name
                                        }
                                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-white/10">
                                        <span className="text-2xl">
                                          ◇
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="p-3">
                                    <div className="truncate text-[10px] font-black">
                                      {product.name}
                                    </div>

                                    <div className="mt-2 flex items-center gap-2">
                                      <span className="text-xs font-black text-emerald-400">
                                        {formatPrice(
                                          finalPrice
                                        )}
                                      </span>

                                      <span className="text-[9px] text-white/20 line-through">
                                        {formatPrice(
                                          product.price
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      )}
                    </div>

                    {/* DATES */}
                    <div className="grid grid-cols-2 gap-px border-t border-white/[0.07] bg-white/[0.05]">
                      <div className="bg-[#0d0d0d] p-4">
                        <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/20">
                          Inicio
                        </div>

                        <div className="mt-1 text-xs font-bold text-white/60">
                          {formatDate(
                            offer.startDate
                          )}
                        </div>
                      </div>

                      <div className="bg-[#0d0d0d] p-4">
                        <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/20">
                          Finaliza
                        </div>

                        <div className="mt-1 text-xs font-bold text-white/60">
                          {formatDate(
                            offer.endDate
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex flex-wrap gap-2 border-t border-white/[0.07] p-4">
                      <button
                        onClick={() =>
                          void toggleOffer(
                            offer.id
                          )
                        }
                        disabled={
                          togglingId ===
                          offer.id
                        }
                        className={`rounded-full px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-40 ${
                          offer.active
                            ? "border border-white/10 text-white/40 hover:bg-white/[0.05] hover:text-white"
                            : "bg-white text-black hover:bg-white/90"
                        }`}
                      >
                        {togglingId ===
                        offer.id
                          ? "Guardando..."
                          : offer.active
                          ? "Desactivar"
                          : "Activar"}
                      </button>

                      <button
                        onClick={() =>
                          openEditOffer(
                            offer
                          )
                        }
                        disabled={
                          togglingId ===
                            offer.id ||
                          deletingId ===
                            offer.id
                        }
                        className="rounded-full border border-white/10 px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.12em] text-white/40 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-40"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() =>
                          void deleteOffer(
                            offer.id
                          )
                        }
                        disabled={
                          deletingId ===
                          offer.id
                        }
                        className="rounded-full border border-red-400/10 px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.12em] text-red-400/60 transition hover:bg-red-400/10 hover:text-red-400 disabled:opacity-40"
                      >
                        {deletingId ===
                        offer.id
                          ? "Eliminando..."
                          : "Eliminar"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* INFO */}
        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.07] bg-[#111] p-5">
            <div className="mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">
              Descuento
            </div>

            <div className="text-sm leading-6 text-white/40">
              Puedes utilizar un porcentaje o
              establecer directamente un precio
              promocional.
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#111] p-5">
            <div className="mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">
              Productos
            </div>

            <div className="text-sm leading-6 text-white/40">
              Una misma oferta puede aplicarse a
              varios productos.
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#111] p-5">
            <div className="mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">
              Sistema
            </div>

            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Offers System Online
            </div>
          </div>
        </section>
      </div>

      {/* FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:p-8">
          <div className="my-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-white/[0.08] bg-[#101010] shadow-2xl">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-5 sm:px-7">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/25">
                  Offers Editor
                </div>

                <h2 className="mt-1 text-xl font-black">
                  {editing
                    ? "Editar oferta"
                    : "Nueva oferta"}
                </h2>
              </div>

              <button
                onClick={closeForm}
                disabled={saving}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/40 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-30"
              >
                ×
              </button>
            </div>

            <div className="grid lg:grid-cols-[1fr_360px]">
              {/* FORM */}
              <div className="p-5 sm:p-7">
                <div className="grid gap-5">
                  {/* NAME */}
                  <div>
                    <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">
                      Nombre de la oferta
                    </label>

                    <input
                      value={form.name}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          name: event.target.value,
                        })
                      }
                      placeholder="Ej. DROP WEEK"
                      disabled={saving}
                      className="w-full rounded-xl border border-white/[0.07] bg-[#080808] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/20 disabled:opacity-50"
                    />
                  </div>

                  {/* DESCRIPTION */}
                  <div>
                    <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">
                      Descripción
                    </label>

                    <textarea
                      value={form.description ?? ""}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          description:
                            event.target.value,
                        })
                      }
                      rows={3}
                      placeholder="Describe brevemente la promoción..."
                      disabled={saving}
                      className="w-full resize-none rounded-xl border border-white/[0.07] bg-[#080808] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/20 disabled:opacity-50"
                    />
                  </div>

                  {/* DISCOUNT TYPE */}
                  <div>
                    <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">
                      Tipo de oferta
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          setForm({
                            ...form,
                            type: "percentage",
                          })
                        }
                        className={`rounded-xl border p-4 text-left transition disabled:opacity-50 ${
                          form.type ===
                          "percentage"
                            ? "border-white/20 bg-white text-black"
                            : "border-white/[0.07] bg-[#080808] text-white/50 hover:text-white"
                        }`}
                      >
                        <div className="text-lg font-black">
                          %
                        </div>

                        <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em]">
                          Porcentaje
                        </div>
                      </button>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          setForm({
                            ...form,
                            type: "fixed",
                          })
                        }
                        className={`rounded-xl border p-4 text-left transition disabled:opacity-50 ${
                          form.type === "fixed"
                            ? "border-white/20 bg-white text-black"
                            : "border-white/[0.07] bg-[#080808] text-white/50 hover:text-white"
                        }`}
                      >
                        <div className="text-lg font-black">
                          $
                        </div>

                        <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em]">
                          Precio especial
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* VALUE */}
                  <div>
                    <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">
                      {form.type ===
                      "percentage"
                        ? "Descuento"
                        : "Precio final"}
                    </label>

                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-white/30">
                        {form.type ===
                        "percentage"
                          ? "%"
                          : "$"}
                      </span>

                      <input
                        type="number"
                        min="0"
                        max={
                          form.type ===
                          "percentage"
                            ? 100
                            : undefined
                        }
                        step="0.01"
                        value={form.value}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            value: Number(
                              event.target.value
                            ),
                          })
                        }
                        disabled={saving}
                        className="w-full rounded-xl border border-white/[0.07] bg-[#080808] py-3 pl-10 pr-4 text-sm font-bold text-white outline-none focus:border-white/20 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* DATES */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">
                        Fecha de inicio
                      </label>

                      <input
                        type="date"
                        value={
                          form.startDate ?? ""
                        }
                        onChange={(event) =>
                          setForm({
                            ...form,
                            startDate:
                              event.target.value,
                          })
                        }
                        disabled={saving}
                        className="w-full rounded-xl border border-white/[0.07] bg-[#080808] px-4 py-3 text-sm text-white outline-none focus:border-white/20 disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">
                        Fecha de finalización
                      </label>

                      <input
                        type="date"
                        value={
                          form.endDate ?? ""
                        }
                        onChange={(event) =>
                          setForm({
                            ...form,
                            endDate:
                              event.target.value,
                          })
                        }
                        disabled={saving}
                        className="w-full rounded-xl border border-white/[0.07] bg-[#080808] px-4 py-3 text-sm text-white outline-none focus:border-white/20 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* ACTIVE */}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      setForm({
                        ...form,
                        active: !form.active,
                      })
                    }
                    className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-[#080808] p-4 text-left disabled:opacity-50"
                  >
                    <div>
                      <div className="text-sm font-bold">
                        Oferta activa
                      </div>

                      <div className="mt-1 text-[10px] text-white/25">
                        Disponible para mostrarse en la
                        tienda.
                      </div>
                    </div>

                    <span
                      className={`relative h-6 w-11 rounded-full transition ${
                        form.active
                          ? "bg-white"
                          : "bg-white/10"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-4 w-4 rounded-full transition ${
                          form.active
                            ? "left-6 bg-black"
                            : "left-1 bg-white/40"
                        }`}
                      />
                    </span>
                  </button>

                  {/* PRODUCTS */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <label className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">
                        Productos
                      </label>

                      <span className="text-[9px] text-white/20">
                        {form.productIds.length}{" "}
                        seleccionados
                      </span>
                    </div>

                    {/*
                     * INDICADOR DE BASE DE DATOS
                     *
                     * Esto permite comprobar que la lista
                     * viene de Supabase.
                     */}
                    <div className="mb-3 flex items-center justify-between rounded-xl border border-emerald-400/10 bg-emerald-400/[0.03] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-400/70">
                          Productos de la base de datos
                        </span>
                      </div>

                      <span className="text-[10px] font-black text-white/50">
                        {products.length}
                      </span>
                    </div>

                    {/* PRODUCT SEARCH */}
                    <div className="relative mb-3">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/25">
                        ⌕
                      </span>

                      <input
                        value={productSearch}
                        onChange={(event) =>
                          setProductSearch(
                            event.target.value
                          )
                        }
                        placeholder="Buscar producto..."
                        disabled={saving}
                        className="w-full rounded-xl border border-white/[0.07] bg-[#080808] py-3 pl-11 pr-4 text-xs text-white outline-none placeholder:text-white/20 focus:border-white/20 disabled:opacity-50"
                      />
                    </div>

                    <div className="max-h-[390px] overflow-y-auto pr-1">
                      {filteredProducts.length ===
                      0 ? (
                        <div className="rounded-xl border border-dashed border-white/10 bg-[#080808] p-8 text-center">
                          <div className="text-sm font-bold text-white/30">
                            {products.length ===
                            0
                              ? "No hay productos en Supabase"
                              : "No se encontraron productos"}
                          </div>

                          <div className="mt-2 text-[10px] text-white/20">
                            {products.length ===
                            0
                              ? "La tabla products no devolvió registros."
                              : "Prueba con otro nombre."}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {filteredProducts.map(
                            (product) => {
                              const selectedProduct =
                                form.productIds.includes(
                                  product.id
                                );

                              const finalPrice =
                                calculateFinalPrice(
                                  product.price,
                                  form.type,
                                  form.value
                                );

                              const productImage =
                                getProductImage(
                                  product
                                );

                              return (
                                <button
                                  type="button"
                                  key={product.id}
                                  disabled={saving}
                                  onClick={() =>
                                    toggleProduct(
                                      product.id
                                    )
                                  }
                                  className={`overflow-hidden rounded-xl border text-left transition disabled:opacity-50 ${
                                    selectedProduct
                                      ? "border-white/30 bg-white/[0.07]"
                                      : "border-white/[0.06] bg-[#080808] hover:border-white/15"
                                  }`}
                                >
                                  <div className="relative aspect-square overflow-hidden bg-[#111]">
                                    {productImage ? (
                                      <img
                                        src={
                                          productImage
                                        }
                                        alt={
                                          product.name
                                        }
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-white/10">
                                        <span className="text-3xl">
                                          ◇
                                        </span>
                                      </div>
                                    )}

                                    <div
                                      className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${
                                        selectedProduct
                                          ? "bg-white text-black"
                                          : "bg-black/60 text-white/30 backdrop-blur"
                                      }`}
                                    >
                                      {selectedProduct
                                        ? "✓"
                                        : "+"}
                                    </div>

                                    {!product.active && (
                                      <div className="absolute bottom-2 left-2 rounded-full bg-black/80 px-2 py-1 text-[7px] font-black uppercase tracking-[0.1em] text-yellow-400 backdrop-blur">
                                        Inactivo
                                      </div>
                                    )}
                                  </div>

                                  <div className="p-3">
                                    <div className="truncate text-[10px] font-black">
                                      {product.name}
                                    </div>

                                    <div className="mt-1 text-[8px] text-white/20">
                                      {product.published
                                        ? "Publicado"
                                        : "No publicado"}
                                    </div>

                                    <div className="mt-2 flex items-center gap-2">
                                      <span className="text-[10px] font-black text-emerald-400">
                                        {formatPrice(
                                          finalPrice
                                        )}
                                      </span>

                                      <span className="text-[8px] text-white/20 line-through">
                                        {formatPrice(
                                          product.price
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              );
                            }
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* PREVIEW */}
              <aside className="border-t border-white/[0.07] bg-[#0b0b0b] p-5 lg:border-l lg:border-t-0 sm:p-7">
                <div className="mb-5">
                  <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">
                    Live Preview
                  </div>

                  <div className="mt-1 text-sm text-white/35">
                    Así se verá la promoción.
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111]">
                  <div className="relative flex aspect-[4/3] items-end overflow-hidden bg-[#151515]">
                    {form.productIds[0] ? (
                      (() => {
                        const previewProduct =
                          products.find(
                            (product) =>
                              product.id ===
                              form.productIds[0]
                          );

                        const previewImage =
                          previewProduct
                            ? getProductImage(
                                previewProduct
                              )
                            : null;

                        return previewImage ? (
                          <img
                            src={previewImage}
                            alt="Preview"
                            className="absolute inset-0 h-full w-full object-cover opacity-80"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-white/10">
                            <span className="text-4xl">
                              ◇
                            </span>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-white/10">
                        <span className="text-4xl">
                          ◇
                        </span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                    <div className="relative z-10 w-full p-5">
                      <div className="inline-flex rounded-full bg-white px-3 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-black">
                        {form.type ===
                        "percentage"
                          ? `${form.value}% OFF`
                          : "SPECIAL PRICE"}
                      </div>

                      <div className="mt-3 text-2xl font-black tracking-tight">
                        {form.name ||
                          "NUEVA OFERTA"}
                      </div>

                      <div className="mt-1 text-xs text-white/50">
                        {form.description ||
                          "Promoción especial NEWCLOTHES."}
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/25">
                      Vigencia
                    </div>

                    <div className="mt-2 text-xs font-bold text-white/60">
                      {formatDate(
                        form.startDate
                      )}{" "}
                      —{" "}
                      {formatDate(
                        form.endDate
                      )}
                    </div>

                    <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#080808] p-3">
                      <div className="text-[8px] uppercase tracking-[0.15em] text-white/20">
                        Productos
                      </div>

                      <div className="mt-1 text-sm font-black">
                        {form.productIds.length}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/[0.07] bg-[#111] p-4">
                  <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/20">
                    Estado
                  </div>

                  <div
                    className={`mt-2 flex items-center gap-2 text-xs font-bold ${
                      form.active
                        ? "text-emerald-400"
                        : "text-white/30"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        form.active
                          ? "bg-emerald-400"
                          : "bg-white/20"
                      }`}
                    />

                    {form.active
                      ? "Oferta activa"
                      : "Oferta inactiva"}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/[0.07] bg-[#111] p-4">
                  <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/20">
                    Resumen
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/25">
                        Tipo
                      </span>

                      <span className="text-[10px] font-bold text-white/60">
                        {form.type ===
                        "percentage"
                          ? "Porcentaje"
                          : "Precio especial"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/25">
                        Valor
                      </span>

                      <span className="text-[10px] font-bold text-white/60">
                        {form.type ===
                        "percentage"
                          ? `${form.value}%`
                          : formatPrice(
                              form.value
                            )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/25">
                        Productos
                      </span>

                      <span className="text-[10px] font-bold text-white/60">
                        {form.productIds.length}
                      </span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>

            {/* MODAL FOOTER */}
            <div className="flex flex-col-reverse gap-2 border-t border-white/[0.07] bg-[#0c0c0c] p-4 sm:flex-row sm:items-center sm:justify-end">
              <button
                onClick={closeForm}
                disabled={saving}
                className="rounded-full border border-white/10 px-6 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-white/40 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-30"
              >
                Cancelar
              </button>

              <button
                onClick={() =>
                  void saveOffer()
                }
                disabled={saving}
                className="rounded-full bg-white px-6 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Guardando..."
                  : editing
                  ? "Guardar cambios"
                  : "Crear oferta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}