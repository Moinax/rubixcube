import type { ReactNode } from "react";
import CubeView from "./CubeView";
import { Chevron, MiniFace, TopBar } from "./Home";
import { Colored } from "./Scanner";
import { STAGES } from "./beginner";
import { CASES, MILESTONES, PLAN, PRINCIPLES, SEEN_FROM_BELOW, TOPS } from "./plan";
import { tr } from "./i18n";

const LABEL = "text-[11px] font-bold tracking-wide text-mist uppercase";
const LAST = PLAN.length - 1;

/** `children`: the stage's cases, when they are open over the plan. */
type Props = { stage: number; onStage: (stage: number) => void; onBack: () => void; onCases: () => void; onMyCube: () => void; children?: ReactNode };

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

/** The beginner method as a map: stage 0 is the idea of it, then each stage on its own, for any cube. */
export default function Plan({ stage, onStage, onBack, onCases, onMyCube, children }: Props) {
  const plan = PLAN[stage];
  const intro = stage === 0;
  const cases = CASES[stage].length;
  return (
    <>
      <TopBar back={{ label: tr({ fr: "Les bases", nl: "De basis", en: "The basics" }), onClick: onBack }} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 p-4 pb-28 md:p-8 md:pb-28">

        <nav className="-mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0" aria-label={tr({ fr: "Les étapes", nl: "De stappen", en: "The stages" })}>
          {PLAN.map((_, i) => (
            <button
              key={i}
              onClick={() => onStage(i)}
              aria-current={i === stage ? "step" : undefined}
              title={i ? STAGES[i].title : undefined}
              className={`h-9 flex-none rounded-full px-3 text-sm font-semibold ${i === stage ? "bg-chalk text-plastic" : "bg-shell text-mist hover:text-chalk"} ${i ? "min-w-9" : ""}`}
            >
              {i || tr({ fr: "Le principe", nl: "Het idee", en: "The idea" })}
            </button>
          ))}
        </nav>

        <div className="grid gap-6 md:grid-cols-2 md:items-start md:gap-10">
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
              <i className="mt-0.5 size-3 flex-none rounded-[3px] bg-[#3a3d46]" />
              {tr({
                fr: "Gris : n'importe quelle couleur, ça ne compte pas encore. Fais tourner les cubes du doigt.",
                nl: "Grijs: eender welke kleur, het telt nog niet mee. Draai de kubussen met je vinger.",
                en: "Grey: any color, it doesn't count yet. Spin the cubes with your finger.",
              })}
            </p>
          </div>

          <section className="rounded-2xl border border-edge bg-shell p-4 text-[15px] leading-relaxed md:p-5">
            <p className={LABEL}>
              {intro ? tr({ fr: "Le plan", nl: "Het plan", en: "The plan" }) : tr({ fr: `Étape ${stage} sur ${LAST}`, nl: `Stap ${stage} van ${LAST}`, en: `Stage ${stage} of ${LAST}` })}
            </p>
            <h1 className="wide mt-1 text-2xl leading-tight">
              {intro ? tr({ fr: "Comment on résout un cube", nl: "Hoe je een kubus oplost", en: "How a cube gets solved" }) : STAGES[stage].title}
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
                <h2 className="mt-5 border-t border-edge pt-4 font-semibold">{tr({ fr: "Où j'en suis ?", nl: "Waar ben ik?", en: "Where am I?" })}</h2>
                <p className="mt-1 text-mist">
                  {tr({
                    fr: "Tiens ton cube jaune en haut et réponds dans l'ordre. À la première réponse « non », tu as trouvé ton étape.",
                    nl: "Houd je kubus met geel boven en antwoord in volgorde. Bij het eerste „nee” heb je je stap gevonden.",
                    en: "Hold your cube yellow on top and answer in order. At the first “no”, you've found your stage.",
                  })}
                </p>
                <ol className="mt-3 grid gap-1.5">
                  {PLAN.slice(1, LAST).map((p, j) => (
                    <li key={j}>
                      <button onClick={() => onStage(j + 1)} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-raised p-2.5 text-left text-sm hover:ring-1 hover:ring-edge">
                        <span>
                          <Colored text={p.done} />
                        </span>
                        <span className="text-xs whitespace-nowrap text-mist">
                          {tr({ fr: "non → étape", nl: "nee → stap", en: "no → stage" })} {j + 1}
                        </span>
                      </button>
                    </li>
                  ))}
                  <li>
                    <button onClick={() => onStage(LAST)} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-raised p-2.5 text-left text-sm hover:ring-1 hover:ring-edge">
                      <span>{tr({ fr: "Oui à tout, mais pas encore résolu ?", nl: "Overal ja, maar nog niet opgelost?", en: "Yes to all, but not solved yet?" })}</span>
                      <span className="text-xs whitespace-nowrap text-mist">
                        {tr({ fr: "étape", nl: "stap", en: "stage" })} {LAST}
                      </span>
                    </button>
                  </li>
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
            <button className="btn border border-edge bg-shell hover:bg-raised" disabled={intro} onClick={() => onStage(stage - 1)}>
              <Chevron to="left" />
              {tr({ fr: "Précédent", nl: "Vorige", en: "Previous" })}
            </button>
            {stage < LAST ? (
              <button className="btn btn-main min-w-0" onClick={() => onStage(stage + 1)}>
                <span className="truncate">
                  {intro ? tr({ fr: "Étape 1", nl: "Stap 1", en: "Stage 1" }) : tr({ fr: "Étape suivante", nl: "Volgende stap", en: "Next stage" })}
                  <span className="font-normal opacity-70 max-sm:hidden"> · {STAGES[stage + 1].title}</span>
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
