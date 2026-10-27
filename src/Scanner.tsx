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
// ponytail: fixed thresholds tuned by eye; expose them if some lighting needs it.
const STEADY_FRAMES = 5; // ~0.75 s at one sample per 150 ms
const STEADY = 24; // max channel drift between frames of a still cube
const SAME_CENTER = 60; // closer than this to a captured center = that face again

export type Scan = (RGB[] | undefined)[];

const close = (a: RGB, b: RGB, tolerance: number) => a.every((v, k) => Math.abs(v - b[k]) <= tolerance);
const nextMissing = (faces: Scan) => {
  const i = faces.findIndex((f) => !f);
  return i < 0 ? null : i;
};
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

export const Chip = ({ face }: { face: Face }) => (
  <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-100">
    <span className="size-3.5 rounded-sm" style={{ background: FACE_COLORS[face] }} />
    {FACE_NAMES[face]}
  </span>
);

type Props = {
  initial?: Scan;
  onDone: (state: string, scan: Scan) => void;
  onManual: () => void;
  onCancel: () => void;
};

/**
 * Captures the 6 faces in STEPS order, automatically once a new face holds
 * still in the grid. Any face can be redone; `step` is null once all are in.
 */
export default function Scanner({ initial, onDone, onManual, onCancel }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>();
  const [live, setLive] = useState<RGB[]>([]);
  const [box, setBox] = useState(0);
  const [faces, setFaces] = useState<Scan>(() => initial ?? Array(6).fill(undefined));
  const [step, setStep] = useState<number | null>(() => nextMissing(faces));
  const [steady, setSteady] = useState(0);
  const [flash, setFlash] = useState(false);
  // Display only: a webcam facing you reads like a mirror; samples stay unmirrored.
  const [mirror, setMirror] = useState(true);
  // Recent frames, and whether the view changed since the last capture: a
  // still view that never moved is the previous face or the background.
  const frames = useRef<RGB[][]>([]);
  const moved = useRef(false);

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
        setMirror(s.getVideoTracks()[0]?.getSettings().facingMode !== "environment");
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

  function goTo(next: number | null) {
    setStep(next);
    frames.current = [];
    moved.current = false;
    setSteady(0);
  }

  function capture() {
    if (step === null || !live.length) return;
    const next = faces.with(step, live);
    setFaces(next);
    navigator.vibrate?.(60);
    setFlash(true);
    setTimeout(() => setFlash(false), 350);
    goTo(nextMissing(next));
  }

  useEffect(() => {
    if (step === null || !live.length) return;
    const recent = (frames.current = [...frames.current, live].slice(-STEADY_FRAMES));
    const still = recent.filter((f) => f.every((c, i) => close(c, live[i], STEADY))).length;
    if (still < recent.length) moved.current = true;
    const known = faces.some((f, i) => f && i !== step && close(f[4], live[4], SAME_CENTER));
    const dark = live.some((c) => Math.max(...c) < 45);
    const ready = moved.current && !known && !dark;
    setSteady(ready ? still / STEADY_FRAMES : 0);
    if (ready && still === STEADY_FRAMES) capture();
  }, [live]); // only a new frame triggers a check; `capture` reads this render's state

  // Facelet order is URFDLB, scan order is not.
  const finish = () => onDone(classify([...FACES].flatMap((f) => faces[STEPS.findIndex((s) => s.face === f)]!)), faces);
  const current = step === null ? undefined : STEPS[step];
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <button onClick={onCancel} className="text-sm text-zinc-400 hover:text-zinc-100">
          ← Retour
        </button>
        <span className="text-sm text-zinc-400">
          {step === null ? "Vérification" : `Face ${step + 1} / 6`}
        </span>
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
            {current ? (
              <>
                {faces[step!] ? "Refais cette face." : current.hint}
                <br />
                Face <Chip face={current.face} /> vers la caméra, <Chip face={current.top} /> en haut, et ne bouge
                plus.
              </>
            ) : (
              "Les 6 faces sont capturées. Une miniature ne ressemble pas à ton cube ? Touche-la pour refaire cette face."
            )}
          </p>
          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video ref={video} playsInline muted className={`block w-full ${mirror ? "-scale-x-100" : ""}`} />
            <button
              onClick={() => setMirror((m) => !m)}
              aria-pressed={mirror}
              className="absolute top-2 right-2 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-semibold backdrop-blur hover:bg-black/80"
            >
              ⇋ Miroir {mirror ? "activé" : "désactivé"}
            </button>
            {box > 0 && (
              <div
                className={`absolute top-1/2 left-1/2 grid aspect-square -translate-1/2 grid-cols-3 overflow-hidden rounded-xl ring-2 transition ${
                  flash ? "bg-emerald-400/40 ring-emerald-400" : "ring-white/80"
                } ${step === null ? "opacity-40" : ""} ${mirror ? "-scale-x-100" : ""}`}
                style={{ width: `${box}%` }}
              >
                {live.map((c, i) => (
                  <div key={i} className="grid place-items-center border border-white/40">
                    <span className="size-4 rounded-full ring-2 ring-white" style={{ background: rgb(c) }} />
                  </div>
                ))}
                <div
                  className="absolute bottom-0 left-1/2 h-1.5 -translate-x-1/2 bg-emerald-400 transition-[width] duration-150"
                  style={{ width: `${steady * 100}%` }}
                />
              </div>
            )}
          </div>
          {current ? (
            <button
              onClick={capture}
              disabled={!live.length}
              className="rounded-xl bg-white/8 py-3 font-semibold ring-1 ring-white/10 hover:bg-white/14 disabled:opacity-40"
            >
              Capturer maintenant
            </button>
          ) : (
            <button onClick={finish} className="rounded-xl bg-white py-3 font-semibold text-black hover:bg-zinc-200">
              Valider les 6 faces
            </button>
          )}
        </>
      )}

      <div className="grid grid-cols-6 gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s.face}
            onClick={() => goTo(i)}
            title={`Refaire la face ${FACE_NAMES[s.face]}`}
            aria-label={`Refaire la face ${FACE_NAMES[s.face]}`}
            className={`grid aspect-square grid-cols-3 gap-px rounded-md p-1 ${i === step ? "ring-2 ring-white" : "ring-1 ring-white/15"} ${mirror ? "-scale-x-100" : ""}`}
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
        La face est capturée toute seule quand elle reste immobile dans la grille. Bonne lumière, sans reflet : tu
        pourras encore corriger chaque case après.
      </p>
    </div>
  );
}
