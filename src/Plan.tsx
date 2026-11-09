import { Fragment, useEffect, useState, type ReactNode } from "react";
import CubeView, { BLANK } from "./CubeView";
import Guide from "./Guide";
import Lexicon, { LexiconButton } from "./Lexicon";
import { BAR_MENU, Chevron, IsoCube, MiniFace, TopBar, usePopover } from "./Home";
import { Colored } from "./Scanner";
import { STAGES } from "./beginner";
import { CASES, MILESTONE_NAMES, MILESTONES, PLAN, PRINCIPLES, SCRAMBLED, SEEN, SEEN_FROM_BELOW, TOPS } from "./plan";
import { tr } from "./i18n";

const LABEL = "text-[11px] font-bold tracking-wide text-mist uppercase";
const LAST = PLAN.length - 1;

/** A stage opens on its presentation; `view` "see" plays its cases (`cases`: the step in them). How to do it, in
 * words, opens over either. */
export type View = "see";
type Props = {
  stage: number;
  view?: View;
  cases?: number;
  onStage: (stage: number) => void;
  onView: (view?: View) => void;
  onCases: (step?: number) => void;
  onBack: () => void;
};

/** A milestone in its card: the cube on a soft shadow, then what the card stands for and the milestone's name, which
 * grow with the card. The goal's card is tinted with the place's green. Greyed stickers can be anything. */
function Milestone({ at, goal = false }: { at: number; goal?: boolean }) {
  const below = SEEN_FROM_BELOW.includes(at);
  return (
    <div
      className={`@container relative min-w-0 overflow-hidden rounded-[22px] border p-2.5 text-center md:p-3.5 ${
        goal ? "border-place/35 bg-linear-to-b from-[#1f2a27] to-[#1b1d22]" : "border-edge bg-linear-to-b from-[#22242b] to-[#1b1d22]"
      }`}
    >
      {goal && <div className="pointer-events-none absolute inset-x-[15%] top-[25%] h-[45%] bg-[radial-gradient(closest-side,#34d39922,transparent)]" />}
      <div className="relative aspect-square w-full">
        <div className="absolute inset-x-[18%] bottom-[2%] h-[9%] bg-[radial-gradient(closest-side,#00000090,transparent)]" />
        <CubeView state={MILESTONES[at]} below={below} />
      </div>
      <p className={`mt-1 text-[clamp(0.5625rem,2.8cqi,0.6875rem)] font-bold tracking-[0.12em] uppercase ${goal ? "text-place" : "text-mist"}`}>
        {goal ? tr({ fr: "Objectif", nl: "Doel", en: "Goal" }) : tr({ fr: "Point de départ", nl: "Startpunt", en: "Starting point" })}
      </p>
      <p className="wide mt-1 text-[clamp(0.875rem,5.4cqi,1.25rem)] leading-tight text-balance">{MILESTONE_NAMES[at]}</p>
      {/* Kept, unseen, when it is not: the page stays the same height from stage to stage. */}
      <p className={`mt-0.5 text-[clamp(0.6875rem,3.2cqi,0.875rem)] text-mist ${below ? "" : "invisible"}`}>
        {tr({ fr: "vu du dessous", nl: "van onderen gezien", en: "seen from below" })}
      </p>
    </div>
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

/** How to do a stage, in words, over the page: rising from the bottom on a phone, from the right on a wide screen,
 * where the cube stays in view beside it. Closed by ✕, a tap outside it, or Escape. */
function HowSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const close = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", close);
    return () => removeEventListener("keydown", close);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal aria-label={title}>
      <button aria-label={tr({ fr: "Fermer", nl: "Sluiten", en: "Close" })} onClick={onClose} className="absolute inset-0 bg-black/60" />
      <section className="absolute inset-x-0 bottom-0 flex max-h-[80dvh] flex-col rounded-t-3xl border-t border-edge bg-shell shadow-2xl shadow-black md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[26rem] md:rounded-none md:border-t-0 md:border-l">
        <header className="flex flex-none items-center gap-3 px-5 pt-4 pb-2">
          <h2 className="min-w-0 flex-1 font-semibold">
            {tr({ fr: "Comment faire", nl: "Hoe je het doet", en: "How to do it" })} <span className="text-mist">· {title}</span>
          </h2>
          <button onClick={onClose} aria-label={tr({ fr: "Fermer", nl: "Sluiten", en: "Close" })} className="grid size-9 flex-none place-items-center rounded-full border border-edge text-mist hover:text-chalk">
            ✕
          </button>
        </header>
        <div className="overflow-y-auto px-5 pb-5 text-[15px] leading-relaxed">
          {children}
        </div>
      </section>
    </div>
  );
}

/** The beginner method as a map: the idea of it, where you stand, then each stage on its own, for any cube. */
export default function Plan({ stage, view, cases: step, onStage, onView, onCases, onBack }: Props) {
  const plan = PLAN[stage];
  const [intro, where] = [stage === 0, stage === WHERE];
  const { ref: menu } = usePopover(stage);
  const [lexicon, setLexicon] = useState(false);
  const [how, setHow] = useState(false);
  const watched = view === "see" && stage > 0;
  // "?" opens the glossary here too; the guide listens for itself when it shows.
  useEffect(() => {
    if (watched) return;
    const open = (e: KeyboardEvent) => e.key === "?" && !(e.target as Element).closest("input, textarea") && setLexicon(true);
    addEventListener("keydown", open);
    return () => removeEventListener("keydown", open);
  }, [watched]);
  const back = { label: tr({ fr: "Les bases", nl: "De basis", en: "The basics" }), onClick: onBack };
  // What the stage starts from and ends on: its presentation.
  const [from, to] = intro ? [0, LAST] : [stage - 1, stage];
  const beforeAfter = (
    <div>
      {/* Two cards, the arrow a chip astride them at the cubes' middle: a quarter of the row, less its gap. */}
      <div className="@container relative grid grid-cols-2 items-stretch gap-(--gap) [--gap:0.625rem] md:[--gap:0.875rem]">
        <Milestone at={from} />
        <Milestone at={to} goal />
        <span className="absolute top-[calc((100cqi-var(--gap))/4)] left-1/2 grid size-7 -translate-1/2 place-items-center rounded-full border border-edge bg-plastic text-mist shadow-[0_0_0_5px_var(--color-plastic)] md:size-9">
          <svg viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current stroke-[2.4] md:size-4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>
      <p className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full border border-edge bg-shell/60 py-1 pr-3 pl-2 text-center text-[11px] text-mist md:mt-4 md:text-xs">
        <i className="size-3 flex-none rounded-[3px] shadow-[inset_0_0_0_1px_#ffffff14]" style={{ background: BLANK }} />
        {tr({
          fr: "Gris : n'importe quelle couleur, ça ne compte pas encore",
          nl: "Grijs: eender welke kleur, het telt nog niet mee",
          en: "Grey: any color, it doesn't count yet",
        })}
      </p>
    </div>
  );
  const cases = new Set(CASES[stage]?.map((g) => g.title)).size;
  const chained = !!CASES[stage]?.slice(1).every((g) => !g.from);
  const watchLabel = tr({
    fr: cases > 1 ? `Voir les ${cases} ${chained ? "étapes" : "situations"} en 3D` : "Voir la situation en 3D",
    nl: cases > 1 ? `De ${cases} ${chained ? "stappen" : "situaties"} in 3D bekijken` : "De situatie in 3D bekijken",
    en: cases > 1 ? `Watch the ${cases} ${chained ? "steps" : "situations"} in 3D` : "Watch the situation in 3D",
  });
  // How to do it, in words: a light link under the card that opens a panel over the page, never a mode of its own.
  const howLink = (
    <button onClick={() => setHow(true)} className="group mx-auto flex items-center gap-1.5 text-sm font-semibold text-mist hover:text-chalk">
      <span aria-hidden>≡</span>
      <span className="underline decoration-current/40 underline-offset-4 group-hover:decoration-current">{tr({ fr: "Comment faire", nl: "Hoe je het doet", en: "How to do it" })}</span>
    </button>
  );
  const next = stage > 0 && stage < LAST ? stage + 1 : undefined;
  // Once the cases are seen, and only then, the way on: the next stage, or back to the basics after the last.
  const onward = {
    label:
      next !== undefined
        ? tr({ fr: `Étape suivante · ${STAGES[next].title}`, nl: `Volgende stap · ${STAGES[next].title}`, en: `Next stage · ${STAGES[next].title}` })
        : tr({ fr: "Terminer · Les bases", nl: "Afronden · De basis", en: "Finish · The basics" }),
    onClick: () => (next !== undefined ? onStage(next) : onBack()),
  };
  const howSheet = how && stage > 0 && (
    <HowSheet title={STAGES[stage].title} onClose={() => setHow(false)}>
      <h3 className={LABEL}>{tr({ fr: "Ce que tu cherches", nl: "Wat je zoekt", en: "What you look for" })}</h3>
      <p className="mt-1">
        <Colored text={plan.look} />
      </p>
      <h3 className={`${LABEL} mt-4`}>{tr({ fr: "Comment faire", nl: "Hoe je het doet", en: "How to do it" })}</h3>
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
      <p className="mt-4 rounded-xl bg-raised p-3 text-sm">
        <span className="text-place">{tr({ fr: "C'est fini quand… ", nl: "Klaar wanneer… ", en: "Done when… " })}</span>
        <Colored text={plan.done} />
      </p>
    </HowSheet>
  );

  // The pages in one menu, in the top bar.
  const header = (
    <details ref={menu} className="group flex min-w-0 flex-1">
      <summary className={BAR_MENU.summary}>
        <PageMark page={stage} current />
        <span className="line-clamp-2 min-w-0 flex-1 text-sm leading-[1.1] font-semibold">{pageTitle(stage)}</span>
        <Chevron to="down" className="flex-none text-mist transition group-open:rotate-180" />
      </summary>
      <ol className={BAR_MENU.list}>
        {PAGES.map((i) => (
          <li key={i}>
            <button
              onClick={() => onStage(i)}
              aria-current={i === stage ? "step" : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-edge ${i === stage ? "bg-edge font-semibold" : ""}`}
            >
              <PageMark page={i} current={i === stage} />
              {pageTitle(i)}
            </button>
          </li>
        ))}
      </ol>
    </details>
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
          footer: howLink,
          next: onward,
        }}
      />
      {howSheet}
      </>
    );

  return (
    <>
      <TopBar back={back} menu={header}>
        <LexiconButton onClick={() => setLexicon(true)} />
      </TopBar>
      {lexicon && <Lexicon tab="moves" onClose={() => setLexicon(false)} />}
      {/* One column a comfortable line long: the drawings, then the text under them. */}
      <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 pb-10 md:px-8 md:pb-16">

        {/* On a wide screen the page sits in the middle of the height, the quiet link to the next stage at the foot. */}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:my-auto md:gap-6">
          {/* Where you are is a list of drawings already: it takes the whole width. */}
          {/* The same size presented or read: switching between them never moves the cubes. */}
          {/* On a wide screen they take the height the page leaves them, wider than the text if there is room, never
              wider than the top bar. */}
          {!where && <div className="w-full max-w-[max(14rem,calc((100dvh-32rem)*2))] justify-self-center md:w-[min(60rem,calc(100vw-4rem),max(28rem,calc((100dvh-32rem)*2)))] md:max-w-none">{beforeAfter}</div>}

          <section className={`rounded-2xl border border-edge bg-shell p-4 text-[15px] leading-relaxed md:p-5 [&>:first-child]:mt-0 ${where ? "max-sm:border-0 max-sm:bg-transparent max-sm:p-0" : ""}`}>
            {/* The menu above names the page: only the idea's page, called something else there, keeps a title. */}
            {intro && <h1 className="wide text-xl leading-tight">{tr({ fr: "Comment on résout un cube", nl: "Hoe je een kubus oplost", en: "How a cube gets solved" })}</h1>}
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
                    fr: "Tiens ton cube jaune en haut et trouve la ligne dont le dessin « ton cube » lui ressemble. Le gris, c'est n'importe quelle couleur. Si plusieurs lignes vont, prends celle qui est le plus bas dans la liste : c'est l'étape la plus avancée.",
                    nl: "Houd je kubus met geel boven en zoek de rij waarvan de tekening „je kubus” erop lijkt. Grijs is eender welke kleur. Passen er meerdere rijen, neem dan de onderste in de lijst: dat is de verste stap.",
                    en: "Hold your cube yellow on top and find the row whose \"your cube\" drawing looks like it. Grey is any color. If several rows fit, take the lowest one in the list: it's the furthest stage.",
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
                {/* Two lines kept, whatever its length: the page, centered, stays put from stage to stage. */}
                <p className="mt-2 md:min-h-[3.25em]">
                  <span className="text-place">{tr({ fr: "C'est fini quand… ", nl: "Klaar wanneer… ", en: "Done when… " })}</span>
                  <Colored text={plan.done} />
                </p>
              </>
            )}
          </section>
          {/* The principle leads to where you are; a stage, to its cases watched, its how in a panel. */}
          {intro && (
            <button onClick={() => onStage(WHERE)} className="btn btn-main w-full">
              {WHERE_TITLE}
              <Chevron />
            </button>
          )}
          {stage > 0 && (
            <>
              <button onClick={() => onView("see")} className="btn btn-main w-full">
                <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
                  <path d="M7 5v14l11-7z" />
                </svg>
                {watchLabel}
              </button>
              {howLink}
            </>
          )}
        </div>
        {/* A quiet way on, for who wants to skip ahead without watching. */}
        {stage > 0 && (
          <button onClick={onward.onClick} className="mt-auto flex items-center gap-1 self-center pt-6 text-xs text-mist hover:text-chalk md:absolute md:bottom-6 md:left-1/2 md:-translate-x-1/2">
            {tr({ fr: "Passer l'étape", nl: "Stap overslaan", en: "Skip this stage" })}
            <Chevron className="size-3" />
          </button>
        )}
        {howSheet}
      </main>
    </>
  );
}
