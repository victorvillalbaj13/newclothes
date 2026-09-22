"use client";

type ArtworkControlsProps = {
  hasArtwork: boolean;
  scale: number;
  rotation: number;
  x: number;
  y: number;
  onScaleChange: (value: number) => void;
  onRotationChange: (value: number) => void;
  onMove: (x: number, y: number) => void;
  onUpload: (file: File) => void;
  onReset: () => void;
  onRemove: () => void;
};

export default function ArtworkControls({
  hasArtwork,
  scale,
  rotation,
  x,
  y,
  onScaleChange,
  onRotationChange,
  onMove,
  onUpload,
  onReset,
  onRemove,
}: ArtworkControlsProps) {
  return (
    <div className="space-y-7">
      {/* UPLOAD */}
      <section>
        <div className="mb-3">
          <span className="text-[9px] font-medium uppercase tracking-[0.28em] text-white/40">
            Artwork
          </span>
        </div>

        <label className="group flex cursor-pointer flex-col items-center justify-center border border-dashed border-white/15 bg-white/[0.02] px-5 py-7 text-center transition hover:border-white/30 hover:bg-white/[0.04]">
          <span className="mb-3 text-xl font-light text-white/50">
            +
          </span>

          <span className="text-[9px] uppercase tracking-[0.25em] text-white/60">
            Upload artwork
          </span>

          <span className="mt-2 text-[8px] uppercase tracking-[0.15em] text-white/20">
            PNG / JPG / WEBP
          </span>

          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                onUpload(file);
              }

              event.currentTarget.value = "";
            }}
          />
        </label>
      </section>

      {hasArtwork && (
        <>
          {/* SCALE */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-[0.25em] text-white/40">
                Scale
              </span>

              <span className="text-[9px] tabular-nums text-white/30">
                {scale.toFixed(2)}
              </span>
            </div>

            <input
              type="range"
              min="0.25"
              max="2.5"
              step="0.01"
              value={scale}
              onChange={(event) =>
                onScaleChange(Number(event.target.value))
              }
              className="w-full accent-white"
            />
          </section>

          {/* ROTATION */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-[0.25em] text-white/40">
                Rotation
              </span>

              <span className="text-[9px] tabular-nums text-white/30">
                {Math.round(rotation)}°
              </span>
            </div>

            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={rotation}
              onChange={(event) =>
                onRotationChange(Number(event.target.value))
              }
              className="w-full accent-white"
            />
          </section>

          {/* POSITION */}
          <section>
            <div className="mb-3">
              <span className="text-[9px] uppercase tracking-[0.25em] text-white/40">
                Position
              </span>
            </div>

            <div className="mx-auto grid w-[112px] grid-cols-3 gap-1">
              <div />

              <button
                type="button"
                onClick={() => onMove(x, y - 0.04)}
                className="h-9 border border-white/10 text-white/50 transition hover:border-white/30 hover:text-white"
              >
                ↑
              </button>

              <div />

              <button
                type="button"
                onClick={() => onMove(x - 0.04, y)}
                className="h-9 border border-white/10 text-white/50 transition hover:border-white/30 hover:text-white"
              >
                ←
              </button>

              <button
                type="button"
                onClick={() => onMove(0, 0)}
                className="h-9 border border-white/10 text-[8px] uppercase tracking-widest text-white/30 transition hover:border-white/30 hover:text-white"
              >
                C
              </button>

              <button
                type="button"
                onClick={() => onMove(x + 0.04, y)}
                className="h-9 border border-white/10 text-white/50 transition hover:border-white/30 hover:text-white"
              >
                →
              </button>

              <div />

              <button
                type="button"
                onClick={() => onMove(x, y + 0.04)}
                className="h-9 border border-white/10 text-white/50 transition hover:border-white/30 hover:text-white"
              >
                ↓
              </button>

              <div />
            </div>
          </section>

          {/* ACTIONS */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onReset}
              className="h-10 border border-white/10 text-[8px] uppercase tracking-[0.2em] text-white/40 transition hover:border-white/30 hover:text-white"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={onRemove}
              className="h-10 border border-white/10 text-[8px] uppercase tracking-[0.2em] text-white/40 transition hover:border-white/30 hover:text-white"
            >
              Remove
            </button>
          </div>
        </>
      )}
    </div>
  );
}