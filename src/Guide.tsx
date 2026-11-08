import { useEffect, useId, useMemo, useRef, useState } from "react";
import CubeView, { INDEX_COLOR, THUMB_COLOR } from "./CubeView";
import Lexicon, { type Tab } from "./Lexicon";
import { Chevron, HOME, modeTitle, TopBar, usePopover } from "./Home";
import { Chip, Colored, Swatches } from "./Scanner";
import { algOf, findPiece, names, pieceColors, planStates, play, slotOf, STAGES, type Group, type Stage } from "./beginner";
import type { Intro } from "./course";
import { applyMove, describeMove, invert, upright, type Face } from "./cube";
import { nOf, tr } from "./i18n";

/** "Face du haut : un quart de tour…" with the face in bold. */
function MoveText({ move, finger }: { move: string; finger?: string }) {
  const [face, turn] = describeMove(move);
  return (
    <p>
      <span className="font-semibold text-chalk">{face}</span> <span className="text-mist">{turn}</span>
      {finger && (
        <>
          <span className="text-mist"> · </span>
          <span className="font-semibold text-chalk">{finger}</span>
        </>
      )}
    </p>
  );
}

/** « L'arête blanc-vert », "the white-green edge", named as the instructions name it. */
function pieceName(piece: string) {
  const n = names(piece);
  return piece.length === 3
    ? tr({ fr: `Le coin ${n}`, nl: `Hoekstuk ${n}`, en: `The ${n} corner` })
    : tr({ fr: `L'arête ${n}`, nl: `Randstuk ${n}`, en: `The ${n} edge` });
}

/** A piece's colors as swatches, with its name, outlined in the piece's pink. */
const PieceChip = ({ piece }: { piece: string }) => (
  <span className="rounded-lg bg-raised py-0.5 pr-2 pl-1.5 ring-1 ring-piece">
    <Swatches faces={pieceColors(piece)} />
    {pieceName(piece)}
  </span>
);
/** « → sa place », or « → leur place » for a pair. */
const placeOf = (pair?: string) =>
  pair ? tr({ fr: "leur place", nl: "hun plek", en: "their place" }) : tr({ fr: "sa place", nl: "zijn plek", en: "its place" });

/** « 20 coups », "1 move". */
const moves = (n: number) =>
  tr({ fr: `${n} coup${n > 1 ? "s" : ""}`, nl: `${n} ${n === 1 ? "zet" : "zetten"}`, en: `${n} move${n === 1 ? "" : "s"}` });

type GuideProps = {
  start: string;
  groups: Group[];
  learn: boolean;
  course?: boolean;
  /** The method's stages: the beginner method's unless told otherwise. */
  stages?: Stage[];
  step: number;
  onStep: (step: number) => void;
  onHome: () => void;
  /** The cases of one stage, shown on their own over another screen: no progress bar, stage list or glossary
   * button, only the cases and a way back. */
  focus?: { title: string; onClose: () => void; intro?: Intro };
  onScan: () => void;
  onEdit: (state: string) => void;
};

/** A move playing from `from`, forward or undone (inverted), and the group it belongs to. */
type Anim = { from: string; move: string; group: Group };

const DELAYS = [2, 3, 5, 8];
const DELAY_KEY = "rubixcube:delay";

const ICONS = {
  back: (
    <>
      <rect x="5" y="5" width="2.5" height="14" rx="1" />
      <path d="M19 5v14L9 12z" />
    </>
  ),
  auto: <path d="M3.5 5v14l8.5-7zM12 5v14l8.5-7z" />,
  pause: <path d="M6 5h4v14H6zM14 5h4v14h-4z" />,
  play: <path d="M7 5v14l12-7z" />,
  next: <path d="M5 5v14l9-7zM15.5 5h3v14h-3z" />,
  done: <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />,
};
const Icon = ({ name, className = "size-5" }: { name: keyof typeof ICONS; className?: string }) => (
  <svg viewBox="0 0 24 24" className={`${className} flex-none`} fill="currentColor" aria-hidden>
    {ICONS[name]}
  </svg>
);
const DONE = tr({ fr: "Terminé", nl: "Klaar", en: "Done" });
const INTRO_LABEL = tr({ fr: "Présentation", nl: "Kennismaking", en: "Introduction" });
const LABEL = "text-[11px] font-bold tracking-wide text-mist uppercase";
// A click leaves the focus where it was, so Space keeps toggling the auto mode.
const keepFocus = (e: React.MouseEvent) => e.preventDefault();

export default function Guide({ start, groups, learn, course, stages = STAGES, step, onStep, onHome, focus, onScan, onEdit }: GuideProps) {
  const flat = useMemo(() => groups.flatMap((g, group) => g.moves.map((move) => ({ move, group }))), [groups]);
  const states = useMemo(() => planStates(start, groups), [start, groups]);
  const total = flat.length;
  // The cube each group leaves, and the place it leaves its piece in, named by the centers around it.
  const ends = useMemo(() => {
    let i = 0;
    return groups.map((g) => play(states[(i += g.moves.length) - g.moves.length], g.moves));
  }, [groups, states]);
  const slots = useMemo(() => {
    const slot = (i: number, piece?: string) => piece && slotOf(ends[i], findPiece(ends[i], piece));
    return new Map(groups.map((g, i) => [g, { piece: slot(i, g.piece), pair: slot(i, g.pair) }]));
  }, [groups, ends]);
  /** Whether the group ending before move `s` hands over to another cube (a new demo): a fade swaps them. */
  const newCubeAt = (s: number) => states[s] !== ends[flat[s - 1].group];
  /** Whether a stage ends before move `s`, a phase in the fast mode. */
  const stageEndAt = (s: number) => !learn || groups[flat[s].group].stage !== groups[flat[s - 1].group].stage;
  /** Whether move `s` starts a group, after another. */
  const boundaryAt = (s: number) => s > 0 && s < total && flat[s].group !== flat[s - 1].group;
  /** Whether a result stop ends the group before move `s`: only when the next one starts on another cube (a new
   * demo). Otherwise the last move leads straight to the next sequence, its piece and place already outlined. */
  const resultAt = (s: number) => boundaryAt(s) && newCubeAt(s);
  /** Whether move `s` starts a new stage (a phase, in the fast mode). */
  const stageStartAt = (s: number) => boundaryAt(s) && stageEndAt(s);

  // On the result of a course demo, before the next demo's cube fades in.
  const [atResult, setAtResult] = useState(false);
  // The stage's presentation, before its first case: the whole stage played once, then ▶ goes on to the cases.
  const intro = focus?.intro;
  const [atIntro, setAtIntro] = useState(!!intro && step === 0);
  const [introRun, setIntroRun] = useState(0);
  const done = step === total;
  const gi = atResult ? flat[step - 1].group : flat[step]?.group;
  const group = gi === undefined ? undefined : groups[gi];
  const move = atResult || atIntro ? undefined : flat[step]?.move;
  const state = atResult ? ends[gi!] : states[step];

  // The cube rests on `state`; a step forward or back plays its move, while the texts already show where it lands.
  const [anim, setAnim] = useState<Anim | null>(null);
  // The fade that swaps one demo cube for the next.
  const [fading, setFading] = useState(false);
  const [auto, setAuto] = useState(false);
  const [delay, setDelay] = useState(() => Number(localStorage.getItem(DELAY_KEY)) || 5);
  const [lexicon, setLexicon] = useState<{ tab: Tab; focus?: string } | null>(null);
  /** Goes to move `to`, or to the result stop just before it. */
  const land = (to: number, result = false) => {
    setAtResult(result);
    onStep(to);
  };
  /** Swaps the cube for one no move leads to: a fade, never a jump. A jump, or leaving the guide, cancels it. */
  const fade = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(fade.current), []);
  const swap = (then: () => void) => {
    setFading(true);
    fade.current = setTimeout(() => {
      then();
      setFading(false);
    }, 200);
  };
  const jump = (to: number) => {
    setAtIntro(false);
    clearTimeout(fade.current);
    setFading(false);
    setAnim(null);
    land(to);
  };
  const showIntro = () => {
    jump(0);
    setAtIntro(true);
    setIntroRun((n) => n + 1);
  };
  const forward = () => {
    if (atIntro) return swap(() => setAtIntro(false));
    if (done || fading) return;
    if (atResult) return swap(() => land(step));
    setAnim({ from: state, move: flat[step].move, group: group! });
    land(step + 1, resultAt(step + 1));
    // The autoplay stops at the end of the guide, and of each stage: the next one starts on a press.
    if (step + 1 === total || stageStartAt(step + 1)) setAuto(false);
  };
  const back = () => {
    if (intro && !step && !atIntro && !fading) return swap(() => setAtIntro(true));
    if (fading || !step) return;
    if (!atResult && resultAt(step)) {
      setAnim(null);
      return swap(() => setAtResult(true));
    }
    const { move: m, group: g } = flat[step - 1];
    // From the end of that move: a course demo may start right after it, on another cube.
    setAnim({ from: applyMove(states[step - 1], m), move: invert([m])[0], group: groups[g] });
    land(step - 1);
  };
  const toggleAuto = () => {
    setAuto(!auto);
    if (!auto) forward(); // starts right away
  };
  const chooseDelay = (d: number) => {
    setDelay(d);
    localStorage.setItem(DELAY_KEY, String(d));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (lexicon) return; // the glossary is open over the guide
      if (e.key === "?" && !(e.target as Element).closest("input, textarea")) return setLexicon({ tab: "moves" });
      if (e.key === "Escape") return focus ? focus.onClose() : closePicker();
      // A focused control already handles Space itself.
      if (e.key === " " && (e.target as Element).closest("button, summary, input")) return;
      if (e.key === " ") {
        e.preventDefault();
        if (!done) toggleAuto();
      }
      if (e.key === "ArrowRight") forward();
      if (e.key === "ArrowLeft") back();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  // Learn and course modes walk one instruction at a time; the fast mode is one long sequence.
  const groupStart = flat.findIndex((f) => f.group === gi);
  const [n, of] = learn ? [step - groupStart + 1, group?.moves.length ?? 0] : [step + 1, total];
  const position = nOf(n, of);
  // The named sequence of the instruction, and where the next move stands in it.
  const alg = group?.alg;
  const k = step - groupStart;
  const part = !alg
    ? undefined
    : k < alg.setup
      ? tr({ fr: "préparation", nl: "voorbereiding", en: "setup" })
      : `${alg.name}${alg.reps > 1 ? ` ${Math.floor((k - alg.setup) / alg.moves.length) + 1}/${alg.reps}` : ""}`;

  // The instruction's parts: only the one being played shows, the last one on a result stop.
  const parts = group?.steps ?? (group ? [{ text: "", count: group.moves.length }] : []);
  const partEnds = parts.map((_, j) => groupStart + parts.slice(0, j + 1).reduce((sum, p) => sum + p.count, 0));
  const partNow = atResult ? parts.length - 1 : partEnds.findIndex((end) => step < end);

  // A new instruction gets twice the time to be read before its first move.
  const wait = delay * 1000 * (learn && !atResult && step === groupStart ? 2 : 1);
  useEffect(() => {
    if (!auto || fading || lexicon) return; // waits while the glossary is open
    const timer = setTimeout(forward, wait);
    return () => clearTimeout(timer);
  }, [auto, step, atResult, wait, fading, lexicon]);

  // Progress: one segment per stage (per phase in the fast mode), as long as its moves.
  const current = group?.stage ?? stages.length - 1;
  const firsts = stages.map((_, i) => flat.findIndex((f) => groups[f.group].stage === i));
  const segments = learn
    ? stages.map((s, i) => ({ title: s.title, first: firsts[i], count: flat.filter((f) => groups[f.group].stage === i).length }))
    : groups.map((g, i) => ({ title: g.title, first: flat.findIndex((f) => f.group === i), count: g.moves.length }));
  const reached = done ? segments.length : learn ? current : flat[step].group;
  const stage = learn ? stages[current] : undefined;
  // The stage list is a popover: it closes on any step change, a tap outside it, or Escape.
  const { ref: picker, close: closePicker } = usePopover(step);
  const { ref: casePicker } = usePopover(`${step}|${atIntro}`);

  const piece = group?.piece;
  /** What one case of a stage does toward it; lessons (stage 0) and the fast mode's phases have none. */
  const aim = learn && group && group.stage > 0 ? (stages[group.stage].aim ?? stages[group.stage].goal) : undefined;
  const cases = course ? groups.map((g, i) => ({ g, first: flat.findIndex((f) => f.group === i) })).filter(({ g }) => g.stage === current) : [];
  // While a move plays, the outlines follow the piece it works on, from where it starts.
  const worked = anim?.group ?? group;
  const settings = useId();
  // What a result stop closes: the last demo of a stage, or one demo among its cases.
  const ending = !atResult ? undefined : stageEndAt(step) ? "stage" : "demo";
  const ENDINGS = {
    stage: learn
      ? { label: tr({ fr: "Étape terminée", nl: "Stap klaar", en: "Step done" }), next: tr({ fr: "Étape suivante", nl: "Volgende stap", en: "Next step" }) }
      : { label: tr({ fr: "Phase terminée", nl: "Fase klaar", en: "Phase done" }), next: tr({ fr: "Phase suivante", nl: "Volgende fase", en: "Next phase" }) },
    demo: { label: tr({ fr: "Résultat", nl: "Resultaat", en: "Result" }), next: tr({ fr: "Exemple suivant", nl: "Volgend voorbeeld", en: "Next example" }) },
  };
  // What ▶ does from here: go on past a result, or play the move; its size never changes.
  const next: { icon: keyof typeof ICONS; label?: string; title: string } = atIntro
    ? { icon: "next", label: tr({ fr: "Suite", nl: "Verder", en: "Next" }), title: tr({ fr: "Les situations une par une", nl: "De situaties één voor één", en: "The situations one by one" }) }
    : done
    ? { icon: "done", title: DONE }
    : atResult
          ? { icon: "next", label: tr({ fr: "Suite", nl: "Verder", en: "Next" }), title: ENDINGS[ending!].next }
          : { icon: "play", label: move, title: `${tr({ fr: "Jouer", nl: "Speel", en: "Play" })} ${move}` };

  return (
    <>
      <TopBar back={focus ? { label: tr({ fr: "Le plan", nl: "Het plan", en: "The plan" }), onClick: focus.onClose } : { label: HOME, onClick: onHome }}>
        <button
          onClick={() => setLexicon({ tab: "moves" })}
          onMouseDown={keepFocus}
          title={tr({ fr: "Lexique (?)", nl: "Woordenlijst (?)", en: "Glossary (?)" })}
          aria-label={tr({ fr: "Lexique", nl: "Woordenlijst", en: "Glossary" })}
          className="flex h-8 items-center gap-1.5 rounded-full border border-edge px-2.5 text-sm text-chalk hover:border-mist/60"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
            <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" />
          </svg>
          <span className="max-sm:hidden">{tr({ fr: "Lexique", nl: "Woordenlijst", en: "Glossary" })}</span>
        </button>
      </TopBar>
      <main className="mx-auto flex w-full flex-1 max-w-5xl flex-col gap-4 p-4 pb-44 md:px-8 md:pb-28 md:phone:gap-2 md:phone:pt-2">
        {focus ? (
          <div className={cases.length > 1 ? "max-md:hidden" : ""}>
            <p className={LABEL}>{tr({ fr: "Les cas", nl: "De gevallen", en: "The cases" })}</p>
            <p className="wide text-lg md:text-xl">{focus.title}</p>
          </div>
        ) : (
          <p className="-mb-2 text-sm text-mist">
            {course
              ? tr({ fr: "Cube d'exemple", nl: "Voorbeeldkubus", en: "Sample cube" })
              : (
                <>
                  {/* Each color stays with its word when the line wraps on a phone. */}
                  <span className="whitespace-nowrap">
                    <Chip face={state[4] as Face} /> {tr({ fr: "en haut", nl: "boven", en: "on top" })},
                  </span>{" "}
                  <span className="whitespace-nowrap">
                    <Chip face={state[22] as Face} /> {tr({ fr: "devant", nl: "vooraan", en: "in front" })}
                  </span>
                  {!learn && tr({ fr: ", sans le retourner", nl: ", zonder hem om te draaien", en: ", without turning it over" })}
                </>
              )}
          </p>
        )}

        <div className="flex flex-col gap-2">
          {!focus && (
          <div className="flex gap-[3px]">
            {segments.map(({ title, first, count }, i) =>
              count ? (
                <button key={i} onClick={() => jump(first)} onMouseDown={keepFocus} title={title} aria-label={title} className="-my-2 min-w-0 py-2" style={{ flexGrow: count }}>
                  <span className="block h-1.5 overflow-hidden rounded-full bg-edge">
                    <span
                      className={`block h-full ${i < reached ? "bg-mist/70" : "bg-chalk"}`}
                      style={{ width: i < reached ? "100%" : i === reached ? `${(100 * (step - first)) / count}%` : 0 }}
                    />
                  </span>
                </button>
              ) : null,
            )}
            {!total && <span className="h-1.5 flex-1 rounded-full bg-edge" />}
          </div>
          )}
          {focus ? null : stage ? (
            <details ref={picker} className="group relative">
              <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <span className="wide text-lg md:text-xl">{stage.title}</span>
                <span className="flex items-center gap-1 text-sm whitespace-nowrap text-mist">
                  {current === 0
                    ? tr({ fr: "pour commencer", nl: "om te beginnen", en: "to begin" })
                    : `${tr({ fr: "étape", nl: "stap", en: "step" })} ${nOf(current, stages.length - 1)}`}
                  <Chevron to="down" className="transition group-open:rotate-180" />
                </span>
              </summary>
              <ol className="absolute inset-x-0 top-full z-20 mt-2 grid gap-0.5 rounded-2xl border border-edge bg-shell p-1.5 shadow-2xl shadow-black/60 md:left-auto md:w-80">
                {stages.map((s, i) => (
                  <li key={s.title}>
                    <button
                      disabled={firsts[i] < 0}
                      onClick={() => jump(firsts[i])}
                      className={`flex w-full items-baseline gap-2 rounded-xl px-3 py-2 text-left text-sm enabled:hover:bg-edge disabled:text-mist/60 ${i === current ? "bg-edge font-semibold" : ""}`}
                    >
                      <span className="w-4 text-mist">{i}</span>
                      <span className="flex-1">{s.title}</span>
                      {firsts[i] < 0 && <span className="text-xs">{tr({ fr: "déjà fait", nl: "al gedaan", en: "already done" })}</span>}
                    </button>
                  </li>
                ))}
              </ol>
            </details>
          ) : (
            <p className="flex items-baseline justify-between">
              <span className="wide text-lg md:text-xl">{modeTitle("fast")}</span>
              <span className="text-sm text-mist">{moves(total)}</span>
            </p>
          )}
          {/* The cases: chips on a wide screen, a menu on a phone, where chips would take two lines or scroll. */}
          {cases.length > 1 && (
            <details ref={casePicker} className="group relative md:hidden">
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-2xl border border-edge bg-shell px-3 py-1.5 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-mist">
                    {focus && `${focus.title} · `}
                    {atIntro ? INTRO_LABEL.toLowerCase() : `${tr({ fr: "cas", nl: "geval", en: "case" })} ${nOf(cases.findIndex(({ g }) => g === group) + 1, cases.length)}`}
                  </span>
                  <span className="block truncate font-semibold">{atIntro ? tr({ fr: "L'étape en entier", nl: "De hele stap", en: "The whole stage" }) : group?.title}</span>
                </span>
                <Chevron to="down" className="text-mist transition group-open:rotate-180" />
              </summary>
              <ol className="absolute inset-x-0 top-full z-20 mt-2 grid gap-0.5 rounded-2xl border border-edge bg-shell p-1.5 shadow-2xl shadow-black/60">
                {intro && (
                  <li>
                    <button
                      onClick={showIntro}
                      className={`flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-edge ${atIntro ? "bg-edge font-semibold" : ""}`}
                    >
                      <span className={`grid size-7 flex-none place-items-center rounded-full text-xs font-black ${atIntro ? "bg-chalk text-plastic" : "bg-raised text-chalk"}`}>i</span>
                      {INTRO_LABEL}
                    </button>
                  </li>
                )}
                {cases.map(({ g, first }, k) => (
                  <li key={first}>
                    <button
                      onClick={() => jump(first)}
                      className={`flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-edge ${g === group && !atIntro ? "bg-edge font-semibold" : ""}`}
                    >
                      <span className={`grid size-7 flex-none place-items-center rounded-full text-xs font-black ${g === group && !atIntro ? "bg-chalk text-plastic" : "bg-raised text-chalk"}`}>{k + 1}</span>
                      {g.title}
                    </button>
                  </li>
                ))}
              </ol>
            </details>
          )}
          {cases.length > 1 && (
            <ol className="flex flex-wrap gap-1.5 max-md:hidden">
              {intro && (
                <li className="shrink-0">
                  <button
                    onClick={showIntro}
                    onMouseDown={keepFocus}
                    className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${atIntro ? "bg-chalk text-plastic" : "bg-shell text-mist hover:text-chalk"}`}
                  >
                    {INTRO_LABEL}
                  </button>
                </li>
              )}
              {cases.map(({ g, first }) => (
                <li key={first} className="shrink-0">
                  <button
                    onClick={() => jump(first)}
                    onMouseDown={keepFocus}
                    className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${g === group && !atIntro ? "bg-chalk text-plastic" : "bg-shell text-mist hover:text-chalk"}`}
                  >
                    {g.title}
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="grid flex-1 items-center gap-4 md:grid-cols-2 md:gap-10">
          <div
            className={`aspect-square max-h-[30dvh] w-full justify-self-center transition-opacity duration-200 md:max-h-[60dvh] md:phone:sticky md:phone:top-4 md:phone:max-h-[calc(100dvh-12rem)] md:phone:self-start ${fading ? "opacity-0" : ""}`}
          >
            {atIntro && intro ? (
              <CubeView state={intro.from} moves={intro.moves} replay={introRun} />
            ) : (
            <CubeView
              state={anim?.from ?? state}
              moves={anim ? [anim.move] : undefined}
              onEnd={() => setAnim(null)}
              piece={worked?.piece}
              place={worked && slots.get(worked)!.piece}
              pair={worked?.pair}
              pairPlace={worked && slots.get(worked)!.pair}
              grip={!!worked?.fingers}
              next={worked?.fingers && move}
            />
            )}
          </div>

          <div className="flex flex-col gap-4">
            {atIntro && intro ? (
              <section className="rounded-2xl border border-edge bg-shell p-4 text-[15px] leading-relaxed">
                <p className={LABEL}>{INTRO_LABEL}</p>
                <p className="mt-1">
                  <Colored text={intro.text} />
                </p>
                <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <button onClick={() => setIntroRun((n) => n + 1)} onMouseDown={keepFocus} className="font-semibold underline underline-offset-2 hover:text-white">
                    {tr({ fr: "↻ Revoir", nl: "↻ Opnieuw", en: "↻ Watch again" })}
                  </button>
                  <span className="text-mist">{tr({ fr: "Puis ▶ Suite : chaque situation, une par une.", nl: "Dan ▶ Verder: elke situatie, één voor één.", en: "Then ▶ Next: each situation, one by one." })}</span>
                </p>
              </section>
            ) : done ? (
              <div>
                <p className="wide text-4xl">
                  {focus
                    ? tr({ fr: "Tous les cas vus", nl: "Alle gevallen gezien", en: "All cases seen" })
                    : course
                    ? tr({ fr: "Cours terminé", nl: "Cursus voltooid", en: "Course complete" })
                    : tr({ fr: "Résolu !", nl: "Opgelost!", en: "Solved!" })}
                </p>
                <p className="mt-2 text-mist">
                  {focus
                    ? tr({
                        fr: "Essaie-les sur ton cube, puis reviens au plan pour l'étape suivante.",
                        nl: "Probeer ze op je kubus, en ga dan terug naar het plan voor de volgende stap.",
                        en: "Try them on your cube, then go back to the plan for the next stage.",
                      })
                    : course
                    ? tr({
                        fr: "Prends ton cube et refais chaque étape : la liste des étapes te ramène à n'importe quel cas.",
                        nl: "Neem je kubus en doe elke stap opnieuw: via de lijst met stappen kom je terug bij elk geval.",
                        en: "Grab your cube and redo each step: the step list takes you back to any case.",
                      })
                    : total
                      ? `${moves(total)}${tr({ fr: ", bravo.", nl: ", goed gedaan.", en: ", well done." })}`
                      : tr({ fr: "Ton cube était déjà résolu.", nl: "Je kubus was al opgelost.", en: "Your cube was already solved." })}
                </p>
              </div>
            ) : (
              group && (
                <section className="rounded-2xl border border-edge bg-shell p-4 text-[15px] leading-relaxed [&>:first-child]:mt-0">
                  {/* A case of a stage puts what you work with first: the piece, where it stands, then how; its aim, the
                      same for every case of the stage, goes to the foot. A lesson or a phase keeps its title on top. */}
                  {aim ? (
                    !course && group.title && <p className={LABEL}>{group.title}</p>
                  ) : (
                    <>
                      <p className={LABEL}>{tr({ fr: "Le but", nl: "Het doel", en: "The goal" })}</p>
                      <p className="wide mt-1 text-lg leading-snug">{group.title ?? stage?.goal}</p>
                    </>
                  )}
                  {piece && (
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      <PieceChip piece={piece} />
                      {group.pair && <PieceChip piece={group.pair} />}
                      <span className="text-mist">→</span>
                      <span className="flex items-center gap-1.5 rounded-lg bg-raised py-0.5 pr-2 pl-1 ring-1 ring-place">
                        <i className="h-3.5 w-3.5 rounded-[2px] bg-place" />
                        {placeOf(group.pair)}
                      </span>
                    </p>
                  )}
                  {group.text && (
                    <p className="mt-2 text-mist">
                      <Colored text={group.text} />
                    </p>
                  )}
                  {group.fingers && (
                    <p className="mt-2 flex gap-4 text-sm">
                      <span className="flex items-center gap-1.5">
                        <i className="size-3 rounded-full" style={{ background: THUMB_COLOR }} />
                        {tr({ fr: "les pouces", nl: "de duimen", en: "the thumbs" })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <i className="size-3 rounded-full" style={{ background: INDEX_COLOR }} />
                        {tr({ fr: "les index", nl: "de wijsvingers", en: "the index fingers" })}
                      </span>
                    </p>
                  )}

                  <p className={`${LABEL} mt-4 border-t border-edge pt-3`}>
                    {tr({ fr: "Comment", nl: "Hoe", en: "How" })}
                    {parts.length > 1 && <span className="font-normal tracking-normal normal-case"> · {nOf(partNow + 1, parts.length)}</span>}
                  </p>
                  <ol className="mt-2 grid gap-2.5">
                    {parts.map((part, j) => {
                      if (j !== partNow) return null; // one part at a time: ◀ ▶ walk through them
                      const first = partEnds[j] - part.count;
                      const own = flat.slice(first, first + part.count).map((f) => f.move);
                      const [passed, here] = [atResult || step >= first + part.count, !atResult && step >= first && step < first + part.count];
                      // A sequence played several times shows each time apart, and which one is playing.
                      const rep = algOf(own);
                      const size = rep && !rep.setup && rep.reps > 1 ? rep.moves.length : own.length;
                      const runs = Array.from({ length: own.length / size }, (_, r) => r * size);
                      const moveChips = (className: string) => (
                        <span className={`${className} flex-wrap gap-1.5`}>
                          {runs.map((r) => (
                            <span key={r} className={`flex flex-wrap gap-1 ${runs.length > 1 ? "rounded-[10px] p-0.5 ring-1 ring-edge" : ""}`}>
                              {own.slice(r, r + size).map((m, c) => {
                                const i = first + r + c;
                                return (
                                  <button
                                    key={i}
                                    onClick={() => jump(i)}
                                    onMouseDown={keepFocus}
                                    title={describeMove(m).join(", ")}
                                    className={`min-w-8 rounded-lg px-1 py-0.5 text-sm font-semibold [font-stretch:125%] ${
                                      here && i === step ? "bg-chalk text-plastic" : passed || i < step ? "bg-raised text-mist/60" : "bg-raised text-chalk"
                                    }`}
                                  >
                                    {m}
                                  </button>
                                );
                              })}
                            </span>
                          ))}
                        </span>
                      );
                      return (
                        // A short step's moves lead its line, where its number was; a long one's (a sequence played
                        // several times) would push the text away, so they come under it.
                        <li key={j} className={passed ? "opacity-55" : ""}>
                          {own.length <= 4 && moveChips("mr-2 inline-flex align-middle")}
                          {part.text && <Colored text={part.text} />}
                          {here && runs.length > 1 && (
                            <span className="ml-1.5 rounded-md bg-piece px-1.5 py-px align-[1px] text-[11px] font-bold text-plastic">
                              {Math.floor((step - first) / size) + 1}/{runs.length}
                            </span>
                          )}
                          {own.length > 4 && moveChips(`flex ${part.text ? "mt-1.5" : ""}`)}
                        </li>
                      );
                    })}
                  </ol>
                  {aim && (
                    <p className="mt-4 border-t border-edge pt-3 text-sm text-mist">
                      <span className="text-chalk/80">{tr({ fr: "Le but\u00a0: ", nl: "Het doel: ", en: "The goal: " })}</span>
                      <Colored text={aim} />
                    </p>
                  )}
                  {stage && !(course && !group.stage) && (
                    <p className={`${aim ? "mt-2" : "mt-4"} text-sm text-mist`}>
                      <span className="text-chalk/80">{tr({ fr: "Pourquoi ça marche : ", nl: "Waarom het werkt: ", en: "Why it works: " })}</span>
                      <Colored text={stage.why} />
                    </p>
                  )}
                </section>
              )
            )}
          </div>
        </div>

        {!course && (
          <div className="flex justify-center gap-4 text-sm text-mist">
            <span>{tr({ fr: "Perdu ?", nl: "Kwijt?", en: "Lost?" })}</span>
            <button className="font-semibold text-chalk underline underline-offset-2" onClick={onScan}>
              {tr({ fr: "Rescanner le cube", nl: "Kubus opnieuw scannen", en: "Rescan the cube" })}
            </button>
            <button className="font-semibold text-chalk underline underline-offset-2" onClick={() => onEdit(upright(state))}>
              {tr({ fr: "Corriger les couleurs", nl: "Kleuren corrigeren", en: "Fix the colors" })}
            </button>
          </div>
        )}

        {/* The player, pinned to the bottom: its buttons never move or resize, so a pointer can rest on ▶. */}
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-edge bg-plastic/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-col gap-2.5 px-4 py-3 md:grid md:h-18 md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-6 md:px-8 md:py-0">
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0 text-sm leading-snug">
                <p className="text-xs text-mist">
                  {atIntro
                    ? INTRO_LABEL
                    : ending
                      ? ENDINGS[ending].label
                      : done
                        ? DONE
                        : `${tr({ fr: "Coup", nl: "Zet", en: "Move" })} ${position}`}
                  {move && part && ` · ${part}`}
                </p>
                {atIntro && <p className="font-semibold">{focus?.title}</p>}
                {ending && (
                  <p className="font-semibold">{ending === "demo" || !learn ? group?.title : stages[group!.stage].title}</p>
                )}
                {move && (
                  <div className="md:line-clamp-2">
                    <MoveText move={move} finger={group?.fingers?.[step - groupStart]} />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <div className="flex gap-1 rounded-full bg-white/8 p-1 ring-1 ring-white/15">
                <button
                  onClick={back}
                  onMouseDown={keepFocus}
                  disabled={atIntro || (!step && !intro)}
                  title={tr({ fr: "Coup précédent (←)", nl: "Vorige zet (←)", en: "Previous move (←)" })}
                  aria-label={tr({ fr: "Coup précédent", nl: "Vorige zet", en: "Previous move" })}
                  className="grid h-10 w-12 place-items-center rounded-full text-zinc-200 enabled:hover:bg-white/15 disabled:opacity-30"
                >
                  <Icon name="back" />
                </button>
                <button
                  onClick={toggleAuto}
                  onMouseDown={keepFocus}
                  disabled={done}
                  aria-pressed={auto}
                  title={tr({ fr: "Lecture automatique (espace)", nl: "Automatisch afspelen (spatie)", en: "Autoplay (space)" })}
                  aria-label={tr({ fr: "Lecture automatique", nl: "Automatisch afspelen", en: "Autoplay" })}
                  className={`relative grid h-10 w-12 place-items-center rounded-full text-zinc-200 disabled:opacity-30 ${auto ? "bg-white/12" : "enabled:hover:bg-white/15"}`}
                >
                  {auto && (
                    <svg viewBox="0 0 48 40" className="absolute inset-0" aria-hidden>
                      <rect key={`${step}|${atResult}|${wait}`} x="1.5" y="1.5" width="45" height="37" rx="18.5" pathLength={100} className="countdown" style={{ animationDuration: `${wait}ms` }} />
                    </svg>
                  )}
                  <Icon name={auto ? "pause" : "auto"} />
                </button>
                <button
                  onClick={() => forward()}
                  onMouseDown={keepFocus}
                  disabled={done}
                  title={`${next.title} (→)`}
                  aria-label={next.title}
                  className="flex h-10 w-24 items-center justify-center gap-1.5 rounded-full bg-chalk text-plastic enabled:hover:bg-white disabled:opacity-40"
                >
                  <Icon name={next.icon} />
                  {next.label && <span className="wide min-w-7 text-left text-base">{next.label}</span>}
                </button>
              </div>
              <button
                popoverTarget={settings}
                onMouseDown={keepFocus}
                title={tr({ fr: "Durée par coup en lecture automatique", nl: "Duur per zet bij automatisch afspelen", en: "Time per move in autoplay" })}
                className={`h-8 w-12 rounded-full border text-xs font-semibold ${auto ? "border-place text-chalk" : "border-edge text-mist hover:text-chalk"}`}
              >
                {delay} s
              </button>
              <div
                id={settings}
                popover="auto"
                className="inset-auto bottom-40 left-1/2 m-0 w-64 -translate-x-1/2 rounded-2xl border border-edge bg-shell p-3 text-chalk shadow-2xl shadow-black/60 md:bottom-20"
              >
                <p className="mb-2 text-xs text-mist">{tr({ fr: "Durée par coup", nl: "Duur per zet", en: "Time per move" })}</p>
                <div className="flex gap-1 rounded-xl bg-plastic p-1">
                  {DELAYS.map((d) => (
                    <button
                      key={d}
                      onClick={() => chooseDelay(d)}
                      onMouseDown={keepFocus}
                      aria-pressed={d === delay}
                      className={`flex-1 rounded-lg py-1.5 text-sm font-semibold ${d === delay ? "bg-chalk text-plastic" : "text-mist hover:text-chalk"}`}
                    >
                      {d} s
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="hidden text-right text-xs text-mist pointer-fine:md:block">
              {tr({ fr: "← → coup par coup · espace : auto · ? : lexique", nl: "← → zet per zet · spatie: auto · ?: woordenlijst", en: "← → move by move · space: auto · ?: glossary" })}
            </p>
          </div>
        </div>
        {lexicon && <Lexicon tab={lexicon.tab} focus={lexicon.focus} onClose={() => setLexicon(null)} />}
      </main>
    </>
  );
}
