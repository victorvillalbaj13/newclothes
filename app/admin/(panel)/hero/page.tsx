"use client";

import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type HeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  image: string;
  button_text: string;
  button_link: string;
  position: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type SlideForm = {
  eyebrow: string;
  title: string;
  subtitle: string;
  image: string;
  button_text: string;
  button_link: string;
  active: boolean;
};

const emptySlide: SlideForm = {
  eyebrow: "",
  title: "",
  subtitle: "",
  image: "",
  button_text: "",
  button_link: "",
  active: true,
};

const STORAGE_BUCKET = "products";
const STORAGE_FOLDER = "hero";

export default function HeroAdmin() {
  const supabase = createClient();

  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] =
    useState<HeroSlide | null>(null);

  const [form, setForm] =
    useState<SlideForm>(emptySlide);

  const [selectedImageFile, setSelectedImageFile] =
    useState<File | null>(null);

  const [localPreview, setLocalPreview] =
    useState<string>("");

  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadSlides();
  }, []);

  useEffect(() => {
    return () => {
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  async function loadSlides() {
    setLoading(true);

    const { data, error } = await supabase
      .from("hero_slides")
      .select(
        `
        id,
        eyebrow,
        title,
        subtitle,
        image,
        button_text,
        button_link,
        position,
        active,
        created_at,
        updated_at
        `
      )
      .order("position", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error(error);

      showMessage(
        "error",
        "No se pudieron cargar los slides."
      );

      setLoading(false);
      return;
    }

    setSlides(data || []);
    setLoading(false);
  }

  function resetImageState() {
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
    }

    setSelectedImageFile(null);
    setLocalPreview("");
  }

  function openNewSlide() {
    resetImageState();

    setEditingSlide(null);

    setForm({
      ...emptySlide,
    });

    setModalOpen(true);
  }

  function openEditSlide(slide: HeroSlide) {
    resetImageState();

    setEditingSlide(slide);

    setForm({
      eyebrow: slide.eyebrow || "",
      title: slide.title || "",
      subtitle: slide.subtitle || "",
      image: slide.image || "",
      button_text: slide.button_text || "",
      button_link: slide.button_link || "",
      active: slide.active,
    });

    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    resetImageState();

    setModalOpen(false);
    setEditingSlide(null);
  }

  function updateField(
    field: keyof SlideForm,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function prepareImage(file: File) {
    if (!file.type.startsWith("image/")) {
      showMessage(
        "error",
        "Selecciona un archivo de imagen válido."
      );

      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      showMessage(
        "error",
        "La imagen debe pesar menos de 6 MB."
      );

      return;
    }

    if (localPreview) {
      URL.revokeObjectURL(localPreview);
    }

    const previewUrl =
      URL.createObjectURL(file);

    setSelectedImageFile(file);
    setLocalPreview(previewUrl);
  }

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    prepareImage(file);

    event.target.value = "";
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    setDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (!file) return;

    prepareImage(file);
  }

  function removeSelectedImage() {
    resetImageState();

    updateField("image", "");
  }

  function sanitizeFileName(name: string) {
    const extension =
      name.split(".").pop() || "jpg";

    const baseName = name
      .replace(/\.[^/.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return `${baseName || "hero"}-${Date.now()}.${extension}`;
  }

  async function uploadHeroImage(
    file: File
  ) {
    const fileName =
      sanitizeFileName(file.name);

    const filePath =
      `${STORAGE_FOLDER}/${fileName}`;

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error(error);
      return {
        url: "",
        path: "",
        error,
      };
    }

    const { data } =
      supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

    return {
      url: data.publicUrl,
      path: filePath,
      error: null,
    };
  }

  function getStoragePath(
    url: string
  ) {
    if (!url) return null;

    const marker =
      `/storage/v1/object/public/${STORAGE_BUCKET}/`;

    const index = url.indexOf(marker);

    if (index === -1) {
      return null;
    }

    return decodeURIComponent(
      url.slice(index + marker.length)
    );
  }

  async function deleteStorageImage(
    url: string
  ) {
    const path = getStoragePath(url);

    if (!path) return;

    const { error } =
      await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([path]);

    if (error) {
      console.error(
        "No se pudo eliminar la imagen anterior:",
        error
      );
    }
  }

  async function saveSlide() {
    if (!form.title.trim()) {
      showMessage(
        "error",
        "El título es obligatorio."
      );

      return;
    }

    if (
      !form.image.trim() &&
      !selectedImageFile
    ) {
      showMessage(
        "error",
        "Debes agregar una imagen al slide."
      );

      return;
    }

    setSaving(true);
    setMessage(null);

    let finalImageUrl =
      form.image.trim();

    let uploadedImagePath = "";

    if (selectedImageFile) {
      const uploadResult =
        await uploadHeroImage(
          selectedImageFile
        );

      if (uploadResult.error) {
        showMessage(
          "error",
          "No se pudo subir la imagen. Verifica los permisos de Storage."
        );

        setSaving(false);
        return;
      }

      finalImageUrl =
        uploadResult.url;

      uploadedImagePath =
        uploadResult.path;
    }

    if (editingSlide) {
      const { error } = await supabase
        .from("hero_slides")
        .update({
          eyebrow:
            form.eyebrow.trim(),
          title:
            form.title.trim(),
          subtitle:
            form.subtitle.trim(),
          image:
            finalImageUrl,
          button_text:
            form.button_text.trim(),
          button_link:
            form.button_link.trim(),
          active:
            form.active,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          editingSlide.id
        );

      if (error) {
        console.error(error);

        if (uploadedImagePath) {
          await supabase.storage
            .from(STORAGE_BUCKET)
            .remove([
              uploadedImagePath,
            ]);
        }

        showMessage(
          "error",
          "No se pudo actualizar el slide."
        );

        setSaving(false);
        return;
      }

      if (
        selectedImageFile &&
        editingSlide.image &&
        editingSlide.image !==
          finalImageUrl
      ) {
        await deleteStorageImage(
          editingSlide.image
        );
      }
    } else {
      const nextPosition =
        slides.length > 0
          ? Math.max(
              ...slides.map(
                (slide) =>
                  slide.position
              )
            ) + 1
          : 0;

      const { error } = await supabase
        .from("hero_slides")
        .insert({
          eyebrow:
            form.eyebrow.trim(),
          title:
            form.title.trim(),
          subtitle:
            form.subtitle.trim(),
          image:
            finalImageUrl,
          button_text:
            form.button_text.trim(),
          button_link:
            form.button_link.trim(),
          position:
            nextPosition,
          active:
            form.active,
        });

      if (error) {
        console.error(error);

        if (uploadedImagePath) {
          await supabase.storage
            .from(STORAGE_BUCKET)
            .remove([
              uploadedImagePath,
            ]);
        }

        showMessage(
          "error",
          "No se pudo crear el slide."
        );

        setSaving(false);
        return;
      }
    }

    const wasEditing =
      Boolean(editingSlide);

    setSaving(false);

    resetImageState();

    setModalOpen(false);
    setEditingSlide(null);

    await loadSlides();

    showMessage(
      "success",
      wasEditing
        ? "Slide actualizado correctamente."
        : "Slide creado correctamente."
    );
  }

  async function toggleActive(
    slide: HeroSlide
  ) {
    const { error } =
      await supabase
        .from("hero_slides")
        .update({
          active:
            !slide.active,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          slide.id
        );

    if (error) {
      console.error(error);

      showMessage(
        "error",
        "No se pudo cambiar el estado."
      );

      return;
    }

    setSlides((current) =>
      current.map((item) =>
        item.id === slide.id
          ? {
              ...item,
              active:
                !item.active,
            }
          : item
      )
    );

    showMessage(
      "success",
      slide.active
        ? "Slide desactivado."
        : "Slide activado."
    );
  }

  async function deleteSlide(
    slide: HeroSlide
  ) {
    const confirmed =
      window.confirm(
        `¿Eliminar el slide "${slide.title}"? Esta acción no se puede deshacer.`
      );

    if (!confirmed) return;

    const { error } =
      await supabase
        .from("hero_slides")
        .delete()
        .eq(
          "id",
          slide.id
        );

    if (error) {
      console.error(error);

      showMessage(
        "error",
        "No se pudo eliminar el slide."
      );

      return;
    }

    await deleteStorageImage(
      slide.image
    );

    setSlides((current) =>
      current.filter(
        (item) =>
          item.id !== slide.id
      )
    );

    showMessage(
      "success",
      "Slide eliminado correctamente."
    );
  }

  async function moveSlide(
    slide: HeroSlide,
    direction: "up" | "down"
  ) {
    const currentIndex =
      slides.findIndex(
        (item) =>
          item.id === slide.id
      );

    if (currentIndex === -1)
      return;

    const targetIndex =
      direction === "up"
        ? currentIndex - 1
        : currentIndex + 1;

    if (
      targetIndex < 0 ||
      targetIndex >=
        slides.length
    ) {
      return;
    }

    const targetSlide =
      slides[targetIndex];

    const currentPosition =
      slide.position;

    const targetPosition =
      targetSlide.position;

    const firstUpdate =
      await supabase
        .from("hero_slides")
        .update({
          position:
            targetPosition,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          slide.id
        );

    if (firstUpdate.error) {
      console.error(
        firstUpdate.error
      );

      showMessage(
        "error",
        "No se pudo cambiar el orden."
      );

      return;
    }

    const secondUpdate =
      await supabase
        .from("hero_slides")
        .update({
          position:
            currentPosition,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          targetSlide.id
        );

    if (secondUpdate.error) {
      console.error(
        secondUpdate.error
      );

      showMessage(
        "error",
        "No se pudo completar el cambio de orden."
      );

      await loadSlides();
      return;
    }

    await loadSlides();

    showMessage(
      "success",
      "Orden actualizado."
    );
  }

  function showMessage(
    type: "success" | "error",
    text: string
  ) {
    setMessage({
      type,
      text,
    });

    setTimeout(() => {
      setMessage(null);
    }, 2500);
  }

  const activeSlides =
    slides.filter(
      (slide) =>
        slide.active
    ).length;

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
        <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="h-px w-8 bg-white/30" />

              <span className="text-[9px] font-medium uppercase tracking-[0.35em] text-zinc-500">
                Homepage Content
              </span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Hero / Slides
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
              Administra las imágenes y mensajes principales que aparecen en la página de inicio.
            </p>
          </div>

          <button
            onClick={openNewSlide}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-6 text-[9px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-zinc-200"
          >
            <span className="mr-2 text-base leading-none">
              +
            </span>
            Agregar Slide
          </button>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard
            label="Slides"
            value={slides.length}
            detail="Total"
          />

          <StatCard
            label="Activos"
            value={activeSlides}
            detail="Visibles"
          />

          <StatCard
            label="Inactivos"
            value={
              slides.length -
              activeSlides
            }
            detail="Ocultos"
          />
        </div>

        {loading ? (
          <div className="rounded-[28px] border border-white/[0.07] bg-white/[0.025] px-6 py-20 text-center">
            <div className="mx-auto mb-4 h-7 w-7 animate-spin rounded-full border-2 border-white/10 border-t-white/70" />

            <p className="text-sm text-zinc-500">
              Cargando slides...
            </p>
          </div>
        ) : slides.length === 0 ? (
          <EmptyState
            onCreate={openNewSlide}
          />
        ) : (
          <div className="space-y-4">
            {slides.map(
              (slide, index) => (
                <SlideCard
                  key={slide.id}
                  slide={slide}
                  index={index}
                  total={
                    slides.length
                  }
                  onEdit={() =>
                    openEditSlide(
                      slide
                    )
                  }
                  onDelete={() =>
                    deleteSlide(
                      slide
                    )
                  }
                  onToggle={() =>
                    toggleActive(
                      slide
                    )
                  }
                  onMoveUp={() =>
                    moveSlide(
                      slide,
                      "up"
                    )
                  }
                  onMoveDown={() =>
                    moveSlide(
                      slide,
                      "down"
                    )
                  }
                />
              )
            )}
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
        <SlideModal
          form={form}
          editingSlide={
            editingSlide
          }
          saving={saving}
          dragging={dragging}
          imagePreview={
            localPreview ||
            form.image
          }
          onClose={closeModal}
          onSave={saveSlide}
          onChange={updateField}
          onImageChange={
            handleImageChange
          }
          onDrop={handleDrop}
          onRemoveImage={
            removeSelectedImage
          }
          onDragEnter={() =>
            setDragging(true)
          }
          onDragLeave={() =>
            setDragging(false)
          }
        />
      )}

      {message && (
        <div className="fixed bottom-5 left-1/2 z-[200] w-[calc(100%-32px)] max-w-[500px] -translate-x-1/2">
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
    </main>
  );
}

function SlideCard({
  slide,
  index,
  total,
  onEdit,
  onDelete,
  onToggle,
  onMoveUp,
  onMoveDown,
}: {
  slide: HeroSlide;
  index: number;
  total: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="group overflow-hidden rounded-[28px] border border-white/[0.07] bg-white/[0.025] transition hover:border-white/[0.13]">
      <div className="flex flex-col lg:flex-row">
        <div className="relative h-[230px] overflow-hidden bg-black lg:h-auto lg:min-h-[270px] lg:w-[43%]">
          {slide.image ? (
            <img
              src={slide.image}
              alt={
                slide.title ||
                "Hero slide"
              }
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-800">
              Sin imagen
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/10" />

          <div className="absolute left-4 top-4 flex items-center gap-2">
            <span className="rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-[8px] font-semibold uppercase tracking-[0.15em] text-white backdrop-blur-md">
              Slide {index + 1}
            </span>

            <span
              className={`rounded-full border px-3 py-1.5 text-[8px] font-semibold uppercase tracking-[0.15em] backdrop-blur-md ${
                slide.active
                  ? "border-green-400/20 bg-green-400/10 text-green-300"
                  : "border-red-400/20 bg-red-400/10 text-red-300"
              }`}
            >
              {slide.active
                ? "Activo"
                : "Inactivo"}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                Position{" "}
                {slide.position}
              </span>

              <div className="h-px flex-1 bg-white/[0.05]" />
            </div>

            {slide.eyebrow && (
              <p className="mb-2 text-[8px] font-medium uppercase tracking-[0.25em] text-zinc-600">
                {slide.eyebrow}
              </p>
            )}

            <h2 className="whitespace-pre-line text-xl font-semibold tracking-tight">
              {slide.title ||
                "Sin título"}
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              {slide.subtitle ||
                "Sin subtítulo"}
            </p>

            {slide.button_text && (
              <div className="mt-4 inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[8px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
                {slide.button_text}

                {slide.button_link && (
                  <span className="ml-2 text-zinc-700">
                    →
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.05] pt-4">
            <div className="flex gap-2">
              <button
                onClick={onMoveUp}
                disabled={
                  index === 0
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-black/20 text-zinc-600 transition hover:border-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                title="Subir"
              >
                ↑
              </button>

              <button
                onClick={onMoveDown}
                disabled={
                  index ===
                  total - 1
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-black/20 text-zinc-600 transition hover:border-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                title="Bajar"
              >
                ↓
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onToggle}
                className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-2.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-zinc-500 transition hover:border-white/15 hover:text-white"
              >
                {slide.active
                  ? "Ocultar"
                  : "Activar"}
              </button>

              <button
                onClick={onEdit}
                className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-2.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-zinc-500 transition hover:border-white/15 hover:text-white"
              >
                Editar
              </button>

              <button
                onClick={onDelete}
                className="rounded-xl border border-red-500/10 bg-red-500/[0.03] px-4 py-2.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-red-500/70 transition hover:border-red-500/20 hover:bg-red-500/[0.06] hover:text-red-400"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideModal({
  form,
  editingSlide,
  saving,
  dragging,
  imagePreview,
  onClose,
  onSave,
  onChange,
  onImageChange,
  onDrop,
  onRemoveImage,
  onDragEnter,
  onDragLeave,
}: {
  form: SlideForm;
  editingSlide: HeroSlide | null;
  saving: boolean;
  dragging: boolean;
  imagePreview: string;
  onClose: () => void;
  onSave: () => void;
  onChange: (
    field: keyof SlideForm,
    value: string | boolean
  ) => void;
  onImageChange: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
  onDrop: (
    event: DragEvent<HTMLDivElement>
  ) => void;
  onRemoveImage: () => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
}) {
  const titleLines =
    form.title.trim() ||
    "WEAR\nYOUR\nSTORY.";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-6"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="relative flex max-h-[94vh] w-full max-w-[1250px] flex-col overflow-hidden rounded-[30px] border border-white/[0.1] bg-[#0b0b0b] shadow-[0_40px_120px_rgba(0,0,0,0.8)]">
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-5 py-5 sm:px-7">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="h-px w-6 bg-white/30" />

              <span className="text-[8px] uppercase tracking-[0.3em] text-zinc-600">
                Homepage Content
              </span>
            </div>

            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {editingSlide
                ? "Editar Slide"
                : "Nuevo Slide"}
            </h2>
          </div>

          <button
            onClick={onClose}
            disabled={saving}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-lg text-zinc-500 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:opacity-30"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-7 p-5 sm:p-7 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-5">
              <SectionLabel
                number="01"
                label="Contenido"
              />

              <div>
                <label className="mb-2 block text-[8px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                  Texto superior
                </label>

                <input
                  value={form.eyebrow}
                  onChange={(event) =>
                    onChange(
                      "eyebrow",
                      event.target.value
                    )
                  }
                  placeholder="NEWCLOTHES® / DROP 001"
                  className="h-12 w-full rounded-xl border border-white/[0.07] bg-black/30 px-4 text-sm text-white outline-none placeholder:text-zinc-800 focus:border-white/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-[8px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                  Título *
                </label>

                <textarea
                  value={form.title}
                  onChange={(event) =>
                    onChange(
                      "title",
                      event.target.value
                    )
                  }
                  placeholder={"WEAR\nYOUR\nSTORY."}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-white/[0.07] bg-black/30 px-4 py-3 text-sm leading-7 text-white outline-none placeholder:text-zinc-800 focus:border-white/20"
                />

                <p className="mt-2 text-[8px] leading-4 text-zinc-700">
                  Puedes utilizar saltos de línea para controlar cómo se verá el título.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-[8px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                  Descripción
                </label>

                <textarea
                  value={form.subtitle}
                  onChange={(event) =>
                    onChange(
                      "subtitle",
                      event.target.value
                    )
                  }
                  placeholder="Streetwear for individuality, movement and everything that makes you different."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-white/[0.07] bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-800 focus:border-white/20"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[8px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                    Texto del botón
                  </label>

                  <input
                    value={
                      form.button_text
                    }
                    onChange={(event) =>
                      onChange(
                        "button_text",
                        event.target.value
                      )
                    }
                    placeholder="SHOP NOW"
                    className="h-12 w-full rounded-xl border border-white/[0.07] bg-black/30 px-4 text-sm text-white outline-none placeholder:text-zinc-800 focus:border-white/20"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[8px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                    Enlace
                  </label>

                  <input
                    value={
                      form.button_link
                    }
                    onChange={(event) =>
                      onChange(
                        "button_link",
                        event.target.value
                      )
                    }
                    placeholder="/shop"
                    className="h-12 w-full rounded-xl border border-white/[0.07] bg-black/30 px-4 text-sm text-white outline-none placeholder:text-zinc-800 focus:border-white/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <div>
                  <p className="text-[10px] font-medium text-zinc-300">
                    Slide activo
                  </p>

                  <p className="mt-1 text-[8px] text-zinc-700">
                    Si está desactivado no aparecerá en la página.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      "active",
                      !form.active
                    )
                  }
                  className={`relative h-7 w-12 rounded-full border transition ${
                    form.active
                      ? "border-white bg-white"
                      : "border-white/10 bg-white/[0.05]"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full transition ${
                      form.active
                        ? "left-6 bg-black"
                        : "left-1 bg-zinc-600"
                    }`}
                  />
                </button>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-[8px] uppercase tracking-[0.2em] text-zinc-700">
                  Previsualización en vivo
                </p>

                <p className="mt-2 text-[10px] leading-5 text-zinc-600">
                  La vista de la derecha cambia automáticamente mientras escribes.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <SectionLabel
                number="02"
                label="Imagen"
              />

              <div
                onDragOver={(event) =>
                  event.preventDefault()
                }
                onDragEnter={(event) => {
                  event.preventDefault();
                  onDragEnter();
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  onDragLeave();
                }}
                onDrop={onDrop}
                className={`relative overflow-hidden rounded-[24px] border border-dashed transition ${
                  dragging
                    ? "border-white/40 bg-white/[0.06]"
                    : "border-white/[0.08] bg-black/20"
                }`}
              >
                {imagePreview ? (
                  <div className="relative aspect-[16/9]">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />

                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent p-4 pt-10">
                      <span className="text-[8px] uppercase tracking-[0.15em] text-zinc-400">
                        Imagen seleccionada
                      </span>

                      <button
                        type="button"
                        onClick={
                          onRemoveImage
                        }
                        className="rounded-lg border border-red-400/20 bg-black/60 px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.12em] text-red-400"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex aspect-[16/9] cursor-pointer flex-col items-center justify-center px-6 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-xl text-zinc-600">
                      ↑
                    </div>

                    <p className="text-sm font-medium text-zinc-400">
                      Arrastra una imagen aquí
                    </p>

                    <p className="mt-2 text-[9px] uppercase tracking-[0.15em] text-zinc-700">
                      o haz clic para seleccionar
                    </p>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={
                        onImageChange
                      }
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="mb-2 block text-[8px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                  URL de imagen
                </label>

                <input
                  value={form.image}
                  onChange={(event) =>
                    onChange(
                      "image",
                      event.target.value
                    )
                  }
                  placeholder="https://..."
                  className="h-12 w-full rounded-xl border border-white/[0.07] bg-black/30 px-4 text-xs text-white outline-none placeholder:text-zinc-800 focus:border-white/20"
                />

                <p className="mt-2 text-[8px] leading-4 text-zinc-700">
                  También puedes utilizar una URL externa.
                </p>
              </div>

              <SectionLabel
                number="03"
                label="Vista del Hero"
              />

              <HeroPreview
                image={
                  imagePreview
                }
                eyebrow={
                  form.eyebrow
                }
                title={
                  titleLines
                }
                subtitle={
                  form.subtitle
                }
                buttonText={
                  form.button_text
                }
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white/[0.07] bg-[#0b0b0b] px-5 py-4 sm:px-7">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-white/[0.08] px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-500 transition hover:border-white/15 hover:text-white disabled:opacity-30"
          >
            Cancelar
          </button>

          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-xl bg-white px-6 py-3 text-[9px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-zinc-200 disabled:cursor-wait disabled:opacity-50"
          >
            {saving
              ? "Guardando..."
              : editingSlide
              ? "Guardar cambios"
              : "Crear Slide"}
          </button>
        </div>
      </div>
    </div>
  );
}

function HeroPreview({
  image,
  eyebrow,
  title,
  subtitle,
  buttonText,
}: {
  image: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  buttonText: string;
}) {
  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#101010]">
      {image ? (
        <img
          src={image}
          alt="Hero preview"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 to-black text-[9px] uppercase tracking-[0.2em] text-zinc-700">
          Sin imagen
        </div>
      )}

      <div className="absolute inset-0 bg-black/35" />

      <div className="absolute inset-0 flex items-center">
        <div className="w-full max-w-[62%] px-5 py-6 sm:px-8">
          {eyebrow && (
            <p className="mb-2 text-[6px] font-medium uppercase tracking-[0.25em] text-white/60 sm:text-[7px]">
              {eyebrow}
            </p>
          )}

          <h3 className="whitespace-pre-line text-[24px] font-semibold leading-[0.92] tracking-[-0.04em] text-white sm:text-[34px]">
            {title}
          </h3>

          {subtitle && (
            <p className="mt-3 max-w-[330px] text-[7px] leading-4 text-white/65 sm:text-[9px] sm:leading-5">
              {subtitle}
            </p>
          )}

          {buttonText && (
            <div className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-[6px] font-bold uppercase tracking-[0.16em] text-black sm:px-5 sm:py-2.5 sm:text-[7px]">
              {buttonText}
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-4 right-4 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[6px] uppercase tracking-[0.15em] text-white/50 backdrop-blur-md">
        LIVE PREVIEW
      </div>
    </div>
  );
}

function SectionLabel({
  number,
  label,
}: {
  number: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[8px] font-semibold uppercase tracking-[0.25em] text-zinc-700">
        {number}
      </span>

      <div className="h-px flex-1 bg-white/[0.05]" />

      <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
        {label}
      </span>
    </div>
  );
}

function EmptyState({
  onCreate,
}: {
  onCreate: () => void;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-20 text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/[0.08] bg-white/[0.03] text-2xl text-zinc-600">
        ◇
      </div>

      <h3 className="text-lg font-medium">
        No hay slides
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
        Crea el primer slide para comenzar a administrar el contenido principal de la página.
      </p>

      <button
        onClick={onCreate}
        className="mt-6 rounded-xl bg-white px-5 py-3 text-[9px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-zinc-200"
      >
        Crear primer slide
      </button>
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