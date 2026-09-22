"use client";

type CustomControlsProps = {
  color: string;
  setColor: (color: string) => void;
  size: string;
  setSize: (size: string) => void;
};

const colors = [
  {
    name: "Black",
    value: "#090909",
  },
  {
    name: "White",
    value: "#f2f2f0",
  },
  {
    name: "Grey",
    value: "#6b6b6b",
  },
];

const sizes = ["XS", "S", "M", "L", "XL"];

export default function CustomControls({
  color,
  setColor,
  size,
  setSize,
}: CustomControlsProps) {
  return (
    <div className="space-y-8">
      {/* GARMENT */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[9px] font-medium uppercase tracking-[0.28em] text-white/40">
            Garment
          </span>

          <span className="text-[9px] uppercase tracking-[0.2em] text-white/20">
            T-Shirt
          </span>
        </div>

        <div className="border border-white/10 bg-white/[0.025] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/80">
                Essential Tee
              </p>

              <p className="mt-1 text-[9px] uppercase tracking-[0.15em] text-white/30">
                Heavyweight / Premium
              </p>
            </div>

            <span className="text-[10px] text-white/40">
              $40.00
            </span>
          </div>
        </div>
      </section>

      {/* COLOR */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[9px] font-medium uppercase tracking-[0.28em] text-white/40">
            Color
          </span>

          <span className="text-[9px] uppercase tracking-[0.2em] text-white/20">
            {colors.find((item) => item.value === color)?.name}
          </span>
        </div>

        <div className="flex gap-3">
          {colors.map((item) => {
            const active = color === item.value;

            return (
              <button
                key={item.value}
                type="button"
                aria-label={item.name}
                onClick={() => setColor(item.value)}
                className={[
                  "relative h-10 w-10 rounded-full border transition-all",
                  active
                    ? "border-white"
                    : "border-white/10 hover:border-white/40",
                ].join(" ")}
                style={{
                  backgroundColor: item.value,
                }}
              >
                {active && (
                  <span className="absolute inset-1 rounded-full border border-black/20" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* SIZE */}
      <section>
        <div className="mb-4">
          <span className="text-[9px] font-medium uppercase tracking-[0.28em] text-white/40">
            Size
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1">
          {sizes.map((item) => {
            const active = size === item;

            return (
              <button
                key={item}
                type="button"
                onClick={() => setSize(item)}
                className={[
                  "h-10 border text-[9px] uppercase tracking-[0.15em] transition",
                  active
                    ? "border-white bg-white text-black"
                    : "border-white/10 text-white/50 hover:border-white/30 hover:text-white",
                ].join(" ")}
              >
                {item}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}