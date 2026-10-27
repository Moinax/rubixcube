import { useEffect, useMemo, useState } from "react";
import CubeView from "./CubeView";
import NetEditor from "./NetEditor";
import Scanner from "./Scanner";
import { applyMove, describeMove, FACE_COLORS, FACE_NAMES, SOLVED, solve, suspects, validate, type Face } from "./cube";

type Screen =
  | { name: "home" }
  | { name: "scan" }
  | { name: "edit"; state: string }
  | { name: "solving" }
  | { name: "guide"; start: string; moves: string[] };

const SHOWCASE = "R U F' L2 D B' R2 U'".split(" ").reduce(applyMove, SOLVED);

const button = "rounded-xl px-4 py-3 font-semibold transition disabled:opacity-40";
const primary = `${button} bg-white text-black hover:bg-zinc-200`;
const secondary = `${button} bg-white/8 text-zinc-100 ring-1 ring-white/10 hover:bg-white/14`;

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });

  async function startGuide(state: string) {
    setScreen({ name: "solving" });
    await new Promise((r) => setTimeout(r, 50)); // let the spinner paint before the solver blocks
    setScreen({ name: "guide", start: state, moves: solve(state) });
  }

  switch (screen.name) {
    case "home":
      return (
        <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 p-6 text-center">
          <div className="aspect-square w-full max-w-sm">
            <CubeView state={SHOWCASE} autoRotate />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Résous ton Rubik's Cube</h1>
          <p className="text-zinc-400">
            Montre les 6 faces de ton cube à la caméra, puis suis les mouvements un par un en 3D.
          </p>
          <div className="flex w-full flex-col gap-3">
            <button className={primary} onClick={() => setScreen({ name: "scan" })}>
              Scanner mon cube
            </button>
            <button className={secondary} onClick={() => setScreen({ name: "edit", state: SOLVED })}>
              Saisir les couleurs à la main
            </button>
          </div>
        </main>
      );
    case "scan":
      return (
        <Scanner
          onDone={(state) => setScreen({ name: "edit", state })}
          onManual={() => setScreen({ name: "edit", state: SOLVED })}
          onCancel={() => setScreen({ name: "home" })}
        />
      );
    case "edit":
      return (
        <Editor
          state={screen.state}
          onChange={(state) => setScreen({ name: "edit", state })}
          onScan={() => setScreen({ name: "scan" })}
          onSolve={() => startGuide(screen.state)}
        />
      );
    case "solving":
      return <p className="grid min-h-dvh place-items-center text-zinc-400">Calcul de la solution…</p>;
    case "guide":
      return (
        <Guide
          start={screen.start}
          moves={screen.moves}
          onScan={() => setScreen({ name: "scan" })}
          onEdit={(state) => setScreen({ name: "edit", state })}
        />
      );
  }
}

type EditorProps = { state: string; onChange: (s: string) => void; onScan: () => void; onSolve: () => void };

function Editor({ state, onChange, onScan, onSolve }: EditorProps) {
  const error = validate(state);
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-5 p-4">
      <div>
        <h1 className="text-2xl font-bold">Vérifie les couleurs</h1>
        <p className="text-zinc-400">
          Compare avec ton cube et corrige les cases fausses : choisis une couleur, puis touche la case.
        </p>
      </div>
      <div className="grid items-center gap-6 md:grid-cols-[3fr_2fr]">
        <NetEditor state={state} onChange={onChange} highlight={error ? suspects(state) : undefined} />
        <div className="aspect-square">
          <CubeView state={state} />
        </div>
      </div>
      <p className={`rounded-xl p-3 text-sm ${error ? "bg-amber-950/60 text-amber-200" : "bg-emerald-950/60 text-emerald-200"}`}>
        {error ?? "Ce cube est valide."}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <button className={secondary} onClick={onScan}>
          Rescanner
        </button>
        <button className={primary} disabled={!!error} onClick={onSolve}>
          Résoudre
        </button>
      </div>
    </main>
  );
}

type GuideProps = { start: string; moves: string[]; onScan: () => void; onEdit: (state: string) => void };

function Guide({ start, moves, onScan, onEdit }: GuideProps) {
  const [step, setStep] = useState(0);
  const states = useMemo(() => moves.reduce((acc, m) => [...acc, applyMove(acc.at(-1)!, m)], [start]), [start, moves]);
  const done = step === moves.length;
  const go = (delta: number) => setStep((s) => Math.min(moves.length, Math.max(0, s + delta)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  const chip = (f: Face) => (
    <span className="inline-flex items-center gap-1 font-semibold text-zinc-100">
      <span className="size-3 rounded-sm" style={{ background: FACE_COLORS[f] }} />
      {FACE_NAMES[f]}
    </span>
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-4 p-4">
      <p className="text-center text-sm text-zinc-400">
        Tiens ton cube {chip("U")} en haut et {chip("F")} face à toi, sans jamais le retourner.
      </p>

      <div className="grid flex-1 items-center gap-4 md:grid-cols-[3fr_2fr]">
        <div className="aspect-square max-h-[60dvh] w-full justify-self-center">
          <CubeView state={states[step]} move={moves[step]} />
        </div>
        <div className="flex flex-col gap-4 text-center md:text-left">
          {done ? (
            <div>
              <p className="text-4xl font-bold">Résolu 🎉</p>
              <p className="mt-2 text-zinc-400">
                {moves.length ? `${moves.length} mouvements, bravo.` : "Ton cube était déjà résolu."}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-zinc-400">
                Étape {step + 1} / {moves.length}
              </p>
              <p className="font-mono text-6xl font-bold">{moves[step]}</p>
              <p className="mt-2 text-lg">{describeMove(moves[step])}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button className={secondary} disabled={step === 0} onClick={() => go(-1)}>
              ← Précédent
            </button>
            <button className={primary} disabled={done} onClick={() => go(1)}>
              {step === moves.length - 1 ? "Terminer" : "Suivant →"}
            </button>
          </div>
        </div>
      </div>

      <ol className="flex flex-wrap justify-center gap-1.5">
        {moves.map((m, i) => (
          <li key={i}>
            <button
              onClick={() => setStep(i)}
              className={`min-w-10 rounded-md px-2 py-1 font-mono text-sm ${
                i === step ? "bg-white text-black" : i < step ? "bg-white/5 text-zinc-500" : "bg-white/10"
              }`}
            >
              {m}
            </button>
          </li>
        ))}
      </ol>

      <div className="flex justify-center gap-3 text-sm">
        <span className="text-zinc-500">Perdu ?</span>
        <button className="font-semibold underline" onClick={onScan}>
          Rescanner le cube
        </button>
        <button className="font-semibold underline" onClick={() => onEdit(states[step])}>
          Corriger les couleurs
        </button>
      </div>
    </main>
  );
}
