import { useEffect, useRef, useState } from "react";
import { X, Plus } from "lucide-react";
import type { CutPoint } from "@/lib/store";
import { fmtDuration } from "@/lib/store";

interface Props {
  duration: number;
  thumbnail: string;
  cuts: CutPoint[];
  onChange: (cuts: CutPoint[]) => void;
}

export function Timeline({ duration, thumbnail, cuts, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  // generate fake waveform once
  const bars = useRef<number[]>(
    Array.from({ length: 120 }, () => 0.25 + Math.random() * 0.75),
  ).current;

  useEffect(() => {
    if (!dragId) return;
    const onMove = (e: MouseEvent) => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const t = (x / rect.width) * duration;
      onChange(cuts.map((c) => c.id === dragId ? { ...c, time: t } : c).sort((a, b) => a.time - b.time));
    };
    const onUp = () => setDragId(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragId, cuts, duration, onChange]);

  const handleClick = (e: React.MouseEvent) => {
    if (dragId) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const t = (x / rect.width) * duration;
    if (t < 0.5 || t > duration - 0.5) return;
    onChange([...cuts, { id: crypto.randomUUID(), time: t }].sort((a, b) => a.time - b.time));
  };

  return (
    <div className="select-none">
      <div
        ref={ref}
        onClick={handleClick}
        onMouseMove={(e) => {
          const rect = ref.current?.getBoundingClientRect();
          if (rect) setHoverX(e.clientX - rect.left);
        }}
        onMouseLeave={() => setHoverX(null)}
        className="relative h-24 rounded-md overflow-hidden cursor-crosshair border border-border bg-[#0a1428]"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(10,20,40,0.85), rgba(10,20,40,0.4)), url(${thumbnail})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* waveform */}
        <div className="absolute inset-0 flex items-center px-1 gap-[1px]">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-primary/40 rounded-[1px]"
              style={{ height: `${h * 60}%` }}
            />
          ))}
        </div>

        {/* hover indicator */}
        {hoverX !== null && !dragId && (
          <div
            className="absolute top-0 bottom-0 w-px bg-white/30 pointer-events-none"
            style={{ left: hoverX }}
          >
            <div className="absolute -top-0 left-1 text-[10px] font-mono text-white/70 bg-black/50 px-1 rounded">
              {fmtDuration((hoverX / (ref.current?.clientWidth || 1)) * duration)}
            </div>
          </div>
        )}

        {/* cut markers */}
        {cuts.map((c) => {
          const left = (c.time / duration) * 100;
          return (
            <div
              key={c.id}
              onMouseDown={(e) => { e.stopPropagation(); setDragId(c.id); }}
              className="absolute top-0 bottom-0 w-[2px] bg-primary cursor-ew-resize group"
              style={{ left: `${left}%` }}
            >
              <div className="absolute -top-1 -left-[7px] w-4 h-4 rounded-sm bg-primary shadow-lg shadow-primary/40 ring-2 ring-[#0a1428]" />
              <div className="absolute -bottom-0.5 -left-[7px] w-4 h-4 rounded-sm bg-primary shadow-lg shadow-primary/40 ring-2 ring-[#0a1428]" />
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                <span className="text-[10px] font-mono bg-primary text-primary-foreground px-1.5 py-0.5 rounded whitespace-nowrap">
                  {fmtDuration(c.time)}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onChange(cuts.filter((x) => x.id !== c.id)); }}
                  className="w-4 h-4 rounded bg-destructive grid place-items-center hover:scale-110 transition"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          );
        })}

        {/* time ruler */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-[9px] font-mono text-white/50 pointer-events-none">
          <span>00:00</span>
          <span>{fmtDuration(duration / 2)}</span>
          <span>{fmtDuration(duration)}</span>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Plus className="w-3 h-3" />
        <span>Clique na timeline para adicionar um corte. Arraste os marcadores para ajustar.</span>
      </div>
    </div>
  );
}
