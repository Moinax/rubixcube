import { useEffect, useMemo, useState } from "react";
import CubeView from "./CubeView";
import NetEditor from "./NetEditor";
import Scanner, { type Scan } from "./Scanner";
import { beginnerSolve, findPiece, STAGES, type Group } from "./beginner";
import { applyMove, describeMove, FACE_COLORS, FACE_NAMES, SOLVED, solve, suspects, upright, validate, type Face } from "./cube";

type Screen =
  | { name: "home" }
  | { name: "scan"; scan?: Scan }
  | { name: "edit"; state: string; scan?: Scan }
  | { name: "solving" }
  | { name: "guide"; start: string; groups: Group[]; learn: boolean };

const SHOWCASE = "R U F' L2 D B' R2 U'".split(" ").reduce(applyMove, SOLVED);

const button = "rounded-xl px-4 py-3 font-semibold transition disabled:opacity-40";
const primary = `${button} bg-white text-black hover:bg-zinc-200`;
const secondary = `${button} bg-white/8 text-zinc-100 ring-1 ring-white/10 hover:bg-white/14`;

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });

  async function startGuide(state: string, learn: boolean) {
    setScreen({ name: "solving" });
    await new Promise((r) => setTimeout(r, 50)); // let the spinner paint before the solver blocks
    const groups = learn ? beginnerSolve(state) : [{ stage: 0, text: "", moves: solve(state) }];
    setScreen({ name: "guide", start: state, groups, learn });
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
            Montre les 6 faces de ton cube à la caméra, puis suis les mouvements un par un en 3D : la solution
            la plus courte, ou la méthode débutant pour apprendre à le résoudre toi-même.
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
          initial={screen.scan}
          onDone={(state, scan) => setScreen({ name: "edit", state, scan })}
          onManual={() => setScreen({ name: "edit", state: SOLVED })}
          onCancel={() => setScreen({ name: "home" })}
        />
      );
    case "edit":
      return (
        <Editor
          state={screen.state}
          onChange={(state) => setScreen({ ...screen, state })}
          onScan={() => setScreen({ name: "scan", scan: screen.scan })}
          onSolve={(learn) => startGuide(screen.state, learn)}
        />
      );
    case "solving":
      return <p className="grid min-h-dvh place-items-center text-zinc-400">Calcul de la solution…</p>;
    case "guide":
      return (
        <Guide
          start={screen.start}
          groups={screen.groups}
          learn={screen.learn}
          onScan={() => setScreen({ name: "scan" })}
          onEdit={(state) => setScreen({ name: "edit", state })}
        />
      );
  }
}

type EditorProps = { state: string; onChange: (s: string) => void; onScan: () => void; onSolve: (learn: boolean) => void };

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
      <div className="grid gap-3 md:grid-cols-3">
        <button className={secondary} onClick={onScan}>
          Rescanner
        </button>
        <button className={primary} disabled={!!error} onClick={() => onSolve(false)}>
          Solution rapide
        </button>
        <button className={primary} disabled={!!error} onClick={() => onSolve(true)}>
          Apprendre la méthode
        </button>
      </div>
    </main>
  );
}

type GuideProps = {
  start: string;
  groups: Group[];
  learn: boolean;
  onScan: () => void;
  onEdit: (state: string) => void;
};

function Guide({ start, groups, learn, onScan, onEdit }: GuideProps) {
  const [step, setStep] = useState(0);
  const flat = useMemo(() => groups.flatMap((g, group) => g.moves.map((move) => ({ move, group }))), [groups]);
  const states = useMemo(
    () => flat.reduce((acc, { move }) => [...acc, applyMove(acc.at(-1)!, move)], [start]),
    [start, flat],
  );
  const total = flat.length;
  const done = step === total;
  const go = (delta: number) => setStep((s) => Math.min(total, Math.max(0, s + delta)));
  const move = flat[step]?.move;
  const group = done ? undefined : groups[flat[step].group];
  const groupStart = flat.findIndex((f) => f.group === flat[step]?.group);
  const state = states[step];

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
  // Fast mode lists every move; learn mode only the moves of the current instruction.
  const chips = learn ? flat.map((f, i) => ({ ...f, i })).filter((f) => f.group === flat[step]?.group) : flat.map((f, i) => ({ ...f, i }));
  const stage = learn && group ? STAGES[group.stage] : undefined;

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-4 p-4">
      <p className="text-center text-sm text-zinc-400">
        Tiens ton cube {chip(state[4] as Face)} en haut et {chip(state[22] as Face)} face à toi
        {learn ? "." : ", sans jamais le retourner."}
      </p>

      {learn && (
        <ol className="flex flex-wrap justify-center gap-1.5">
          {STAGES.map((s, i) => {
            const first = flat.findIndex((f) => groups[f.group].stage === i);
            return (
              <li key={s.title}>
                <button
                  disabled={first < 0}
                  onClick={() => setStep(first)}
                  title={first < 0 ? `${s.title} : déjà fait` : s.title}
                  className={`rounded-full px-3 py-1 text-xs font-semibold disabled:line-through disabled:opacity-40 ${
                    group?.stage === i ? "bg-white text-black" : (group?.stage ?? 99) > i ? "bg-white/5 text-zinc-500" : "bg-white/10"
                  }`}
                >
                  {i}. {s.title}
                </button>
              </li>
            );
          })}
        </ol>
      )}

      <div className="grid flex-1 items-center gap-6 md:grid-cols-[1fr_1fr]">
        <div className="aspect-square max-h-[60dvh] w-full justify-self-center">
          <CubeView state={state} move={move} highlight={group?.piece ? findPiece(state, group.piece) : undefined} />
        </div>
        <div className="flex flex-col gap-4 text-center md:text-left">
          {stage && (
            <section className="rounded-xl bg-white/5 p-4 text-left ring-1 ring-white/10">
              <h2 className="font-bold">{stage.title}</h2>
              <p className="text-sm text-zinc-300">{stage.goal}</p>
              <details className="mt-2 text-sm text-zinc-400">
                <summary className="cursor-pointer text-zinc-300">Comment ça marche ?</summary>
                <p className="mt-1">{stage.how}</p>
              </details>
            </section>
          )}
          {done ? (
            <div>
              <p className="text-4xl font-bold">Résolu 🎉</p>
              <p className="mt-2 text-zinc-400">{total ? `${total} mouvements, bravo.` : "Ton cube était déjà résolu."}</p>
            </div>
          ) : (
            <div>
              {group?.text && <p className="mb-3 rounded-lg bg-fuchsia-400/10 p-3 text-left text-fuchsia-100">{group.text}</p>}
              <p className="text-sm text-zinc-400">
                Mouvement {step + 1} / {total}
                {learn && ` · ${step - groupStart + 1} / ${chips.length} de cette séquence`}
              </p>
              <p className="font-mono text-6xl font-bold">{move}</p>
              <p className="mt-2 text-lg">{describeMove(move!)}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button className={secondary} disabled={step === 0} onClick={() => go(-1)}>
              ← Précédent
            </button>
            <button className={primary} disabled={done} onClick={() => go(1)}>
              {step === total - 1 ? "Terminer" : "Suivant →"}
            </button>
          </div>
          <ol className="flex flex-wrap justify-center gap-1.5 md:justify-start">
            {chips.map(({ move: m, i }) => (
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
        </div>
      </div>

      <div className="flex justify-center gap-3 text-sm">
        <span className="text-zinc-500">Perdu ?</span>
        <button className="font-semibold underline" onClick={onScan}>
          Rescanner le cube
        </button>
        <button className="font-semibold underline" onClick={() => onEdit(upright(state))}>
          Corriger les couleurs
        </button>
      </div>
    </main>
  );
}
