"use client";

import { useState } from "react";

type Section = {
  id: number;
  name: string;
  description: string;
  type: string;
  active: boolean;
  order: number;
  title: string;
  subtitle: string;
  buttonText: string;
  image: string;
};

const initialSections: Section[] = [
  {
    id: 1,
    name: "Hero Principal",
    description: "Imagen principal de entrada del sitio.",
    type: "HERO",
    active: true,
    order: 1,
    title: "THE LAST DANCE",
    subtitle: "LIMITED EDITION",
    buttonText: "VER DROP",
    image: "",
  },
  {
    id: 2,
    name: "Drops Destacados",
    description: "Muestra los lanzamientos principales.",
    type: "PRODUCTOS",
    active: true,
    order: 2,
    title: "NEW DROPS",
    subtitle: "DESCUBRE LO NUEVO",
    buttonText: "VER PRODUCTOS",
    image: "",
  },
  {
    id: 3,
    name: "Banner de Campaña",
    description: "Espacio visual para campañas especiales.",
    type: "BANNER",
    active: true,
    order: 3,
    title: "WEAR YOUR STORY",
    subtitle: "NEWCLOTHES",
    buttonText: "DESCUBRIR",
    image: "",
  },
  {
    id: 4,
    name: "Colección",
    description: "Presentación de una colección completa.",
    type: "COLECCIÓN",
    active: true,
    order: 4,
    title: "THE COLLECTION",
    subtitle: "EXPLORE THE DROP",
    buttonText: "VER COLECCIÓN",
    image: "",
  },
  {
    id: 5,
    name: "Nosotros",
    description: "Información sobre NEWCLOTHES.",
    type: "INFORMACIÓN",
    active: false,
    order: 5,
    title: "NEWCLOTHES",
    subtitle: "WEAR YOUR STORY",
    buttonText: "CONOCER MÁS",
    image: "",
  },
  {
    id: 6,
    name: "Footer",
    description: "Información final y enlaces del sitio.",
    type: "FOOTER",
    active: true,
    order: 6,
    title: "NEWCLOTHES",
    subtitle: "STREETWEAR",
    buttonText: "",
    image: "",
  },
];

export default function SectionsPage() {
  const [sections, setSections] =
    useState<Section[]>(initialSections);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [image, setImage] = useState("");

  const openEditor = (section: Section) => {
    setEditingId(section.id);
    setTitle(section.title);
    setSubtitle(section.subtitle);
    setButtonText(section.buttonText);
    setImage(section.image);
  };

  const closeEditor = () => {
    setEditingId(null);
    setTitle("");
    setSubtitle("");
    setButtonText("");
    setImage("");
  };

  const saveSection = () => {
    if (editingId === null) return;

    setSections((current) =>
      current.map((section) =>
        section.id === editingId
          ? {
              ...section,
              title,
              subtitle,
              buttonText,
              image,
            }
          : section
      )
    );

    closeEditor();
  };

  const toggleActive = (id: number) => {
    setSections((current) =>
      current.map((section) =>
        section.id === id
          ? {
              ...section,
              active: !section.active,
            }
          : section
      )
    );
  };

  const moveSection = (
    id: number,
    direction: "up" | "down"
  ) => {
    setSections((current) => {
      const sorted = [...current].sort(
        (a, b) => a.order - b.order
      );

      const index = sorted.findIndex(
        (section) => section.id === id
      );

      if (direction === "up" && index === 0) {
        return current;
      }

      if (
        direction === "down" &&
        index === sorted.length - 1
      ) {
        return current;
      }

      const targetIndex =
        direction === "up" ? index - 1 : index + 1;

      const currentSection = sorted[index];
      const targetSection = sorted[targetIndex];

      const oldOrder = currentSection.order;

      currentSection.order = targetSection.order;
      targetSection.order = oldOrder;

      return sorted;
    });
  };

  const activeSections = sections.filter(
    (section) => section.active
  ).length;

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
              className="block px-4 py-3 text-sm text-white/50 hover:text-white hover:bg-white/5 transition"
            >
              Contenido / Banners
            </a>

            <a
              href="/admin/sections"
              className="block px-4 py-3 text-sm bg-white/10 text-white border-l-2 border-white"
            >
              Secciones de la web
            </a>

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

          <div className="mb-10">

            <p className="text-[10px] tracking-[0.3em] text-white/30 mb-3">
              ESTRUCTURA DEL SITIO
            </p>

            <h2 className="text-4xl font-bold tracking-tight">
              Secciones de la web
            </h2>

            <p className="text-sm text-white/40 mt-2 max-w-2xl">
              Controla la estructura y el contenido visual
              del catálogo.
            </p>

          </div>


          {/* STATS */}
          <div className="grid grid-cols-3 gap-5 mb-10">

            <div className="border border-white/10 bg-[#0c0c0c] p-6">

              <p className="text-[10px] tracking-[0.25em] text-white/30">
                SECCIONES
              </p>

              <p className="text-3xl font-semibold mt-3">
                {sections.length}
              </p>

            </div>


            <div className="border border-white/10 bg-[#0c0c0c] p-6">

              <p className="text-[10px] tracking-[0.25em] text-white/30">
                VISIBLES
              </p>

              <p className="text-3xl font-semibold mt-3">
                {activeSections}
              </p>

            </div>


            <div className="border border-white/10 bg-[#0c0c0c] p-6">

              <p className="text-[10px] tracking-[0.25em] text-white/30">
                OCULTAS
              </p>

              <p className="text-3xl font-semibold mt-3">
                {sections.length - activeSections}
              </p>

            </div>

          </div>


          {/* EDITOR */}
          {editingId !== null && (

            <div className="border border-white/10 bg-[#0b0b0b] p-8 mb-8">

              <div className="flex items-center justify-between mb-8">

                <div>

                  <p className="text-[10px] tracking-[0.25em] text-white/30">
                    EDITOR VISUAL
                  </p>

                  <h3 className="text-2xl font-semibold mt-2">
                    {
                      sections.find(
                        (section) =>
                          section.id === editingId
                      )?.name
                    }
                  </h3>

                </div>

                <button
                  onClick={closeEditor}
                  className="text-white/40 hover:text-white text-xl"
                >
                  ×
                </button>

              </div>


              <div className="grid grid-cols-2 gap-6">

                {/* TITLE */}
                <div>

                  <label className="text-[10px] tracking-widest text-white/40">
                    TÍTULO PRINCIPAL
                  </label>

                  <input
                    value={title}
                    onChange={(e) =>
                      setTitle(e.target.value)
                    }
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
                    className="w-full mt-2 bg-black border border-white/10 px-4 py-3 text-sm outline-none focus:border-white/40"
                  />

                </div>


                {/* PREVIEW */}
                <div>

                  <label className="text-[10px] tracking-widest text-white/40">
                    VISTA PREVIA
                  </label>

                  <div className="mt-2 h-11 border border-white/10 bg-black flex items-center px-4">

                    <span className="text-xs text-white/50 truncate">
                      {title || "SIN TÍTULO"}
                    </span>

                  </div>

                </div>

              </div>


              <div className="flex justify-end gap-3 mt-8">

                <button
                  onClick={closeEditor}
                  className="border border-white/10 px-6 py-3 text-xs tracking-widest text-white/50 hover:text-white transition"
                >
                  CANCELAR
                </button>

                <button
                  onClick={saveSection}
                  className="bg-white text-black px-7 py-3 text-xs font-bold tracking-widest hover:bg-white/80 transition"
                >
                  GUARDAR CAMBIOS
                </button>

              </div>

            </div>

          )}


          {/* SECTIONS */}
          <div className="border border-white/10 bg-[#0b0b0b]">

            <div className="px-7 py-5 border-b border-white/10">

              <p className="text-[10px] tracking-[0.25em] text-white/30">
                ESTRUCTURA DEL CATÁLOGO
              </p>

            </div>


            <div className="divide-y divide-white/10">

              {[...sections]
                .sort((a, b) => a.order - b.order)
                .map((section, index) => (

                <div
                  key={section.id}
                  className="px-7 py-6 flex items-center gap-6"
                >

                  {/* NUMBER */}
                  <div className="w-8 text-center">

                    <span className="text-xs text-white/30">
                      {index + 1}
                    </span>

                  </div>


                  {/* TYPE */}
                  <div className="w-14 h-14 border border-white/10 bg-black flex items-center justify-center">

                    <span className="text-[9px] tracking-widest text-white/40">
                      {section.type.slice(0, 3)}
                    </span>

                  </div>


                  {/* INFO */}
                  <div className="flex-1">

                    <div className="flex items-center gap-3 flex-wrap">

                      <h3 className="font-semibold tracking-wide">
                        {section.name}
                      </h3>

                      <span className="border border-white/10 px-2 py-1 text-[8px] tracking-widest text-white/40">
                        {section.type}
                      </span>

                      <span
                        className={`border px-2 py-1 text-[8px] tracking-widest ${
                          section.active
                            ? "border-white/20 text-white/60"
                            : "border-white/10 text-white/25"
                        }`}
                      >
                        {section.active
                          ? "VISIBLE"
                          : "OCULTA"}
                      </span>

                    </div>

                    <p className="text-xs text-white/40 mt-2">
                      {section.title}
                    </p>

                  </div>


                  {/* ORDER */}
                  <div className="flex items-center gap-1">

                    <button
                      disabled={index === 0}
                      onClick={() =>
                        moveSection(section.id, "up")
                      }
                      className="w-9 h-9 border border-white/10 text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-20 transition"
                    >
                      ↑
                    </button>

                    <button
                      disabled={
                        index === sections.length - 1
                      }
                      onClick={() =>
                        moveSection(section.id, "down")
                      }
                      className="w-9 h-9 border border-white/10 text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-20 transition"
                    >
                      ↓
                    </button>

                  </div>


                  {/* VISIBILITY */}
                  <button
                    onClick={() =>
                      toggleActive(section.id)
                    }
                    className="border border-white/10 px-4 py-2 text-[9px] tracking-widest text-white/50 hover:text-white hover:border-white/30 transition"
                  >
                    {section.active
                      ? "OCULTAR"
                      : "MOSTRAR"}
                  </button>


                  {/* EDIT */}
                  <button
                    onClick={() => openEditor(section)}
                    className="border border-white/10 px-4 py-2 text-[9px] tracking-widest text-white/50 hover:text-white hover:border-white/30 transition"
                  >
                    EDITAR
                  </button>

                </div>

              ))}

            </div>

          </div>


          {/* NOTE */}
          <div className="mt-8 border border-white/10 bg-[#0b0b0b] p-7">

            <p className="text-[10px] tracking-[0.25em] text-white/30 mb-3">
              ESTADO DEL SISTEMA
            </p>

            <p className="text-sm text-white/40 leading-6">
              Este editor funciona actualmente como demostración.
              Más adelante conectaremos estas configuraciones
              con la base de datos para que cada cambio se refleje
              directamente en la página pública.
            </p>

          </div>

        </section>

      </div>

    </main>
  );
}