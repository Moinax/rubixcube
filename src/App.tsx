import { useEffect, useMemo, useState } from "react";
import CubeView from "./CubeView";
import NetEditor from "./NetEditor";
import Scanner, { Chip, type Scan } from "./Scanner";
import { beginnerSolve, findPiece, homeOf, STAGES, type Group } from "./beginner";
import { COURSE } from "./course";
import { applyMove, describeMove, SOLVED, solve, suspects, upright, validate, type Face } from "./cube";

type Screen =
  | { name: "home" }
  | { name: "scan"; scan?: Scan }
  | { name: "edit"; state: string; scan?: Scan }
  | { name: "solving" }
  | { name: "guide"; start: string; groups: Group[]; learn: boolean; step: number; course?: boolean };

// The current screen survives a reload, so a scanned cube never has to be scanned again.
const STORAGE_KEY = "rubixcube";
function restore(): Screen {
  try {
    const screen: Screen = JSON.parse(localStorage.getItem(STORAGE_KEY)!) ?? { name: "home" };
    // Rebuild the plan and its texts from the code, so an update reaches a guide in progress;
    // the saved plan stays if that fails. The fast solution has no texts and costs a solver
    // warm-up, so it stays as saved.
    if (screen.name === "guide" && screen.learn) {
      try {
        screen.groups = screen.course ? COURSE : beginnerSolve(screen.start);
      } catch (e) {
        console.error(e);
      }
      screen.step = Math.min(screen.step, screen.groups.reduce((n, g) => n + g.moves.length, 0));
    }
    return screen;
  } catch {
    return { name: "home" };
  }
}

const SHOWCASE = "R U F' L2 D B' R2 U'".split(" ").reduce(applyMove, SOLVED);

const button = "rounded-xl px-4 py-3 font-semibold transition disabled:opacity-40";
const primary = `${button} bg-white text-black hover:bg-zinc-200`;
const secondary = `${button} bg-white/8 text-zinc-100 ring-1 ring-white/10 hover:bg-white/14`;

export default function App() {
  const [screen, setScreen] = useState<Screen>(restore);
  useEffect(() => {
    if (screen.name !== "solving") localStorage.setItem(STORAGE_KEY, JSON.stringify(screen));
  }, [screen]);

  async function startGuide(edit: Extract<Screen, { name: "edit" }>, learn: boolean) {
    setScreen({ name: "solving" });
    await new Promise((r) => setTimeout(r, 50)); // let the spinner paint before the solver blocks
    try {
      const groups = learn ? beginnerSolve(edit.state) : [{ stage: 0, text: "", moves: solve(edit.state) }];
      setScreen({ name: "guide", start: edit.state, groups, learn, step: 0 });
    } catch (e) {
      console.error(e);
      alert("Le calcul de la solution a échoué. Vérifie les couleurs, ou essaie l'autre mode.");
      setScreen(edit);
    }
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
            la plus courte, ou la méthode débutant pour apprendre à le résoudre toi-même. Sans scanner, le cours
            t'apprend la méthode cas par cas, sur un cube d'exemple.
          </p>
          <div className="flex w-full flex-col gap-3">
            <button className={primary} onClick={() => setScreen({ name: "scan" })}>
              Scanner mon cube
            </button>
            <button className={secondary} onClick={() => setScreen({ name: "edit", state: SOLVED })}>
              Saisir les couleurs à la main
            </button>
            <button
              className={secondary}
              onClick={() => setScreen({ name: "guide", start: COURSE[0].from!, groups: COURSE, learn: true, step: 0, course: true })}
            >
              Apprendre sans scanner
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
          onSolve={(learn) => startGuide(screen, learn)}
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
          course={screen.course}
          step={screen.step}
          onStep={(step) => setScreen({ ...screen, step })}
          onHome={() => setScreen({ name: "home" })}
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

const FACES_EN: [string, string][] = [["R", "Right"], ["L", "Left"], ["U", "Up"], ["D", "Down"], ["F", "Front"], ["B", "Back"]];

/** How to read the moves: the standard (Singmaster) notation every cube tutorial uses. */
function Notation() {
  const letter = (m: string) => <span className="font-mono font-bold text-zinc-100">{m}</span>;
  return (
    <details className="text-left text-sm text-zinc-400">
      <summary className="cursor-pointer text-zinc-300">Que veulent dire les lettres ?</summary>
      <div className="mt-2 flex flex-col gap-2">
        <p>
          C'est la notation standard des cubeurs. Chaque lettre est l'initiale anglaise d'une face ; seule, elle
          veut dire un quart de tour dans le sens des aiguilles d'une montre, comme si tu regardais cette face en face.
        </p>
        <ul className="grid gap-1 sm:grid-cols-2">
          {FACES_EN.map(([m, en]) => (
            <li key={m}>
              {letter(m)} <span className="text-zinc-500">({en})</span> : {describeMove(m).replace(" : ", ", ")}
            </li>
          ))}
        </ul>
        <p>
          {letter("'")} (prime) : le même quart de tour dans l'autre sens, {letter("R'")} défait {letter("R")}.{" "}
          {letter("2")} : un demi-tour, {letter("U2")} = {letter("U U")}. {letter("x y z")} : tout le cube tourne
          dans ta main, comme {letter("R")}, {letter("U")} et {letter("F")}.
        </p>
      </div>
    </details>
  );
}

type GuideProps = {
  start: string;
  groups: Group[];
  learn: boolean;
  course?: boolean;
  step: number;
  onStep: (step: number) => void;
  onHome: () => void;
  onScan: () => void;
  onEdit: (state: string) => void;
};

function Guide({ start, groups, learn, course, step, onStep, onHome, onScan, onEdit }: GuideProps) {
  const flat = useMemo(() => groups.flatMap((g, group) => g.moves.map((move) => ({ move, group }))), [groups]);
  // States before each move; a group with its own start cube (a course demo) begins from it.
  const states = useMemo(() => {
    const out = [start];
    flat.forEach(({ move, group }, i) => {
      if (flat[i - 1]?.group !== group) out[i] = groups[group].from ?? out[i];
      out.push(applyMove(out[i], move));
    });
    return out;
  }, [start, flat, groups]);
  const total = flat.length;
  const done = step === total;
  const go = (delta: number) => onStep(Math.min(total, Math.max(0, step + delta)));
  const move = flat[step]?.move;
  const group = done ? undefined : groups[flat[step].group];
  const groupStart = flat.findIndex((f) => f.group === flat[step]?.group);
  const state = states[step];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A focused button already handles Space itself.
      if (e.key === " " && (e.target as Element).closest("button, summary")) return;
      if (e.key === " ") e.preventDefault();
      if (e.key === "ArrowRight" || e.key === " ") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  // Fast mode lists every move; learn mode only the moves of the current instruction.
  const chips = flat.map((f, i) => ({ ...f, i })).filter((f) => !learn || f.group === flat[step]?.group);
  const stage = learn && group ? STAGES[group.stage] : undefined;
  const inGroup = `${step - groupStart + 1} / ${chips.length}`;
  const counter = course
    ? `Mouvement ${inGroup} de ce cas`
    : `Mouvement ${step + 1} / ${total}${learn ? ` · ${inGroup} de cette séquence` : ""}`;
  const doneText = course
    ? "Prends ton cube et refais chaque étape : les pastilles te ramènent à n'importe quel cas."
    : total ? `${total} mouvements, bravo.` : "Ton cube était déjà résolu.";

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-3 text-sm text-zinc-400">
        <button onClick={onHome} className="hover:text-zinc-100">
          ← Accueil
        </button>
        <p className="text-center">
          {course ? (
            `Cube d'exemple : trouve le même cas sur ton cube${group && group.stage > 0 ? ", tenu jaune en haut" : ""}.`
          ) : (
            <>
              Tiens ton cube <Chip face={state[4] as Face} /> en haut et <Chip face={state[22] as Face} /> face à toi
              {learn ? "." : ", sans jamais le retourner."}
            </>
          )}
        </p>
        <span />
      </div>

      {learn && (
        <ol className="flex flex-wrap justify-center gap-1.5">
          {STAGES.map((s, i) => {
            const first = flat.findIndex((f) => groups[f.group].stage === i);
            return (
              <li key={s.title}>
                <button
                  disabled={first < 0}
                  onClick={() => onStep(first)}
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
          <CubeView
            state={state}
            move={move}
            highlight={group?.piece ? findPiece(state, group.piece) : undefined}
            target={stage?.toHome && group?.piece ? homeOf(state, group.piece) : undefined}
          />
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
              {course && (
                <ol className="mt-3 flex flex-wrap gap-1.5">
                  {groups.map((g, i) => {
                    if (g.stage !== group?.stage) return null;
                    const first = flat.findIndex((f) => f.group === i);
                    return (
                      <li key={i}>
                        <button
                          onClick={() => onStep(first)}
                          className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                            g === group ? "bg-fuchsia-300 text-black" : "bg-white/10 hover:bg-white/15"
                          }`}
                        >
                          {g.title}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          )}
          {done ? (
            <div>
              <p className="text-4xl font-bold">{course ? "Cours terminé 🎉" : "Résolu 🎉"}</p>
              <p className="mt-2 text-zinc-400">{doneText}</p>
            </div>
          ) : (
            <div>
              {group?.text && (
                <div className="mb-3 rounded-lg bg-fuchsia-400/10 p-3 text-left text-fuchsia-100">
                  {group.title && <p className="font-semibold">{group.title}</p>}
                  <p>{group.text}</p>
                </div>
              )}
              <p className="text-sm text-zinc-400">{counter}</p>
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
                  onClick={() => onStep(i)}
                  title={describeMove(m)}
                  className={`min-w-10 rounded-md px-2 py-1 font-mono text-sm ${
                    i === step ? "bg-white text-black" : i < step ? "bg-white/5 text-zinc-500" : "bg-white/10"
                  }`}
                >
                  {m}
                </button>
              </li>
            ))}
          </ol>
          <Notation />
        </div>
      </div>

      {!course && (
        <div className="flex justify-center gap-3 text-sm">
          <span className="text-zinc-500">Perdu ?</span>
          <button className="font-semibold underline" onClick={onScan}>
            Rescanner le cube
          </button>
          <button className="font-semibold underline" onClick={() => onEdit(upright(state))}>
            Corriger les couleurs
          </button>
        </div>
      )}
    </main>
  );
}
