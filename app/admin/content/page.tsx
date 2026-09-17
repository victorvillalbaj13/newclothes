"use client";

import { useState } from "react";

type ContentItem = {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  buttonText: string;
  type: "HERO" | "BANNER" | "CAMPAÑA" | "DROP";
  active: boolean;
};

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
  {
    id: 3,
    title: "STREETWEAR",
    subtitle: "WEAR YOUR STORY",
    image: "",
    buttonText: "DESCUBRIR",
    type: "CAMPAÑA",
    active: true,
  },
  {
    id: 4,
    title: "LIMITED DROP",
    subtitle: "ONLY FOR A FEW",
    image: "",
    buttonText: "VER DROP",
    type: "DROP",
    active: false,
  },
];

export default function ContentPage() {
  const [content, setContent] =
    useState<ContentItem[]>(initialContent);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [image, setImage] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [type, setType] =
    useState<ContentItem["type"]>("BANNER");
  const [active, setActive] = useState(true);

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

  const editContent = (item: ContentItem) => {
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

      setContent((current) => [newItem, ...current]);
    }

    resetForm();
  };

  const deleteContent = (id: number) => {
    if (!window.confirm("¿Eliminar este contenido?")) return;

    setContent((current) =>
      current.filter((item) => item.id !== id)
    );
  };

  const toggleActive = (id: number) => {
    setContent((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, active: !item.active }
          : item
      )
    );
  };

  return (
    <main className="min-h-screen bg-[#070707] text-white">

      {/* HEADER */}
      <header className="h-20 border-b border-white/10 bg-black flex items-center justify-between px-8">

        <div>
          <h1 className="text-xl font-bold tracking-[0.25em]">
            NEWCLOTHES
          </h1>

          <p className="text-[10px] tracking-[0.3em] text-white/40 mt-1">
            ADMINISTRATION
          </p>
        </div>

        <button
          onClick={() =>
            (window.location.href = "/admin/login")
          }
          className="border border-white/20 px-5 py-2 text-xs tracking-widest hover:bg-white hover:text-black transition"
        >
          CERRAR SESIÓN
        </button>

      </header>


      <div className="flex min-h-[calc(100vh-80px)]">

        {/* SIDEBAR */}
        <aside className="w-64 border-r border-white/10 bg-[#090909] p-6">

          <p className="text-[10px] text-white/30 tracking-[0.3em] mb-5">
            ADMIN
          </p>

          <nav className="space-y-1">

            <a
              href="/admin/dashboard"
              className="block px-4 py-3 text-sm text-white/50 hover:text-white hover:bg-white/5 transition"
            >
              Dashboard
            </a>

            <a
              href="/admin/products"
              className="block px-4 py-3 text-sm text-white/50 hover:text-white hover:bg-white/5 transition"
            >
              Productos
            </a>

            <a
              href="/admin/inventory"
              className="block px-4 py-3 text-sm text-white/50 hover:text-white hover:bg-white/5 transition"
            >
              Inventario
            </a>

            <a
              href="/admin/content"
              className="block px-4 py-3 text-sm bg-white/10 text-white border-l-2 border-white"
            >
              Contenido / Banners
            </a>

            <button className="w-full text-left px-4 py-3 text-sm text-white/50 hover:text-white hover:bg-white/5 transition">
              Secciones de la web
            </button>

            <button className="w-full text-left px-4 py-3 text-sm text-white/50 hover:text-white hover:bg-white/5 transition">
              Estadísticas
            </button>

            <button className="w-full text-left px-4 py-3 text-sm text-white/50 hover:text-white hover:bg-white/5 transition">
              Usuarios
            </button>

            <button className="w-full text-left px-4 py-3 text-sm text-white/50 hover:text-white hover:bg-white/5 transition">
              Configuración
            </button>

          </nav>

        </aside>


        {/* MAIN */}
        <section className="flex-1 p-10">

          {/* TITLE */}
          <div className="flex items-end justify-between mb-10">

            <div>

              <p className="text-[10px] tracking-[0.3em] text-white/30 mb-3">
                CONTENIDO VISUAL
              </p>

              <h2 className="text-4xl font-bold tracking-tight">
                Contenido / Banners
              </h2>

              <p className="text-sm text-white/40 mt-2">
                Controla los elementos visuales que aparecen en
                la web.
              </p>

            </div>


            <button
              onClick={openNew}
              className="bg-white text-black px-6 py-3 text-xs font-bold tracking-[0.15em] hover:bg-white/80 transition"
            >
              + NUEVO CONTENIDO
            </button>

          </div>


          {/* STATS */}
          <div className="grid grid-cols-3 gap-5 mb-10">

            <div className="border border-white/10 bg-[#0c0c0c] p-6">

              <p className="text-[10px] tracking-[0.25em] text-white/30">
                CONTENIDOS
              </p>

              <p className="text-3xl font-semibold mt-3">
                {content.length}
              </p>

            </div>


            <div className="border border-white/10 bg-[#0c0c0c] p-6">

              <p className="text-[10px] tracking-[0.25em] text-white/30">
                ACTIVOS
              </p>

              <p className="text-3xl font-semibold mt-3">
                {
                  content.filter((item) => item.active)
                    .length
                }
              </p>

            </div>


            <div className="border border-white/10 bg-[#0c0c0c] p-6">

              <p className="text-[10px] tracking-[0.25em] text-white/30">
                DESTACADOS
              </p>

              <p className="text-3xl font-semibold mt-3">
                {
                  content.filter(
                    (item) =>
                      item.type === "HERO" ||
                      item.type === "DROP"
                  ).length
                }
              </p>

            </div>

          </div>


          {/* FORM */}
          {showForm && (

            <div className="border border-white/10 bg-[#0b0b0b] p-8 mb-8">

              <div className="flex justify-between items-center mb-8">

                <div>

                  <p className="text-[10px] tracking-[0.25em] text-white/30">
                    {editingId !== null
                      ? "EDITAR CONTENIDO"
                      : "NUEVO CONTENIDO"}
                  </p>

                  <h3 className="text-2xl font-semibold mt-2">
                    {editingId !== null
                      ? "Editar elemento"
                      : "Crear elemento"}
                  </h3>

                </div>

                <button
                  onClick={resetForm}
                  className="text-white/40 hover:text-white text-xl"
                >
                  ×
                </button>

              </div>


              <div className="grid grid-cols-2 gap-6">

                {/* TITLE */}
                <div>

                  <label className="text-[10px] tracking-widest text-white/40">
                    TÍTULO
                  </label>

                  <input
                    value={title}
                    onChange={(e) =>
                      setTitle(e.target.value)
                    }
                    placeholder="THE LAST DANCE"
                    className="w-full mt-2 bg-black border border-white/10 px-4 py-3 text-sm outline-none focus:border-white/40"
                  />

                </div>


                {/* SUBTITLE */}
                <div>

                  <label className="text-[10px] tracking-widest text-white/40">
                    SUBTÍTULO
                  </label>

                  <input
                    value={subtitle}
                    onChange={(e) =>
                      setSubtitle(e.target.value)
                    }
                    placeholder="LIMITED EDITION"
                    className="w-full mt-2 bg-black border border-white/10 px-4 py-3 text-sm outline-none focus:border-white/40"
                  />

                </div>


                {/* IMAGE */}
                <div className="col-span-2">

                  <label className="text-[10px] tracking-widest text-white/40">
                    URL DE IMAGEN
                  </label>

                  <input
                    value={image}
                    onChange={(e) =>
                      setImage(e.target.value)
                    }
                    placeholder="https://..."
                    className="w-full mt-2 bg-black border border-white/10 px-4 py-3 text-sm outline-none focus:border-white/40"
                  />

                  <p className="text-[10px] text-white/25 mt-2">
                    Posteriormente podremos cargar imágenes
                    directamente desde el administrador.
                  </p>

                </div>


                {/* BUTTON */}
                <div>

                  <label className="text-[10px] tracking-widest text-white/40">
                    TEXTO DEL BOTÓN
                  </label>

                  <input
                    value={buttonText}
                    onChange={(e) =>
                      setButtonText(e.target.value)
                    }
                    placeholder="VER DROP"
                    className="w-full mt-2 bg-black border border-white/10 px-4 py-3 text-sm outline-none focus:border-white/40"
                  />

                </div>


                {/* TYPE */}
                <div>

                  <label className="text-[10px] tracking-widest text-white/40">
                    TIPO DE CONTENIDO
                  </label>

                  <select
                    value={type}
                    onChange={(e) =>
                      setType(
                        e.target.value as ContentItem["type"]
                      )
                    }
                    className="w-full mt-2 bg-black border border-white/10 px-4 py-3 text-sm outline-none focus:border-white/40"
                  >

                    <option value="HERO">
                      HERO PRINCIPAL
                    </option>

                    <option value="BANNER">
                      BANNER
                    </option>

                    <option value="CAMPAÑA">
                      CAMPAÑA
                    </option>

                    <option value="DROP">
                      DROP
                    </option>

                  </select>

                </div>


                {/* ACTIVE */}
                <div className="col-span-2 flex items-center gap-3">

                  <input
                    id="active"
                    type="checkbox"
                    checked={active}
                    onChange={(e) =>
                      setActive(e.target.checked)
                    }
                    className="w-4 h-4"
                  />

                  <label
                    htmlFor="active"
                    className="text-sm text-white/70"
                  >
                    Mostrar este contenido en la web
                  </label>

                </div>

              </div>


              {/* ACTIONS */}
              <div className="flex justify-end gap-3 mt-8">

                <button
                  onClick={resetForm}
                  className="border border-white/10 px-6 py-3 text-xs tracking-widest text-white/50 hover:text-white hover:border-white/30 transition"
                >
                  CANCELAR
                </button>

                <button
                  onClick={saveContent}
                  className="bg-white text-black px-7 py-3 text-xs font-bold tracking-widest hover:bg-white/80 transition"
                >
                  GUARDAR CONTENIDO
                </button>

              </div>

            </div>

          )}


          {/* CONTENT LIST */}
          <div className="border border-white/10 bg-[#0b0b0b]">

            <div className="px-7 py-5 border-b border-white/10">

              <p className="text-[10px] tracking-[0.25em] text-white/30">
                ELEMENTOS VISUALES
              </p>

            </div>


            <div className="divide-y divide-white/10">

              {content.map((item) => (

                <div
                  key={item.id}
                  className="px-7 py-6 flex items-center gap-6"
                >

                  {/* IMAGE */}
                  <div className="w-40 h-24 bg-[#111] border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">

                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[9px] tracking-widest text-white/20">
                        SIN IMAGEN
                      </span>
                    )}

                  </div>


                  {/* INFO */}
                  <div className="flex-1 min-w-0">

                    <div className="flex items-center gap-3 flex-wrap">

                      <h3 className="font-semibold tracking-wide">
                        {item.title}
                      </h3>

                      <span className="border border-white/10 px-2 py-1 text-[8px] tracking-widest text-white/40">
                        {item.type}
                      </span>

                      <span
                        className={`border px-2 py-1 text-[8px] tracking-widest ${
                          item.active
                            ? "border-white/20 text-white/60"
                            : "border-white/10 text-white/25"
                        }`}
                      >
                        {item.active
                          ? "ACTIVO"
                          : "OCULTO"}
                      </span>

                    </div>


                    <p className="text-xs text-white/40 mt-2">
                      {item.subtitle}
                    </p>


                    <p className="text-[9px] tracking-widest text-white/25 mt-3">
                      BOTÓN:{" "}
                      {item.buttonText || "SIN BOTÓN"}
                    </p>

                  </div>


                  {/* ACTIONS */}
                  <div className="flex items-center gap-2">

                    <button
                      onClick={() =>
                        toggleActive(item.id)
                      }
                      className="border border-white/10 px-4 py-2 text-[9px] tracking-widest text-white/50 hover:text-white hover:border-white/30 transition"
                    >
                      {item.active
                        ? "OCULTAR"
                        : "MOSTRAR"}
                    </button>

                    <button
                      onClick={() => editContent(item)}
                      className="border border-white/10 px-4 py-2 text-[9px] tracking-widest text-white/50 hover:text-white hover:border-white/30 transition"
                    >
                      EDITAR
                    </button>

                    <button
                      onClick={() =>
                        deleteContent(item.id)
                      }
                      className="border border-white/10 px-4 py-2 text-[9px] tracking-widest text-white/50 hover:text-white hover:border-white/30 transition"
                    >
                      ELIMINAR
                    </button>

                  </div>

                </div>

              ))}

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}