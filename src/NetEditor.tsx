import { useState } from "react";
import { FACE_COLORS, FACE_NAMES, FACES, type Face } from "./cube";

// Unfolded cube: [face, grid row, grid column] of each 3x3 block.
const LAYOUT: [Face, number, number][] = [
  ["U", 0, 3],
  ["L", 3, 0],
  ["F", 3, 3],
  ["R", 3, 6],
  ["B", 3, 9],
  ["D", 6, 3],
];

type Props = { state: string; onChange: (state: string) => void; highlight?: Set<number> };

/** Flat cube pattern: pick a color, tap stickers to paint them. Centers are fixed. */
export default function NetEditor({ state, onChange, highlight }: Props) {
  const [brush, setBrush] = useState<Face>("U");
  const paint = (i: number) => onChange(state.slice(0, i) + brush + state.slice(i + 1));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-12 gap-[3px]">
        {LAYOUT.flatMap(([face, row, col]) =>
          Array.from({ length: 9 }, (_, k) => {
            const i = 9 * FACES.indexOf(face) + k;
            return (
              <button
                key={i}
                disabled={k === 4}
                onClick={() => paint(i)}
                aria-label={`Case ${k + 1} de la face ${FACE_NAMES[face]}`}
                className={`aspect-square rounded-[4px] enabled:hover:ring-2 enabled:hover:ring-white ${highlight?.has(i) ? "outline-3 outline-offset-1 outline-fuchsia-400" : ""}`}
                style={{
                  gridRow: row + Math.floor(k / 3) + 1,
                  gridColumn: col + (k % 3) + 1,
                  background: FACE_COLORS[state[i] as Face],
                }}
              />
            );
          }),
        )}
      </div>
      <div className="flex justify-center gap-2">
        {[...FACES].map((f) => (
          <button
            key={f}
            onClick={() => setBrush(f as Face)}
            aria-label={`Pinceau ${FACE_NAMES[f as Face]}`}
            aria-pressed={brush === f}
            className={`size-9 rounded-lg transition ${brush === f ? "scale-110 ring-3 ring-white" : "ring-1 ring-white/20"}`}
            style={{ background: FACE_COLORS[f as Face] }}
          />
        ))}
      </div>
    </div>
  );
}
