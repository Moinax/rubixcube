import { useState } from "react";
import { FACE_COLORS, FACE_NAMES, FACES, feminine, INFLECTED, type Face } from "./cube";
import { tr } from "./i18n";

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
      <div className="grid grid-cols-12 gap-[3px] md:gap-1">
        {LAYOUT.flatMap(([face, row, col]) =>
          Array.from({ length: 9 }, (_, k) => {
            const i = 9 * FACES.indexOf(face) + k;
            return (
              <button
                key={i}
                disabled={k === 4}
                onClick={() => paint(i)}
                aria-label={tr({
                  fr: `Case ${k + 1} de la face ${feminine(face)}`,
                  nl: `Vakje ${k + 1} van de ${INFLECTED[face]} kant`,
                  en: `Square ${k + 1} of the ${FACE_NAMES[face]} face`,
                })}
                className={`aspect-square rounded-[4px] enabled:hover:ring-2 enabled:hover:ring-chalk ${highlight?.has(i) ? "outline-3 outline-offset-1 outline-amber-400" : ""}`}
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
      <div className="flex justify-between gap-1.5 rounded-2xl border border-edge bg-shell p-1.5 md:justify-start md:gap-2 md:self-start">
        {[...FACES].map((f) => (
          <button
            key={f}
            onClick={() => setBrush(f as Face)}
            aria-label={`${tr({ fr: "Pinceau", nl: "Penseel", en: "Brush" })} ${FACE_NAMES[f as Face]}`}
            aria-pressed={brush === f}
            className={`size-10 rounded-[10px] transition ${brush === f ? "ring-2 ring-chalk ring-offset-2 ring-offset-shell" : ""}`}
            style={{ background: FACE_COLORS[f as Face] }}
          />
        ))}
      </div>
    </div>
  );
}
