"use client";

import { useRef, useCallback, useEffect } from "react";

export interface SpinItem {
  id: string;
  label: string; // short text shown in the drum
  content: string;
  category: string;
}

interface SpinDrumProps {
  items: SpinItem[];
  /** Called with the winning item once the spin settles */
  onSettle: (item: SpinItem) => void;
  /** Expose an imperative trigger */
  triggerRef: React.MutableRefObject<(() => void) | null>;
}

const ITEM_H = 56; // px height of each drum slot
const VISIBLE = 3; // number of visible rows in the viewport
const DRUM_H = ITEM_H * VISIBLE;

export default function SpinDrum({ items, onSettle, triggerRef }: SpinDrumProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const isSpinning = useRef(false);

  const spin = useCallback(() => {
    if (!trackRef.current || items.length === 0 || isSpinning.current) return;
    isSpinning.current = true;

    const track = trackRef.current;
    // Reset to top on each new spin so re-spins always start from 0
    track.style.transform = "translateY(0px)";
    track.dataset.offset = "0";

    const winIdx = Math.floor(Math.random() * items.length);

    // Tile items LOOPS times so the drum scrolls a long way before stopping.
    // targetOffset places items[winIdx] exactly in the centre slot (row 1 of 3).
    const LOOPS = 5; // must match the DOM loop count below
    const landRow = LOOPS * items.length + winIdx; // absolute row index of the winner
    // Subtract ITEM_H so the winner sits in row 1 (centre), not row 0 (top)
    const targetOffset = landRow * ITEM_H - ITEM_H;

    const duration = 2600; // ms total
    const start = performance.now();
    const startOffset = parseFloat(track.dataset.offset ?? "0");

    function easeOut(t: number) {
      // Cubic ease-out
      return 1 - Math.pow(1 - t, 3);
    }

    function frame(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOut(t);
      const offset = startOffset + (targetOffset - startOffset) * eased;

      track.style.transform = `translateY(-${offset}px)`;
      track.dataset.offset = String(offset);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        isSpinning.current = false;
        onSettle(items[winIdx]);
      }
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(frame);
  }, [items, onSettle]);

  // Expose to parent via ref (must happen in effect, not during render)
  useEffect(() => {
    triggerRef.current = spin;
  }, [spin, triggerRef]);

  if (items.length === 0) return null;

  // Build repeated list — must equal the LOOPS constant used in spin()
  const DOM_LOOPS = 6; // one extra beyond LOOPS=5 so there's always content after the winner
  const repeated: SpinItem[] = [];
  for (let i = 0; i < DOM_LOOPS; i++) repeated.push(...items);

  return (
    <div
      style={{
        width: "100%",
        height: `${DRUM_H}px`,
        overflow: "hidden",
        position: "relative",
        borderRadius: "4px",
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      {/* Centre highlight stripe */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          top: `${ITEM_H}px`,
          height: `${ITEM_H}px`,
          background: "var(--ink)",
          opacity: 0.06,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      {/* Top + bottom fade masks */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, var(--surface) 0%, transparent 28%, transparent 72%, var(--surface) 100%)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

      {/* Scrolling track */}
      <div
        ref={trackRef}
        data-offset="0"
        style={{
          willChange: "transform",
          transform: "translateY(0px)",
        }}
      >
        {repeated.map((item, i) => (
          <div
            key={`${item.id}-${i}`}
            style={{
              height: `${ITEM_H}px`,
              display: "flex",
              alignItems: "center",
              padding: "0 20px",
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--ink-2)",
              lineHeight: 1.4,
              borderBottom: "1px solid var(--border-light)",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
