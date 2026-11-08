import { Fragment, useEffect, useState } from "react";
import CubeView, { BLANK } from "./CubeView";
import Guide from "./Guide";
import Lexicon, { LexiconButton } from "./Lexicon";
import { Chevron, MiniFace, TopBar, usePopover } from "./Home";
import { Colored } from "./Scanner";
import { STAGES } from "./beginner";
import { CASES, MILESTONES, PLAN, PRINCIPLES, SCRAMBLED, SEEN, SEEN_FROM_BELOW, TOPS } from "./plan";
import { FACE_COLORS, STICKERS, type Face } from "./cube";
import { tr } from "./i18n";

const LABEL = "text-[11px] font-bold tracking-wide text-mist uppercase";
const LAST = PLAN.length - 1;

/** A stage opens on its presentation; `view` is what was chosen from it, its whole text read or its cases watched
 * (`cases`: the step in them). */
export type View = "read" | "see";
type Props = {
  stage: number;
  view?: View;
  cases?: number;
  onStage: (stage: number) => void;
  onView: (view?: View) => void;
  onCases: (step?: number) => void;
  onBack: () => void;
};

/** What a viewer chose last, put first among the choices of the next presentation. */
type Mode = View;
const MODE_KEY = "rubixcube:plan-mode";
function savedMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === "read" ? "read" : "see";
  } catch {
    return "see";
  }
}

/** A small flat drawing of the cube `state` (its top, front and right faces, or its bottom, front and right ones
 * `below`), for a list where a 3D view each would be too many. */
function IsoCube({ state, below = false, className = "size-14" }: { state: string; below?: boolean; className?: string }) {
  const [sx, sy] = [Math.sqrt(3) / 2, 0.5];
  const at = ([x, y, z]: number[]) => `${((x - z) * sx).toFixed(3)},${((below ? -sy : sy) * (x + z) - y).toFixed(3)}`;
  const shown = [below ? [0, -1, 0] : [0, 1, 0], [0, 0, 1], [1, 0, 0]].map(String);
  return (
    <svg viewBox="-2.8 -3.2 5.6 6.4" className={`flex-none ${className}`} aria-hidden>
      {STICKERS.map(({ pos, normal }, i) => {
        if (!shown.includes(String(normal))) return null;
        const center = pos.map((p, k) => p + normal[k] * 0.5);
        const [u, v] = [0, 1, 2].filter((k) => !normal[k]);
        const corner = (a: number, b: number) => at(center.map((c, k) => c + (k === u ? a : k === v ? b : 0) * 0.44));
        return (
          <polygon
            key={i}
            points={[corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)].join(" ")}
            fill={FACE_COLORS[state[i] as Face] ?? BLANK}
            stroke="#16171b"
            strokeWidth="0.08"
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}

/** The cube at a milestone, with what it shows; greyed stickers can be anything. */
function Milestone({ at, label }: { at: number; label: string }) {
  const below = SEEN_FROM_BELOW.includes(at);
  return (
    <figure className="min-w-0 text-center">
      <div className="aspect-square w-full">
        <CubeView state={MILESTONES[at]} below={below} />
      </div>
      <figcaption className="text-sm font-semibold">{label}</figcaption>
      <p className={`text-xs text-mist ${below ? "" : "invisible"}`}>{tr({ fr: "vu du dessous", nl: "van onderen gezien", en: "seen from below" })}</p>
    </figure>
  );
}

/** The page that finds your stage from what your cube looks like, between the idea and the stages. */
export const WHERE = -1;
/** The pages in reading order: the idea (0), where you are, then stages 1 to 8. */
const PAGES = [0, WHERE, ...PLAN.slice(1).map((_, i) => i + 1)];
const WHERE_TITLE = tr({ fr: "Où j'en suis ?", nl: "Waar ben ik?", en: "Where am I?" });

const pageTitle = (page: number) =>
  page > 0 ? STAGES[page].title : page === WHERE ? WHERE_TITLE : tr({ fr: "Le principe", nl: "Het idee", en: "The idea" });

/** A page's mark in the phone menu: the stage's number, "?" for where you are, "i" for the idea. */
const PageMark = ({ page, current }: { page: number; current?: boolean }) => (
  <span className={`grid size-8 flex-none place-items-center rounded-full text-sm font-black ${current ? "bg-chalk text-plastic" : "bg-raised text-chalk"}`}>
    {page > 0 ? page : page === WHERE ? "?" : "i"}
  </span>
);

/** The beginner method as a map: the idea of it, where you stand, then each stage on its own, for any cube. */
export default function Plan({ stage, view, cases: step, onStage, onView, onCases, onBack }: Props) {
  const plan = PLAN[stage];
  const [intro, where] = [stage === 0, stage === WHERE];
  const page = PAGES.indexOf(stage);
  const next = PAGES[page + 1];
  const { ref: menu } = usePopover(stage);
  const [preferred, setPreferred] = useState(savedMode);
  const [lexicon, setLexicon] = useState(false);
  const watched = view === "see" && stage > 0;
  const reading = view === "read" && stage > 0;
  // "?" opens the glossary here too; the guide listens for itself when it shows.
  useEffect(() => {
    if (watched) return;
    const open = (e: KeyboardEvent) => e.key === "?" && !(e.target as Element).closest("input, textarea") && setLexicon(true);
    addEventListener("keydown", open);
    return () => removeEventListener("keydown", open);
  }, [watched]);
  const choose = (m: Mode) => {
    setPreferred(m);
    onView(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      // storage blocked: the choice lasts this visit
    }
  };
  const back = { label: tr({ fr: "Les bases", nl: "De basis", en: "The basics" }), onClick: onBack };
  // What the stage starts from and ends on: beside its text when read, as its presentation when watched.
  const beforeAfter = (
    <div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
        <Milestone
          at={intro ? 0 : stage - 1}
          label={intro ? tr({ fr: "Au départ", nl: "Bij het begin", en: "At the start" }) : tr({ fr: "Tu pars de", nl: "Je begint bij", en: "You start from" })}
        />
        <Chevron className="mb-8 text-mist" />
        <Milestone
          at={intro ? LAST : stage}
          label={intro ? tr({ fr: "À la fin", nl: "Op het einde", en: "At the end" }) : tr({ fr: "Tu arrives à", nl: "Je komt uit bij", en: "You end up with" })}
        />
      </div>
      <p className="mt-3 flex items-start justify-center gap-2 text-center text-xs text-mist">
        <i className="mt-0.5 size-3 flex-none rounded-[3px] " style={{ background: BLANK }} />
        {tr({
          fr: "Gris : n'importe quelle couleur, ça ne compte pas encore.",
          nl: "Grijs: eender welke kleur, het telt nog niet mee.",
          en: "Grey: any color, it doesn't count yet.",
        })}
      </p>
    </div>
  );
  const cases = new Set(CASES[stage]?.map((g) => g.title)).size;
  // Under the card, always the two other ways to the stage: its presentation, its text read, its cases watched. Light
  // links, so they never vie with the bar's buttons; on the presentation, the last choice reads brighter.
  const ways = (here?: Mode) => (
    <nav className="flex flex-col items-center gap-2.5 text-sm font-semibold">
      {(
        [
          [
            undefined,
            // An "i" in a circle, as the case menu marks the presentation.
            <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5.5M12 7.5v.5" />
            </svg>,
            tr({ fr: "Présentation", nl: "Kennismaking", en: "Introduction" }),
          ],
          ["read", "≡", tr({ fr: "Lire comment faire", nl: "Lezen hoe het moet", en: "Read how to do it" })],
          [
            "see",
            "▶",
            tr({
              fr: cases > 1 ? `Voir les ${cases} situations en 3D` : "Voir la situation en 3D",
              nl: cases > 1 ? `De ${cases} situaties in 3D bekijken` : "De situatie in 3D bekijken",
              en: cases > 1 ? `Watch the ${cases} situations in 3D` : "Watch the situation in 3D",
            }),
          ],
        ] as const
      )
        .filter(([m]) => m !== here)
        .map(([m, icon, label]) => (
          <button
            key={m ?? "present"}
            onClick={() => (m ? choose(m) : onView(undefined))}
            className={`group flex items-center gap-1.5 ${!here && m === preferred ? "text-chalk" : "text-mist hover:text-chalk"}`}
          >
            <span aria-hidden>{icon}</span>
            <span className="underline decoration-current/40 underline-offset-4 group-hover:decoration-current">{label}</span>
          </button>
        ))}
    </nav>
  );
  // Fixed at the bottom in both modes, the guide's player floating over it when watched: the next stage is always
  // under the same thumb.
  const bar = (
  <div className="fixed inset-x-0 bottom-0 z-10 border-t border-edge bg-plastic/95 pb-[env(safe-area-inset-bottom)] backdrop-blur before:pointer-events-none before:absolute before:inset-x-0 before:-top-10 before:h-10 before:bg-linear-to-t before:from-plastic before:to-transparent">
    {/* The page fades out above the bar (the before: layer), so the text plainly runs on under it. */}
    <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3 md:px-8">
      <button className="btn border border-edge bg-shell hover:bg-raised" disabled={!page} onClick={() => onStage(PAGES[page - 1])}>
        <Chevron to="left" />
        {tr({ fr: "Précédent", nl: "Vorige", en: "Previous" })}
      </button>
      {/* Short words on a phone, never cut: "Suivant"; the next page's name on a wide screen. */}
      {next !== undefined ? (
        <button className="btn btn-main" onClick={() => onStage(next)}>
          <span className="sm:hidden">{tr({ fr: "Suivant", nl: "Volgende", en: "Next" })}</span>
          <span className="max-sm:hidden">
            {next === WHERE ? (
              WHERE_TITLE
            ) : (
              <>
                {where ? tr({ fr: "Étape 1", nl: "Stap 1", en: "Stage 1" }) : tr({ fr: "Étape suivante", nl: "Volgende stap", en: "Next stage" })}
                <span className="font-normal opacity-70"> · {STAGES[next].title}</span>
              </>
            )}
          </span>
          <Chevron />
        </button>
      ) : (
        // The plan's end leads one level up, back to the basics.
        <button className="btn btn-main" onClick={onBack}>
          {tr({ fr: "Terminer", nl: "Afronden", en: "Finish" })}
          <span className="font-normal opacity-70 max-sm:hidden"> · {tr({ fr: "Les bases", nl: "De basis", en: "The basics" })}</span>
          <Chevron />
        </button>
      )}
    </div>
  </div>
  );


  // The pages in one menu at every size.
  const header = (
    <div className="flex items-center gap-2">
      <details ref={menu} className="group relative min-w-0 flex-1 md:max-w-md">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-2xl border border-edge bg-shell py-1.5 pr-3 pl-2 [&::-webkit-details-marker]:hidden">
          <PageMark page={stage} current />
          <span className="min-w-0 flex-1">
            {stage > 0 && <span className="block text-xs text-mist">{tr({ fr: `Étape ${stage} sur ${LAST}`, nl: `Stap ${stage} van ${LAST}`, en: `Stage ${stage} of ${LAST}` })}</span>}
            <span className="block leading-tight font-semibold">{pageTitle(stage)}</span>
          </span>
          <Chevron to="down" className="text-mist transition group-open:rotate-180" />
        </summary>
        <ol className="absolute inset-x-0 top-full z-20 mt-2 grid gap-0.5 rounded-2xl border border-edge bg-shell p-1.5 shadow-2xl shadow-black/60">
          {PAGES.map((i) => (
            <li key={i}>
              <button
                onClick={() => onStage(i)}
                aria-current={i === stage ? "step" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-edge ${i === stage ? "bg-edge font-semibold" : ""}`}
              >
                <PageMark page={i} current={i === stage} />
                {i > 0 && <span className="text-mist">{tr({ fr: `Étape ${i}`, nl: `Stap ${i}`, en: `Stage ${i}` })} ·</span>}
                {pageTitle(i)}
              </button>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );

  // Watched: the stage's cases, played in the guide's own player, in this page.
  if (watched)
    return (
      <>
      <Guide
        key={stage}
        start={CASES[stage][0].from!}
        groups={CASES[stage]}
        learn
        course
        step={step ?? 0}
        onStep={onCases}
        onHome={onBack}
        onScan={() => {}}
        onEdit={() => {}}
        focus={{
          title: STAGES[stage].title,
          back,
          header,
          onPresent: () => onView(undefined),
          footer: ways("see"),
        }}
      />
      {bar}
      </>
    );

  return (
    <>
      <TopBar back={back}>
        <LexiconButton onClick={() => setLexicon(true)} />
      </TopBar>
      {lexicon && <Lexicon tab="moves" onClose={() => setLexicon(false)} />}
      {/* One column a comfortable line long: the drawings, then the text under them. */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 pb-28 md:px-8">
        {header}

        <div className="grid gap-4 md:gap-6">
          {/* Where you are is a list of drawings already: it takes the whole width. */}
          {/* The presentation shows the stage big; read, it steps back for the text. */}
          {!where && <div className={`mx-auto w-full ${reading ? "max-w-48 md:max-w-xs" : "max-w-56 md:max-w-md"}`}>{beforeAfter}</div>}

          <section className={`rounded-2xl border border-edge bg-shell p-4 text-[15px] leading-relaxed md:p-5 ${where ? "max-sm:border-0 max-sm:bg-transparent max-sm:p-0" : ""}`}>
            {/* The phone menu above already says which page this is. */}
            <p className={`${LABEL} max-md:hidden`}>
              {intro || where ? tr({ fr: "Le plan", nl: "Het plan", en: "The plan" }) : tr({ fr: `Étape ${stage} sur ${LAST}`, nl: `Stap ${stage} van ${LAST}`, en: `Stage ${stage} of ${LAST}` })}
            </p>
            <h1 className="wide text-xl leading-tight md:mt-1">
              {intro ? tr({ fr: "Comment on résout un cube", nl: "Hoe je een kubus oplost", en: "How a cube gets solved" }) : where ? WHERE_TITLE : STAGES[stage].title}
            </h1>
            {intro ? (
              <>
                {PRINCIPLES.map(([heading, text]) => (
                  <div key={heading} className="mt-4">
                    <h2 className="font-semibold">{heading}</h2>
                    <p className="mt-1 text-mist">
                      <Colored text={text} />
                    </p>
                  </div>
                ))}
              </>
            ) : where ? (
              <>
                <p className="mt-1 text-mist">
                  {tr({
                    fr: "Cube jaune en haut, trouve la ligne où le premier dessin ressemble à ton cube. Le gris, c'est n'importe quelle couleur ; si plusieurs vont, prends la plus basse.",
                    nl: "Geel boven, zoek de rij waar de eerste tekening op je kubus lijkt. Grijs is eender welke kleur; passen er meerdere, neem dan de onderste.",
                    en: "Yellow on top, find the row whose first drawing looks like your cube. Grey is any color; if several fit, take the lowest.",
                  })}
                </p>
                <ol className="mt-4 grid gap-2">
                  {SEEN.map((seen, m) => (
                    <li key={m}>
                      {/* The stage to do comes first, what your cube looks like under it; the drawings go from your cube
                          to what the stage makes of it: on the right on a wide screen, in a captioned tray on a phone. */}
                      <button
                        onClick={() => onStage(m + 1)}
                        className="grid w-full grid-cols-[auto_1fr_auto] gap-x-3 gap-y-2.5 rounded-2xl bg-raised p-3 text-left hover:ring-1 hover:ring-edge sm:items-center sm:py-2"
                      >
                        <span className="grid size-8 place-items-center rounded-full bg-chalk text-sm font-black text-plastic">{m + 1}</span>
                        <span className="min-w-0 self-center">
                          <span className="block leading-tight font-semibold">{STAGES[m + 1].title}</span>
                          <span className="mt-0.5 block text-sm leading-snug text-mist">
                            {tr({ fr: "Ton cube : ", nl: "Je kubus: ", en: "Your cube: " })}
                            <Colored text={seen} />
                          </span>
                        </span>
                        <Chevron className="mt-2 self-start text-mist sm:hidden" />
                        <span className="col-span-2 col-start-2 flex items-center justify-center gap-6 rounded-xl bg-plastic/60 px-2 py-1.5 sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:gap-1 sm:bg-transparent sm:p-0">
                          {[
                            [m ? MILESTONES[m] : SCRAMBLED, m, tr({ fr: "ton cube", nl: "je kubus", en: "your cube" })] as const,
                            [MILESTONES[m + 1], m + 1, tr({ fr: "après", nl: "erna", en: "after" })] as const,
                          ].map(([state, at, caption], i) => (
                            <Fragment key={at}>
                              {i > 0 && <Chevron className="text-mist" />}
                              <span className="flex items-center gap-2 sm:flex-col sm:gap-0.5">
                                <IsoCube state={state} below={SEEN_FROM_BELOW.includes(at)} className="size-12" />
                                <span className="text-xs text-mist sm:hidden">{caption}</span>
                              </span>
                            </Fragment>
                          ))}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <>
                {/* Where the stage leads, set apart: what you aim at says more than the pieces you hunt. */}
                <p className="mt-2">
                  <span className="text-place">{tr({ fr: "C'est fini quand… ", nl: "Klaar wanneer… ", en: "Done when… " })}</span>
                  <Colored text={plan.done} />
                </p>
                {reading && (
                <>
                <h2 className={`${LABEL} mt-4 border-t border-edge pt-3`}>{tr({ fr: "Ce que tu cherches", nl: "Wat je zoekt", en: "What you look for" })}</h2>
                <p className="mt-1">
                  <Colored text={plan.look} />
                </p>
                <h2 className={`${LABEL} mt-4`}>{tr({ fr: "Comment faire", nl: "Hoe je het doet", en: "How to do it" })}</h2>
                <ol className="mt-2 grid gap-2.5">
                  {plan.how.map((text, j) => (
                    <li key={j} className="grid grid-cols-[1.25rem_1fr_auto] gap-2.5">
                      <span className="mt-0.5 grid size-5 place-items-center rounded-full bg-raised text-[11px] font-bold text-mist">{j + 1}</span>
                      <span>
                        <Colored text={text} />
                      </span>
                      {TOPS[stage]?.[j] ? <MiniFace cells={TOPS[stage][j]!} /> : <span />}
                    </li>
                  ))}
                </ol>
                <p className="mt-4 text-sm text-mist">
                  <span className="text-chalk/80">{tr({ fr: "Pourquoi ça marche : ", nl: "Waarom het werkt: ", en: "Why it works: " })}</span>
                  <Colored text={plan.why} />
                </p>
                </>
                )}
              </>
            )}
          </section>
          {stage > 0 && ways(reading ? "read" : undefined)}
        </div>

        {bar}

      </main>
    </>
  );
}
