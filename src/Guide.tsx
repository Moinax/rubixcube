import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import CubeView, { INDEX_COLOR, THUMB_COLOR } from "./CubeView";
import Lexicon, { LexiconButton, type Tab } from "./Lexicon";
import { Chevron, HOME, modeTitle, TopBar, usePopover } from "./Home";
import { Chip, Colored, Swatches } from "./Scanner";
import { algOf, findPiece, names, pieceColors, planStates, play, slotOf, STAGES, type Group, type Stage } from "./beginner";
import { applyMove, describeMove, invert, stickerAt, upright, type Face, type Vec } from "./cube";
import { nOf, tr } from "./i18n";

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
  /** The cases of one stage, inside the plan's page for that stage: no progress bar or stage list; `header` (the
   * page's own) takes their place, `back` is the way back, `onPresent` goes back to the stage's presentation (before
   * the first case), `footer` goes under the card. */
  focus?: { title: string; back: { label: string; onClick: () => void }; header: ReactNode; onPresent?: () => void; footer?: ReactNode };
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
  prev: <path d="M17 5v14L6 12z" />,
  auto: <path d="M3.5 5v14l8.5-7zM12 5v14l8.5-7z" />,
  pause: <path d="M6 5h4v14H6zM14 5h4v14h-4z" />,
  play: <path d="M7 5v14l12-7z" />,
  next: <path d="M5 5v14l9-7zM15.5 5h3v14h-3z" />,
};
const Icon = ({ name, className = "size-5" }: { name: keyof typeof ICONS; className?: string }) => (
  <svg viewBox="0 0 24 24" className={`${className} flex-none`} fill="currentColor" aria-hidden>
    {ICONS[name]}
  </svg>
);
/** What a player button does and its key, over it on hover: the bar carries no legend. */
const Tip = ({ label, keys }: { label: string; keys?: string }) => (
  <span
    role="tooltip"
    className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2.5 -translate-x-1/2 rounded-lg border border-edge bg-raised px-2 py-1 text-xs font-medium whitespace-nowrap text-chalk opacity-0 shadow-lg transition-opacity delay-300 group-hover:opacity-100"
  >
    {label}
    {keys && <kbd className="ml-1.5 rounded bg-plastic px-1.5 py-px font-sans text-[11px] text-mist">{keys}</kbd>}
  </span>
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
  // Before the first case, the plan's page presents the stage: going back past the first move leads there.
  const present = focus?.onPresent;
  const done = step === total;
  const gi = atResult ? flat[step - 1].group : flat[step]?.group;
  const group = gi === undefined ? undefined : groups[gi];
  const move = atResult ? undefined : flat[step]?.move;
  const state = atResult ? ends[gi!] : states[step];
  /** The first move of the instruction being played (or just played, on a result stop). */
  const groupStart = flat.findIndex((f) => f.group === gi);

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
    clearTimeout(fade.current);
    setFading(false);
    setAnim(null);
    land(to);
  };
  // ⏮ ⏭ jump between the starts of the instructions (a case, a piece, a phase): back to this one's start, or the
  // one before when already there (then the presentation); on to the next one's, or the end.
  const starts = groups.map((_, i) => flat.findIndex((f) => f.group === i)).filter((i) => i >= 0);
  const seriesBack = done ? starts.at(-1) : atResult || step > groupStart ? groupStart : starts.findLast((s) => s < step);
  const seriesNext = done ? undefined : (starts.find((s) => s > step) ?? total);
  const prevSeries = () => {
    if (fading) return;
    setAuto(false);
    if (seriesBack !== undefined) jump(seriesBack);
    else present?.();
  };
  const nextSeries = () => {
    if (atResult) return forward(); // the next instruction is the next press away already
    if (seriesNext === undefined || fading) return;
    setAuto(false);
    jump(seriesNext);
  };
  const forward = () => {
    if (done || fading) return;
    if (atResult) return swap(() => land(step));
    setAnim({ from: state, move: flat[step].move, group: group! });
    land(step + 1, resultAt(step + 1));
    // The autoplay stops at the end of the guide, and of each stage: the next one starts on a press.
    if (step + 1 === total || stageStartAt(step + 1)) setAuto(false);
  };
  const back = () => {
    if (present && !step && !fading) return present();
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
      if (e.key === "Escape") closePicker();
      // A focused control already handles Space itself.
      if (e.key === " " && (e.target as Element).closest("button, summary, input")) return;
      if (e.key === " ") {
        e.preventDefault();
        if (!done) toggleAuto();
      }
      if (e.key === "ArrowRight") (e.shiftKey ? nextSeries : forward)();
      if (e.key === "ArrowLeft") (e.shiftKey ? prevSeries : back)();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });


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
  // At the end, the stage of the last instruction: the cases opened from the plan are one stage's.
  const current = group?.stage ?? groups.at(-1)?.stage ?? stages.length - 1;
  const firsts = stages.map((_, i) => flat.findIndex((f) => groups[f.group].stage === i));
  const segments = learn
    ? stages.map((s, i) => ({ title: s.title, first: firsts[i], count: flat.filter((f) => groups[f.group].stage === i).length }))
    : groups.map((g, i) => ({ title: g.title, first: flat.findIndex((f) => f.group === i), count: g.moves.length }));
  const reached = done ? segments.length : learn ? current : flat[step].group;
  const stage = learn ? stages[current] : undefined;
  // The stage list is a popover: it closes on any step change, a tap outside it, or Escape.
  const { ref: picker, close: closePicker } = usePopover(step);
  const { ref: casePicker } = usePopover(step);

  const piece = group?.piece;
  // At the end of a case, or of the whole guide, what the stage built is glanced at when it sits out of view: the
  // beginner method's white cross and white corners, at the bottom. Its key never meets an instruction's.
  const endPeek =
    learn && stages === STAGES && (done || atResult) && [2, 3].includes(current) ? { from: [0, -1, 0] as Vec, key: -1 - step } : undefined;
  // At the start of an instruction, a piece the view doesn't show is glanced at first, the way a hand tilts the cube:
  // a piece hidden whole (down, left or back), or its white or yellow (which tells how it is turned) facing away.
  const hidden = (() => {
    if (!learn || atResult || step !== groupStart) return;
    for (const p of [piece, group?.pair]) {
      if (!p) continue;
      const pos = findPiece(state, p);
      if (pos.every((v) => v <= 0)) return pos;
      const away = ([0, 1, 2] as const)
        .map((k) => pos.map((_, j) => (j === k ? pos[k] : 0)) as Vec)
        .find((normal) => normal.some((v) => v < 0) && "UD".includes(state[stickerAt(pos, normal)!]));
      if (away) return away;
    }
  })();
  /** What one case of a stage does toward it; lessons (stage 0) and the fast mode's phases have none. */
  const aim = learn && group && group.stage > 0 ? (stages[group.stage].aim ?? stages[group.stage].goal) : undefined;
  const cases = course ? groups.map((g, i) => ({ g, first: flat.findIndex((f) => f.group === i) })).filter(({ g }) => g.stage === current) : [];
  // While a move plays, the outlines follow the piece it works on, from where it starts.
  const worked = anim?.group ?? group;
  const { ref: pace } = usePopover(delay);
  // What a result stop closes: the last demo of a stage, or one demo among its cases.
  const ending = !atResult ? undefined : stageEndAt(step) ? "stage" : "demo";
  const ENDINGS = {
    stage: learn
      ? { label: tr({ fr: "Étape terminée", nl: "Stap klaar", en: "Step done" }), next: tr({ fr: "Étape suivante", nl: "Volgende stap", en: "Next step" }) }
      : { label: tr({ fr: "Phase terminée", nl: "Fase klaar", en: "Phase done" }), next: tr({ fr: "Phase suivante", nl: "Volgende fase", en: "Next phase" }) },
    demo: { label: tr({ fr: "Résultat", nl: "Resultaat", en: "Result" }), next: tr({ fr: "Exemple suivant", nl: "Volgend voorbeeld", en: "Next example" }) },
  };
  // What ▶ does from here: go on past a result, or play the move; its size never changes.
  // What ▶ does from here, said only on hover: the arrow alone shows it.
  const nextTitle = done
      ? DONE
      : atResult
        ? ENDINGS[ending!].next
        : `${tr({ fr: "Jouer", nl: "Speel", en: "Play" })} ${move}`;

  // The player sits right under the cube, which keeps its size: its buttons never move or resize, so a pointer can
  // rest on ▶. What each does and its key show on hover.
  const player = (
    <div className="flex items-center justify-center gap-2">
        {/* Arrows only: a move, or a whole instruction (a case, a piece, a phase); what the move is, the card says. */}
        <div className="flex gap-1 rounded-full bg-white/8 p-1 ring-1 ring-white/15">
          <button
            onClick={prevSeries}
            onMouseDown={keepFocus}
            disabled={seriesBack === undefined && !present}
            aria-label={tr({ fr: "Série précédente", nl: "Vorige reeks", en: "Previous series" })}
            className="group relative grid h-10 w-10 place-items-center rounded-full text-zinc-200 enabled:hover:bg-white/15 disabled:opacity-30"
          >
            <Icon name="back" />
            <Tip label={tr({ fr: "Début de la série précédente", nl: "Begin van de vorige reeks", en: "Start of the previous series" })} keys={tr({ fr: "Maj ←", nl: "Shift ←", en: "Shift ←" })} />
          </button>
          <button
            onClick={back}
            onMouseDown={keepFocus}
            disabled={!step && !present}
            aria-label={tr({ fr: "Coup précédent", nl: "Vorige zet", en: "Previous move" })}
            className="group relative grid h-10 w-10 place-items-center rounded-full text-zinc-200 enabled:hover:bg-white/15 disabled:opacity-30"
          >
            <Icon name="prev" />
            <Tip label={tr({ fr: "Coup précédent", nl: "Vorige zet", en: "Previous move" })} keys="←" />
          </button>
          <button
            onClick={() => forward()}
            onMouseDown={keepFocus}
            disabled={done}
            aria-label={nextTitle}
            className="group relative grid h-10 w-16 place-items-center rounded-full bg-chalk text-plastic enabled:hover:bg-white disabled:opacity-40"
          >
            <Icon name="play" />
            <Tip label={nextTitle} keys="→" />
          </button>
          <button
            onClick={nextSeries}
            onMouseDown={keepFocus}
            disabled={seriesNext === undefined}
            aria-label={tr({ fr: "Série suivante", nl: "Volgende reeks", en: "Next series" })}
            className="group relative grid h-10 w-10 place-items-center rounded-full text-zinc-200 enabled:hover:bg-white/15 disabled:opacity-30"
          >
            <Icon name="next" />
            <Tip label={tr({ fr: "Série suivante", nl: "Volgende reeks", en: "Next series" })} keys={tr({ fr: "Maj →", nl: "Shift →", en: "Shift →" })} />
          </button>
        </div>
        {/* How the moves play on their own: autoplay and its pace, together. */}
        <div className="flex items-center gap-1 rounded-full p-1 ring-1 ring-edge">
          <button
            onClick={toggleAuto}
            onMouseDown={keepFocus}
            disabled={done}
            aria-pressed={auto}
            aria-label={tr({ fr: "Lecture automatique", nl: "Automatisch afspelen", en: "Autoplay" })}
            className={`group relative grid h-10 w-10 place-items-center rounded-full text-zinc-200 disabled:opacity-30 ${auto ? "bg-white/12" : "enabled:hover:bg-white/15"}`}
          >
            {auto && (
              <svg viewBox="0 0 40 40" className="absolute inset-0" aria-hidden>
                <rect key={`${step}|${atResult}|${wait}`} x="1.5" y="1.5" width="37" height="37" rx="18.5" pathLength={100} className="countdown" style={{ animationDuration: `${wait}ms` }} />
              </svg>
            )}
            <Icon name={auto ? "pause" : "auto"} className="size-4.5" />
            <Tip label={tr({ fr: "Lecture automatique", nl: "Automatisch afspelen", en: "Autoplay" })} keys={tr({ fr: "espace", nl: "spatie", en: "space" })} />
          </button>
          {/* The pace of the autoplay: a small menu under its chip. */}
          <details ref={pace} className="relative">
            <summary
              aria-label={tr({ fr: "Durée par coup en lecture automatique", nl: "Duur per zet bij automatisch afspelen", en: "Time per move in autoplay" })}
              onMouseDown={keepFocus}
              className={`group relative grid h-10 w-11 cursor-pointer list-none place-items-center rounded-full text-xs font-semibold [&::-webkit-details-marker]:hidden ${auto ? "text-chalk" : "text-mist hover:text-chalk"}`}
            >
              {delay} s
              <Tip label={tr({ fr: "Durée par coup", nl: "Duur per zet", en: "Time per move" })} />
            </summary>
            <div className="absolute top-full right-0 z-30 mt-2 w-64 rounded-2xl border border-edge bg-shell p-3 text-chalk shadow-2xl shadow-black/60">
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
          </details>
        </div>
    </div>
  );

  return (
    <>
      <TopBar back={focus?.back ?? { label: course ? tr({ fr: "Les bases", nl: "De basis", en: "The basics" }) : HOME, onClick: onHome }}>
        <LexiconButton onClick={() => setLexicon({ tab: "moves" })} />
      </TopBar>
      {/* In the plan's page, one column a comfortable line long, like the rest of the plan. */}
      <main className={`mx-auto flex w-full flex-1 flex-col gap-4 p-4 md:px-8 md:phone:gap-2 md:phone:pt-2 ${focus ? "max-w-2xl pb-28" : "max-w-5xl pb-8"}`}>
        {focus ? (
          focus.header
        ) : course ? null : (
          <p className="-mb-2 text-sm text-mist">
            {(
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
          {!focus && !course && (
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
            // The stage menu looks like the plan's: the number in a circle, where you are above the stage's title.
            <details ref={picker} className="group relative md:max-w-md">
              <summary className="flex h-13 cursor-pointer list-none items-center gap-3 rounded-2xl border border-edge bg-shell pr-3 pl-2 [&::-webkit-details-marker]:hidden">
                <span className="grid size-8 flex-none place-items-center rounded-full bg-chalk text-sm font-black text-plastic">{current || "i"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-mist">
                    {current === 0
                      ? tr({ fr: "Pour commencer", nl: "Om te beginnen", en: "To begin" })
                      : tr({ fr: `Étape ${current} sur ${stages.length - 1}`, nl: `Stap ${current} van ${stages.length - 1}`, en: `Stage ${current} of ${stages.length - 1}` })}
                  </span>
                  <span className="block leading-tight font-semibold">{stage.title}</span>
                </span>
                <Chevron to="down" className="text-mist transition group-open:rotate-180" />
              </summary>
              <ol className="absolute inset-x-0 top-full z-20 mt-2 grid gap-0.5 rounded-2xl border border-edge bg-shell p-1.5 shadow-2xl shadow-black/60">
                {stages.map((s, i) => (
                  <li key={s.title}>
                    <button
                      disabled={firsts[i] < 0}
                      onClick={() => jump(firsts[i])}
                      className={`flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm enabled:hover:bg-edge disabled:text-mist/60 ${i === current ? "bg-edge font-semibold" : ""}`}
                    >
                      <span className={`grid size-7 flex-none place-items-center rounded-full text-xs font-black ${i === current ? "bg-chalk text-plastic" : "bg-raised text-chalk"}`}>{i || "i"}</span>
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
          {/* The cases: one menu, at every size, so they read as the parts of one stage. */}
          {/* Shown even for a single case, so the cube and the player keep their height from one stage to the next. It reads
              like the stage's menu above it: the case's number in a smaller circle, "Cas 1 sur 4" over its title, at a fixed
              height (a title too long for a line is cut, its menu line shows it whole); a menu
              only when there is something else to pick. */}
          {(cases.length > 0 || present) &&
            (() => {
              const k = cases.findIndex(({ g }) => g === group);
              const chapter = (i: number) => `${i + 1}`;
              const line = (
                <>
                  <span className="ml-1 grid size-6 flex-none place-items-center rounded-full bg-chalk text-[11px] font-black text-plastic">{done ? "✓" : chapter(k)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-mist">
                      {done ? DONE : tr({ fr: `Cas ${k + 1} sur ${cases.length}`, nl: `Geval ${k + 1} van ${cases.length}`, en: `Case ${k + 1} of ${cases.length}` })}
                    </span>
                    <span className="line-clamp-1 leading-tight font-semibold">{done ? tr({ fr: "Tous les cas vus", nl: "Alle gevallen gezien", en: "All cases seen" }) : group?.title}</span>
                  </span>
                </>
              );
              const box = "flex h-13 items-center gap-3 rounded-2xl border border-edge bg-shell pr-3 pl-2";
              if (cases.length < 2 && !present) return <div className={`${box} md:max-w-md`}>{line}</div>;
              return (
                <details ref={casePicker} className="group relative md:max-w-md">
                  <summary className={`${box} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
                    {line}
                    <Chevron to="down" className="text-mist transition group-open:rotate-180" />
                  </summary>
                  <ol className="absolute inset-x-0 top-full z-20 mt-2 grid gap-0.5 rounded-2xl border border-edge bg-shell p-1.5 shadow-2xl shadow-black/60">
                    {present && (
                      <li>
                        <button onClick={present} className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-edge">
                          <span className="grid size-7 flex-none place-items-center rounded-full bg-raised text-xs font-black text-chalk">i</span>
                          {INTRO_LABEL}
                        </button>
                      </li>
                    )}
                    {cases.map(({ g, first }, i) => (
                      <li key={first}>
                        <button
                          onClick={() => jump(first)}
                          className={`flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-edge ${g === group ? "bg-edge font-semibold" : ""}`}
                        >
                          <span className={`grid size-6 flex-none place-items-center rounded-full text-[11px] font-black ${g === group ? "bg-chalk text-plastic" : "bg-raised text-chalk"}`}>{chapter(i)}</span>
                          {g.title}
                        </button>
                      </li>
                    ))}
                  </ol>
                </details>
              );
            })()}
        </div>

        <div className={`grid flex-1 content-start items-center gap-4 ${focus ? "" : "md:grid-cols-2 md:content-center md:gap-10"}`}>
          <div className="flex flex-col gap-3 md:phone:sticky md:phone:top-4 md:phone:self-start">
          <div
            className={`aspect-square max-h-[30dvh] w-full justify-self-center transition-opacity duration-200 ${focus ? "md:max-h-[40dvh]" : "md:max-h-[60dvh]"} md:phone:max-h-[calc(100dvh-12rem)] ${fading ? "opacity-0" : ""}`}
          >
            <CubeView
              state={anim?.from ?? state}
              moves={anim ? [anim.move] : undefined}
              onEnd={() => setAnim(null)}
              piece={worked?.piece}
              place={worked && slots.get(worked)!.piece}
              pair={worked?.pair}
              pairPlace={worked && slots.get(worked)!.pair}
              grip={!!worked?.fingers}
              peek={hidden ? { from: hidden, key: step } : endPeek}
              next={worked?.fingers && move}
            />
          </div>
          {player}
          </div>

          <div className="flex flex-col gap-4">
            {done ? (
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
                        fr: "Essaie-les sur ton cube, puis passe à l'étape suivante.",
                        nl: "Probeer ze op je kubus, en ga dan naar de volgende stap.",
                        en: "Try them on your cube, then go on to the next stage.",
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
                  ) : course ? null /* a course's lesson is named by the case menu above */ : (
                    <>
                      <p className={LABEL}>{tr({ fr: "Le but", nl: "Het doel", en: "The goal" })}</p>
                      <p className="wide mt-1 text-lg leading-snug">{group.title ?? stage?.goal}</p>
                    </>
                  )}
                  {/* In a plan's stage, the case menu already says where the piece stands and the cube outlines it:
                      the card goes straight to how. */}
                  {piece && !focus && (
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
                  {group.text && !focus && (
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

                  <p className={`${LABEL} ${focus ? "" : "mt-4 border-t border-edge pt-3"}`}>
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
            {focus?.footer}
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

        {lexicon && <Lexicon tab={lexicon.tab} focus={lexicon.focus} onClose={() => setLexicon(null)} />}
      </main>
    </>
  );
}
