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

type ContentTab =
  | "ALL"
  | "HERO"
  | "BANNER"
  | "ABOUT";

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
  intro:
    "ROPA STREETWEAR TOTALMENTE PREMIUM. HECHA PARA TI.",
  description:
    "En NEWCLOTHES creamos y seleccionamos prendas streetwear premium para quienes buscan vestir diferente. Nos enfocamos en diseños con carácter, calidad y una estética que se adapta a cada persona.",
  custom_description:
    "También hacemos ropa personalizada, llevando tus ideas a prendas creadas totalmente a tu estilo. Tú imaginas el diseño. Nosotros lo convertimos en una pieza que representa quién eres.",
  active: true,
};

export default function ContentPage() {
  const supabase = useMemo(() => createClient(), []);

  /*
  |--------------------------------------------------------------------------
  | CONTENT STATE
  |--------------------------------------------------------------------------
  */

  const [content, setContent] =
    useState<ContentItem[]>(initialContent);

  const [activeTab, setActiveTab] =
    useState<ContentTab>("ALL");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [image, setImage] = useState("");
  const [buttonText, setButtonText] = useState("");

  const [type, setType] =
    useState<ContentItem["type"]>("BANNER");

  const [active, setActive] = useState(true);

  /*
  |--------------------------------------------------------------------------
  | ABOUT STATE
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | LOAD ABOUT
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const loadAbout = async () => {
      setAboutLoading(true);
      setAboutMessage("");

      const { data, error } = await supabase
        .from("about_content")
        .select(`
          id,
          image_url,
          eyebrow,
          title,
          intro,
          description,
          custom_description,
          active
        `)
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
  }, [supabase]);

  /*
  |--------------------------------------------------------------------------
  | CONTENT FUNCTIONS
  |--------------------------------------------------------------------------
  */

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
                title,
                subtitle,
                image,
                buttonText,
                type,
                active,
              }
            : item
        )
      );
    } else {
      const newItem: ContentItem = {
        id: Date.now(),
        title,
        subtitle,
        image,
        buttonText,
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

  const deleteContent = (id: number) => {
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

  const toggleActive = (id: number) => {
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

  /*
  |--------------------------------------------------------------------------
  | FILTERED CONTENT
  |--------------------------------------------------------------------------
  */

  const filteredContent = content.filter(
    (item) => {
      if (activeTab === "ALL") {
        return true;
      }

      if (activeTab === "ABOUT") {
        return false;
      }

      return item.type === activeTab;
    }
  );

  /*
  |--------------------------------------------------------------------------
  | ABOUT FUNCTIONS
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | UPLOAD ABOUT IMAGE
  |--------------------------------------------------------------------------
  */

  const handleAboutImageUpload = async (
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
        !file.type.startsWith("image/")
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
          ?.toLowerCase() || "jpg";

      const fileName =
        `about-${Date.now()}.${extension}`;

      const { error: uploadError } =
        await supabase.storage
          .from("about")
          .upload(
            fileName,
            file,
            {
              cacheControl: "3600",
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
        .getPublicUrl(fileName);

      const publicUrl =
        publicUrlData.publicUrl;

      setAbout((current) => ({
        ...current,
        image_url: publicUrl,
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

  /*
  |--------------------------------------------------------------------------
  | REMOVE ABOUT IMAGE
  |--------------------------------------------------------------------------
  */

  const removeAboutImage = async () => {
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
          const { error } =
            await supabase.storage
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

  /*
  |--------------------------------------------------------------------------
  | SAVE ABOUT
  |--------------------------------------------------------------------------
  */

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
            .from("about_content")
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
            .from("about_content")
            .insert(
              payload
            )
            .select()
            .single();

        error =
          response.error;

        if (response.data) {
          setAbout(
            (current) => ({
              ...current,
              id:
                response.data.id,
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

  /*
  |--------------------------------------------------------------------------
  | STATS
  |--------------------------------------------------------------------------
  */

  const activeCount =
    content.filter(
      (item) => item.active
    ).length;

  const featuredCount =
    content.filter(
      (item) => item.type === "HERO"
    ).length;

  /*
  |--------------------------------------------------------------------------
  | TAB BUTTON
  |--------------------------------------------------------------------------
  */

  const tabClass = (
    tab: ContentTab
  ) =>
    `whitespace-nowrap rounded-full border px-5 py-2.5 text-[9px] font-black tracking-[0.18em] transition ${
      activeTab === tab
        ? "border-white bg-white text-black"
        : "border-white/10 bg-black text-white/40 hover:border-white/30 hover:text-white"
    }`;

  /*
  |--------------------------------------------------------------------------
  | INPUT CLASS
  |--------------------------------------------------------------------------
  */

  const inputClass =
    "mt-2 w-full rounded-xl border border-white/10 bg-[#090909] px-4 py-3.5 text-xs text-white outline-none transition placeholder:text-white/15 focus:border-white/30";

  const buttonSecondaryClass =
    "rounded-xl border border-white/10 px-5 py-3 text-[8px] font-black tracking-[0.18em] text-white/40 transition hover:border-white/30 hover:bg-white/[0.04] hover:text-white";

  return (
    <main className="min-h-screen bg-[#050505] text-white">

      {/* HEADER */}

      <header className="sticky top-0 z-40 flex min-h-[76px] items-center justify-between border-b border-white/10 bg-black/95 px-5 backdrop-blur-xl md:px-8">

        <div>
          <h1 className="text-lg font-black tracking-[0.25em] md:text-xl">
            NEWCLOTHES
          </h1>

          <p className="mt-1 text-[8px] font-bold tracking-[0.35em] text-white/30">
            ADMINISTRATION
          </p>
        </div>

        <button
          onClick={() =>
            (window.location.href =
              "/admin/login")
          }
          className="rounded-xl border border-white/10 px-4 py-2.5 text-[8px] font-black tracking-[0.18em] text-white/50 transition hover:border-white/30 hover:bg-white hover:text-black md:px-5"
        >
          CERRAR SESIÓN
        </button>

      </header>

      <div className="flex min-h-[calc(100vh-76px)]">

        {/* SIDEBAR */}

        <aside className="hidden w-60 shrink-0 border-r border-white/10 bg-[#080808] p-5 lg:block">

          <div className="mb-7 rounded-2xl border border-white/10 bg-white/[0.02] p-5">

            <p className="text-[8px] font-black tracking-[0.35em] text-white/25">
              CONTROL PANEL
            </p>

            <p className="mt-2 text-xs font-semibold text-white/70">
              Gestión de tienda
            </p>

          </div>

          <p className="mb-4 px-3 text-[8px] font-black tracking-[0.3em] text-white/25">
            ADMIN
          </p>

          <nav className="space-y-1.5">

            <a
              href="/admin/dashboard"
              className="block rounded-xl border border-transparent px-3 py-3 text-xs font-medium text-white/45 transition hover:bg-white/5 hover:text-white"
            >
              Dashboard
            </a>

            <a
              href="/admin/products"
              className="block rounded-xl border border-transparent px-3 py-3 text-xs font-medium text-white/45 transition hover:bg-white/5 hover:text-white"
            >
              Productos
            </a>

            <a
              href="/admin/inventory"
              className="block rounded-xl border border-transparent px-3 py-3 text-xs font-medium text-white/45 transition hover:bg-white/5 hover:text-white"
            >
              Inventario
            </a>

            <a
              href="/admin/content"
              className="block rounded-xl border border-white/10 bg-white/[0.07] px-3 py-3 text-xs font-semibold text-white"
            >
              Contenido
            </a>

            <a
              href="/admin/drops"
              className="block rounded-xl border border-transparent px-3 py-3 text-xs font-medium text-white/45 transition hover:bg-white/5 hover:text-white"
            >
              Drops
            </a>

            <a
              href="/admin/offers"
              className="block rounded-xl border border-transparent px-3 py-3 text-xs font-medium text-white/45 transition hover:bg-white/5 hover:text-white"
            >
              Ofertas
            </a>

            <a
              href="/admin/sales"
              className="block rounded-xl border border-transparent px-3 py-3 text-xs font-medium text-white/45 transition hover:bg-white/5 hover:text-white"
            >
              Ventas
            </a>

          </nav>

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-4">

            <p className="px-1 text-[8px] font-black tracking-[0.3em] text-white/20">
              WEB
            </p>

            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="mt-2 block rounded-xl px-2 py-3 text-xs font-medium text-white/45 transition hover:bg-white/5 hover:text-white"
            >
              Ver tienda ↗
            </a>

          </div>

        </aside>

        {/* MAIN */}

        <section className="min-w-0 flex-1">

          <div className="mx-auto max-w-[1600px] px-5 py-7 md:px-8 md:py-10">

            {/* PAGE HEADER */}

            <div className="flex flex-col gap-6 border-b border-white/10 pb-7 xl:flex-row xl:items-end xl:justify-between">

              <div>

                <p className="text-[8px] font-black tracking-[0.4em] text-white/25">
                  01 / CONTENIDO
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] md:text-5xl">
                  Contenido
                </h2>

                <p className="mt-3 max-w-xl text-xs leading-6 text-white/35 md:text-sm">
                  Administra los elementos
                  visuales y las secciones
                  editables de NEWCLOTHES.
                </p>

              </div>

              {activeTab !== "ABOUT" && (
                <button
                  onClick={openNew}
                  className="w-full rounded-xl bg-white px-6 py-3.5 text-[9px] font-black tracking-[0.18em] text-black transition hover:bg-white/85 sm:w-auto"
                >
                  + NUEVO CONTENIDO
                </button>
              )}

            </div>

            {/* MOBILE NAV */}

            <div className="mt-6 overflow-x-auto pb-1 lg:hidden">

              <div className="flex min-w-max gap-2">

                <a
                  href="/admin/dashboard"
                  className="rounded-full border border-white/10 px-4 py-2.5 text-[9px] font-black tracking-[0.15em] text-white/40"
                >
                  DASHBOARD
                </a>

                <a
                  href="/admin/products"
                  className="rounded-full border border-white/10 px-4 py-2.5 text-[9px] font-black tracking-[0.15em] text-white/40"
                >
                  PRODUCTOS
                </a>

                <a
                  href="/admin/inventory"
                  className="rounded-full border border-white/10 px-4 py-2.5 text-[9px] font-black tracking-[0.15em] text-white/40"
                >
                  INVENTARIO
                </a>

                <a
                  href="/admin/drops"
                  className="rounded-full border border-white/10 px-4 py-2.5 text-[9px] font-black tracking-[0.15em] text-white/40"
                >
                  DROPS
                </a>

              </div>

            </div>

            {/* CONTENT TABS */}

            <div className="mt-8">

              <div className="flex gap-2 overflow-x-auto pb-2">

                <button
                  onClick={() =>
                    setActiveTab("ALL")
                  }
                  className={tabClass("ALL")}
                >
                  TODO
                </button>

                <button
                  onClick={() =>
                    setActiveTab("HERO")
                  }
                  className={tabClass("HERO")}
                >
                  HERO
                </button>

                <button
                  onClick={() =>
                    setActiveTab("BANNER")
                  }
                  className={tabClass("BANNER")}
                >
                  BANNERS
                </button>

                <button
                  onClick={() =>
                    setActiveTab("ABOUT")
                  }
                  className={tabClass("ABOUT")}
                >
                  ABOUT
                </button>

              </div>

            </div>

            {/* ABOUT */}

            {activeTab === "ABOUT" ? (

              <div className="mt-7 rounded-2xl border border-white/10 bg-[#080808] p-5 md:p-7">

                <div className="border-b border-white/10 pb-6">

                  <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

                    <div>

                      <p className="text-[8px] font-black tracking-[0.4em] text-white/25">
                        SECCIÓN EDITABLE
                      </p>

                      <h3 className="mt-3 text-2xl font-black tracking-[-0.03em] md:text-4xl">
                        About / Quiénes somos
                      </h3>

                      <p className="mt-2 max-w-2xl text-xs leading-6 text-white/35">
                        Edita la imagen y el contenido
                        que aparece en la sección
                        About de la página principal.
                      </p>

                    </div>

                    <div
                      className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-[8px] font-black tracking-[0.18em] ${
                        about.active
                          ? "border-white/20 text-white/60"
                          : "border-white/10 text-white/25"
                      }`}
                    >

                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          about.active
                            ? "bg-white"
                            : "bg-white/20"
                        }`}
                      />

                      {about.active
                        ? "VISIBLE EN LA WEB"
                        : "OCULTO"}

                    </div>

                  </div>

                </div>

                {aboutLoading ? (

                  <div className="flex min-h-[500px] items-center justify-center">

                    <div className="text-center">

                      <div className="mx-auto h-8 w-8 animate-spin rounded-full border border-white/10 border-t-white" />

                      <p className="mt-5 text-[8px] font-black tracking-[0.3em] text-white/25">
                        CARGANDO ABOUT
                      </p>

                    </div>

                  </div>

                ) : (

                  <div className="mt-7">

                    <div className="grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">

                      {/* IMAGE */}

                      <div>

                        <div className="mb-3 flex items-center justify-between">

                          <label className="text-[8px] font-black tracking-[0.25em] text-white/35">
                            IMAGEN PRINCIPAL
                          </label>

                          <span className="text-[8px] tracking-[0.15em] text-white/20">
                            4 : 5
                          </span>

                        </div>

                        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 bg-[#090909]">

                          {about.image_url ? (

                            <img
                              src={
                                about.image_url
                              }
                              alt="About NEWCLOTHES"
                              className="h-full w-full object-cover"
                            />

                          ) : (

                            <div className="absolute inset-0 flex items-center justify-center">

                              <div className="text-center">

                                <p className="text-[11px] font-black tracking-[0.5em] text-white/15">
                                  NEWCLOTHES
                                </p>

                                <p className="mt-3 text-[8px] font-bold tracking-[0.3em] text-white/10">
                                  SIN IMAGEN
                                </p>

                              </div>

                            </div>

                          )}

                          {aboutUploading && (

                            <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">

                              <div className="text-center">

                                <div className="mx-auto h-8 w-8 animate-spin rounded-full border border-white/10 border-t-white" />

                                <p className="mt-4 text-[8px] font-black tracking-[0.25em] text-white/60">
                                  SUBIENDO IMAGEN
                                </p>

                              </div>

                            </div>

                          )}

                        </div>

                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">

                          <label className="flex cursor-pointer items-center justify-center rounded-xl bg-white px-5 py-3 text-[8px] font-black tracking-[0.18em] text-black transition hover:bg-white/85">

                            {about.image_url
                              ? "CAMBIAR IMAGEN"
                              : "SUBIR IMAGEN"}

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
                              className={buttonSecondaryClass}
                            >
                              ELIMINAR
                            </button>

                          )}

                        </div>

                        <p className="mt-3 text-[8px] leading-5 text-white/20">
                          JPG, PNG o WEBP · Máximo
                          10 MB
                        </p>

                      </div>

                      {/* TEXT */}

                      <div className="min-w-0">

                        <div className="grid gap-6">

                          <div>

                            <label className="text-[8px] font-black tracking-[0.25em] text-white/35">
                              ETIQUETA
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
                              placeholder="QUIÉNES SOMOS"
                              className={inputClass}
                            />

                          </div>

                          <div>

                            <label className="text-[8px] font-black tracking-[0.25em] text-white/35">
                              TÍTULO PRINCIPAL
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
                              placeholder="VISTE TU IDENTIDAD."
                              className={`${inputClass} font-bold`}
                            />

                          </div>

                          <div>

                            <div className="flex items-center justify-between">

                              <label className="text-[8px] font-black tracking-[0.25em] text-white/35">
                                FRASE DESTACADA
                              </label>

                              <span className="text-[8px] text-white/15">
                                TEXTO CORTO
                              </span>

                            </div>

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
                              placeholder="ROPA STREETWEAR TOTALMENTE PREMIUM. HECHA PARA TI."
                              className={`${inputClass} resize-none leading-6`}
                            />

                          </div>

                          <div>

                            <label className="text-[8px] font-black tracking-[0.25em] text-white/35">
                              DESCRIPCIÓN DE NEWCLOTHES
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
                              placeholder="Describe quiénes son..."
                              className={`${inputClass} resize-none leading-6`}
                            />

                          </div>

                          <div>

                            <label className="text-[8px] font-black tracking-[0.25em] text-white/35">
                              ROPA PERSONALIZADA
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
                              placeholder="Explica el servicio de ropa personalizada..."
                              className={`${inputClass} resize-none leading-6`}
                            />

                          </div>

                          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4">

                            <div>

                              <p className="text-[9px] font-black tracking-[0.18em] text-white/70">
                                PUBLICACIÓN
                              </p>

                              <p className="mt-1 text-[8px] text-white/25">
                                Controla si About aparece
                                en la página.
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
                                  : "border-white/20 bg-black"
                              }`}
                              aria-label="Cambiar visibilidad de About"
                            >

                              <span
                                className={`absolute top-1 h-4 w-4 rounded-full transition ${
                                  about.active
                                    ? "left-6 bg-black"
                                    : "left-1 bg-white/30"
                                }`}
                              />

                            </button>

                          </div>

                        </div>

                      </div>

                    </div>

                    <div className="mt-8 flex flex-col gap-5 border-t border-white/10 pt-6 md:flex-row md:items-center md:justify-between">

                      <div className="min-h-[18px]">

                        {aboutMessage && (

                          <p
                            className={`text-[8px] font-bold tracking-[0.12em] ${
                              aboutMessage.startsWith(
                                "✓"
                              )
                                ? "text-white/70"
                                : "text-white/40"
                            }`}
                          >
                            {aboutMessage}
                          </p>

                        )}

                      </div>

                      <button
                        type="button"
                        onClick={saveAbout}
                        disabled={
                          aboutSaving ||
                          aboutUploading
                        }
                        className="rounded-xl bg-white px-8 py-3.5 text-[8px] font-black tracking-[0.2em] text-black transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {aboutSaving
                          ? "GUARDANDO..."
                          : "GUARDAR ABOUT"}
                      </button>

                    </div>

                  </div>

                )}

              </div>

            ) : (

              /* CONTENT AREA */

              <div className="mt-7">

                {/* STATS */}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

                  <div className="rounded-2xl border border-white/10 bg-[#080808] p-5 md:p-6">

                    <p className="text-[8px] font-black tracking-[0.25em] text-white/25">
                      CONTENIDOS
                    </p>

                    <p className="mt-3 text-3xl font-black tracking-tight">
                      {content.length}
                    </p>

                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#080808] p-5 md:p-6">

                    <p className="text-[8px] font-black tracking-[0.25em] text-white/25">
                      ACTIVOS
                    </p>

                    <p className="mt-3 text-3xl font-black tracking-tight">
                      {activeCount}
                    </p>

                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#080808] p-5 md:p-6">

                    <p className="text-[8px] font-black tracking-[0.25em] text-white/25">
                      HERO
                    </p>

                    <p className="mt-3 text-3xl font-black tracking-tight">
                      {featuredCount}
                    </p>

                  </div>

                </div>

                {/* FORM */}

                {showForm && (

                  <div className="mt-7 overflow-hidden rounded-2xl border border-white/10 bg-[#080808]">

                    <div className="flex items-center justify-between border-b border-white/10 px-5 py-5 md:px-7">

                      <div>

                        <p className="text-[8px] font-black tracking-[0.3em] text-white/25">
                          {editingId !== null
                            ? "EDITAR CONTENIDO"
                            : "NUEVO CONTENIDO"}
                        </p>

                        <h3 className="mt-2 text-xl font-black">
                          {editingId !== null
                            ? "Editar elemento"
                            : "Crear elemento"}
                        </h3>

                      </div>

                      <button
                        onClick={
                          resetForm
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-lg text-white/30 transition hover:border-white/30 hover:bg-white hover:text-black"
                      >
                        ×
                      </button>

                    </div>

                    <div className="p-5 md:p-7">

                      <div className="grid gap-5 md:grid-cols-2">

                        <div>

                          <label className="text-[8px] font-black tracking-[0.25em] text-white/35">
                            TÍTULO
                          </label>

                          <input
                            value={title}
                            onChange={(e) =>
                              setTitle(
                                e.target.value
                              )
                            }
                            placeholder="THE LAST DANCE"
                            className={inputClass}
                          />

                        </div>

                        <div>

                          <label className="text-[8px] font-black tracking-[0.25em] text-white/35">
                            SUBTÍTULO
                          </label>

                          <input
                            value={subtitle}
                            onChange={(e) =>
                              setSubtitle(
                                e.target.value
                              )
                            }
                            placeholder="LIMITED EDITION"
                            className={inputClass}
                          />

                        </div>

                        <div className="md:col-span-2">

                          <label className="text-[8px] font-black tracking-[0.25em] text-white/35">
                            URL DE IMAGEN
                          </label>

                          <input
                            value={image}
                            onChange={(e) =>
                              setImage(
                                e.target.value
                              )
                            }
                            placeholder="https://..."
                            className={inputClass}
                          />

                        </div>

                        <div>

                          <label className="text-[8px] font-black tracking-[0.25em] text-white/35">
                            TEXTO DEL BOTÓN
                          </label>

                          <input
                            value={buttonText}
                            onChange={(e) =>
                              setButtonText(
                                e.target.value
                              )
                            }
                            placeholder="VER PRODUCTOS"
                            className={inputClass}
                          />

                        </div>

                        <div>

                          <label className="text-[8px] font-black tracking-[0.25em] text-white/35">
                            TIPO
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

                        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4 md:col-span-2">

                          <input
                            id="content-active"
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
                            className="h-4 w-4 rounded"
                          />

                          <label
                            htmlFor="content-active"
                            className="text-xs text-white/60"
                          >
                            Mostrar este contenido
                            en la web
                          </label>

                        </div>

                      </div>

                      <div className="mt-7 flex flex-col justify-end gap-2 border-t border-white/10 pt-6 sm:flex-row">

                        <button
                          onClick={
                            resetForm
                          }
                          className={buttonSecondaryClass}
                        >
                          CANCELAR
                        </button>

                        <button
                          onClick={
                            saveContent
                          }
                          className="rounded-xl bg-white px-7 py-3 text-[8px] font-black tracking-[0.18em] text-black transition hover:bg-white/85"
                        >
                          GUARDAR CONTENIDO
                        </button>

                      </div>

                    </div>

                  </div>

                )}

                {/* CONTENT LIST */}

                <div className="mt-7 overflow-hidden rounded-2xl border border-white/10 bg-[#080808]">

                  <div className="flex items-center justify-between border-b border-white/10 px-5 py-5 md:px-7">

                    <div>

                      <p className="text-[8px] font-black tracking-[0.3em] text-white/25">
                        ELEMENTOS VISUALES
                      </p>

                      <h3 className="mt-2 text-lg font-black">
                        {activeTab === "ALL"
                          ? "Todos los contenidos"
                          : activeTab === "HERO"
                          ? "Hero principal"
                          : "Banners"}
                      </h3>

                    </div>

                    <span className="text-[8px] font-black tracking-[0.15em] text-white/20">
                      {filteredContent.length}{" "}
                      ELEMENTOS
                    </span>

                  </div>

                  {filteredContent.length ===
                  0 ? (

                    <div className="flex min-h-[250px] items-center justify-center">

                      <div className="text-center">

                        <p className="text-[9px] font-black tracking-[0.3em] text-white/20">
                          SIN CONTENIDO
                        </p>

                        <p className="mt-3 text-xs text-white/20">
                          No hay elementos en
                          esta categoría.
                        </p>

                      </div>

                    </div>

                  ) : (

                    <div className="divide-y divide-white/10">

                      {filteredContent.map(
                        (item) => (

                          <div
                            key={item.id}
                            className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:p-7"
                          >

                            {/* IMAGE */}

                            <div className="h-40 w-full shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#050505] md:h-24 md:w-40">

                              {item.image ? (

                                <img
                                  src={
                                    item.image
                                  }
                                  alt={
                                    item.title
                                  }
                                  className="h-full w-full object-cover"
                                />

                              ) : (

                                <div className="flex h-full items-center justify-center">

                                  <span className="text-[8px] font-black tracking-[0.2em] text-white/15">
                                    SIN IMAGEN
                                  </span>

                                </div>

                              )}

                            </div>

                            {/* INFO */}

                            <div className="min-w-0 flex-1">

                              <div className="flex flex-wrap items-center gap-2">

                                <h3 className="text-sm font-black tracking-wide">
                                  {
                                    item.title
                                  }
                                </h3>

                                <span className="rounded-full border border-white/10 px-2 py-1 text-[7px] font-black tracking-[0.15em] text-white/35">
                                  {
                                    item.type
                                  }
                                </span>

                                <span
                                  className={`rounded-full border px-2 py-1 text-[7px] font-black tracking-[0.15em] ${
                                    item.active
                                      ? "border-white/20 text-white/60"
                                      : "border-white/10 text-white/20"
                                  }`}
                                >
                                  {item.active
                                    ? "ACTIVO"
                                    : "OCULTO"}
                                </span>

                              </div>

                              <p className="mt-2 text-xs text-white/35">
                                {
                                  item.subtitle
                                }
                              </p>

                              <p className="mt-3 text-[8px] tracking-[0.15em] text-white/20">
                                BOTÓN:{" "}
                                {item.buttonText ||
                                  "SIN BOTÓN"}
                              </p>

                            </div>

                            {/* ACTIONS */}

                            <div className="flex flex-wrap gap-2">

                              <button
                                onClick={() =>
                                  toggleActive(
                                    item.id
                                  )
                                }
                                className={buttonSecondaryClass}
                              >
                                {item.active
                                  ? "OCULTAR"
                                  : "MOSTRAR"}
                              </button>

                              <button
                                onClick={() =>
                                  editContent(
                                    item
                                  )
                                }
                                className={buttonSecondaryClass}
                              >
                                EDITAR
                              </button>

                              <button
                                onClick={() =>
                                  deleteContent(
                                    item.id
                                  )
                                }
                                className={buttonSecondaryClass}
                              >
                                ELIMINAR
                              </button>

                            </div>

                          </div>

                        )
                      )}

                    </div>

                  )}

                </div>

              </div>

            )}

          </div>

        </section>

      </div>

    </main>
  );
}