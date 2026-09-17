import { notFound } from "next/navigation";
import ProductClient from "./ProductClient";
import { createClient } from "@/lib/supabase/server";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();

  // 1. Cargar producto
  const { data: product, error: productError } = await supabase
    .from("products")
    .select(`
      id,
      name,
      slug,
      description,
      price,
      image,
      images,
      category,
      collection,
      sku,
      limited,
      offer,
      exclusive_drop,
      is_new,
      featured,
      published,
      active
    `)
    .eq("slug", slug)
    .eq("published", true)
    .eq("active", true)
    .maybeSingle();

  if (productError) {
    console.error("Error cargando producto:", productError);
    notFound();
  }

  if (!product) {
    notFound();
  }

  // 2. Cargar variantes del producto desde Supabase
  const { data: variants, error: variantsError } = await supabase
    .from("product_variants")
    .select(`
      id,
      color,
      size,
      stock
    `)
    .eq("product_id", product.id)
    .order("size", { ascending: true });

  if (variantsError) {
    console.error("Error cargando variantes:", variantsError);
  }

  // 3. Procesar imágenes
  const images = Array.isArray(product.images)
    ? product.images.filter(
        (image): image is string => typeof image === "string"
      )
    : [];

  const mainImage =
    product.image ||
    images[0] ||
    "/images/placeholder.png";

  // 4. Obtener tallas únicas
  const sizes = Array.from(
    new Set(
      (variants || [])
        .map((variant) => variant.size)
        .filter(
          (size): size is string =>
            typeof size === "string" && size.trim().length > 0
        )
    )
  );

  // 5. Obtener colores únicos
  const colors = Array.from(
    new Set(
      (variants || [])
        .map((variant) => variant.color)
        .filter(
          (color): color is string =>
            typeof color === "string" && color.trim().length > 0
        )
    )
  );

  // 6. Calcular stock total
  const totalStock = (variants || []).reduce(
    (total, variant) =>
      total + Number(variant.stock || 0),
    0
  );

  return (
    <ProductClient
      product={{
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: `$${Number(product.price).toFixed(2)}`,
        priceValue: Number(product.price),
        image: mainImage,
        images,
        description:
          product.description ||
          "NEWCLOTHES streetwear oversize. Diseño exclusivo, identidad fuerte y estilo urbano.",
        category: product.category,
        collection: product.collection,
        sku: product.sku,
        limited: product.limited,
        offer: product.offer,
        exclusiveDrop: product.exclusive_drop,
        isNew: product.is_new,
        featured: product.featured,

        // Datos provenientes de Supabase
        sizes:
          sizes.length > 0
            ? sizes
            : ["XS", "S", "M", "L", "XL"],

        colors,
        stock: totalStock,

        // Variantes completas con talla, color y stock
        variants: (variants || []).map((variant) => ({
          id: variant.id,
          color: variant.color || "",
          size: variant.size,
          stock: Number(variant.stock || 0),
        })),
      }}
    />
  );
}