import { useEffect, useMemo, useRef } from "react";
import CubeView from "./CubeView";
import { Back, Chevron, HOME, modeTitle } from "./Home";
import { Chip, Colored } from "./Scanner";
import { findPiece, homeOf, planStates, STAGES, type Group } from "./beginner";
import { describeMove, upright, type Face } from "./cube";
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

export default function Guide({ start, groups, learn, course, step, onStep, onHome, onScan, onEdit }: GuideProps) {
  const flat = useMemo(() => groups.flatMap((g, group) => g.moves.map((move) => ({ move, group }))), [groups]);
  const states = useMemo(() => planStates(start, groups), [start, groups]);
  const total = flat.length;
  const done = step === total;
  const go = (delta: number) => onStep(Math.min(total, Math.max(0, step + delta)));
  const move = flat[step]?.move;
  const group = done ? undefined : groups[flat[step].group];
  const state = states[step];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A focused button already handles Space itself.
      if (e.key === " " && (e.target as Element).closest("button, summary")) return;
      if (e.key === " ") e.preventDefault();
      if (e.key === "ArrowRight" || e.key === " ") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "Escape") closePicker();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  // Learn and course modes walk one instruction at a time; the fast mode is one long sequence.
  const groupStart = flat.findIndex((f) => f.group === flat[step]?.group);
  const chips = flat.map((f, i) => ({ ...f, i })).filter((f) => !learn || f.group === flat[step]?.group);
  const [n, of] = learn ? [step - groupStart + 1, chips.length] : [step + 1, total];
  const position = nOf(n, of);

  // Progress: one segment per stage, as long as its moves.
  const current = group?.stage ?? STAGES.length - 1;
  const firsts = STAGES.map((_, i) => flat.findIndex((f) => groups[f.group].stage === i));
  const counts = STAGES.map((_, i) => flat.filter((f) => groups[f.group].stage === i).length);
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
  const target = stage?.toHome && piece ? homeOf(state, piece) : undefined;
  const cases = course ? groups.map((g, i) => ({ g, first: flat.findIndex((f) => f.group === i) })).filter(({ g }) => g.stage === current) : [];

  return (
    <main className="mx-auto flex w-full flex-1 max-w-5xl flex-col gap-4 p-4 pb-28 md:px-8 roomy:pb-6 md:phone:gap-2 md:phone:pt-2 md:phone:pb-20">
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
          {learn ? (
            STAGES.map((_, i) =>
              counts[i] ? (
                <span key={i} className="h-1.5 overflow-hidden rounded-full bg-edge" style={{ flexGrow: counts[i] }}>
                  <span
                    className={`block h-full ${i < current || done ? "bg-mist/70" : "bg-chalk"}`}
                    style={{ width: i < current || done ? "100%" : i === current ? `${(100 * (step - firsts[i])) / counts[i]}%` : 0 }}
                  />
                </span>
              ) : null,
            )
          ) : (
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-edge">
              <span className="block h-full bg-chalk" style={{ width: `${(100 * step) / Math.max(total, 1)}%` }} />
            </span>
          )}
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
                    onClick={() => onStep(firsts[i])}
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
                  onClick={() => onStep(first)}
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
        <div className="aspect-square max-h-[42dvh] w-full justify-self-center md:max-h-[60dvh] md:phone:sticky md:phone:top-4 md:phone:max-h-[calc(100dvh-10rem)] md:phone:self-start">
          <CubeView state={state} move={move} highlight={piece ? findPiece(state, piece) : undefined} target={target} />
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
            <>
              {(group?.text || stage) && (
                <section className="rounded-2xl border border-edge bg-shell p-4 text-[15px] leading-relaxed">
                  {group?.title && <p className="mb-1 font-semibold">{group.title}</p>}
                  {group?.text && (
                    <p>
                      <Colored text={group.text} />
                    </p>
                  )}
                  {piece && (
                    <p className="mt-2 flex gap-4 text-xs text-mist">
                      <span className="flex items-center gap-1.5">
                        <i className="size-2.5 rounded-[3px] bg-piece" />
                        {piece.length === 3
                          ? tr({ fr: "le coin", nl: "het hoekstuk", en: "the corner" })
                          : tr({ fr: "l'arête", nl: "het randstuk", en: "the edge" })}
                      </span>
                      {target && (
                        <span className="flex items-center gap-1.5">
                          <i className="size-2.5 rounded-[3px] bg-place" />
                          {tr({ fr: "sa place", nl: "zijn plek", en: "its place" })}
                        </span>
                      )}
                    </p>
                  )}
                  {stage && (
                    <details className="mt-3 border-t border-edge pt-3 text-sm text-mist">
                      <summary className="cursor-pointer text-chalk/80">
                        {tr({ fr: "Comment ça marche ?", nl: "Hoe werkt het?", en: "How does it work?" })}
                      </summary>
                      <p className="mt-1">
                        <span className="text-chalk">{stage.goal}</span> <Colored text={stage.how} />
                      </p>
                    </details>
                  )}
                </section>
              )}
              <div>
                <p className="text-sm text-mist phone:hidden">
                  {tr({ fr: "Coup", nl: "Zet", en: "Move" })} {position}
                </p>
                <p className="wide text-6xl phone:hidden">{move}</p>
                <div className="mt-1 phone:mt-0">
                  <MoveText move={move!} />
                </div>
              </div>
            </>
          )}

          {/* A bar fixed under the thumb on phones, with the move in the middle; inline on roomy screens. */}
          <div className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-edge bg-plastic/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:phone:pt-1.5 md:phone:pb-1.5 roomy:static roomy:grid-cols-2 roomy:border-0 roomy:bg-transparent roomy:p-0 roomy:backdrop-blur-none">
            <button className="btn btn-ghost max-[380px]:px-2 max-[380px]:text-sm" disabled={step === 0} onClick={() => go(-1)}>
              {tr({ fr: "Précédent", nl: "Vorige", en: "Previous" })}
            </button>
            <span className="min-w-14 text-center roomy:hidden">
              <span className="wide block text-3xl leading-none">{move ?? "✓"}</span>
              {!done && <span className="mt-1 block text-[11px] text-mist">{position}</span>}
            </span>
            <button className="btn btn-main max-[380px]:px-2 max-[380px]:text-sm" disabled={done} onClick={() => go(1)}>
              {step === total - 1
                ? tr({ fr: "Terminer", nl: "Klaar", en: "Finish" })
                : tr({ fr: "Suivant", nl: "Volgende", en: "Next" })}
            </button>
          </div>

          <ol className="flex flex-wrap gap-1.5 phone:order-1">
            {chips.map(({ move: m, i }) => (
              <li key={i}>
                <button
                  onClick={() => onStep(i)}
                  title={describeMove(m).join(", ")}
                  className={`min-w-10 rounded-lg px-2 py-1 text-sm font-semibold [font-stretch:125%] ${
                    i === step ? "bg-chalk text-plastic" : i < step ? "bg-shell text-mist/60" : "bg-shell text-chalk"
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
    </main>
  );
}
