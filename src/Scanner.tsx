import { useEffect, useRef, useState } from "react";
import { classify, FACE_COLORS, FACE_NAMES, FACES, type Face, type RGB } from "./cube";

// Turning the cube a quarter left each time shows F, R, B, L; then the top and bottom.
const STEPS: { face: Face; top: Face; hint: string }[] = [
  { face: "F", top: "U", hint: "Commence par la face avant." },
  { face: "R", top: "U", hint: "Tourne le cube d'un quart vers la gauche." },
  { face: "B", top: "U", hint: "Encore un quart vers la gauche." },
  { face: "L", top: "U", hint: "Encore un quart vers la gauche." },
  { face: "U", top: "B", hint: "Bascule le cube pour montrer le dessus." },
  { face: "D", top: "F", hint: "Puis le dessous." },
];
const GRID = 0.62; // share of the shorter video side covered by the grid
const SIZE = 90; // sampling canvas side, 30 px per sticker

const rgb = (c?: RGB) => (c ? `rgb(${c.join(",")})` : "transparent");

/** Average color of the middle of each of the 9 cells, row by row. */
function sampleGrid(data: Uint8ClampedArray): RGB[] {
  return Array.from({ length: 9 }, (_, cell) => {
    const total = [0, 0, 0];
    let n = 0;
    for (let y = 9; y < 21; y++)
      for (let x = 9; x < 21; x++) {
        const p = ((Math.floor(cell / 3) * 30 + y) * SIZE + (cell % 3) * 30 + x) * 4;
        for (let k = 0; k < 3; k++) total[k] += data[p + k];
        n++;
      }
    return total.map((t) => Math.round(t / n)) as RGB;
  });
}

const Chip = ({ face }: { face: Face }) => (
  <span className="inline-flex items-center gap-1.5 font-semibold">
    <span className="size-3.5 rounded-sm" style={{ background: FACE_COLORS[face] }} />
    {FACE_NAMES[face]}
  </span>
);

type Props = { onDone: (state: string) => void; onManual: () => void; onCancel: () => void };

export default function Scanner({ onDone, onManual, onCancel }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>();
  const [live, setLive] = useState<RGB[]>([]);
  const [box, setBox] = useState(0);
  const [faces, setFaces] = useState<(RGB[] | undefined)[]>(() => Array(6).fill(undefined));
  const [step, setStep] = useState(0);

  useEffect(() => {
    let stream: MediaStream | undefined;
    let stopped = false;
    if (!navigator.mediaDevices) {
      setError("La caméra n'est disponible qu'en HTTPS ou sur localhost (lance « pnpm dev:lan » pour un téléphone).");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } }, audio: false })
      .then((s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        video.current!.srcObject = s;
        return video.current!.play();
      })
      .catch((e: Error) => setError(`Impossible d'ouvrir la caméra : ${e.message}`));

    const canvas = Object.assign(document.createElement("canvas"), { width: SIZE, height: SIZE });
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const timer = setInterval(() => {
      const v = video.current;
      if (!v?.videoWidth) return;
      const side = Math.min(v.videoWidth, v.videoHeight) * GRID;
      ctx.drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, 0, 0, SIZE, SIZE);
      setLive(sampleGrid(ctx.getImageData(0, 0, SIZE, SIZE).data));
      setBox((100 * side) / v.videoWidth);
    }, 150);
    return () => {
      stopped = true;
      clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function capture() {
    const next = faces.with(step, live);
    setFaces(next);
    const missing = next.findIndex((f) => !f);
    if (missing >= 0) return setStep(missing);
    // Facelet order is URFDLB, scan order is not.
    onDone(classify([...FACES].flatMap((f) => next[STEPS.findIndex((s) => s.face === f)]!)));
  }

  const { face, top, hint } = STEPS[step];
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <button onClick={onCancel} className="text-sm text-zinc-400 hover:text-zinc-100">
          ← Retour
        </button>
        <span className="text-sm text-zinc-400">Face {step + 1} / 6</span>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-950/60 p-4 text-sm text-red-200">
          {error}
          <button onClick={onManual} className="mt-3 block font-semibold text-white underline">
            Saisir les couleurs à la main
          </button>
        </div>
      ) : (
        <>
          <p className="text-lg leading-snug">
            {hint}
            <br />
            Face <Chip face={face} /> vers la caméra, <Chip face={top} /> en haut.
          </p>
          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video ref={video} playsInline muted className="block w-full" />
            {box > 0 && (
              <div
                className="absolute top-1/2 left-1/2 grid aspect-square -translate-1/2 grid-cols-3 rounded-xl ring-2 ring-white/80"
                style={{ width: `${box}%` }}
              >
                {live.map((c, i) => (
                  <div key={i} className="grid place-items-center border border-white/40">
                    <span className="size-4 rounded-full ring-2 ring-white" style={{ background: rgb(c) }} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={capture}
            disabled={!live.length}
            className="rounded-xl bg-white py-3 font-semibold text-black disabled:opacity-40"
          >
            Capturer la face {FACE_NAMES[face]}
          </button>
        </>
      )}

      <div className="grid grid-cols-6 gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s.face}
            onClick={() => setStep(i)}
            title={`Reprendre la face ${FACE_NAMES[s.face]}`}
            className={`grid aspect-square grid-cols-3 gap-px rounded-md p-1 ${i === step ? "ring-2 ring-white" : "ring-1 ring-white/15"}`}
          >
            {Array.from({ length: 9 }, (_, k) => (
              <span
                key={k}
                className="rounded-[2px]"
                style={{ background: faces[i] ? rgb(faces[i]![k]) : k === 4 ? FACE_COLORS[s.face] : "#26272e" }}
              />
            ))}
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-zinc-500">
        Bonne lumière, sans reflet. Tu pourras corriger chaque case juste après.
      </p>
    </div>
  );
}
