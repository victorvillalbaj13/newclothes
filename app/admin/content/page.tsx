"use client";

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

type ContentItem = {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  buttonText: string;
  type: "HERO" | "BANNER";
  active: boolean;
};

type AboutContent = {
  id: string;
  image_url: string | null;
  eyebrow: string;
  title: string;
  intro: string;
  description: string;
  custom_description: string;
  active: boolean;
};

type ContentTab = "ALL" | "HERO" | "BANNER" | "ABOUT";

const initialContent: ContentItem[] = [
  {
    id: 1,
    title: "THE LAST DANCE",
    subtitle: "LIMITED EDITION",
    image: "",
    buttonText: "VER DROP",
    type: "HERO",
    active: true,
  },
  {
    id: 2,
    title: "NEW DROP",
    subtitle: "NEWCLOTHES 2026",
    image: "",
    buttonText: "VER PRODUCTOS",
    type: "BANNER",
    active: true,
  },
];

const defaultAbout: AboutContent = {
  id: "",
  image_url: null,
  eyebrow: "QUIÉNES SOMOS",
  title: "VISTE TU IDENTIDAD.",
  intro: "ROPA STREETWEAR TOTALMENTE PREMIUM. HECHA PARA TI.",
  description:
    "En NEWCLOTHES creamos y seleccionamos prendas streetwear premium para quienes buscan vestir diferente. Nos enfocamos en diseños con carácter, calidad y una estética que se adapta a cada persona.",
  custom_description:
    "También hacemos ropa personalizada, llevando tus ideas a prendas creadas totalmente a tu estilo. Tú imaginas el diseño. Nosotros lo convertimos en una pieza que representa quién eres.",
  active: true,
};

const supabase = createClient();

export default function ContentPage() {
  const [content, setContent] =
    useState<ContentItem[]>(initialContent);

  const [activeTab, setActiveTab] =
    useState<ContentTab>("ALL");

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [title, setTitle] =
    useState("");

  const [subtitle, setSubtitle] =
    useState("");

  const [image, setImage] =
    useState("");

  const [buttonText, setButtonText] =
    useState("");

  const [type, setType] =
    useState<ContentItem["type"]>("BANNER");

  const [active, setActive] =
    useState(true);

  const [about, setAbout] =
    useState<AboutContent>(defaultAbout);

  const [aboutLoading, setAboutLoading] =
    useState(true);

  const [aboutSaving, setAboutSaving] =
    useState(false);

  const [aboutUploading, setAboutUploading] =
    useState(false);

  const [aboutMessage, setAboutMessage] =
    useState("");

  useEffect(() => {
    const loadAbout = async () => {
      setAboutLoading(true);
      setAboutMessage("");

      const { data, error } = await supabase
        .from("about_content")
        .select(
          `
            id,
            image_url,
            eyebrow,
            title,
            intro,
            description,
            custom_description,
            active
          `
        )
        .order("updated_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(
          "Error cargando About:",
          error
        );

        setAboutMessage(
          "No se pudo cargar la información de About."
        );

        setAboutLoading(false);
        return;
      }

      if (data) {
        setAbout({
          id: data.id,
          image_url: data.image_url,
          eyebrow: data.eyebrow,
          title: data.title,
          intro: data.intro,
          description: data.description,
          custom_description:
            data.custom_description,
          active: data.active,
        });
      }

      setAboutLoading(false);
    };

    loadAbout();
  }, []);

  const resetForm = () => {
    setTitle("");
    setSubtitle("");
    setImage("");
    setButtonText("");
    setType("BANNER");
    setActive(true);
    setEditingId(null);
    setShowForm(false);
  };

  const openNew = () => {
    resetForm();
    setShowForm(true);
  };

  const editContent = (
    item: ContentItem
  ) => {
    setTitle(item.title);
    setSubtitle(item.subtitle);
    setImage(item.image);
    setButtonText(item.buttonText);
    setType(item.type);
    setActive(item.active);
    setEditingId(item.id);
    setShowForm(true);
  };

  const saveContent = () => {
    if (!title.trim()) {
      alert("Escribe un título.");
      return;
    }

    if (editingId !== null) {
      setContent((current) =>
        current.map((item) =>
          item.id === editingId
            ? {
                ...item,
                title: title.trim(),
                subtitle:
                  subtitle.trim(),
                image: image.trim(),
                buttonText:
                  buttonText.trim(),
                type,
                active,
              }
            : item
        )
      );
    } else {
      const newItem: ContentItem = {
        id: Date.now(),
        title: title.trim(),
        subtitle: subtitle.trim(),
        image: image.trim(),
        buttonText:
          buttonText.trim(),
        type,
        active,
      };

      setContent((current) => [
        newItem,
        ...current,
      ]);
    }

    resetForm();
  };

  const deleteContent = (
    id: number
  ) => {
    if (
      !window.confirm(
        "¿Eliminar este contenido?"
      )
    ) {
      return;
    }

    setContent((current) =>
      current.filter(
        (item) => item.id !== id
      )
    );
  };

  const toggleActive = (
    id: number
  ) => {
    setContent((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              active: !item.active,
            }
          : item
      )
    );
  };

  const filteredContent =
    content.filter((item) => {
      if (activeTab === "ALL") {
        return true;
      }

      if (activeTab === "ABOUT") {
        return false;
      }

      return item.type === activeTab;
    });

  const updateAboutField = (
    field: keyof AboutContent,
    value:
      | string
      | boolean
      | null
  ) => {
    setAbout((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleAboutImageUpload =
    async (
      event: ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      setAboutUploading(true);
      setAboutMessage("");

      try {
        if (
          !file.type.startsWith(
            "image/"
          )
        ) {
          throw new Error(
            "Selecciona un archivo de imagen válido."
          );
        }

        const maxSize =
          10 * 1024 * 1024;

        if (file.size > maxSize) {
          throw new Error(
            "La imagen no puede superar los 10 MB."
          );
        }

        const extension =
          file.name
            .split(".")
            .pop()
            ?.toLowerCase() ||
          "jpg";

        const fileName =
          `about-${Date.now()}.${extension}`;

        const {
          error: uploadError,
        } = await supabase.storage
          .from("about")
          .upload(
            fileName,
            file,
            {
              cacheControl:
                "3600",
              upsert: true,
            }
          );

        if (uploadError) {
          throw new Error(
            uploadError.message
          );
        }

        const {
          data: publicUrlData,
        } = supabase.storage
          .from("about")
          .getPublicUrl(
            fileName
          );

        const publicUrl =
          publicUrlData.publicUrl;

        setAbout((current) => ({
          ...current,
          image_url:
            publicUrl,
        }));

        setAboutMessage(
          "Imagen cargada correctamente. Presiona GUARDAR ABOUT."
        );
      } catch (error) {
        console.error(
          "Error subiendo imagen:",
          error
        );

        setAboutMessage(
          error instanceof Error
            ? error.message
            : "No se pudo subir la imagen."
        );
      } finally {
        setAboutUploading(false);
        event.target.value = "";
      }
    };

  const removeAboutImage =
    async () => {
      if (!about.image_url) {
        return;
      }

      const confirmed =
        window.confirm(
          "¿Quieres eliminar la imagen de About?"
        );

      if (!confirmed) {
        return;
      }

      setAboutUploading(true);
      setAboutMessage("");

      try {
        const url =
          about.image_url;

        const marker =
          "/storage/v1/object/public/about/";

        const markerIndex =
          url.indexOf(marker);

        if (markerIndex !== -1) {
          const filePath =
            url.substring(
              markerIndex +
                marker.length
            );

          if (filePath) {
            const {
              error,
            } = await supabase.storage
              .from("about")
              .remove([
                filePath,
              ]);

            if (error) {
              console.warn(
                "No se pudo eliminar físicamente la imagen:",
                error
              );
            }
          }
        }

        setAbout((current) => ({
          ...current,
          image_url: null,
        }));

        setAboutMessage(
          "Imagen eliminada. Presiona GUARDAR ABOUT para confirmar."
        );
      } catch (error) {
        console.error(error);

        setAboutMessage(
          "No se pudo eliminar la imagen."
        );
      } finally {
        setAboutUploading(false);
      }
    };

  const saveAbout = async () => {
    setAboutSaving(true);
    setAboutMessage("");

    try {
      const payload = {
        image_url:
          about.image_url,
        eyebrow:
          about.eyebrow.trim(),
        title:
          about.title.trim(),
        intro:
          about.intro.trim(),
        description:
          about.description.trim(),
        custom_description:
          about.custom_description.trim(),
        active:
          about.active,
        updated_at:
          new Date().toISOString(),
      };

      let error;

      if (about.id) {
        const response =
          await supabase
            .from(
              "about_content"
            )
            .update(payload)
            .eq(
              "id",
              about.id
            );

        error =
          response.error;
      } else {
        const response =
          await supabase
            .from(
              "about_content"
            )
            .insert(payload)
            .select()
            .single();

        error =
          response.error;

        if (response.data) {
          setAbout(
            (current) => ({
              ...current,
              id: response
                .data.id,
            })
          );
        }
      }

      if (error) {
        throw new Error(
          error.message
        );
      }

      setAboutMessage(
        "✓ Sección About guardada correctamente."
      );
    } catch (error) {
      console.error(
        "Error guardando About:",
        error
      );

      setAboutMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la sección About."
      );
    } finally {
      setAboutSaving(false);
    }
  };

  const activeCount =
    content.filter(
      (item) => item.active
    ).length;

  const featuredCount =
    content.filter(
      (item) =>
        item.type === "HERO"
    ).length;

  const tabClass = (
    tab: ContentTab
  ) =>
    `whitespace-nowrap rounded-full border px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.18em] transition ${
      activeTab === tab
        ? "border-white bg-white text-black"
        : "border-white/[0.08] bg-white/[0.025] text-zinc-500 hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
    }`;

  const inputClass =
    "mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3.5 text-xs text-white outline-none transition placeholder:text-zinc-700 focus:border-white/20 focus:bg-white/[0.04]";

  const secondaryButton =
    "rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 py-3 text-[8px] font-bold uppercase tracking-[0.18em] text-zinc-500 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white";

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-9">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="h-px w-8 bg-white/30" />

              <span className="text-[9px] font-medium uppercase tracking-[0.35em] text-zinc-500">
                NEWCLOTHES CONTROL
              </span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Contenidos
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
              Gestión de los elementos visuales
              y secciones editables de la tienda.
            </p>
          </div>

          {activeTab !==
            "ABOUT" && (
            <button
              type="button"
              onClick={openNew}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-400 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
            >
              + Nuevo contenido
            </button>
          )}
        </div>

        {/* =====================================================
            TABS
        ====================================================== */}

        <div className="mb-5">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              type="button"
              onClick={() =>
                setActiveTab("ALL")
              }
              className={tabClass(
                "ALL"
              )}
            >
              Todo
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab("HERO")
              }
              className={tabClass(
                "HERO"
              )}
            >
              Hero
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab("BANNER")
              }
              className={tabClass(
                "BANNER"
              )}
            >
              Banners
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab("ABOUT")
              }
              className={tabClass(
                "ABOUT"
              )}
            >
              About
            </button>
          </div>
        </div>

        {/* =====================================================
            ABOUT
        ====================================================== */}

        {activeTab ===
        "ABOUT" ? (
          <section className="rounded-[28px] border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6">

            <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                  Content Management
                </p>

                <h2 className="mt-2 text-lg font-semibold">
                  About / Quiénes somos
                </h2>

                <p className="mt-2 max-w-2xl text-[8px] leading-5 text-zinc-700">
                  Edita la sección que aparece
                  actualmente en la página principal.
                </p>
              </div>

              <div className="flex items-center gap-2 text-[8px] uppercase tracking-[0.15em] text-zinc-600">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    about.active
                      ? "bg-green-500/70"
                      : "bg-zinc-700"
                  }`}
                />

                {about.active
                  ? "Visible"
                  : "Oculto"}
              </div>
            </div>

            {aboutLoading ? (
              <div className="flex min-h-[420px] items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border border-white/10 border-t-white" />

                  <p className="mt-5 text-[8px] font-bold uppercase tracking-[0.25em] text-zinc-700">
                    Cargando About
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">

                  {/* IMAGE */}

                  <div className="rounded-[24px] border border-white/[0.07] bg-black/20 p-4 sm:p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                        Imagen principal
                      </p>

                      <span className="text-[7px] uppercase tracking-[0.15em] text-zinc-800">
                        4 : 5
                      </span>
                    </div>

                    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/[0.06] bg-black">
                      {about.image_url ? (
                        <img
                          src={
                            about.image_url
                          }
                          alt="About NEWCLOTHES"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <div className="text-center">
                            <p className="text-[11px] font-black tracking-[0.5em] text-zinc-800">
                              NEWCLOTHES
                            </p>

                            <p className="mt-3 text-[8px] uppercase tracking-[0.3em] text-zinc-800">
                              Sin imagen
                            </p>
                          </div>
                        </div>
                      )}

                      {aboutUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                          <div className="text-center">
                            <div className="mx-auto h-8 w-8 animate-spin rounded-full border border-white/10 border-t-white" />

                            <p className="mt-4 text-[8px] font-bold uppercase tracking-[0.25em] text-zinc-500">
                              Subiendo imagen
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <label className="flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-[8px] font-bold uppercase tracking-[0.18em] text-zinc-500 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white">
                        {about.image_url
                          ? "Cambiar imagen"
                          : "Subir imagen"}

                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={
                            handleAboutImageUpload
                          }
                          disabled={
                            aboutUploading
                          }
                          className="hidden"
                        />
                      </label>

                      {about.image_url && (
                        <button
                          type="button"
                          onClick={
                            removeAboutImage
                          }
                          disabled={
                            aboutUploading
                          }
                          className={secondaryButton}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>

                    <p className="mt-3 text-[7px] uppercase tracking-[0.12em] text-zinc-800">
                      JPG · PNG · WEBP · Máximo 10 MB
                    </p>
                  </div>

                  {/* TEXT CONTENT */}

                  <div className="rounded-[24px] border border-white/[0.07] bg-black/20 p-4 sm:p-5">
                    <div className="space-y-5">

                      <div>
                        <label className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                          Etiqueta
                        </label>

                        <input
                          value={
                            about.eyebrow
                          }
                          onChange={(e) =>
                            updateAboutField(
                              "eyebrow",
                              e.target.value
                            )
                          }
                          className={inputClass}
                          placeholder="QUIÉNES SOMOS"
                        />
                      </div>

                      <div>
                        <label className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                          Título principal
                        </label>

                        <input
                          value={
                            about.title
                          }
                          onChange={(e) =>
                            updateAboutField(
                              "title",
                              e.target.value
                            )
                          }
                          className={`${inputClass} font-semibold`}
                          placeholder="VISTE TU IDENTIDAD."
                        />
                      </div>

                      <div>
                        <label className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                          Frase destacada
                        </label>

                        <textarea
                          value={
                            about.intro
                          }
                          onChange={(e) =>
                            updateAboutField(
                              "intro",
                              e.target.value
                            )
                          }
                          rows={3}
                          className={`${inputClass} resize-none leading-6`}
                          placeholder="ROPA STREETWEAR TOTALMENTE PREMIUM. HECHA PARA TI."
                        />
                      </div>

                      <div>
                        <label className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                          Descripción de NEWCLOTHES
                        </label>

                        <textarea
                          value={
                            about.description
                          }
                          onChange={(e) =>
                            updateAboutField(
                              "description",
                              e.target.value
                            )
                          }
                          rows={6}
                          className={`${inputClass} resize-none leading-6`}
                          placeholder="Describe quiénes son..."
                        />
                      </div>

                      <div>
                        <label className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                          Ropa personalizada
                        </label>

                        <textarea
                          value={
                            about.custom_description
                          }
                          onChange={(e) =>
                            updateAboutField(
                              "custom_description",
                              e.target.value
                            )
                          }
                          rows={6}
                          className={`${inputClass} resize-none leading-6`}
                          placeholder="Explica el servicio de ropa personalizada..."
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <div>
                          <p className="text-[9px] font-medium text-zinc-400">
                            Publicación
                          </p>

                          <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-zinc-700">
                            Controla la visibilidad de About
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            updateAboutField(
                              "active",
                              !about.active
                            )
                          }
                          className={`relative h-6 w-11 rounded-full border transition ${
                            about.active
                              ? "border-white bg-white"
                              : "border-white/10 bg-black"
                          }`}
                        >
                          <span
                            className={`absolute top-1 h-4 w-4 rounded-full transition ${
                              about.active
                                ? "left-6 bg-black"
                                : "left-1 bg-zinc-700"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-4 border-t border-white/[0.05] pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-h-[18px]">
                    {aboutMessage && (
                      <p className="text-[8px] font-medium text-zinc-500">
                        {aboutMessage}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={
                      saveAbout
                    }
                    disabled={
                      aboutSaving ||
                      aboutUploading
                    }
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white px-6 text-[9px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {aboutSaving
                      ? "Guardando..."
                      : "Guardar About"}
                  </button>
                </div>
              </>
            )}
          </section>
        ) : (
          <>
            {/* ===================================================
                ANALYTICS
            ==================================================== */}

            <section className="mb-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                  Content Analytics
                </span>

                <div className="h-px flex-1 bg-white/[0.05]" />
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

                <ContentStat
                  label="Contenidos"
                  value={
                    content.length
                  }
                  detail="Elementos creados"
                  icon="◇"
                />

                <ContentStat
                  label="Activos"
                  value={
                    activeCount
                  }
                  detail="Visibles actualmente"
                  icon="●"
                />

                <ContentStat
                  label="Hero"
                  value={
                    featuredCount
                  }
                  detail="Slides principales"
                  icon="▧"
                />

                <ContentStat
                  label="Banners"
                  value={
                    content.filter(
                      (item) =>
                        item.type ===
                        "BANNER"
                    ).length
                  }
                  detail="Banners disponibles"
                  icon="▤"
                />

              </div>
            </section>

            {/* ===================================================
                FORM
            ==================================================== */}

            {showForm && (
              <section className="mb-5 rounded-[28px] border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6">

                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                      Content Editor
                    </p>

                    <h2 className="mt-2 text-lg font-semibold">
                      {editingId !== null
                        ? "Editar contenido"
                        : "Nuevo contenido"}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={
                      resetForm
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-lg text-zinc-600 transition hover:border-white/20 hover:text-white"
                  >
                    ×
                  </button>
                </div>

                <div className="grid gap-5 md:grid-cols-2">

                  <div>
                    <label className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                      Título
                    </label>

                    <input
                      value={title}
                      onChange={(e) =>
                        setTitle(
                          e.target.value
                        )
                      }
                      className={inputClass}
                      placeholder="THE LAST DANCE"
                    />
                  </div>

                  <div>
                    <label className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                      Subtítulo
                    </label>

                    <input
                      value={
                        subtitle
                      }
                      onChange={(e) =>
                        setSubtitle(
                          e.target.value
                        )
                      }
                      className={inputClass}
                      placeholder="LIMITED EDITION"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                      URL de imagen
                    </label>

                    <input
                      value={image}
                      onChange={(e) =>
                        setImage(
                          e.target.value
                        )
                      }
                      className={inputClass}
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                      Texto del botón
                    </label>

                    <input
                      value={
                        buttonText
                      }
                      onChange={(e) =>
                        setButtonText(
                          e.target.value
                        )
                      }
                      className={inputClass}
                      placeholder="VER PRODUCTOS"
                    />
                  </div>

                  <div>
                    <label className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                      Tipo
                    </label>

                    <select
                      value={type}
                      onChange={(e) =>
                        setType(
                          e.target
                            .value as ContentItem["type"]
                        )
                      }
                      className={inputClass}
                    >
                      <option value="HERO">
                        HERO PRINCIPAL
                      </option>

                      <option value="BANNER">
                        BANNER
                      </option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                      <input
                        type="checkbox"
                        checked={
                          active
                        }
                        onChange={(e) =>
                          setActive(
                            e.target
                              .checked
                          )
                        }
                        className="h-4 w-4"
                      />

                      <span className="text-[9px] font-medium text-zinc-500">
                        Mostrar este contenido en la web
                      </span>
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex flex-col justify-end gap-2 border-t border-white/[0.05] pt-5 sm:flex-row">
                  <button
                    type="button"
                    onClick={
                      resetForm
                    }
                    className={secondaryButton}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={
                      saveContent
                    }
                    className="rounded-xl bg-white px-7 py-3 text-[8px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-zinc-200"
                  >
                    Guardar contenido
                  </button>
                </div>
              </section>
            )}

            {/* ===================================================
                CONTENT LIST
            ==================================================== */}

            <section className="rounded-[28px] border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6">

              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[8px] uppercase tracking-[0.25em] text-zinc-700">
                    Content Library
                  </p>

                  <h2 className="mt-2 text-lg font-semibold">
                    {activeTab ===
                    "ALL"
                      ? "Todos los contenidos"
                      : activeTab ===
                        "HERO"
                      ? "Hero principal"
                      : "Banners"}
                  </h2>
                </div>

                <span className="text-[8px] uppercase tracking-[0.15em] text-zinc-700">
                  {
                    filteredContent.length
                  } elementos
                </span>
              </div>

              {filteredContent.length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.07] bg-black/20 px-5 py-12 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.07] text-sm text-zinc-700">
                    ◇
                  </div>

                  <p className="text-[10px] font-medium text-zinc-500">
                    Sin contenido
                  </p>

                  <p className="mx-auto mt-2 max-w-xs text-[8px] leading-5 text-zinc-700">
                    No hay elementos en esta categoría.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredContent.map(
                    (item) => (
                      <ContentRow
                        key={
                          item.id
                        }
                        item={
                          item
                        }
                        onToggle={() =>
                          toggleActive(
                            item.id
                          )
                        }
                        onEdit={() =>
                          editContent(
                            item
                          )
                        }
                        onDelete={() =>
                          deleteContent(
                            item.id
                          )
                        }
                      />
                    )
                  )}
                </div>
              )}
            </section>

            {/* ===================================================
                FOOTER
            ==================================================== */}

            <div className="mt-10 flex flex-col gap-2 border-t border-white/[0.05] pt-5 text-[8px] uppercase tracking-[0.25em] text-zinc-700 sm:flex-row sm:items-center sm:justify-between">
              <span>
                NEWCLOTHES® ADMIN SYSTEM
              </span>

              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500/70" />
                Content Management
              </span>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

/* =========================================================
   CONTENT STAT
========================================================= */

function ContentStat({
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
   CONTENT ROW
========================================================= */

function ContentRow({
  item,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: ContentItem;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-black/20 p-3 transition hover:border-white/[0.09] hover:bg-white/[0.02]">

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">

        {/* IMAGE */}

        <div className="h-28 w-full shrink-0 overflow-hidden rounded-xl border border-white/[0.06] bg-black sm:h-32 lg:h-20 lg:w-32">
          {item.image ? (
            <img
              src={item.image}
              alt={item.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-[8px] uppercase tracking-[0.15em] text-zinc-800">
                Sin imagen
              </span>
            </div>
          )}
        </div>

        {/* INFO */}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[10px] font-medium text-zinc-300">
              {item.title}
            </p>

            <span className="rounded-full border border-white/[0.06] px-2 py-1 text-[6px] font-semibold uppercase tracking-[0.1em] text-zinc-700">
              {item.type}
            </span>

            <span className="flex items-center gap-1 rounded-full border border-white/[0.06] px-2 py-1 text-[6px] font-semibold uppercase tracking-[0.1em] text-zinc-700">
              <span
                className={`h-1 w-1 rounded-full ${
                  item.active
                    ? "bg-green-500/70"
                    : "bg-zinc-700"
                }`}
              />

              {item.active
                ? "Activo"
                : "Oculto"}
            </span>
          </div>

          <p className="mt-1 text-[8px] text-zinc-700">
            {item.subtitle ||
              "Sin subtítulo"}
          </p>

          <p className="mt-2 text-[7px] uppercase tracking-[0.12em] text-zinc-800">
            Botón:{" "}
            {item.buttonText ||
              "Sin botón"}
          </p>
        </div>

        {/* ACTIONS */}

        <div className="grid grid-cols-3 gap-2 lg:flex lg:shrink-0">
          <button
            type="button"
            onClick={
              onToggle
            }
            className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-[7px] font-semibold uppercase tracking-[0.1em] text-zinc-600 transition hover:border-white/15 hover:text-white"
          >
            {item.active
              ? "Ocultar"
              : "Mostrar"}
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-[7px] font-semibold uppercase tracking-[0.1em] text-zinc-600 transition hover:border-white/15 hover:text-white"
          >
            Editar
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-[7px] font-semibold uppercase tracking-[0.1em] text-zinc-600 transition hover:border-white/15 hover:text-white"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}