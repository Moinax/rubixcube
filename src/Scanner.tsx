import { useEffect, useRef, useState, type ReactNode } from "react";
import { Back, ENTER_COLORS } from "./Home";
import { classify, FACE_COLORS, FACE_NAMES, FACES, feminine, INFLECTED, vivid, type Face, type RGB } from "./cube";
import { capitalize, tr } from "./i18n";

// Turning the cube a quarter left each time shows F, R, B, L; then the top and bottom.
const AGAIN = tr({ fr: "Encore un quart vers la gauche.", nl: "Nog een kwartslag naar links.", en: "Another quarter to the left." });
const STEPS: { face: Face; top: Face; hint: string }[] = [
  { face: "F", top: "U", hint: tr({ fr: "Commence par la face avant.", nl: "Begin met de voorkant.", en: "Start with the front face." }) },
  {
    face: "R",
    top: "U",
    hint: tr({ fr: "Tourne le cube d'un quart vers la gauche.", nl: "Draai de kubus een kwartslag naar links.", en: "Turn the cube a quarter to the left." }),
  },
  { face: "B", top: "U", hint: AGAIN },
  { face: "L", top: "U", hint: AGAIN },
  {
    face: "U",
    top: "B",
    hint: tr({ fr: "Bascule le cube pour montrer le dessus.", nl: "Kantel de kubus om de bovenkant te tonen.", en: "Tip the cube over to show the top." }),
  },
  { face: "D", top: "F", hint: tr({ fr: "Puis le dessous.", nl: "Dan de onderkant.", en: "Then the bottom." }) },
];
/** « Face verte », "Green face". */
const faceTitle = (f: Face) => tr({ fr: `Face ${feminine(f)}`, nl: `${capitalize(INFLECTED[f])} kant`, en: `${capitalize(FACE_NAMES[f])} face` });
const redoLabel = (f: Face) =>
  tr({ fr: `Refaire la face ${feminine(f)}`, nl: `De ${INFLECTED[f]} kant opnieuw doen`, en: `Redo the ${FACE_NAMES[f]} face` });
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

// Readable on the dark plastic: white as chalk, blue a little lighter than its sticker.
const TEXT_COLORS: Record<Face, string> = { ...FACE_COLORS, U: "var(--color-chalk)", B: "#4f8ff7" };
const COLOR_FACES = tr<Record<string, Face>>({
  fr: { blanc: "U", blanche: "U", rouge: "R", vert: "F", verte: "F", jaune: "D", orange: "L", bleu: "B", bleue: "B" },
  nl: { wit: "U", witte: "U", rood: "R", rode: "R", groen: "F", groene: "F", geel: "D", gele: "D", oranje: "L", blauw: "B", blauwe: "B" },
  en: { white: "U", red: "R", green: "F", yellow: "D", orange: "L", blue: "B" },
});
const COLOR_WORDS = new RegExp(`(?<!\\p{L})(${Object.keys(COLOR_FACES).join("|")})s?(?!\\p{L})`, "giu");

/** `text` with every color name in bold and in its face color: « le centre <b>rouge</b> », "the <b>red</b> center". */
export function Colored({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(COLOR_WORDS)) {
    parts.push(text.slice(last, m.index));
    parts.push(
      <b key={m.index} className="font-semibold" style={{ color: TEXT_COLORS[COLOR_FACES[m[1].toLowerCase()]] }}>
        {m[0]}
      </b>,
    );
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

export const Chip = ({ face }: { face: Face }) => (
  <span className="inline-flex items-center gap-1.5 font-semibold text-chalk">
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
      setError(
        tr({
          fr: "La caméra n'est disponible qu'en HTTPS ou sur localhost (lance « pnpm dev:lan » pour un téléphone).",
          nl: "De camera werkt alleen via HTTPS of op localhost (start „pnpm dev:lan” voor een telefoon).",
          en: "The camera only works over HTTPS or on localhost (run “pnpm dev:lan” for a phone).",
        }),
      );
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
      .catch((e: Error) =>
        setError(
          tr({
            fr: `Impossible d'ouvrir la caméra : ${e.message}`,
            nl: `Kan de camera niet openen: ${e.message}`,
            en: `Couldn't open the camera: ${e.message}`,
          }),
        ),
      );

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
    // Any face of a mixed cube shows several colored stickers; a person or a room shows none.
    const cube = live.filter(vivid).length >= 4;
    const ready = moved.current && !known && !dark && cube;
    setSteady(ready ? still / STEADY_FRAMES : 0);
    if (ready && still === STEADY_FRAMES) capture();
  }, [live]); // only a new frame triggers a check; `capture` reads this render's state

  // Facelet order is URFDLB, scan order is not.
  const finish = () => onDone(classify([...FACES].flatMap((f) => faces[STEPS.findIndex((s) => s.face === f)]!)), faces);
  const current = step === null ? undefined : STEPS[step];
  const filled = flash ? 100 : steady * 100;
  return (
    <main className="mx-auto flex w-full flex-1 max-w-xl flex-col gap-4 p-4 md:py-10">
      <div className="flex items-center justify-between">
        <Back label={tr({ fr: "Annuler", nl: "Annuleren", en: "Cancel" })} onClick={onCancel} />
        <button
          onClick={() => setMirror((m) => !m)}
          aria-pressed={mirror}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${mirror ? "border-chalk/40 text-chalk" : "border-edge text-mist"}`}
        >
          {tr({ fr: "Miroir", nl: "Spiegelen", en: "Mirror" })}
        </button>
      </div>

      {/* The 6 faces double as progress: captured, current (ringed), still to do (center only). */}
      <div className="grid grid-cols-6 gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s.face}
            onClick={() => goTo(i)}
            title={redoLabel(s.face)}
            aria-label={redoLabel(s.face)}
            aria-current={i === step ? "step" : undefined}
            className={`grid aspect-square grid-cols-3 gap-px rounded-lg bg-black p-1 ${i === step ? "ring-2 ring-chalk" : ""} ${mirror ? "-scale-x-100" : ""}`}
          >
            {Array.from({ length: 9 }, (_, k) => (
              <span
                key={k}
                className="rounded-[2px]"
                style={{ background: faces[i] ? rgb(faces[i]![k]) : k === 4 ? FACE_COLORS[s.face] : "var(--color-blank)" }}
              />
            ))}
          </button>
        ))}
      </div>

      {error ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
          {error}
          <button onClick={onManual} className="btn btn-main">
            {ENTER_COLORS}
          </button>
        </div>
      ) : (
        <>
          <div>
            {current ? (
              <>
                <h1 className="wide flex items-center gap-2.5 text-2xl">
                  <span className="size-4 rounded" style={{ background: FACE_COLORS[current.face] }} />
                  {faceTitle(current.face)}
                </h1>
                <p className="mt-1 text-mist">
                  <Colored
                    text={tr({
                      fr: `${faces[step!] ? "Refais cette face." : current.hint} Le ${FACE_NAMES[current.top]} en haut, tiens-la immobile dans le cadre.`,
                      nl: `${faces[step!] ? "Doe deze kant opnieuw." : current.hint} ${capitalize(FACE_NAMES[current.top])} boven, houd de kubus stil in het kader.`,
                      en: `${faces[step!] ? "Redo this face." : current.hint} ${capitalize(FACE_NAMES[current.top])} on top, hold it still in the frame.`,
                    })}
                  />
                </p>
              </>
            ) : (
              <>
                <h1 className="wide text-2xl">{tr({ fr: "Les 6 faces sont prises", nl: "Alle 6 kanten zijn vastgelegd", en: "All 6 faces are in" })}</h1>
                <p className="mt-1 text-mist">
                  {tr({
                    fr: "Une miniature ne ressemble pas à ton cube ? Touche-la pour refaire cette face.",
                    nl: "Lijkt een miniatuur niet op je kubus? Tik erop om die kant opnieuw te doen.",
                    en: "A thumbnail doesn't match your cube? Tap it to redo that face.",
                  })}
                </p>
              </>
            )}
          </div>
          <div className="relative overflow-hidden rounded-3xl bg-black">
            <video ref={video} playsInline muted className={`block w-full ${mirror ? "-scale-x-100" : ""}`} />
            {box > 0 && (
              <div
                className={`absolute top-1/2 left-1/2 grid aspect-square -translate-1/2 grid-cols-3 overflow-hidden rounded-2xl ring-2 transition ${
                  flash ? "bg-place/40 ring-place" : "ring-chalk/90"
                } ${step === null ? "opacity-40" : ""} ${mirror ? "-scale-x-100" : ""}`}
                style={{ width: `${box}%` }}
              >
                {live.map((c, i) => (
                  <div key={i} className="grid place-items-center border border-white/30">
                    <span className="size-4 rounded-full ring-2 ring-white" style={{ background: rgb(c) }} />
                  </div>
                ))}
              </div>
            )}
            {current && box > 0 && (
              <p className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 py-1.5 pr-3 pl-1.5 text-sm whitespace-nowrap backdrop-blur">
                <span
                  className="size-5 rounded-full [mask:radial-gradient(circle_6px,transparent_98%,#000)]"
                  style={{ background: `conic-gradient(var(--color-place) ${filled}%, #ffffff30 0)` }}
                />
                {flash
                  ? tr({ fr: "Capturée", nl: "Vastgelegd", en: "Captured" })
                  : steady > 0
                    ? tr({ fr: "Ne bouge plus…", nl: "Niet bewegen…", en: "Hold still…" })
                    : tr({ fr: "Place la face dans le cadre", nl: "Plaats de kant in het kader", en: "Fit the face in the frame" })}
              </p>
            )}
          </div>
          {current ? (
            <button
              onClick={capture}
              disabled={!live.length}
              className="self-center text-sm text-mist underline underline-offset-4 hover:text-chalk disabled:opacity-40"
            >
              {tr({ fr: "Capturer maintenant", nl: "Nu vastleggen", en: "Capture now" })}
            </button>
          ) : (
            <button onClick={finish} className="btn btn-main">
              {tr({ fr: "Valider les 6 faces", nl: "De 6 kanten bevestigen", en: "Confirm the 6 faces" })}
            </button>
          )}
          <p className="text-center text-xs text-mist">
            {tr({
              fr: "Bonne lumière, sans reflet. Tu pourras corriger chaque case ensuite.",
              nl: "Goed licht, zonder weerspiegeling. Je kunt elk vakje achteraf nog corrigeren.",
              en: "Good light, no glare. You can fix any square afterwards.",
            })}
          </p>
        </>
      )}
    </main>
  );
}
