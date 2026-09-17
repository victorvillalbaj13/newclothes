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

type DropProduct = Product & {
  position: number;
};

type Drop = {
  id: string;
  name: string;
  description: string;
  cover_image: string | null;
  launch_date: string | null;
  limited: boolean;
  active: boolean;
  products: DropProduct[];
};

const EMPTY_FORM = {
  name: "",
  description: "",
  cover_image: "",
  launch_date: "",
  limited: true,
  active: true,
  productIds: [] as string[],
};

export default function DropsAdmin() {
  const supabase = createClient();

  const [drops, setDrops] = useState<Drop[]>([]);
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

    const [dropsResult, productsResult] =
      await Promise.all([
        supabase
          .from("drops")
          .select(
            `
            id,
            name,
            description,
            cover_image,
            launch_date,
            limited,
            active,
            drop_products (
              product_id,
              position
            )
          `
          )
          .order("created_at", {
            ascending: false,
          }),

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
          .order("name", {
            ascending: true,
          }),
      ]);

    if (dropsResult.error) {
      console.error(dropsResult.error);

      setMessage({
        type: "error",
        text: "No se pudieron cargar los Drops.",
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

    const productList: Product[] = (
      productsResult.data || []
    ).map((item: any) => ({
      id: item.id,
      name: item.name || "",
      price: Number(item.price || 0),
      image: item.image || null,
      sku: item.sku || "",
    }));

    setProducts(productList);

    const mappedDrops: Drop[] = (
      dropsResult.data || []
    ).map((item: any) => {
      const relations = (
        item.drop_products || []
      ) as {
        product_id: string;
        position: number;
      }[];

      const dropProducts: DropProduct[] =
        relations
          .map((relation) => {
            const product = productList.find(
              (item) =>
                item.id === relation.product_id
            );

            if (!product) return null;

            return {
              ...product,
              position:
                Number(relation.position) || 0,
            };
          })
          .filter(Boolean)
          .sort(
            (a: any, b: any) =>
              a.position - b.position
          ) as DropProduct[];

      return {
        id: item.id,
        name: item.name || "",
        description: item.description || "",
        cover_image: item.cover_image || null,
        launch_date: item.launch_date || null,
        limited: Boolean(item.limited),
        active: Boolean(item.active),
        products: dropProducts,
      };
    });

    setDrops(mappedDrops);
    setLoading(false);
  }

  const filteredDrops = useMemo(() => {
    const query = search.trim().toLowerCase();

    return drops.filter((drop) => {
      const matchesSearch =
        !query ||
        drop.name
          .toLowerCase()
          .includes(query) ||
        drop.description
          .toLowerCase()
          .includes(query) ||
        drop.products.some((product) =>
          product.name
            .toLowerCase()
            .includes(query)
        );

      let matchesFilter = true;

      if (filter === "ACTIVE") {
        matchesFilter = drop.active;
      }

      if (filter === "INACTIVE") {
        matchesFilter = !drop.active;
      }

      if (filter === "LIMITED") {
        matchesFilter = drop.limited;
      }

      return matchesSearch && matchesFilter;
    });
  }, [drops, search, filter]);

  const activeCount = drops.filter(
    (drop) => drop.active
  ).length;

  const limitedCount = drops.filter(
    (drop) => drop.limited
  ).length;

  const totalProducts = Array.from(
    new Set(
      drops.flatMap((drop) =>
        drop.products.map(
          (product) => product.id
        )
      )
    )
  ).length;

  const filteredProducts = useMemo(() => {
    const query = productSearch
      .trim()
      .toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter(
      (product) =>
        product.name
          .toLowerCase()
          .includes(query) ||
        product.sku
          .toLowerCase()
          .includes(query)
    );
  }, [products, productSearch]);

  function openNewDrop() {
    setEditingId(null);

    setForm({
      ...EMPTY_FORM,
      productIds: [],
    });

    setProductSearch("");
    setMessage(null);
    setModalOpen(true);
  }

  function openEditDrop(drop: Drop) {
    setEditingId(drop.id);

    setForm({
      name: drop.name,
      description: drop.description,
      cover_image: drop.cover_image || "",
      launch_date: drop.launch_date || "",
      limited: drop.limited,
      active: drop.active,
      productIds: drop.products
        .sort(
          (a, b) =>
            a.position - b.position
        )
        .map((product) => product.id),
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
      const exists =
        current.productIds.includes(productId);

      return {
        ...current,
        productIds: exists
          ? current.productIds.filter(
              (id) => id !== productId
            )
          : [
              ...current.productIds,
              productId,
            ],
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

  function moveProduct(
    productId: string,
    direction: "up" | "down"
  ) {
    setForm((current) => {
      const index =
        current.productIds.indexOf(
          productId
        );

      if (index === -1) {
        return current;
      }

      const newIndex =
        direction === "up"
          ? index - 1
          : index + 1;

      if (
        newIndex < 0 ||
        newIndex >=
          current.productIds.length
      ) {
        return current;
      }

      const ids = [
        ...current.productIds,
      ];

      const temp = ids[index];

      ids[index] = ids[newIndex];
      ids[newIndex] = temp;

      return {
        ...current,
        productIds: ids,
      };
    });
  }

  async function saveDrop() {
    setMessage(null);

    if (!form.name.trim()) {
      setMessage({
        type: "error",
        text: "Escribe el nombre del Drop.",
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

    setSaving(true);

    const dropPayload = {
      name: form.name.trim(),
      description:
        form.description.trim() || null,
      cover_image:
        form.cover_image.trim() || null,
      launch_date:
        form.launch_date || null,
      limited: form.limited,
      active: form.active,
      updated_at: new Date().toISOString(),
    };

    try {
      let dropId = editingId;

      if (editingId) {
        const { error } = await supabase
          .from("drops")
          .update(dropPayload)
          .eq("id", editingId);

        if (error) {
          throw error;
        }

        const { error: deleteError } =
          await supabase
            .from("drop_products")
            .delete()
            .eq("drop_id", editingId);

        if (deleteError) {
          throw deleteError;
        }
      } else {
        const { data, error } =
          await supabase
            .from("drops")
            .insert(dropPayload)
            .select("id")
            .single();

        if (error) {
          throw error;
        }

        dropId = data.id;
      }

      if (!dropId) {
        throw new Error(
          "No se pudo obtener el ID del Drop."
        );
      }

      const relations =
        form.productIds.map(
          (productId, index) => ({
            drop_id: dropId,
            product_id: productId,
            position: index,
          })
        );

      if (relations.length > 0) {
        const { error } =
          await supabase
            .from("drop_products")
            .insert(relations);

        if (error) {
          throw error;
        }
      }

      await loadData();

      setMessage({
        type: "success",
        text: editingId
          ? "Drop actualizado correctamente."
          : "Drop creado correctamente.",
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
          "No se pudo guardar el Drop.",
      });

      setSaving(false);
    }
  }

  async function toggleDrop(drop: Drop) {
    const newValue = !drop.active;

    const { error } = await supabase
      .from("drops")
      .update({
        active: newValue,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", drop.id);

    if (error) {
      console.error(error);

      setMessage({
        type: "error",
        text: "No se pudo cambiar el estado del Drop.",
      });

      return;
    }

    setDrops((current) =>
      current.map((item) =>
        item.id === drop.id
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
        ? "Drop activado."
        : "Drop desactivado.",
    });

    setTimeout(
      () => setMessage(null),
      2000
    );
  }

  async function deleteDrop(drop: Drop) {
    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar "${drop.name}"?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("drops")
      .delete()
      .eq("id", drop.id);

    if (error) {
      console.error(error);

      setMessage({
        type: "error",
        text: "No se pudo eliminar el Drop.",
      });

      return;
    }

    setDrops((current) =>
      current.filter(
        (item) => item.id !== drop.id
      )
    );

    setMessage({
      type: "success",
      text: "Drop eliminado correctamente.",
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
                Collection Management
              </span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Drops
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
              Administra lanzamientos exclusivos y colecciones especiales.
            </p>
          </div>

          <button
            onClick={openNewDrop}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-black transition hover:bg-zinc-200"
          >
            <span className="mr-3 text-lg leading-none">
              +
            </span>
            Nuevo Drop
          </button>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            label="Drops"
            value={drops.length}
            detail="Total"
          />

          <StatCard
            label="Activos"
            value={activeCount}
            detail="Publicados"
          />

          <StatCard
            label="Limitados"
            value={limitedCount}
            detail="Exclusivos"
          />

          <StatCard
            label="Productos"
            value={totalProducts}
            detail="En Drops"
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
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Buscar Drop o producto..."
                className="h-12 w-full rounded-2xl border border-white/[0.06] bg-black/40 pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/20"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto">
              <FilterButton
                active={filter === "ALL"}
                onClick={() =>
                  setFilter("ALL")
                }
              >
                Todos
              </FilterButton>

              <FilterButton
                active={filter === "ACTIVE"}
                onClick={() =>
                  setFilter("ACTIVE")
                }
              >
                Activos
              </FilterButton>

              <FilterButton
                active={filter === "INACTIVE"}
                onClick={() =>
                  setFilter("INACTIVE")
                }
              >
                Inactivos
              </FilterButton>

              <FilterButton
                active={filter === "LIMITED"}
                onClick={() =>
                  setFilter("LIMITED")
                }
              >
                Limitados
              </FilterButton>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[28px] border border-white/[0.07] bg-white/[0.025] px-6 py-20 text-center">
            <div className="mx-auto mb-4 h-7 w-7 animate-spin rounded-full border-2 border-white/10 border-t-white/70" />

            <p className="text-sm text-zinc-500">
              Cargando Drops...
            </p>
          </div>
        ) : filteredDrops.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-20 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/[0.08] bg-white/[0.03] text-2xl text-zinc-600">
              D
            </div>

            <h3 className="text-lg font-medium">
              No hay Drops
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
              Crea tu primer lanzamiento para comenzar a organizar tus colecciones.
            </p>

            <button
              onClick={openNewDrop}
              className="mt-6 rounded-xl bg-white px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-zinc-200"
            >
              Crear Drop
            </button>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {filteredDrops.map((drop) => (
              <div
                key={drop.id}
                className="group relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-white/[0.025] transition duration-300 hover:-translate-y-1 hover:border-white/[0.14]"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-zinc-950">
                  {drop.cover_image ? (
                    <img
                      src={drop.cover_image}
                      alt={drop.name}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-900 to-black">
                      <span className="text-5xl font-semibold text-white/10">
                        DROP
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                  <div className="absolute left-4 top-4 flex gap-2">
                    {drop.limited && (
                      <span className="rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.15em] text-white backdrop-blur-md">
                        Limited
                      </span>
                    )}

                    <span
                      className={`rounded-full border px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.15em] backdrop-blur-md ${
                        drop.active
                          ? "border-green-400/20 bg-green-400/10 text-green-300"
                          : "border-white/10 bg-black/60 text-zinc-500"
                      }`}
                    >
                      {drop.active
                        ? "Activo"
                        : "Inactivo"}
                    </span>
                  </div>

                  <div className="absolute bottom-4 left-5 right-5">
                    <p className="text-[8px] uppercase tracking-[0.25em] text-white/50">
                      {formatDate(
                        drop.launch_date
                      )}
                    </p>

                    <h3 className="mt-1 text-2xl font-semibold tracking-tight">
                      {drop.name}
                    </h3>
                  </div>
                </div>

                <div className="p-5">
                  {drop.description && (
                    <p className="mb-5 line-clamp-2 text-xs leading-5 text-zinc-600">
                      {drop.description}
                    </p>
                  )}

                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold">
                        {drop.products.length}
                      </p>

                      <p className="text-[8px] uppercase tracking-[0.15em] text-zinc-700">
                        Productos
                      </p>
                    </div>

                    <div className="flex -space-x-2">
                      {drop.products
                        .slice(0, 4)
                        .map((product) => (
                          <div
                            key={product.id}
                            title={product.name}
                            className="h-9 w-9 overflow-hidden rounded-xl border-2 border-[#0b0b0b] bg-zinc-900"
                          >
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[8px] text-zinc-700">
                                ◇
                              </div>
                            )}
                          </div>
                        ))}

                      {drop.products.length >
                        4 && (
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#0b0b0b] bg-zinc-800 text-[8px] text-zinc-400">
                          +
                          {drop.products.length -
                            4}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                    <button
                      onClick={() =>
                        openEditDrop(drop)
                      }
                      className="rounded-xl border border-white/[0.08] bg-white/[0.035] py-3 text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() =>
                        toggleDrop(drop)
                      }
                      title={
                        drop.active
                          ? "Desactivar Drop"
                          : "Activar Drop"
                      }
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-sm text-zinc-500 transition hover:border-white/20 hover:text-white"
                    >
                      {drop.active
                        ? "◉"
                        : "○"}
                    </button>

                    <button
                      onClick={() =>
                        deleteDrop(drop)
                      }
                      title="Eliminar Drop"
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
            if (
              event.target ===
              event.currentTarget
            ) {
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
                    Drop Management
                  </span>
                </div>

                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  {editingId
                    ? "Editar Drop"
                    : "Nuevo Drop"}
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
              <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-6">
                  <PremiumSection>
                    <SectionHeader
                      eyebrow="01"
                      title="Información"
                      description="Configura la información principal del lanzamiento."
                    />

                    <div className="space-y-4">
                      <InputField
                        label="Nombre del Drop"
                        value={form.name}
                        onChange={(value) =>
                          updateField(
                            "name",
                            value
                          )
                        }
                        placeholder="Ej. THE LAST DANCE"
                      />

                      <div>
                        <label className="mb-2 block text-[9px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                          Descripción
                        </label>

                        <textarea
                          value={
                            form.description
                          }
                          onChange={(event) =>
                            updateField(
                              "description",
                              event.target.value
                            )
                          }
                          placeholder="Describe la colección..."
                          rows={4}
                          className="w-full resize-none rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/20"
                        />
                      </div>

                      <InputField
                        label="Imagen de portada"
                        value={
                          form.cover_image
                        }
                        onChange={(value) =>
                          updateField(
                            "cover_image",
                            value
                          )
                        }
                        placeholder="/images/drop.jpg o URL"
                      />

                      <div>
                        <label className="mb-2 block text-[9px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                          Fecha de lanzamiento
                        </label>

                        <input
                          type="date"
                          value={
                            form.launch_date
                          }
                          onChange={(event) =>
                            updateField(
                              "launch_date",
                              event.target.value
                            )
                          }
                          className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 text-sm text-white outline-none focus:border-white/20"
                        />
                      </div>

                      <Toggle
                        label="Drop limitado"
                        description="Marca este lanzamiento como una colección exclusiva."
                        value={form.limited}
                        onChange={(value) =>
                          updateField(
                            "limited",
                            value
                          )
                        }
                      />

                      <Toggle
                        label="Drop activo"
                        description="Permite que el lanzamiento esté publicado en la tienda."
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
                      title="Vista previa"
                      description="Así se verá la portada del Drop dentro del administrador."
                    />

                    <div className="overflow-hidden rounded-[22px] border border-white/[0.07] bg-black">
                      <div className="relative aspect-[16/9] overflow-hidden">
                        {form.cover_image ? (
                          <img
                            src={
                              form.cover_image
                            }
                            alt="Preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-900 to-black">
                            <span className="text-4xl font-semibold text-white/10">
                              DROP
                            </span>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

                        <div className="absolute bottom-4 left-4">
                          <p className="text-[7px] uppercase tracking-[0.25em] text-white/50">
                            {form.limited
                              ? "LIMITED EDITION"
                              : "COLLECTION"}
                          </p>

                          <p className="mt-1 text-xl font-semibold">
                            {form.name ||
                              "NUEVO DROP"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </PremiumSection>
                </div>

                <PremiumSection>
                  <SectionHeader
                    eyebrow="03"
                    title="Productos del Drop"
                    description="Selecciona y ordena los productos que pertenecen a este lanzamiento."
                  />

                  <div className="mb-4 flex gap-2">
                    <div className="relative flex-1">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600">
                        ⌕
                      </span>

                      <input
                        value={
                          productSearch
                        }
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

                  <div className="max-h-[530px] space-y-2 overflow-y-auto pr-1">
                    {filteredProducts.length ===
                    0 ? (
                      <div className="rounded-2xl border border-dashed border-white/[0.08] px-5 py-10 text-center">
                        <p className="text-sm text-zinc-600">
                          No se encontraron productos.
                        </p>
                      </div>
                    ) : (
                      filteredProducts.map(
                        (product) => {
                          const selected =
                            form.productIds.includes(
                              product.id
                            );

                          const selectedIndex =
                            form.productIds.indexOf(
                              product.id
                            );

                          return (
                            <div
                              key={product.id}
                              className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                                selected
                                  ? "border-white/20 bg-white/[0.07]"
                                  : "border-white/[0.06] bg-black/20 hover:border-white/[0.12]"
                              }`}
                            >
                              <button
                                onClick={() =>
                                  toggleProduct(
                                    product.id
                                  )
                                }
                                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                              >
                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/[0.07] bg-black">
                                  {product.image ? (
                                    <img
                                      src={
                                        product.image
                                      }
                                      alt={
                                        product.name
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
                                  <p className="truncate text-[10px] font-medium text-zinc-300">
                                    {
                                      product.name
                                    }
                                  </p>

                                  <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-zinc-700">
                                    {product.sku ||
                                      "SIN SKU"}
                                  </p>

                                  <p className="mt-2 text-[9px] text-zinc-500">
                                    $
                                    {product.price.toFixed(
                                      2
                                    )}
                                  </p>
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

                              {selected && (
                                <div className="flex shrink-0 flex-col gap-1">
                                  <button
                                    onClick={() =>
                                      moveProduct(
                                        product.id,
                                        "up"
                                      )
                                    }
                                    disabled={
                                      selectedIndex ===
                                      0
                                    }
                                    className="flex h-6 w-7 items-center justify-center rounded-md border border-white/[0.08] text-[10px] text-zinc-500 transition hover:text-white disabled:opacity-20"
                                  >
                                    ↑
                                  </button>

                                  <button
                                    onClick={() =>
                                      moveProduct(
                                        product.id,
                                        "down"
                                      )
                                    }
                                    disabled={
                                      selectedIndex ===
                                      form
                                        .productIds
                                        .length -
                                        1
                                    }
                                    className="flex h-6 w-7 items-center justify-center rounded-md border border-white/[0.08] text-[10px] text-zinc-500 transition hover:text-white disabled:opacity-20"
                                  >
                                    ↓
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        }
                      )
                    )}
                  </div>
                </PremiumSection>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3 border-t border-white/[0.07] bg-[#0b0b0b] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div className="text-[8px] uppercase tracking-[0.2em] text-zinc-700">
                {editingId
                  ? "Editando Drop existente"
                  : "Creando nuevo Drop"}
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
                  onClick={saveDrop}
                  disabled={saving}
                  className="rounded-xl bg-white px-6 py-3 text-[9px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Guardando..."
                    : editingId
                    ? "Guardar cambios"
                    : "Crear Drop"}
                </button>
              </div>
            </div>

            {message && (
              <div className="absolute bottom-[78px] left-1/2 z-20 w-[calc(100%-32px)] max-w-[500px] -translate-x-1/2">
                <div
                  className={`rounded-2xl border px-4 py-3 text-center text-sm shadow-2xl backdrop-blur-xl ${
                    message.type ===
                    "success"
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

function formatDate(date: string | null) {
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-[9px] font-medium uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </label>

      <input
        type="text"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/20"
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