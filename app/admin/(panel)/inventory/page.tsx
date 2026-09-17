"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string;
  name: string;
  price: number;
  image: string | null;
  sku: string;
};

type Offer = {
  id: string;
  name: string;
  description: string;
  type: "percentage" | "fixed";
  value: number;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  productIds: string[];
  products: Product[];
};

const EMPTY_FORM = {
  name: "",
  description: "",
  type: "percentage" as "percentage" | "fixed",
  value: 10,
  start_date: "",
  end_date: "",
  active: true,
  productIds: [] as string[],
};

export default function OffersAdmin() {
  const supabase = createClient();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const [productSearch, setProductSearch] = useState("");

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [offersResult, productsResult] = await Promise.all([
      supabase
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
          active,
          offer_products (
            product_id
          )
        `
        )
        .order("created_at", { ascending: false }),

      supabase
        .from("products")
        .select(
          `
          id,
          name,
          price,
          image,
          sku
        `
        )
        .order("name", { ascending: true }),
    ]);

    if (offersResult.error) {
      console.error(offersResult.error);

      setMessage({
        type: "error",
        text: "No se pudieron cargar las ofertas.",
      });

      setLoading(false);
      return;
    }

    if (productsResult.error) {
      console.error(productsResult.error);

      setMessage({
        type: "error",
        text: "No se pudieron cargar los productos.",
      });

      setLoading(false);
      return;
    }

    const productList: Product[] = (productsResult.data || []).map(
      (item: any) => ({
        id: item.id,
        name: item.name || "",
        price: Number(item.price || 0),
        image: item.image || null,
        sku: item.sku || "",
      })
    );

    setProducts(productList);

    const mappedOffers: Offer[] = (offersResult.data || []).map(
      (item: any) => {
        const productIds = (
          item.offer_products || []
        )
          .map((relation: any) => relation.product_id)
          .filter(Boolean);

        const offerProducts = productList.filter((product) =>
          productIds.includes(product.id)
        );

        return {
          id: item.id,
          name: item.name || "",
          description: item.description || "",
          type:
            item.type === "fixed"
              ? "fixed"
              : "percentage",
          value: Number(item.value || 0),
          start_date: item.start_date || null,
          end_date: item.end_date || null,
          active: Boolean(item.active),
          productIds,
          products: offerProducts,
        };
      }
    );

    setOffers(mappedOffers);
    setLoading(false);
  }

  const filteredOffers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return offers.filter((offer) => {
      const matchesSearch =
        !query ||
        offer.name.toLowerCase().includes(query) ||
        offer.description.toLowerCase().includes(query) ||
        offer.products.some((product) =>
          product.name.toLowerCase().includes(query)
        );

      let matchesFilter = true;

      if (filter === "ACTIVE") {
        matchesFilter = offer.active;
      }

      if (filter === "INACTIVE") {
        matchesFilter = !offer.active;
      }

      return matchesSearch && matchesFilter;
    });
  }, [offers, search, filter]);

  const activeCount = offers.filter(
    (offer) => offer.active
  ).length;

  const inactiveCount = offers.filter(
    (offer) => !offer.active
  ).length;

  const totalProductsInOffers = Array.from(
    new Set(
      offers.flatMap((offer) => offer.productIds)
    )
  ).length;

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query)
    );
  }, [products, productSearch]);

  function openNewOffer() {
    setEditingId(null);

    setForm({
      ...EMPTY_FORM,
      productIds: [],
    });

    setProductSearch("");
    setMessage(null);
    setModalOpen(true);
  }

  function openEditOffer(offer: Offer) {
    setEditingId(offer.id);

    setForm({
      name: offer.name,
      description: offer.description,
      type: offer.type,
      value: offer.value,
      start_date: formatDateForInput(
        offer.start_date
      ),
      end_date: formatDateForInput(
        offer.end_date
      ),
      active: offer.active,
      productIds: [...offer.productIds],
    });

    setProductSearch("");
    setMessage(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingId(null);
    setProductSearch("");
  }

  function updateField(
    field: keyof typeof form,
    value: any
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function toggleProduct(productId: string) {
    setForm((current) => {
      const exists = current.productIds.includes(
        productId
      );

      return {
        ...current,
        productIds: exists
          ? current.productIds.filter(
              (id) => id !== productId
            )
          : [...current.productIds, productId],
      };
    });
  }

  function selectAllFilteredProducts() {
    setForm((current) => {
      const ids = new Set(current.productIds);

      filteredProducts.forEach((product) => {
        ids.add(product.id);
      });

      return {
        ...current,
        productIds: Array.from(ids),
      };
    });
  }

  function clearSelectedProducts() {
    setForm((current) => ({
      ...current,
      productIds: [],
    }));
  }

  function calculateDiscountedPrice(
    price: number
  ) {
    if (form.type === "percentage") {
      return Math.max(
        0,
        price - price * (Number(form.value) / 100)
      );
    }

    return Math.max(
      0,
      price - Number(form.value)
    );
  }

  async function saveOffer() {
    setMessage(null);

    if (!form.name.trim()) {
      setMessage({
        type: "error",
        text: "Escribe el nombre de la oferta.",
      });
      return;
    }

    if (Number(form.value) <= 0) {
      setMessage({
        type: "error",
        text: "El valor de la oferta debe ser mayor que 0.",
      });
      return;
    }

    if (
      form.type === "percentage" &&
      Number(form.value) > 100
    ) {
      setMessage({
        type: "error",
        text: "El porcentaje no puede superar el 100%.",
      });
      return;
    }

    if (form.productIds.length === 0) {
      setMessage({
        type: "error",
        text: "Selecciona al menos un producto.",
      });
      return;
    }

    if (
      form.start_date &&
      form.end_date &&
      new Date(form.end_date) <
        new Date(form.start_date)
    ) {
      setMessage({
        type: "error",
        text: "La fecha final no puede ser anterior a la fecha inicial.",
      });
      return;
    }

    setSaving(true);

    const offerPayload = {
      name: form.name.trim(),
      description:
        form.description.trim() || null,
      type: form.type,
      value: Number(form.value),
      start_date: form.start_date
        ? new Date(form.start_date).toISOString()
        : null,
      end_date: form.end_date
        ? new Date(form.end_date).toISOString()
        : null,
      active: form.active,
      updated_at: new Date().toISOString(),
    };

    try {
      let offerId = editingId;

      if (editingId) {
        const { error } = await supabase
          .from("offers")
          .update(offerPayload)
          .eq("id", editingId);

        if (error) {
          throw error;
        }

        const { error: deleteRelationsError } =
          await supabase
            .from("offer_products")
            .delete()
            .eq("offer_id", editingId);

        if (deleteRelationsError) {
          throw deleteRelationsError;
        }
      } else {
        const { data, error } = await supabase
          .from("offers")
          .insert(offerPayload)
          .select("id")
          .single();

        if (error) {
          throw error;
        }

        offerId = data.id;
      }

      if (!offerId) {
        throw new Error(
          "No se pudo obtener el ID de la oferta."
        );
      }

      const relations = form.productIds.map(
        (productId) => ({
          offer_id: offerId,
          product_id: productId,
        })
      );

      if (relations.length > 0) {
        const { error } = await supabase
          .from("offer_products")
          .insert(relations);

        if (error) {
          throw error;
        }
      }

      await loadData();

      setMessage({
        type: "success",
        text: editingId
          ? "Oferta actualizada correctamente."
          : "Oferta creada correctamente.",
      });

      setSaving(false);

      setTimeout(() => {
        setModalOpen(false);
        setEditingId(null);
        setMessage(null);
      }, 700);
    } catch (error: any) {
      console.error(error);

      setMessage({
        type: "error",
        text:
          error?.message ||
          "No se pudo guardar la oferta.",
      });

      setSaving(false);
    }
  }

  async function toggleOffer(offer: Offer) {
    const newValue = !offer.active;

    const { error } = await supabase
      .from("offers")
      .update({
        active: newValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", offer.id);

    if (error) {
      console.error(error);

      setMessage({
        type: "error",
        text: "No se pudo cambiar el estado de la oferta.",
      });

      return;
    }

    setOffers((current) =>
      current.map((item) =>
        item.id === offer.id
          ? {
              ...item,
              active: newValue,
            }
          : item
      )
    );

    setMessage({
      type: "success",
      text: newValue
        ? "Oferta activada."
        : "Oferta desactivada.",
    });

    setTimeout(
      () => setMessage(null),
      2000
    );
  }

  async function deleteOffer(offer: Offer) {
    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar "${offer.name}"?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("offers")
      .delete()
      .eq("id", offer.id);

    if (error) {
      console.error(error);

      setMessage({
        type: "error",
        text: "No se pudo eliminar la oferta.",
      });

      return;
    }

    setOffers((current) =>
      current.filter(
        (item) => item.id !== offer.id
      )
    );

    setMessage({
      type: "success",
      text: "Oferta eliminada correctamente.",
    });

    setTimeout(
      () => setMessage(null),
      2500
    );
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
        <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="h-px w-8 bg-white/30" />

              <span className="text-[9px] font-medium uppercase tracking-[0.35em] text-zinc-500">
                Management
              </span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Ofertas
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
              Crea promociones y controla los productos asociados.
            </p>
          </div>

          <button
            onClick={openNewOffer}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-black transition hover:bg-zinc-200"
          >
            <span className="mr-3 text-lg leading-none">
              +
            </span>
            Nueva oferta
          </button>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            label="Ofertas"
            value={offers.length}
            detail="Total"
          />

          <StatCard
            label="Activas"
            value={activeCount}
            detail="Publicadas"
          />

          <StatCard
            label="Inactivas"
            value={inactiveCount}
            detail="Pausadas"
          />

          <StatCard
            label="Productos"
            value={totalProductsInOffers}
            detail="En promoción"
          />
        </div>

        <div className="mb-5 rounded-[24px] border border-white/[0.07] bg-white/[0.025] p-3 backdrop-blur-xl">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600">
                ⌕
              </span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Buscar oferta o producto..."
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
                active={filter === "ACTIVE"}
                onClick={() => setFilter("ACTIVE")}
              >
                Activas
              </FilterButton>

              <FilterButton
                active={filter === "INACTIVE"}
                onClick={() => setFilter("INACTIVE")}
              >
                Inactivas
              </FilterButton>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[28px] border border-white/[0.07] bg-white/[0.025] px-6 py-20 text-center">
            <div className="mx-auto mb-4 h-7 w-7 animate-spin rounded-full border-2 border-white/10 border-t-white/70" />

            <p className="text-sm text-zinc-500">
              Cargando ofertas...
            </p>
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-20 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/[0.08] bg-white/[0.03] text-2xl text-zinc-600">
              %
            </div>

            <h3 className="text-lg font-medium">
              No hay ofertas
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
              Crea una oferta para comenzar a promocionar tus productos.
            </p>

            <button
              onClick={openNewOffer}
              className="mt-6 rounded-xl bg-white px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-zinc-200"
            >
              Crear oferta
            </button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {filteredOffers.map((offer) => (
              <div
                key={offer.id}
                className="group relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-white/[0.025] transition duration-300 hover:-translate-y-1 hover:border-white/[0.14]"
              >
                <div className="relative overflow-hidden border-b border-white/[0.07] p-5">
                  <div className="absolute right-5 top-5">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.15em] ${
                        offer.active
                          ? "border-green-400/20 bg-green-400/10 text-green-300"
                          : "border-white/10 bg-black/40 text-zinc-600"
                      }`}
                    >
                      {offer.active
                        ? "Activa"
                        : "Inactiva"}
                    </span>
                  </div>

                  <div className="pr-20">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                      <span className="text-2xl font-semibold">
                        {offer.type === "percentage"
                          ? "%"
                          : "$"}
                      </span>
                    </div>

                    <p className="text-[8px] uppercase tracking-[0.25em] text-zinc-600">
                      {offer.type === "percentage"
                        ? "Descuento porcentual"
                        : "Precio fijo"}
                    </p>

                    <h3 className="mt-1 text-xl font-semibold tracking-tight">
                      {offer.name}
                    </h3>

                    {offer.description && (
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-600">
                        {offer.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-semibold tracking-tight">
                        {offer.type === "percentage"
                          ? `${offer.value}%`
                          : `$${offer.value.toFixed(2)}`}
                      </p>

                      <p className="mt-1 text-[8px] uppercase tracking-[0.15em] text-zinc-700">
                        {offer.type === "percentage"
                          ? "OFF"
                          : "DESCUENTO"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-medium text-zinc-300">
                        {offer.productIds.length}
                      </p>

                      <p className="text-[8px] uppercase tracking-[0.15em] text-zinc-700">
                        Productos
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  {offer.products.length > 0 && (
                    <div className="mb-4 flex -space-x-2">
                      {offer.products
                        .slice(0, 5)
                        .map((product) => (
                          <div
                            key={product.id}
                            title={product.name}
                            className="h-10 w-10 overflow-hidden rounded-xl border-2 border-[#0b0b0b] bg-zinc-900"
                          >
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-zinc-700">
                                ◇
                              </div>
                            )}
                          </div>
                        ))}

                      {offer.products.length > 5 && (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#0b0b0b] bg-zinc-800 text-[8px] text-zinc-400">
                          +{offer.products.length - 5}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mb-5 grid grid-cols-2 gap-3">
                    <InfoBox
                      label="Inicio"
                      value={formatDate(offer.start_date)}
                    />

                    <InfoBox
                      label="Final"
                      value={formatDate(offer.end_date)}
                    />
                  </div>

                  <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                    <button
                      onClick={() =>
                        openEditOffer(offer)
                      }
                      className="rounded-xl border border-white/[0.08] bg-white/[0.035] py-3 text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() =>
                        toggleOffer(offer)
                      }
                      title={
                        offer.active
                          ? "Desactivar oferta"
                          : "Activar oferta"
                      }
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-sm text-zinc-500 transition hover:border-white/20 hover:text-white"
                    >
                      {offer.active ? "◉" : "○"}
                    </button>

                    <button
                      onClick={() =>
                        deleteOffer(offer)
                      }
                      title="Eliminar oferta"
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-500/10 bg-red-500/[0.025] text-sm text-red-500/60 transition hover:border-red-500/30 hover:bg-red-500/[0.07] hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 flex flex-col gap-2 border-t border-white/[0.05] pt-5 text-[8px] uppercase tracking-[0.25em] text-zinc-700 sm:flex-row sm:items-center sm:justify-between">
          <span>
            NEWCLOTHES® ADMIN SYSTEM
          </span>

          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500/70" />
            Supabase Connected
          </span>
        </div>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="relative flex max-h-[96vh] w-full max-w-[1050px] flex-col overflow-hidden rounded-[30px] border border-white/[0.1] bg-[#0b0b0b] shadow-[0_40px_120px_rgba(0,0,0,0.8)]">
            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-5 py-5 sm:px-7">
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <div className="h-px w-6 bg-white/30" />

                  <span className="text-[8px] uppercase tracking-[0.3em] text-zinc-600">
                    Offer Management
                  </span>
                </div>

                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  {editingId
                    ? "Editar oferta"
                    : "Nueva oferta"}
                </h2>
              </div>

              <button
                onClick={closeModal}
                disabled={saving}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-lg text-zinc-500 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_1fr]">
                <div className="space-y-6">
                  <PremiumSection>
                    <SectionHeader
                      eyebrow="01"
                      title="Configuración"
                      description="Define las condiciones principales de la promoción."
                    />

                    <div className="space-y-4">
                      <InputField
                        label="Nombre de la oferta"
                        value={form.name}
                        onChange={(value) =>
                          updateField("name", value)
                        }
                        placeholder="Ej. DROP WEEK"
                      />

                      <div>
                        <label className="mb-2 block text-[9px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                          Descripción
                        </label>

                        <textarea
                          value={form.description}
                          onChange={(event) =>
                            updateField(
                              "description",
                              event.target.value
                            )
                          }
                          placeholder="Describe brevemente la promoción..."
                          rows={3}
                          className="w-full resize-none rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/20"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-[9px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                          Tipo de descuento
                        </label>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() =>
                              updateField(
                                "type",
                                "percentage"
                              )
                            }
                            className={`rounded-xl border p-4 text-left transition ${
                              form.type === "percentage"
                                ? "border-white bg-white text-black"
                                : "border-white/[0.08] bg-white/[0.025] text-zinc-500 hover:border-white/20"
                            }`}
                          >
                            <p className="text-lg font-semibold">
                              %
                            </p>

                            <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.15em]">
                              Porcentaje
                            </p>
                          </button>

                          <button
                            onClick={() =>
                              updateField(
                                "type",
                                "fixed"
                              )
                            }
                            className={`rounded-xl border p-4 text-left transition ${
                              form.type === "fixed"
                                ? "border-white bg-white text-black"
                                : "border-white/[0.08] bg-white/[0.025] text-zinc-500 hover:border-white/20"
                            }`}
                          >
                            <p className="text-lg font-semibold">
                              $
                            </p>

                            <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.15em]">
                              Precio fijo
                            </p>
                          </button>
                        </div>
                      </div>

                      <InputField
                        label={
                          form.type === "percentage"
                            ? "Porcentaje de descuento"
                            : "Monto de descuento"
                        }
                        type="number"
                        value={String(form.value)}
                        onChange={(value) =>
                          updateField(
                            "value",
                            Number(value)
                          )
                        }
                        placeholder={
                          form.type === "percentage"
                            ? "20"
                            : "10"
                        }
                      />

                      <div className="grid gap-4 sm:grid-cols-2">
                        <DateField
                          label="Fecha de inicio"
                          value={form.start_date}
                          onChange={(value) =>
                            updateField(
                              "start_date",
                              value
                            )
                          }
                        />

                        <DateField
                          label="Fecha de finalización"
                          value={form.end_date}
                          onChange={(value) =>
                            updateField(
                              "end_date",
                              value
                            )
                          }
                        />
                      </div>

                      <Toggle
                        label="Oferta activa"
                        description="Permite que la promoción esté disponible para los clientes."
                        value={form.active}
                        onChange={(value) =>
                          updateField(
                            "active",
                            value
                          )
                        }
                      />
                    </div>
                  </PremiumSection>

                  <PremiumSection>
                    <SectionHeader
                      eyebrow="02"
                      title="Resumen"
                      description="Vista rápida de la promoción."
                    />

                    <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-5">
                      <div className="flex items-end justify-between gap-5">
                        <div>
                          <p className="text-[8px] uppercase tracking-[0.2em] text-zinc-700">
                            Descuento
                          </p>

                          <p className="mt-1 text-3xl font-semibold">
                            {form.type === "percentage"
                              ? `${Number(
                                  form.value || 0
                                )}%`
                              : `$${Number(
                                  form.value || 0
                                ).toFixed(2)}`}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-[8px] uppercase tracking-[0.2em] text-zinc-700">
                            Productos
                          </p>

                          <p className="mt-1 text-2xl font-semibold">
                            {form.productIds.length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </PremiumSection>
                </div>

                <PremiumSection>
                  <SectionHeader
                    eyebrow="03"
                    title="Productos"
                    description="Selecciona los productos que participarán en esta oferta."
                  />

                  <div className="mb-4 flex gap-2">
                    <div className="relative flex-1">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600">
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
                        className="h-10 w-full rounded-xl border border-white/[0.08] bg-black/40 pl-9 pr-3 text-[10px] text-white outline-none placeholder:text-zinc-700 focus:border-white/20"
                      />
                    </div>
                  </div>

                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-[8px] uppercase tracking-[0.15em] text-zinc-600">
                      {form.productIds.length} seleccionados
                    </span>

                    <div className="flex gap-2">
                      <button
                        onClick={
                          selectAllFilteredProducts
                        }
                        className="text-[8px] font-semibold uppercase tracking-[0.12em] text-zinc-500 transition hover:text-white"
                      >
                        Seleccionar
                      </button>

                      <span className="text-zinc-800">
                        /
                      </span>

                      <button
                        onClick={
                          clearSelectedProducts
                        }
                        className="text-[8px] font-semibold uppercase tracking-[0.12em] text-zinc-500 transition hover:text-white"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[470px] space-y-2 overflow-y-auto pr-1">
                    {filteredProducts.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/[0.08] px-5 py-10 text-center">
                        <p className="text-sm text-zinc-600">
                          No se encontraron productos.
                        </p>
                      </div>
                    ) : (
                      filteredProducts.map((product) => {
                        const selected =
                          form.productIds.includes(
                            product.id
                          );

                        const discountedPrice =
                          calculateDiscountedPrice(
                            product.price
                          );

                        return (
                          <button
                            key={product.id}
                            onClick={() =>
                              toggleProduct(
                                product.id
                              )
                            }
                            className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                              selected
                                ? "border-white/20 bg-white/[0.07]"
                                : "border-white/[0.06] bg-black/20 hover:border-white/[0.12] hover:bg-white/[0.03]"
                            }`}
                          >
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/[0.07] bg-black">
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

                              <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-zinc-700">
                                {product.sku ||
                                  "SIN SKU"}
                              </p>

                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-[9px] text-zinc-500 line-through">
                                  ${product.price.toFixed(2)}
                                </span>

                                <span className="text-[10px] font-semibold text-white">
                                  $
                                  {discountedPrice.toFixed(
                                    2
                                  )}
                                </span>
                              </div>
                            </div>

                            <div
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition ${
                                selected
                                  ? "border-white bg-white text-black"
                                  : "border-white/[0.1] bg-white/[0.025] text-transparent"
                              }`}
                            >
                              ✓
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </PremiumSection>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3 border-t border-white/[0.07] bg-[#0b0b0b] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div className="text-[8px] uppercase tracking-[0.2em] text-zinc-700">
                {editingId
                  ? "Editando oferta existente"
                  : "Creando nueva oferta"}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 py-3 text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-40"
                >
                  Cancelar
                </button>

                <button
                  onClick={saveOffer}
                  disabled={saving}
                  className="rounded-xl bg-white px-6 py-3 text-[9px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Guardando..."
                    : editingId
                    ? "Guardar cambios"
                    : "Crear oferta"}
                </button>
              </div>
            </div>

            {message && (
              <div className="absolute bottom-[78px] left-1/2 z-20 w-[calc(100%-32px)] max-w-[500px] -translate-x-1/2">
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
          </div>
        </div>
      )}
    </main>
  );
}

function formatDateForInput(
  date: string | null
) {
  if (!date) return "";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getFullYear();
  const month = String(
    parsed.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    parsed.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(
  date: string | null
) {
  if (!date) return "Sin fecha";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Sin fecha";
  }

  return parsed.toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
  children: React.ReactNode;
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

function PremiumSection({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[26px] border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6">
      {children}
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center gap-3">
        <span className="text-[8px] font-semibold uppercase tracking-[0.25em] text-zinc-600">
          {eyebrow}
        </span>

        <div className="h-px flex-1 bg-white/[0.05]" />
      </div>

      <h3 className="text-sm font-semibold tracking-tight text-zinc-200">
        {title}
      </h3>

      <p className="mt-1 text-[10px] leading-5 text-zinc-600">
        {description}
      </p>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-[9px] font-medium uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        min={type === "number" ? "0" : undefined}
        className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/20"
      />
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-[9px] font-medium uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </label>

      <input
        type="date"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 text-sm text-white outline-none focus:border-white/20"
      />
    </div>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between rounded-2xl border border-white/[0.06] bg-black/20 p-4 text-left transition hover:border-white/[0.1] hover:bg-white/[0.025]"
    >
      <div className="pr-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-300">
          {label}
        </p>

        <p className="mt-1 text-[9px] leading-4 text-zinc-700">
          {description}
        </p>
      </div>

      <div
        className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
          value
            ? "border-white bg-white"
            : "border-white/[0.1] bg-white/[0.04]"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full transition ${
            value
              ? "left-6 bg-black"
              : "left-1 bg-zinc-600"
          }`}
        />
      </div>
    </button>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
      <p className="text-[7px] uppercase tracking-[0.15em] text-zinc-700">
        {label}
      </p>

      <p className="mt-1 text-[9px] font-medium text-zinc-400">
        {value}
      </p>
    </div>
  );
}