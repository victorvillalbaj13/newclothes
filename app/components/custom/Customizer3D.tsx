"use client";

import { useState } from "react";
import GarmentViewer from "./GarmentViewer";
import CustomControls from "./CustomControls";
import ArtworkControls from "./ArtworkControls";

type View = "front" | "back";

type Artwork = {
  src: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export default function Customizer3D() {
  const [color, setColor] = useState("#090909");
  const [size, setSize] = useState("M");
  const [view, setView] = useState<View>("front");

  const [frontArtwork, setFrontArtwork] = useState<Artwork | null>(
    null
  );

  const [backArtwork, setBackArtwork] = useState<Artwork | null>(
    null
  );

  const artwork =
    view === "front" ? frontArtwork : backArtwork;

  const setArtwork = (value: Artwork | null) => {
    if (view === "front") {
      setFrontArtwork(value);
    } else {
      setBackArtwork(value);
    }
  };

  const uploadArtwork = (file: File) => {
    const url = URL.createObjectURL(file);

    setArtwork({
      src: url,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
    });
  };

  const updateArtwork = (
    updates: Partial<Artwork>
  ) => {
    if (!artwork) return;

    setArtwork({
      ...artwork,
      ...updates,
    });
  };

  const resetArtwork = () => {
    if (!artwork) return;

    setArtwork({
      ...artwork,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
    });
  };

  const rotationY =
    view === "front" ? 0 : Math.PI;

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      {/* HEADER */}
      <header className="flex h-[72px] items-center justify-between border-b border-white/10 px-5 md:px-8">
        <div className="flex items-center gap-5">
          <span className="text-[13px] font-semibold tracking-[-0.04em]">
            NEWCLOTHES
          </span>

          <span className="hidden text-[8px] uppercase tracking-[0.3em] text-white/25 sm:block">
            Custom Studio
          </span>
        </div>

        <div className="flex items-center gap-5">
          <span className="text-[8px] uppercase tracking-[0.3em] text-white/25">
            Custom / 001
          </span>

          <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
        </div>
      </header>

      {/* MAIN */}
      <div className="grid min-h-[calc(100vh-72px)] lg:grid-cols-[300px_minmax(0,1fr)_300px]">
        {/* LEFT PANEL */}
        <aside className="border-b border-white/10 p-5 md:p-7 lg:border-b-0 lg:border-r">
          <div className="mb-8">
            <p className="text-[9px] uppercase tracking-[0.3em] text-white/25">
              01
            </p>

            <h1 className="mt-2 text-xl font-medium tracking-[-0.04em]">
              Build your tee
            </h1>

            <p className="mt-2 max-w-[220px] text-[9px] leading-5 uppercase tracking-[0.12em] text-white/30">
              Customize every detail of your NEWCLOTHES garment.
            </p>
          </div>

          <CustomControls
            color={color}
            setColor={setColor}
            size={size}
            setSize={setSize}
          />
        </aside>

        {/* CENTER VIEWER */}
        <section className="relative min-h-[620px] lg:min-h-0">
          <GarmentViewer
            color={color}
            rotationY={rotationY}
          />

          {/* VIEW SELECTOR */}
          <div className="absolute left-1/2 top-6 z-10 flex -translate-x-1/2 border border-white/10 bg-black/60 p-1 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setView("front")}
              className={[
                "px-5 py-2 text-[8px] uppercase tracking-[0.25em] transition",
                view === "front"
                  ? "bg-white text-black"
                  : "text-white/40 hover:text-white",
              ].join(" ")}
            >
              Front
            </button>

            <button
              type="button"
              onClick={() => setView("back")}
              className={[
                "px-5 py-2 text-[8px] uppercase tracking-[0.25em] transition",
                view === "back"
                  ? "bg-white text-black"
                  : "text-white/40 hover:text-white",
              ].join(" ")}
            >
              Back
            </button>
          </div>

          {/* PRODUCT LABEL */}
          <div className="absolute bottom-6 left-6 z-10">
            <p className="text-[8px] uppercase tracking-[0.3em] text-white/30">
              NEWCLOTHES
            </p>

            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/60">
              Essential Tee
            </p>
          </div>

          <div className="absolute bottom-6 right-6 z-10 text-right">
            <p className="text-[8px] uppercase tracking-[0.3em] text-white/30">
              Price
            </p>

            <p className="mt-1 text-sm text-white">
              $40.00
            </p>
          </div>
        </section>

        {/* RIGHT PANEL */}
        <aside className="border-t border-white/10 p-5 md:p-7 lg:border-l lg:border-t-0">
          <div className="mb-8">
            <p className="text-[9px] uppercase tracking-[0.3em] text-white/25">
              02
            </p>

            <h2 className="mt-2 text-xl font-medium tracking-[-0.04em]">
              Artwork
            </h2>

            <p className="mt-2 text-[9px] uppercase tracking-[0.12em] text-white/30">
              Front / back artwork placement.
            </p>
          </div>

          <ArtworkControls
            hasArtwork={Boolean(artwork)}
            scale={artwork?.scale ?? 1}
            rotation={artwork?.rotation ?? 0}
            x={artwork?.x ?? 0}
            y={artwork?.y ?? 0}
            onScaleChange={(value) =>
              updateArtwork({ scale: value })
            }
            onRotationChange={(value) =>
              updateArtwork({ rotation: value })
            }
            onMove={(x, y) =>
              updateArtwork({ x, y })
            }
            onUpload={uploadArtwork}
            onReset={resetArtwork}
            onRemove={() => setArtwork(null)}
          />

          <div className="mt-10 border-t border-white/10 pt-6">
            <div className="flex items-center justify-between">
              <span className="text-[8px] uppercase tracking-[0.25em] text-white/30">
                Current view
              </span>

              <span className="text-[8px] uppercase tracking-[0.25em] text-white/60">
                {view}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-[8px] uppercase tracking-[0.25em] text-white/30">
                Size
              </span>

              <span className="text-[8px] uppercase tracking-[0.25em] text-white/60">
                {size}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled
            className="mt-7 h-12 w-full cursor-not-allowed border border-white/10 bg-white/[0.04] text-[9px] uppercase tracking-[0.3em] text-white/25"
          >
            Add to Bag — Coming Soon
          </button>
        </aside>
      </div>
    </main>
  );
}