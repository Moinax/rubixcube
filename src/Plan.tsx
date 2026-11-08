import { Fragment, type ReactNode } from "react";
import CubeView, { BLANK } from "./CubeView";
import { Chevron, MiniFace, TopBar } from "./Home";
import { Colored } from "./Scanner";
import { STAGES } from "./beginner";
import { CASES, MILESTONES, PLAN, PRINCIPLES, SCRAMBLED, SEEN, SEEN_FROM_BELOW, TOPS } from "./plan";
import { FACE_COLORS, STICKERS, type Face } from "./cube";
import { tr } from "./i18n";

const LABEL = "text-[11px] font-bold tracking-wide text-mist uppercase";
const LAST = PLAN.length - 1;

/** `children`: the stage's cases, when they are open over the plan. */
type Props = { stage: number; onStage: (stage: number) => void; onBack: () => void; onCases: () => void; onMyCube: () => void; children?: ReactNode };

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

/** The beginner method as a map: the idea of it, where you stand, then each stage on its own, for any cube. */
export default function Plan({ stage, onStage, onBack, onCases, onMyCube, children }: Props) {
  const plan = PLAN[stage];
  const [intro, where] = [stage === 0, stage === WHERE];
  const cases = CASES[stage]?.length;
  const page = PAGES.indexOf(stage);
  const next = PAGES[page + 1];
  return (
    <>
      <TopBar back={{ label: tr({ fr: "Les bases", nl: "De basis", en: "The basics" }), onClick: onBack }} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 p-4 pb-28 md:p-8 md:pb-28">

        <nav className="-mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0" aria-label={tr({ fr: "Les étapes", nl: "De stappen", en: "The stages" })}>
          {PAGES.map((i) => (
            <button
              key={i}
              onClick={() => onStage(i)}
              aria-current={i === stage ? "step" : undefined}
              title={i > 0 ? STAGES[i].title : undefined}
              className={`h-9 flex-none rounded-full px-3 text-sm font-semibold ${i === stage ? "bg-chalk text-plastic" : "bg-shell text-mist hover:text-chalk"} ${i > 0 ? "min-w-9" : ""}`}
            >
              {i > 0 ? i : i === WHERE ? WHERE_TITLE : tr({ fr: "Le principe", nl: "Het idee", en: "The idea" })}
            </button>
          ))}
        </nav>

        <div className="grid gap-6 md:grid-cols-2 md:items-start md:gap-10">
          {/* Where you are is a list of drawings already: it takes the whole width. */}
          {!where && (
          <div className="md:sticky md:top-6">
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
                fr: "Gris : n'importe quelle couleur, ça ne compte pas encore. Fais tourner les cubes du doigt.",
                nl: "Grijs: eender welke kleur, het telt nog niet mee. Draai de kubussen met je vinger.",
                en: "Grey: any color, it doesn't count yet. Spin the cubes with your finger.",
              })}
            </p>
          </div>
          )}

          <section className={`rounded-2xl border border-edge bg-shell p-4 text-[15px] leading-relaxed md:p-5 ${where ? "max-sm:border-0 max-sm:bg-transparent max-sm:p-0 md:col-span-2 md:mx-auto md:w-full md:max-w-2xl" : ""}`}>
            <p className={LABEL}>
              {intro || where ? tr({ fr: "Le plan", nl: "Het plan", en: "The plan" }) : tr({ fr: `Étape ${stage} sur ${LAST}`, nl: `Stap ${stage} van ${LAST}`, en: `Stage ${stage} of ${LAST}` })}
            </p>
            <h1 className="wide mt-1 text-2xl leading-tight">
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
                <p className="wide mt-2 text-lg leading-snug">
                  <Colored text={STAGES[stage].goal} />
                </p>
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
                <p className="mt-4 rounded-xl bg-raised p-3 text-sm">
                  <span className="text-place">{tr({ fr: "C'est fini quand… ", nl: "Klaar wanneer… ", en: "Done when… " })}</span>
                  <Colored text={plan.done} />
                </p>
                {/* Named after the stage: what opens is that stage played out, not a list to browse. */}
                <button onClick={onCases} className="mt-4 flex w-full items-center gap-3 rounded-[0.875rem] border border-edge bg-raised p-3 text-left hover:border-mist/60">
                  <span className="grid size-10 flex-none place-items-center rounded-full bg-chalk text-plastic">
                    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
                      <path d="M7 5v14l12-7z" />
                    </svg>
                  </span>
                  <span>
                    <span className="block font-semibold">
                      {tr({ fr: "Montre-moi : ", nl: "Laat zien: ", en: "Show me: " })}
                      {STAGES[stage].title[0].toLowerCase() + STAGES[stage].title.slice(1)}
                    </span>
                    <span className="block text-sm text-mist">
                      {tr({
                        fr: `${cases} situation${cases > 1 ? "s jouées" : " jouée"} coup par coup sur un cube en 3D`,
                        nl: `${cases} ${cases > 1 ? "situaties" : "situatie"}, zet voor zet gespeeld op een 3D-kubus`,
                        en: `${cases} situation${cases > 1 ? "s" : ""}, played move by move on a 3D cube`,
                      })}
                    </span>
                  </span>
                </button>
              </>
            )}
          </section>
        </div>

        {/* Fixed, like the guide's player: the next stage is always under the same thumb. */}
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-edge bg-plastic/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 md:px-8">
            <button className="btn border border-edge bg-shell hover:bg-raised" disabled={!page} onClick={() => onStage(PAGES[page - 1])}>
              <Chevron to="left" />
              {tr({ fr: "Précédent", nl: "Vorige", en: "Previous" })}
            </button>
            {next !== undefined ? (
              <button className="btn btn-main min-w-0" onClick={() => onStage(next)}>
                <span className="truncate">
                  {next === WHERE ? (
                    WHERE_TITLE
                  ) : (
                    <>
                      {where ? tr({ fr: "Étape 1", nl: "Stap 1", en: "Stage 1" }) : tr({ fr: "Étape suivante", nl: "Volgende stap", en: "Next stage" })}
                      <span className="font-normal opacity-70 max-sm:hidden"> · {STAGES[next].title}</span>
                    </>
                  )}
                </span>
                <Chevron />
              </button>
            ) : (
              <button className="btn btn-main" onClick={onMyCube}>
                {tr({ fr: "Le faire sur mon cube", nl: "Doen op mijn kubus", en: "Do it on my cube" })}
                <Chevron />
              </button>
            )}
          </div>
        </div>

        {/* The cases cover the plan, which stays as it was under them: closing them lands where the reader left it. */}
        {children && <div className="fixed inset-0 z-30 flex flex-col overflow-y-auto overscroll-contain bg-plastic">{children}</div>}
      </main>
    </>
  );
}
