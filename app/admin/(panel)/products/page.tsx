"use client";

import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  collection: string;
  sku: string;
  images: string[];
  sizes: string[];
  colors: string[];
  stock: Record<string, Record<string, number>>;
  limited: boolean;
  offer: boolean;
  exclusiveDrop: boolean;
  isNew: boolean;
  featured: boolean;
  published: boolean;
  active: boolean;
};

type ProductImage = {
  id: string;
  url: string;
  file?: File;
};

const AVAILABLE_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

const EMPTY_PRODUCT = {
  name: "",
  price: 0,
  description: "",
  category: "T-SHIRTS",
  collection: "ESSENTIALS",
  sku: "",
  images: [] as ProductImage[],
  sizes: ["S", "M", "L", "XL"],
  colors: ["NEGRO"],
  stock: {
    NEGRO: {
      S: 0,
      M: 0,
      L: 0,
      XL: 0,
    },
  } as Record<string, Record<string, number>>,
  limited: false,
  offer: false,
  exclusiveDrop: false,
  isNew: true,
  featured: false,
  published: false,
  active: true,
};

export default function ProductsAdmin() {
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    ...EMPTY_PRODUCT,
    images: [] as ProductImage[],
    sizes: ["S", "M", "L", "XL"],
    colors: ["NEGRO"],
    stock: {
      NEGRO: {
        S: 0,
        M: 0,
        L: 0,
        XL: 0,
      },
    } as Record<string, Record<string, number>>,
  });

  const [newColor, setNewColor] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select(
        `
        id,
        name,
        slug,
        description,
        price,
        image,
        published,
        created_at,
        updated_at,
        category,
        collection,
        sku,
        images,
        limited,
        offer,
        exclusive_drop,
        is_new,
        featured,
        active,
        product_variants (
          id,
          color,
          size,
          stock
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);

      setMessage({
        type: "error",
        text: "No se pudieron cargar los productos.",
      });

      setLoading(false);
      return;
    }

    const mapped: Product[] = (data || []).map((item: any) => {
      const variants = item.product_variants || [];

      const colors = Array.from(
        new Set(
          variants
            .map((variant: any) => variant.color)
            .filter(Boolean)
        )
      ) as string[];

      const sizes = Array.from(
        new Set(
          variants
            .map((variant: any) => variant.size)
            .filter(Boolean)
        )
      ) as string[];

      const stock: Record<string, Record<string, number>> = {};

      variants.forEach((variant: any) => {
        if (!stock[variant.color]) {
          stock[variant.color] = {};
        }

        stock[variant.color][variant.size] = Number(
          variant.stock || 0
        );
      });

      let imageUrls: string[] = [];

      if (Array.isArray(item.images)) {
        imageUrls = item.images.filter(
          (image: any): image is string =>
            typeof image === "string" && image.length > 0
        );
      }

      if (imageUrls.length === 0 && item.image) {
        imageUrls = [item.image];
      }

      return {
        id: item.id,
        name: item.name || "",
        price: Number(item.price || 0),
        description: item.description || "",
        category: item.category || "T-SHIRTS",
        collection: item.collection || "ESSENTIALS",
        sku: item.sku || "",
        images: imageUrls,
        sizes,
        colors,
        stock,
        limited: Boolean(item.limited),
        offer: Boolean(item.offer),
        exclusiveDrop: Boolean(item.exclusive_drop),
        isNew: Boolean(item.is_new),
        featured: Boolean(item.featured),
        published: Boolean(item.published),
        active: Boolean(item.active),
      };
    });

    setProducts(mapped);
    setLoading(false);
  }

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.collection.toLowerCase().includes(query);

      let matchesFilter = true;

      if (filter === "PUBLISHED") {
        matchesFilter = product.published;
      }

      if (filter === "NEW") {
        matchesFilter = product.isNew;
      }

      if (filter === "LIMITED") {
        matchesFilter = product.limited;
      }

      if (filter === "DROP") {
        matchesFilter = product.exclusiveDrop;
      }

      if (filter === "SOLD_OUT") {
        matchesFilter = getTotalStock(product) === 0;
      }

      return matchesSearch && matchesFilter;
    });
  }, [products, search, filter]);

  const totalStock = products.reduce(
    (total, product) => total + getTotalStock(product),
    0
  );

  const publishedCount = products.filter(
    (product) => product.published
  ).length;

  const limitedCount = products.filter(
    (product) => product.limited
  ).length;

  const soldOutCount = products.filter(
    (product) => getTotalStock(product) === 0
  ).length;

  function getTotalStock(product: Product) {
    return Object.values(product.stock).reduce(
      (total, colorStock) =>
        total +
        Object.values(colorStock).reduce(
          (sum, value) => sum + Number(value || 0),
          0
        ),
      0
    );
  }

  function createImageId() {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
  }

  function openNewProduct() {
    setEditingId(null);

    setForm({
      ...EMPTY_PRODUCT,
      images: [],
      sizes: ["S", "M", "L", "XL"],
      colors: ["NEGRO"],
      stock: {
        NEGRO: {
          S: 0,
          M: 0,
          L: 0,
          XL: 0,
        },
      },
    });

    setNewColor("");
    setMessage(null);
    setModalOpen(true);
  }

  function openEditProduct(product: Product) {
    const copiedStock: Record<
      string,
      Record<string, number>
    > = {};

    Object.entries(product.stock).forEach(([color, sizes]) => {
      copiedStock[color] = {};

      Object.entries(sizes).forEach(([size, stock]) => {
        copiedStock[color][size] = stock;
      });
    });

    setEditingId(product.id);

    setForm({
      name: product.name,
      price: product.price,
      description: product.description,
      category: product.category,
      collection: product.collection,
      sku: product.sku,
      images: product.images.map((url) => ({
        id: createImageId(),
        url,
      })),
      sizes: [...product.sizes],
      colors: [...product.colors],
      stock: copiedStock,
      limited: product.limited,
      offer: product.offer,
      exclusiveDrop: product.exclusiveDrop,
      isNew: product.isNew,
      featured: product.featured,
      published: product.published,
      active: product.active,
    });

    setNewColor("");
    setMessage(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingId(null);
    setNewColor("");
  }

  function toggleSize(size: string) {
    setForm((current) => {
      const exists = current.sizes.includes(size);

      const newSizes = exists
        ? current.sizes.filter((item) => item !== size)
        : [...current.sizes, size];

      const newStock = {
        ...current.stock,
      };

      current.colors.forEach((color) => {
        newStock[color] = {
          ...(newStock[color] || {}),
        };

        if (!exists) {
          newStock[color][size] = 0;
        } else {
          delete newStock[color][size];
        }
      });

      return {
        ...current,
        sizes: newSizes,
        stock: newStock,
      };
    });
  }

  function addColor() {
    const color = newColor.trim().toUpperCase();

    if (!color) return;

    if (form.colors.includes(color)) {
      setNewColor("");
      return;
    }

    setForm((current) => ({
      ...current,
      colors: [...current.colors, color],
      stock: {
        ...current.stock,
        [color]: Object.fromEntries(
          current.sizes.map((size) => [size, 0])
        ),
      },
    }));

    setNewColor("");
  }

  function removeColor(color: string) {
    if (form.colors.length <= 1) return;

    setForm((current) => {
      const newStock = {
        ...current.stock,
      };

      delete newStock[color];

      return {
        ...current,
        colors: current.colors.filter(
          (item) => item !== color
        ),
        stock: newStock,
      };
    });
  }

  function updateStock(
    color: string,
    size: string,
    value: number
  ) {
    const safeValue = Math.max(0, Number(value || 0));

    setForm((current) => ({
      ...current,
      stock: {
        ...current.stock,
        [color]: {
          ...(current.stock[color] || {}),
          [size]: safeValue,
        },
      },
    }));
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

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function addImages(files: FileList | File[]) {
    const fileArray = Array.from(files);

    if (fileArray.length === 0) return;

    const validFiles = fileArray.filter((file) => {
      if (!file.type.startsWith("image/")) {
        return false;
      }

      if (file.size > 5 * 1024 * 1024) {
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) {
      setMessage({
        type: "error",
        text: "Selecciona imágenes válidas de máximo 5 MB.",
      });

      return;
    }

    const imageObjects: ProductImage[] =
      validFiles.map((file) => ({
        id: createImageId(),
        url: URL.createObjectURL(file),
        file,
      }));

    setForm((current) => ({
      ...current,
      images: [...current.images, ...imageObjects],
    }));
  }

  function handleImageInput(
    event: ChangeEvent<HTMLInputElement>
  ) {
    if (event.target.files) {
      addImages(event.target.files);
    }

    event.target.value = "";
  }

  function handleDragOver(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setDragActive(false);
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setDragActive(false);

    if (event.dataTransfer.files) {
      addImages(event.dataTransfer.files);
    }
  }

  function removeImage(index: number) {
    setForm((current) => {
      const image = current.images[index];

      if (image?.file) {
        URL.revokeObjectURL(image.url);
      }

      return {
        ...current,
        images: current.images.filter(
          (_, imageIndex) => imageIndex !== index
        ),
      };
    });
  }

  function makeMainImage(index: number) {
    setForm((current) => {
      const selected = current.images[index];

      const remaining = current.images.filter(
        (_, imageIndex) => imageIndex !== index
      );

      return {
        ...current,
        images: [selected, ...remaining],
      };
    });
  }

  async function uploadProductImages(
    productId: string,
    images: ProductImage[]
  ) {
    const uploadedUrls: string[] = [];

    for (let index = 0; index < images.length; index++) {
      const image = images[index];

      if (!image.file) {
        uploadedUrls.push(image.url);
        continue;
      }

      const extension =
        image.file.name.split(".").pop()?.toLowerCase() ||
        "jpg";

      const fileName = `${Date.now()}-${index}-${Math.random()
        .toString(36)
        .slice(2, 10)}.${extension}`;

      const filePath = `${productId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(filePath, image.file, {
          cacheControl: "31536000",
          contentType: image.file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error(uploadError);

        throw new Error(
          uploadError.message ||
            "No se pudo subir una imagen."
        );
      }

      const { data } = supabase.storage
        .from("products")
        .getPublicUrl(filePath);

      if (!data?.publicUrl) {
        throw new Error(
          "No se pudo obtener la URL de la imagen."
        );
      }

      uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
  }

  async function saveProduct() {
    setMessage(null);

    if (!form.name.trim()) {
      setMessage({
        type: "error",
        text: "Escribe el nombre del producto.",
      });
      return;
    }

    if (Number(form.price) <= 0) {
      setMessage({
        type: "error",
        text: "El precio debe ser mayor que 0.",
      });
      return;
    }

    if (form.colors.length === 0) {
      setMessage({
        type: "error",
        text: "Agrega al menos un color.",
      });
      return;
    }

    if (form.sizes.length === 0) {
      setMessage({
        type: "error",
        text: "Selecciona al menos una talla.",
      });
      return;
    }

    setSaving(true);

    try {
      const slug = generateSlug(form.name);

      const basicPayload = {
        name: form.name.trim(),
        slug,
        description: form.description.trim() || null,
        price: Number(form.price),
        published: form.published,
        category: form.category,
        collection: form.collection,
        sku: form.sku.trim() || null,
        limited: form.limited,
        offer: form.offer,
        exclusive_drop: form.exclusiveDrop,
        is_new: form.isNew,
        featured: form.featured,
        active: form.active,
        updated_at: new Date().toISOString(),
      };

      let productId = editingId;

      /*
       * 1. Primero creamos o actualizamos el producto.
       * Las imágenes se guardan después de tener el ID.
       */
      if (editingId) {
        const { error } = await supabase
          .from("products")
          .update(basicPayload)
          .eq("id", editingId);

        if (error) {
          console.error(error);

          setMessage({
            type: "error",
            text:
              error.code === "23505"
                ? "Ya existe un producto con ese nombre o slug."
                : error.message ||
                  "No se pudo actualizar el producto.",
          });

          setSaving(false);
          return;
        }

        const { error: deleteVariantsError } =
          await supabase
            .from("product_variants")
            .delete()
            .eq("product_id", editingId);

        if (deleteVariantsError) {
          console.error(deleteVariantsError);

          setMessage({
            type: "error",
            text:
              "El producto se actualizó, pero no se pudieron actualizar sus variantes.",
          });

          setSaving(false);
          return;
        }
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert({
            ...basicPayload,
            image: null,
            images: [],
          })
          .select("id")
          .single();

        if (error) {
          console.error(error);

          setMessage({
            type: "error",
            text:
              error.code === "23505"
                ? "Ya existe un producto con ese nombre o slug."
                : error.message ||
                  "No se pudo crear el producto.",
          });

          setSaving(false);
          return;
        }

        productId = data.id;
      }

      if (!productId) {
        throw new Error(
          "No se pudo obtener el ID del producto."
        );
      }

      /*
       * 2. Subimos las imágenes nuevas a Supabase Storage.
       */
      const imageUrls = await uploadProductImages(
        productId,
        form.images
      );

      /*
       * 3. Guardamos solamente las URLs en la tabla.
       */
      const { error: imagesUpdateError } = await supabase
        .from("products")
        .update({
          image: imageUrls[0] || null,
          images: imageUrls,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId);

      if (imagesUpdateError) {
        console.error(imagesUpdateError);

        setMessage({
          type: "error",
          text:
            "El producto se guardó, pero no se pudieron guardar las imágenes.",
        });

        setSaving(false);
        return;
      }

      /*
       * 4. Guardamos las variantes.
       */
      const variants = form.colors.flatMap((color) =>
        form.sizes.map((size) => ({
          product_id: productId,
          color,
          size,
          stock: Number(
            form.stock[color]?.[size] || 0
          ),
        }))
      );

      if (variants.length > 0) {
        const { error: variantsError } = await supabase
          .from("product_variants")
          .insert(variants);

        if (variantsError) {
          console.error(variantsError);

          setMessage({
            type: "error",
            text:
              "El producto se guardó, pero hubo un problema con las variantes.",
          });

          setSaving(false);
          return;
        }
      }

      setMessage({
        type: "success",
        text: editingId
          ? "Producto actualizado correctamente."
          : "Producto creado correctamente.",
      });

      await loadProducts();

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
          "Ocurrió un error al guardar el producto.",
      });

      setSaving(false);
    }
  }

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar "${product.name}"?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) {
      console.error(error);

      setMessage({
        type: "error",
        text: "No se pudo eliminar el producto.",
      });

      return;
    }

    setProducts((current) =>
      current.filter((item) => item.id !== product.id)
    );

    setMessage({
      type: "success",
      text: "Producto eliminado correctamente.",
    });

    setTimeout(() => setMessage(null), 2500);
  }

  async function togglePublished(product: Product) {
    const newValue = !product.published;

    const { error } = await supabase
      .from("products")
      .update({
        published: newValue,
        active: newValue ? true : product.active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    if (error) {
      console.error(error);

      setMessage({
        type: "error",
        text: "No se pudo cambiar el estado del producto.",
      });

      return;
    }

    setProducts((current) =>
      current.map((item) =>
        item.id === product.id
          ? {
              ...item,
              published: newValue,
              active: newValue ? true : item.active,
            }
          : item
      )
    );

    setMessage({
      type: "success",
      text: newValue
        ? "Producto publicado."
        : "Producto ocultado.",
    });

    setTimeout(() => setMessage(null), 2000);
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
              Productos
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
              Gestiona el catálogo, imágenes,
              variantes, inventario y publicaciones.
            </p>
          </div>

          <button
            onClick={openNewProduct}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-black transition hover:bg-zinc-200"
          >
            <span className="mr-3 text-lg leading-none">+</span>
            Nuevo producto
          </button>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            label="Productos"
            value={products.length}
            detail="Total catálogo"
          />

          <StatCard
            label="Publicados"
            value={publishedCount}
            detail="Visibles"
          />

          <StatCard
            label="Stock"
            value={totalStock}
            detail="Unidades"
          />

          <StatCard
            label="Agotados"
            value={soldOutCount}
            detail={`${limitedCount} limitados`}
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
                placeholder="Buscar por nombre, SKU o colección..."
                className="h-12 w-full rounded-2xl border border-white/[0.06] bg-black/40 pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/20"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto">
              <FilterButton
                active={filter === "ALL"}
                onClick={() => setFilter("ALL")}
              >
                Todos
              </FilterButton>

              <FilterButton
                active={filter === "PUBLISHED"}
                onClick={() => setFilter("PUBLISHED")}
              >
                Publicados
              </FilterButton>

              <FilterButton
                active={filter === "NEW"}
                onClick={() => setFilter("NEW")}
              >
                Nuevos
              </FilterButton>

              <FilterButton
                active={filter === "LIMITED"}
                onClick={() => setFilter("LIMITED")}
              >
                Limitados
              </FilterButton>

              <FilterButton
                active={filter === "DROP"}
                onClick={() => setFilter("DROP")}
              >
                Drops
              </FilterButton>

              <FilterButton
                active={filter === "SOLD_OUT"}
                onClick={() => setFilter("SOLD_OUT")}
              >
                Agotados
              </FilterButton>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[28px] border border-white/[0.07] bg-white/[0.025] px-6 py-20 text-center">
            <div className="mx-auto mb-4 h-7 w-7 animate-spin rounded-full border-2 border-white/10 border-t-white/70" />

            <p className="text-sm text-zinc-500">
              Cargando productos...
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-20 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/[0.08] bg-white/[0.03] text-2xl text-zinc-600">
              ◇
            </div>

            <h3 className="text-lg font-medium">
              No hay productos
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
              No encontramos productos con los filtros actuales.
            </p>

            <button
              onClick={openNewProduct}
              className="mt-6 rounded-xl bg-white px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-zinc-200"
            >
              Crear producto
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const stock = getTotalStock(product);

              return (
                <div
                  key={product.id}
                  className="group relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-white/[0.025] transition duration-300 hover:-translate-y-1 hover:border-white/[0.14]"
                >
                  <div className="relative aspect-[4/4.5] overflow-hidden bg-[#0d0d0d]">
                    {product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <div className="text-center">
                          <div className="text-4xl text-zinc-800">
                            ◇
                          </div>

                          <p className="mt-3 text-[9px] uppercase tracking-[0.25em] text-zinc-700">
                            Sin imagen
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
                      <div className="flex flex-wrap gap-2">
                        {product.isNew && (
                          <PreviewTag>NEW</PreviewTag>
                        )}

                        {product.limited && (
                          <PreviewTag>LIMITED</PreviewTag>
                        )}

                        {product.exclusiveDrop && (
                          <PreviewTag>DROP</PreviewTag>
                        )}
                      </div>

                      <div
                        className={`rounded-full border px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.15em] backdrop-blur-md ${
                          product.published
                            ? "border-green-400/20 bg-green-400/10 text-green-300"
                            : "border-white/10 bg-black/40 text-zinc-500"
                        }`}
                      >
                        {product.published
                          ? "Publicado"
                          : "Oculto"}
                      </div>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent" />

                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-[9px] uppercase tracking-[0.25em] text-zinc-400">
                        {product.collection}
                      </p>

                      <h3 className="mt-1 text-lg font-semibold tracking-tight">
                        {product.name}
                      </h3>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xl font-semibold">
                          ${product.price.toFixed(2)}
                        </p>

                        <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-zinc-600">
                          {product.sku || "Sin SKU"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p
                          className={`text-sm font-medium ${
                            stock === 0
                              ? "text-red-400"
                              : stock <= 5
                              ? "text-amber-400"
                              : "text-zinc-300"
                          }`}
                        >
                          {stock}
                        </p>

                        <p className="text-[8px] uppercase tracking-[0.18em] text-zinc-600">
                          Stock
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <div className="flex -space-x-1">
                        {product.colors
                          .slice(0, 5)
                          .map((color) => (
                            <div
                              key={color}
                              title={color}
                              className="flex h-6 w-6 items-center justify-center rounded-full border border-black bg-zinc-800 text-[7px] text-zinc-400"
                            >
                              {color.slice(0, 1)}
                            </div>
                          ))}
                      </div>

                      <span className="text-[9px] text-zinc-600">
                        {product.colors.length}{" "}
                        {product.colors.length === 1
                          ? "color"
                          : "colores"}
                      </span>

                      <span className="mx-1 h-1 w-1 rounded-full bg-zinc-700" />

                      <span className="text-[9px] text-zinc-600">
                        {product.sizes.length} tallas
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-[1fr_auto_auto] gap-2">
                      <button
                        onClick={() =>
                          openEditProduct(product)
                        }
                        className="rounded-xl border border-white/[0.08] bg-white/[0.035] py-3 text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() =>
                          togglePublished(product)
                        }
                        title={
                          product.published
                            ? "Ocultar producto"
                            : "Publicar producto"
                        }
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-sm text-zinc-500 transition hover:border-white/20 hover:text-white"
                      >
                        {product.published ? "◉" : "○"}
                      </button>

                      <button
                        onClick={() =>
                          deleteProduct(product)
                        }
                        title="Eliminar producto"
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-500/10 bg-red-500/[0.025] text-sm text-red-500/60 transition hover:border-red-500/30 hover:bg-red-500/[0.07] hover:text-red-400"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
                    Product Management
                  </span>
                </div>

                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  {editingId
                    ? "Editar producto"
                    : "Nuevo producto"}
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
              <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.35fr_0.65fr]">
                <div className="space-y-6">
                  <PremiumSection>
                    <SectionHeader
                      eyebrow="01"
                      title="Información"
                      description="Datos principales del producto."
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <InputField
                        label="Nombre del producto"
                        value={form.name}
                        onChange={(value) =>
                          updateField("name", value)
                        }
                        placeholder="Ej. AMIRI CLASSIC TEE"
                      />

                      <InputField
                        label="Precio"
                        type="number"
                        value={String(form.price)}
                        onChange={(value) =>
                          updateField("price", Number(value))
                        }
                        placeholder="35.00"
                      />

                      <InputField
                        label="SKU"
                        value={form.sku}
                        onChange={(value) =>
                          updateField("sku", value)
                        }
                        placeholder="NWC-001"
                      />

                      <SelectField
                        label="Categoría"
                        value={form.category}
                        onChange={(value) =>
                          updateField("category", value)
                        }
                        options={[
                          "T-SHIRTS",
                          "HOODIES",
                          "PANTS",
                          "JACKETS",
                          "ACCESSORIES",
                          "CAPS",
                        ]}
                      />

                      <SelectField
                        label="Colección"
                        value={form.collection}
                        onChange={(value) =>
                          updateField("collection", value)
                        }
                        options={[
                          "ESSENTIALS",
                          "THE LAST DANCE",
                          "COLLECTION 001",
                          "LIMITED",
                          "ARCHIVE",
                        ]}
                      />

                      <div className="sm:col-span-2">
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
                          placeholder="Descripción del producto..."
                          rows={4}
                          className="w-full resize-none rounded-2xl border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/20"
                        />
                      </div>
                    </div>
                  </PremiumSection>

                  <PremiumSection>
                    <SectionHeader
                      eyebrow="02"
                      title="Imágenes"
                      description="La primera imagen será utilizada como principal."
                    />

                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`relative overflow-hidden rounded-[22px] border border-dashed p-5 transition ${
                        dragActive
                          ? "border-white/40 bg-white/[0.06]"
                          : "border-white/[0.1] bg-black/20"
                      }`}
                    >
                      <input
                        id="product-images"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageInput}
                        className="hidden"
                      />

                      <label
                        htmlFor="product-images"
                        className="flex cursor-pointer flex-col items-center justify-center py-7 text-center"
                      >
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-xl text-zinc-500">
                          +
                        </div>

                        <p className="text-sm font-medium text-zinc-300">
                          Arrastra imágenes aquí
                        </p>

                        <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-zinc-700">
                          o haz clic para seleccionar
                        </p>

                        <p className="mt-2 text-[8px] uppercase tracking-[0.15em] text-zinc-800">
                          Máximo 5 MB por imagen
                        </p>
                      </label>
                    </div>

                    {form.images.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {form.images.map((image, index) => (
                          <div
                            key={image.id}
                            className="group relative aspect-square overflow-hidden rounded-2xl border border-white/[0.08] bg-black"
                          >
                            <img
                              src={image.url}
                              alt={`Imagen ${index + 1}`}
                              className="h-full w-full object-cover"
                            />

                            {index === 0 && (
                              <div className="absolute left-2 top-2 rounded-lg border border-white/10 bg-black/70 px-2 py-1 text-[7px] font-semibold uppercase tracking-[0.15em] text-white backdrop-blur-md">
                                Principal
                              </div>
                            )}

                            {image.file && (
                              <div className="absolute right-2 top-2 rounded-lg border border-green-400/20 bg-green-400/10 px-2 py-1 text-[7px] font-semibold uppercase tracking-[0.12em] text-green-300 backdrop-blur-md">
                                NUEVA
                              </div>
                            )}

                            <div className="absolute inset-x-2 bottom-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                              {index !== 0 && (
                                <button
                                  onClick={() =>
                                    makeMainImage(index)
                                  }
                                  className="flex-1 rounded-lg bg-white/90 py-2 text-[7px] font-bold uppercase tracking-[0.12em] text-black"
                                >
                                  Principal
                                </button>
                              )}

                              <button
                                onClick={() =>
                                  removeImage(index)
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/80 text-sm text-red-400 backdrop-blur-md"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </PremiumSection>

                  <PremiumSection>
                    <SectionHeader
                      eyebrow="03"
                      title="Tallas"
                      description="Selecciona las tallas disponibles."
                    />

                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_SIZES.map((size) => {
                        const active = form.sizes.includes(size);

                        return (
                          <button
                            key={size}
                            onClick={() => toggleSize(size)}
                            className={`min-w-[54px] rounded-xl border px-4 py-3 text-[9px] font-bold uppercase tracking-[0.15em] transition ${
                              active
                                ? "border-white bg-white text-black"
                                : "border-white/[0.08] bg-white/[0.025] text-zinc-600 hover:border-white/20 hover:text-zinc-300"
                            }`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </PremiumSection>

                  <PremiumSection>
                    <SectionHeader
                      eyebrow="04"
                      title="Colores"
                      description="Define los colores disponibles."
                    />

                    <div className="flex flex-wrap gap-2">
                      {form.colors.map((color) => (
                        <div
                          key={color}
                          className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2"
                        >
                          <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-zinc-300">
                            {color}
                          </span>

                          {form.colors.length > 1 && (
                            <button
                              onClick={() =>
                                removeColor(color)
                              }
                              className="text-xs text-zinc-600 transition hover:text-red-400"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <input
                        value={newColor}
                        onChange={(event) =>
                          setNewColor(event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addColor();
                          }
                        }}
                        placeholder="Ej. BLANCO"
                        className="h-11 flex-1 rounded-xl border border-white/[0.08] bg-black/40 px-4 text-[10px] uppercase tracking-[0.12em] text-white outline-none placeholder:text-zinc-700 focus:border-white/20"
                      />

                      <button
                        onClick={addColor}
                        className="rounded-xl border border-white/[0.1] bg-white/[0.05] px-5 text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-300 transition hover:bg-white/[0.09] hover:text-white"
                      >
                        Agregar
                      </button>
                    </div>
                  </PremiumSection>

                  <PremiumSection>
                    <SectionHeader
                      eyebrow="05"
                      title="Inventario"
                      description="Cantidad disponible por color y talla."
                    />

                    <div className="overflow-x-auto rounded-2xl border border-white/[0.07]">
                      <table className="w-full min-w-[520px] border-collapse">
                        <thead>
                          <tr className="border-b border-white/[0.06] bg-white/[0.025]">
                            <th className="px-4 py-3 text-left text-[8px] uppercase tracking-[0.18em] text-zinc-600">
                              Color
                            </th>

                            {form.sizes.map((size) => (
                              <th
                                key={size}
                                className="px-2 py-3 text-center text-[8px] uppercase tracking-[0.18em] text-zinc-600"
                              >
                                {size}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {form.colors.map((color) => (
                            <tr
                              key={color}
                              className="border-b border-white/[0.05] last:border-0"
                            >
                              <td className="px-4 py-3 text-[9px] font-medium uppercase tracking-[0.12em] text-zinc-300">
                                {color}
                              </td>

                              {form.sizes.map((size) => (
                                <td
                                  key={`${color}-${size}`}
                                  className="px-2 py-3"
                                >
                                  <input
                                    type="number"
                                    min="0"
                                    value={
                                      form.stock[color]?.[size] ??
                                      0
                                    }
                                    onChange={(event) =>
                                      updateStock(
                                        color,
                                        size,
                                        Number(
                                          event.target.value
                                        )
                                      )
                                    }
                                    className="h-9 w-full min-w-[58px] rounded-lg border border-white/[0.07] bg-black/40 px-2 text-center text-xs text-white outline-none focus:border-white/20"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </PremiumSection>
                </div>

                <div className="space-y-6">
                  <PremiumSection>
                    <SectionHeader
                      eyebrow="Preview"
                      title="Vista previa"
                      description="Así se verá la ficha del producto."
                    />

                    <div className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0d0d0d]">
                      <div className="relative aspect-[4/4.5] overflow-hidden bg-black">
                        {form.images[0] ? (
                          <img
                            src={form.images[0].url}
                            alt="Preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <span className="text-4xl text-zinc-800">
                              ◇
                            </span>
                          </div>
                        )}

                        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                          {form.isNew && (
                            <PreviewTag>NEW</PreviewTag>
                          )}

                          {form.limited && (
                            <PreviewTag>LIMITED</PreviewTag>
                          )}

                          {form.exclusiveDrop && (
                            <PreviewTag>DROP</PreviewTag>
                          )}
                        </div>
                      </div>

                      <div className="p-4">
                        <p className="text-[8px] uppercase tracking-[0.25em] text-zinc-600">
                          {form.collection}
                        </p>

                        <h3 className="mt-1 text-base font-medium">
                          {form.name || "Nombre del producto"}
                        </h3>

                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-lg font-semibold">
                            $
                            {Number(form.price || 0).toFixed(2)}
                          </span>

                          <span className="text-[8px] uppercase tracking-[0.15em] text-zinc-600">
                            {form.sku || "SKU"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </PremiumSection>

                  <PremiumSection>
                    <SectionHeader
                      eyebrow="06"
                      title="Características"
                      description="Controla cómo se clasifica el producto."
                    />

                    <div className="space-y-2">
                      <Toggle
                        label="Producto nuevo"
                        description="Mostrar como novedad."
                        value={form.isNew}
                        onChange={(value) =>
                          updateField("isNew", value)
                        }
                      />

                      <Toggle
                        label="Edición limitada"
                        description="Marcar como pieza limitada."
                        value={form.limited}
                        onChange={(value) =>
                          updateField("limited", value)
                        }
                      />

                      <Toggle
                        label="Oferta"
                        description="Mostrar como producto en oferta."
                        value={form.offer}
                        onChange={(value) =>
                          updateField("offer", value)
                        }
                      />

                      <Toggle
                        label="Exclusive Drop"
                        description="Asociar visualmente a un drop."
                        value={form.exclusiveDrop}
                        onChange={(value) =>
                          updateField(
                            "exclusiveDrop",
                            value
                          )
                        }
                      />

                      <Toggle
                        label="Producto destacado"
                        description="Priorizar en espacios destacados."
                        value={form.featured}
                        onChange={(value) =>
                          updateField("featured", value)
                        }
                      />

                      <Toggle
                        label="Activo"
                        description="Mantener habilitado en el sistema."
                        value={form.active}
                        onChange={(value) =>
                          updateField("active", value)
                        }
                      />

                      <Toggle
                        label="Publicado"
                        description="Visible para los clientes."
                        value={form.published}
                        onChange={(value) =>
                          updateField(
                            "published",
                            value
                          )
                        }
                      />
                    </div>
                  </PremiumSection>

                  <div className="rounded-[24px] border border-white/[0.07] bg-white/[0.025] p-5">
                    <p className="text-[8px] uppercase tracking-[0.25em] text-zinc-600">
                      Resumen
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <PreviewMetric
                        label="Imágenes"
                        value={form.images.length}
                      />

                      <PreviewMetric
                        label="Colores"
                        value={form.colors.length}
                      />

                      <PreviewMetric
                        label="Tallas"
                        value={form.sizes.length}
                      />

                      <PreviewMetric
                        label="Stock"
                        value={Object.values(form.stock).reduce(
                          (total, sizes) =>
                            total +
                            Object.values(sizes).reduce(
                              (sum, stock) =>
                                sum + Number(stock || 0),
                              0
                            ),
                          0
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3 border-t border-white/[0.07] bg-[#0b0b0b] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div className="text-[8px] uppercase tracking-[0.2em] text-zinc-700">
                {editingId
                  ? "Editando producto existente"
                  : "Creando nuevo producto"}
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
                  onClick={saveProduct}
                  disabled={saving}
                  className="rounded-xl bg-white px-6 py-3 text-[9px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Guardando..."
                    : editingId
                    ? "Guardar cambios"
                    : "Crear producto"}
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
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/20"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-2 block text-[9px] font-medium uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 text-sm text-white outline-none focus:border-white/20"
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
            className="bg-[#111] text-white"
          >
            {option}
          </option>
        ))}
      </select>
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

function PreviewTag({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-[7px] font-semibold uppercase tracking-[0.15em] text-white backdrop-blur-md">
      {children}
    </span>
  );
}

function PreviewMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
      <p className="text-[7px] uppercase tracking-[0.15em] text-zinc-700">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-zinc-300">
        {value}
      </p>
    </div>
  );
}