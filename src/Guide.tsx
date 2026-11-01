import { useEffect, useId, useMemo, useRef, useState } from "react";
import CubeView from "./CubeView";
import { Back, Chevron, HOME, modeTitle } from "./Home";
import { Chip, Colored } from "./Scanner";
import { algOf, findPiece, names, pieceColors, planStates, play, slotOf, STAGES, type Group } from "./beginner";
import { applyMove, describeMove, FACE_COLORS, invert, upright, type Face } from "./cube";
import { lang, nOf, tr } from "./i18n";

const FACES_EN: [string, string][] = [["R", "Right"], ["L", "Left"], ["U", "Up"], ["D", "Down"], ["F", "Front"], ["B", "Back"]];

/** How to read the moves: the standard (Singmaster) notation every cube tutorial uses. */
function Notation() {
  const letter = (m: string) => <span className="wide text-chalk">{m}</span>;
  return (
    <details className="text-left text-sm text-mist phone:order-1">
      <summary className="cursor-pointer text-chalk/80">
        {tr({ fr: "Que veulent dire les lettres ?", nl: "Wat betekenen de letters?", en: "What do the letters mean?" })}
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        <p>
          {tr({
            fr: "C'est la notation standard des cubeurs. Chaque lettre est l'initiale anglaise d'une face ; seule, elle veut dire un quart de tour dans le sens des aiguilles d'une montre, comme si tu regardais cette face en face.",
            nl: "Dit is de standaardnotatie van kubers. Elke letter is de Engelse beginletter van een kant; alleen betekent ze een kwartslag met de klok mee, alsof je recht naar die kant kijkt.",
            en: "This is the standard notation cubers use. Each letter is the initial of a face; on its own, it means a quarter turn clockwise, as if you were looking straight at that face.",
          })}
        </p>
        <ul className="grid gap-1 sm:grid-cols-2">
          {FACES_EN.map(([m, en]) => (
            <li key={m}>
              {/* The English name only helps where it is not already the face's name. */}
              {letter(m)} {lang !== "en" && <span className="opacity-70">({en})</span>}
              {tr({ fr: " : ", nl: ": ", en: ": " })}
              {describeMove(m).join(", ")}
            </li>
          ))}
        </ul>
        <p>
          {tr({
            fr: (
              <>
                {letter("'")} (prime) : le même quart de tour dans l'autre sens, {letter("R'")} défait {letter("R")}.{" "}
                {letter("2")} : un demi-tour, {letter("U2")} = {letter("U U")}. {letter("x y z")} : tout le cube tourne
                dans ta main, comme {letter("R")}, {letter("U")} et {letter("F")}.
              </>
            ),
            nl: (
              <>
                {letter("'")} (prime): dezelfde kwartslag in de andere richting, {letter("R'")} maakt {letter("R")} ongedaan.{" "}
                {letter("2")}: een halve slag, {letter("U2")} = {letter("U U")}. {letter("x y z")}: de hele kubus draait
                in je hand, zoals {letter("R")}, {letter("U")} en {letter("F")}.
              </>
            ),
            en: (
              <>
                {letter("'")} (prime): the same quarter turn the other way, {letter("R'")} undoes {letter("R")}.{" "}
                {letter("2")}: a half turn, {letter("U2")} = {letter("U U")}. {letter("x y z")}: the whole cube turns
                in your hand, like {letter("R")}, {letter("U")} and {letter("F")}.
              </>
            ),
          })}
        </p>
      </div>
    </details>
  );
}

/** "Face du haut : un quart de tour…" with the face in bold. */
function MoveText({ move }: { move: string }) {
  const [face, turn] = describeMove(move);
  return (
    <p>
      <span className="font-semibold text-chalk">{face}</span> <span className="text-mist">{turn}</span>
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

/** « 20 coups », "1 move". */
const moves = (n: number) =>
  tr({ fr: `${n} coup${n > 1 ? "s" : ""}`, nl: `${n} ${n === 1 ? "zet" : "zetten"}`, en: `${n} move${n === 1 ? "" : "s"}` });

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

/** A move playing from `from`, forward or undone (inverted), and the group it belongs to. */
type Anim = { from: string; move: string; group: Group };
/** A stop between moves: the goal before a sequence's first move, the result after a demo's last. */
type Stop = "goal" | "result" | null;

const DELAYS = [2, 3, 5, 8];
const DELAY_KEY = "rubixcube:delay";
const GOAL_KEY = "rubixcube:path"; // the key of the path setting it replaces, so the choice carries over

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
  goal: (
    <>
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  next: <path d="M5 5v14l9-7zM15.5 5h3v14h-3z" />,
  done: <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />,
};
const Icon = ({ name, className = "size-5" }: { name: keyof typeof ICONS; className?: string }) => (
  <svg viewBox="0 0 24 24" className={`${className} flex-none`} fill="currentColor" aria-hidden>
    {ICONS[name]}
  </svg>
);
const DONE = tr({ fr: "Terminé", nl: "Klaar", en: "Done" });
const LABEL = "text-[11px] font-bold tracking-wide text-mist uppercase";
// A click leaves the focus where it was, so Space keeps toggling the auto mode.
const keepFocus = (e: React.MouseEvent) => e.preventDefault();

export default function Guide({ start, groups, learn, course, step, onStep, onHome, onScan, onEdit }: GuideProps) {
  const flat = useMemo(() => groups.flatMap((g, group) => g.moves.map((move) => ({ move, group }))), [groups]);
  const states = useMemo(() => planStates(start, groups), [start, groups]);
  const total = flat.length;
  // The cube each group leaves, and the place it leaves its piece in, named by the centers around it.
  const ends = useMemo(() => {
    let i = 0;
    return groups.map((g) => play(states[(i += g.moves.length) - g.moves.length], g.moves));
  }, [groups, states]);
  const slots = useMemo(() => new Map(groups.map((g, i) => [g, g.piece && slotOf(ends[i], findPiece(ends[i], g.piece))])), [groups, ends]);
  /** Whether move `s` starts a group with a piece to follow: a goal stop comes first. */
  const goalAt = (s: number) => learn && s < total && flat[s].group !== flat[s - 1]?.group && !!groups[flat[s].group].piece;
  /** Whether the group ending before move `s` hands over to another cube (a new demo): a result stop ends it. */
  const resultAt = (s: number) => s > 0 && s < total && flat[s].group !== flat[s - 1].group && states[s] !== ends[flat[s - 1].group];

  const [stop, setStop] = useState<Stop>(() => (goalAt(step) ? "goal" : null));
  const done = step === total;
  const gi = stop === "result" ? flat[step - 1].group : flat[step]?.group;
  const group = gi === undefined ? undefined : groups[gi];
  const move = stop ? undefined : flat[step]?.move;
  const state = stop === "result" ? ends[gi!] : states[step];

  // The cube rests on `state`; a step forward or back plays its move, while the texts already show where it lands.
  const [anim, setAnim] = useState<Anim | null>(null);
  // The goal's copy of the piece flying to its place; the fade that swaps one demo cube for the next.
  const [flying, setFlying] = useState(false);
  const [fading, setFading] = useState(false);
  const [auto, setAuto] = useState(false);
  const [delay, setDelay] = useState(() => Number(localStorage.getItem(DELAY_KEY)) || 5);
  const [showGoal, setShowGoal] = useState(() => localStorage.getItem(GOAL_KEY) !== "0");
  const cubeBox = useRef<HTMLDivElement>(null);
  /** Goes to move `to`, on its goal stop when it has one. */
  const land = (to: number, at: Stop = goalAt(to) ? "goal" : null) => {
    setStop(at);
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
    setFlying(false);
    land(to);
  };
  const forward = (playing = auto) => {
    if (done || fading) return;
    setFlying(false);
    if (stop === "result") return swap(() => land(step));
    if (stop === "goal") {
      setStop(null);
      // The autoplay may skip the flight; a press always shows it.
      setFlying(!playing || showGoal);
      cubeBox.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); // on a phone, the card sits below the cube
      return;
    }
    setAnim({ from: state, move: flat[step].move, group: group! });
    land(step + 1, resultAt(step + 1) ? "result" : undefined);
    if (step + 1 === total) setAuto(false);
  };
  const canBack = step > 0 || (!stop && goalAt(step));
  const back = () => {
    if (fading) return;
    setFlying(false);
    if (stop === "goal" && resultAt(step)) return swap(() => setStop("result"));
    if (!stop && goalAt(step)) {
      setAnim(null);
      return setStop("goal");
    }
    if (!step) return;
    const { move: m, group: g } = flat[step - 1];
    // From the end of that move: a course demo may start right after it, on another cube.
    setAnim({ from: applyMove(states[step - 1], m), move: invert([m])[0], group: groups[g] });
    land(step - 1, null);
  };
  const toggleAuto = () => {
    setAuto(!auto);
    if (!auto) forward(true); // starts right away
  };
  const chooseDelay = (d: number) => {
    setDelay(d);
    localStorage.setItem(DELAY_KEY, String(d));
  };
  const chooseGoal = (on: boolean) => {
    setShowGoal(on);
    localStorage.setItem(GOAL_KEY, on ? "1" : "0");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePicker();
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

  // An instruction with no goal stop to read it on gets twice the time before its first move.
  const wait = delay * 1000 * (learn && !stop && step === groupStart && !goalAt(step) ? 2 : 1);
  useEffect(() => {
    if (!auto || flying || fading) return;
    const timer = setTimeout(forward, wait);
    return () => clearTimeout(timer);
  }, [auto, step, stop, wait, flying, fading]);

  // Progress: one segment per stage (per phase in the fast mode), as long as its moves.
  const current = group?.stage ?? STAGES.length - 1;
  const firsts = STAGES.map((_, i) => flat.findIndex((f) => groups[f.group].stage === i));
  const segments = learn
    ? STAGES.map((s, i) => ({ title: s.title, first: firsts[i], count: flat.filter((f) => groups[f.group].stage === i).length }))
    : groups.map((g, i) => ({ title: g.title, first: flat.findIndex((f) => f.group === i), count: g.moves.length }));
  const reached = done ? segments.length : learn ? current : flat[step].group;
  const stage = learn ? STAGES[current] : undefined;
  // The stage list is a popover: it closes on any step change, a tap outside it, or Escape.
  const picker = useRef<HTMLDetailsElement>(null);
  const closePicker = () => picker.current?.removeAttribute("open");
  useEffect(closePicker, [step]);
  useEffect(() => {
    const outside = (e: PointerEvent) => picker.current?.contains(e.target as Node) || closePicker();
    addEventListener("pointerdown", outside);
    return () => removeEventListener("pointerdown", outside);
  }, []);

  const piece = group?.piece;
  const cases = course ? groups.map((g, i) => ({ g, first: flat.findIndex((f) => f.group === i) })).filter(({ g }) => g.stage === current) : [];
  // While a move plays, the outlines follow the piece it works on, from where it starts.
  const worked = anim?.group ?? group;
  const settings = useId();
  // What ▶ does from here: show the goal, go on to the next demo, play the move; its size never changes.
  const next: { icon: keyof typeof ICONS; label?: string; title: string } = done
    ? { icon: "done", title: DONE }
    : stop === "goal"
      ? { icon: "goal", label: tr({ fr: "But", nl: "Doel", en: "Goal" }), title: tr({ fr: "Voir le but", nl: "Bekijk het doel", en: "Show the goal" }) }
      : stop === "result"
        ? { icon: "next", label: tr({ fr: "Suite", nl: "Verder", en: "Next" }), title: tr({ fr: "Exemple suivant", nl: "Volgend voorbeeld", en: "Next example" }) }
        : { icon: "play", label: move, title: `${tr({ fr: "Jouer", nl: "Speel", en: "Play" })} ${move}` };

  return (
    <main className="mx-auto flex w-full flex-1 max-w-5xl flex-col gap-4 p-4 pb-44 md:px-8 md:pb-28 md:phone:gap-2 md:phone:pt-2">
      <div className="flex items-center justify-between gap-3 text-sm text-mist">
        <Back label={HOME} onClick={onHome} />
        <p className="text-right">
          {course
            ? tr({ fr: "Cube d'exemple", nl: "Voorbeeldkubus", en: "Sample cube" })
            : (
              <>
                <Chip face={state[4] as Face} /> {tr({ fr: "en haut", nl: "boven", en: "on top" })}, <Chip face={state[22] as Face} />{" "}
                {tr({ fr: "devant", nl: "vooraan", en: "in front" })}
                {!learn && tr({ fr: ", sans le retourner", nl: ", zonder hem om te draaien", en: ", without turning it over" })}
              </>
            )}
        </p>
      </div>

      <div className="flex flex-col gap-2">
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
        {stage ? (
          <details ref={picker} className="group relative">
            <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <span className="wide text-lg md:text-xl">{stage.title}</span>
              <span className="flex items-center gap-1 text-sm whitespace-nowrap text-mist">
                {current === 0
                  ? tr({ fr: "pour commencer", nl: "om te beginnen", en: "to begin" })
                  : `${tr({ fr: "étape", nl: "stap", en: "step" })} ${nOf(current, STAGES.length - 1)}`}
                <Chevron to="down" className="transition group-open:rotate-180" />
              </span>
            </summary>
            <ol className="absolute inset-x-0 top-full z-20 mt-2 grid gap-0.5 rounded-2xl border border-edge bg-shell p-1.5 shadow-2xl shadow-black/60 md:left-auto md:w-80">
              {STAGES.map((s, i) => (
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
        {cases.length > 1 && (
          <ol className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
            {cases.map(({ g, first }) => (
              <li key={first} className="shrink-0">
                <button
                  onClick={() => jump(first)}
                  onMouseDown={keepFocus}
                  className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${g === group ? "bg-chalk text-plastic" : "bg-shell text-mist hover:text-chalk"}`}
                >
                  {g.title}
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="grid flex-1 items-center gap-6 md:grid-cols-2 md:gap-10">
        <div
          ref={cubeBox}
          className={`aspect-square max-h-[40dvh] w-full justify-self-center transition-opacity duration-200 md:max-h-[60dvh] md:phone:sticky md:phone:top-4 md:phone:max-h-[calc(100dvh-12rem)] md:phone:self-start ${fading ? "opacity-0" : ""}`}
        >
          <CubeView
            state={anim?.from ?? state}
            moves={anim ? [anim.move] : undefined}
            fly={flying ? ends[gi!] : undefined}
            onEnd={() => (anim ? setAnim(null) : setFlying(false))}
            piece={worked?.piece}
            place={worked && slots.get(worked)}
            spot={!anim && (stop === "goal" || flying)}
          />
        </div>

        <div className="flex flex-col gap-4">
          {done ? (
            <div>
              <p className="wide text-4xl">
                {course
                  ? tr({ fr: "Cours terminé", nl: "Cursus voltooid", en: "Course complete" })
                  : tr({ fr: "Résolu !", nl: "Opgelost!", en: "Solved!" })}
              </p>
              <p className="mt-2 text-mist">
                {course
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
              <section className="rounded-2xl border border-edge bg-shell p-4 text-[15px] leading-relaxed">
                <p className={LABEL}>
                  {tr({ fr: "Le but", nl: "Het doel", en: "The goal" })}
                  {learn && group.stage > 0 && group.title && <span className="font-normal tracking-normal normal-case"> · {group.title}</span>}
                </p>
                <p className="wide mt-1 text-lg leading-snug">{learn && group.stage > 0 ? STAGES[group.stage].goal : (group.title ?? stage?.goal)}</p>
                {piece && (
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="flex items-center gap-1.5 rounded-lg bg-raised py-0.5 pr-2 pl-1 ring-1 ring-piece">
                      <span className="flex gap-px">
                        {pieceColors(piece).map((f) => (
                          <i key={f} className="h-3.5 w-2 rounded-[2px]" style={{ background: FACE_COLORS[f] }} />
                        ))}
                      </span>
                      {pieceName(piece)}
                    </span>
                    <span className="text-mist">→</span>
                    <span className="flex items-center gap-1.5 rounded-lg bg-raised py-0.5 pr-2 pl-1 ring-1 ring-place">
                      <i className="h-3.5 w-3.5 rounded-[2px] bg-place" />
                      {tr({ fr: "sa place", nl: "zijn plek", en: "its place" })}
                    </span>
                  </p>
                )}
                {group.text && (
                  <p className="mt-2 text-mist">
                    <Colored text={group.text} />
                  </p>
                )}

                <p className={`${LABEL} mt-4 border-t border-edge pt-3`}>{tr({ fr: "Comment", nl: "Hoe", en: "How" })}</p>
                <ol className="mt-2 grid gap-3">
                  {(group.steps ?? [{ text: "", count: group.moves.length }]).map((part, j, parts) => {
                    const first = groupStart + parts.slice(0, j).reduce((sum, p) => sum + p.count, 0);
                    const own = flat.slice(first, first + part.count).map((f) => f.move);
                    const [passed, here] = [stop === "result" || step >= first + part.count, !stop && step >= first && step < first + part.count];
                    // A sequence played several times shows each time apart, and which one is playing.
                    const rep = algOf(own);
                    const size = rep && !rep.setup && rep.reps > 1 ? rep.moves.length : own.length;
                    const runs = Array.from({ length: own.length / size }, (_, r) => r * size);
                    return (
                      <li key={j} className={`grid grid-cols-[1.25rem_1fr] gap-2.5 ${passed ? "opacity-55" : ""}`}>
                        <span className={`mt-0.5 grid size-5 place-items-center rounded-full text-[11px] font-bold ${here ? "bg-chalk text-plastic" : "bg-raised text-mist"} ${part.text ? "" : "invisible"}`}>
                          {j + 1}
                        </span>
                        <div className="min-w-0">
                          {part.text && (
                            <p>
                              <Colored text={part.text} />
                              {here && runs.length > 1 && (
                                <span className="ml-1.5 rounded-md bg-piece px-1.5 py-px align-[1px] text-[11px] font-bold text-plastic">
                                  {Math.floor((step - first) / size) + 1}/{runs.length}
                                </span>
                              )}
                            </p>
                          )}
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {runs.map((r) => (
                              <span key={r} className={`flex gap-1 ${runs.length > 1 ? "rounded-[10px] p-0.5 ring-1 ring-edge" : ""}`}>
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
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                {stage && !(course && !group.stage) && (
                  <p className="mt-4 text-sm text-mist">
                    <span className="text-chalk/80">{tr({ fr: "Pourquoi ça marche : ", nl: "Waarom het werkt: ", en: "Why it works: " })}</span>
                    <Colored text={stage.why} />
                  </p>
                )}
              </section>
            )
          )}
          <Notation />
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
            <span className="wide min-w-12 flex-none text-4xl leading-none">
              {stop === "goal" ? <Icon name="goal" className="size-9 text-piece" /> : (move ?? "✓")}
            </span>
            <div className="min-w-0 text-sm leading-snug">
              <p className="text-xs text-mist">
                {stop === "goal"
                  ? tr({ fr: "Objectif", nl: "Doel", en: "Goal" })
                  : stop === "result"
                    ? tr({ fr: "Résultat", nl: "Resultaat", en: "Result" })
                    : done
                      ? DONE
                      : `${tr({ fr: "Coup", nl: "Zet", en: "Move" })} ${position}`}
                {move && part && ` · ${part}`}
              </p>
              {stop === "goal" && piece && (
                <p>
                  <span className="font-semibold">{pieceName(piece)}</span>{" "}
                  <span className="text-mist">{tr({ fr: "→ sa place", nl: "→ zijn plek", en: "→ its place" })}</span>
                </p>
              )}
              {stop === "result" && <p className="font-semibold">{group?.title}</p>}
              {move && (
                <div className="md:line-clamp-2">
                  <MoveText move={move} />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <div className="flex gap-1 rounded-full bg-white/8 p-1 ring-1 ring-white/15">
              <button
                onClick={back}
                onMouseDown={keepFocus}
                disabled={!canBack}
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
                {auto && !flying && (
                  <svg viewBox="0 0 48 40" className="absolute inset-0" aria-hidden>
                    <rect key={`${step}|${stop}|${wait}`} x="1.5" y="1.5" width="45" height="37" rx="18.5" pathLength={100} className="countdown" style={{ animationDuration: `${wait}ms` }} />
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
              {learn && (
                <label className="mt-3 flex items-center justify-between gap-3 text-sm">
                  {tr({ fr: "Montrer l'objectif avant chaque séquence", nl: "Het doel tonen voor elke reeks", en: "Show the goal before each sequence" })}
                  <input type="checkbox" checked={showGoal} onChange={(e) => chooseGoal(e.target.checked)} className="size-4 flex-none accent-place" />
                </label>
              )}
            </div>
          </div>

          <p className="hidden text-right text-xs text-mist pointer-fine:md:block">
            {tr({ fr: "← → coup par coup · espace : auto", nl: "← → zet per zet · spatie: auto", en: "← → move by move · space: auto" })}
          </p>
        </div>
      </div>
    </main>
  );
}
