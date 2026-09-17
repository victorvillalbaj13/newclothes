"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const PRODUCTS = ["test", "test2"];

function dataUrlToBlob(dataUrl: string) {
  const parts = dataUrl.split(",");
  const metadata = parts[0];
  const base64 = parts[1];

  if (!metadata || !base64) {
    throw new Error("Imagen Base64 inválida.");
  }

  const match = metadata.match(/data:(.*?);base64/);
  const contentType = match?.[1] || "image/png";

  const byteCharacters = atob(base64);
  const byteArrays: Uint8Array[] = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
    const slice = byteCharacters.slice(offset, offset + 1024);

    const byteNumbers = new Array(slice.length);

    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays, {
    type: contentType,
  });
}

function getExtension(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/([^;]+);/i);

  if (!match) {
    return "png";
  }

  const extension = match[1].toLowerCase();

  if (extension === "jpeg") {
    return "jpg";
  }

  return extension;
}

export default function MigrateTestPage() {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState<string[]>([]);

  function addLog(text: string) {
    setLogs((current) => [...current, text]);
  }

  async function migrate() {
    if (running) return;

    setRunning(true);
    setMessage("");
    setLogs([]);

    try {
      addLog("Verificando sesión de administrador...");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("No hay una sesión iniciada.");
      }

      addLog(`Usuario autenticado: ${user.email || user.id}`);

      for (const slug of PRODUCTS) {
        addLog("");
        addLog(`Buscando producto: ${slug.toUpperCase()}`);

        const { data: product, error: productError } = await supabase
          .from("products")
          .select("id, name, slug, image, images")
          .eq("slug", slug)
          .maybeSingle();

        if (productError) {
          throw new Error(
            `Error buscando ${slug}: ${productError.message}`
          );
        }

        if (!product) {
          addLog(`⚠️ ${slug.toUpperCase()} no existe. Se omite.`);
          continue;
        }

        const oldImages = Array.isArray(product.images)
          ? product.images.filter(
              (image): image is string =>
                typeof image === "string" &&
                image.length > 0
            )
          : [];

        const fallbackImages =
          oldImages.length > 0
            ? oldImages
            : product.image
              ? [product.image]
              : [];

        if (fallbackImages.length === 0) {
          addLog(`⚠️ ${product.name} no tiene imágenes. Se omite.`);
          continue;
        }

        const alreadyMigrated = fallbackImages.every(
          (image) =>
            image.includes("/storage/v1/object/public/products/")
        );

        if (alreadyMigrated) {
          addLog(
            `✓ ${product.name} ya utiliza Storage. Se omite.`
          );
          continue;
        }

        const newUrls: string[] = [];

        for (let index = 0; index < fallbackImages.length; index++) {
          const image = fallbackImages[index];

          if (
            !image.startsWith("data:image/")
          ) {
            addLog(
              `⚠️ Imagen ${index + 1} no es Base64. Se conserva.`
            );

            newUrls.push(image);
            continue;
          }

          addLog(
            `Subiendo imagen ${index + 1}/${fallbackImages.length} de ${product.name}...`
          );

          const blob = dataUrlToBlob(image);
          const extension = getExtension(image);

          const filePath =
            `migrated/${product.id}/${crypto.randomUUID()}.${extension}`;

          const { error: uploadError } = await supabase.storage
            .from("products")
            .upload(filePath, blob, {
              cacheControl: "31536000",
              contentType: blob.type,
              upsert: false,
            });

          if (uploadError) {
            throw new Error(
              `Error subiendo ${product.name}: ${uploadError.message}`
            );
          }

          const { data: publicData } = supabase.storage
            .from("products")
            .getPublicUrl(filePath);

          if (!publicData.publicUrl) {
            throw new Error(
              `No se pudo obtener la URL pública de ${product.name}.`
            );
          }

          newUrls.push(publicData.publicUrl);

          addLog(`✓ Imagen subida correctamente.`);
        }

        addLog(
          `Actualizando producto ${product.name} en la base de datos...`
        );

        const { error: updateError } = await supabase
          .from("products")
          .update({
            image: newUrls[0] || null,
            images: newUrls,
            updated_at: new Date().toISOString(),
          })
          .eq("id", product.id);

        if (updateError) {
          throw new Error(
            `Error actualizando ${product.name}: ${updateError.message}`
          );
        }

        addLog(
          `✓ ${product.name} migrado correctamente.`
        );
      }

      setMessage(
        "Migración completada correctamente."
      );
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Ocurrió un error desconocido.";

      setMessage(`ERROR: ${errorMessage}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10">
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-white/40">
            NEWCLOTHES ADMIN
          </p>

          <h1 className="text-3xl font-semibold tracking-tight">
            Migración de imágenes
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">
            Esta prueba migrará únicamente las imágenes de TEST y
            TEST2 desde Base64 hacia Supabase Storage.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black p-4">
              <p className="text-xs uppercase tracking-wider text-white/40">
                Producto
              </p>

              <p className="mt-2 font-medium">
                TEST
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black p-4">
              <p className="text-xs uppercase tracking-wider text-white/40">
                Producto
              </p>

              <p className="mt-2 font-medium">
                TEST2
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={migrate}
            disabled={running}
            className="w-full rounded-xl bg-white px-5 py-4 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {running
              ? "MIGRANDO..."
              : "MIGRAR TEST Y TEST2"}
          </button>

          {message && (
            <div
              className={`mt-5 rounded-xl border p-4 text-sm ${
                message.startsWith("ERROR")
                  ? "border-red-500/20 bg-red-500/10 text-red-300"
                  : "border-green-500/20 bg-green-500/10 text-green-300"
              }`}
            >
              {message}
            </div>
          )}

          {logs.length > 0 && (
            <div className="mt-6 rounded-xl border border-white/10 bg-black p-4">
              <p className="mb-3 text-xs uppercase tracking-wider text-white/40">
                Proceso
              </p>

              <div className="space-y-2 font-mono text-xs text-white/60">
                {logs.map((log, index) => (
                  <div key={index}>
                    {log || "\u00A0"}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-xs leading-5 text-white/30">
          Esta prueba no elimina las imágenes Base64 originales.
          Primero verificaremos que las nuevas URLs funcionen
          correctamente antes de limpiar los datos antiguos.
        </p>
      </div>
    </main>
  );
}