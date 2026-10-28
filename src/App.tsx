import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import CubeView from "./CubeView";
import Guide from "./Guide";
import { Back, Home, InputChoice, modeTitle, type Mode, type Resume } from "./Home";
import NetEditor from "./NetEditor";
import Scanner, { Colored, type Scan } from "./Scanner";
import { beginnerSolve, planStates, STAGES, type Group } from "./beginner";
import { COURSE } from "./course";
import { SOLVED, solve, suspects, validate } from "./cube";
import { nOf, tr } from "./i18n";

/** Modes that solve the user's own cube, so need its colors first. */
type CubeMode = Exclude<Mode, "course">;
type GuideScreen = { name: "guide"; start: string; groups: Group[]; learn: boolean; step: number; course?: boolean };
type Screen =
  | { name: "home" }
  | { name: "input"; mode: CubeMode }
  | { name: "scan"; mode: CubeMode; scan?: Scan }
  | { name: "edit"; mode: CubeMode; state: string; scan?: Scan }
  | { name: "solving" }
  | GuideScreen;

// The current screen survives a reload, so a scanned cube never has to be scanned again,
// and the last guide stays one tap away from the home screen.
const STORAGE_KEY = "rubixcube";
const GUIDE_KEY = "rubixcube:guide";

/** Rebuilds a saved learn or course plan from the code, so text updates reach a guide in progress;
 * the saved plan stays if that fails. The fast solution has no texts and costs a solver warm-up. */
function refresh(guide: GuideScreen): GuideScreen {
  if (!guide.learn) return guide;
  try {
    guide = { ...guide, groups: guide.course ? COURSE : beginnerSolve(guide.start) };
  } catch (e) {
    console.error(e);
  }
  return { ...guide, step: Math.min(guide.step, guide.groups.reduce((n, g) => n + g.moves.length, 0)) };
}

function load<T>(key: string): T | undefined {
  try {
    return JSON.parse(localStorage.getItem(key)!) ?? undefined;
  } catch {
    return undefined;
  }
}

function restore(): Screen {
  const screen = load<Screen>(STORAGE_KEY) ?? { name: "home" };
  if (screen.name === "guide") return refresh(screen);
  // Screens saved before modes existed: their cube was meant to be learned.
  if (screen.name === "scan" || screen.name === "edit") screen.mode ??= "learn";
  return screen;
}

/** The unfinished guide the home screen offers to resume. */
function resumable(): { guide: GuideScreen; resume: Resume } | undefined {
  const saved = load<GuideScreen>(GUIDE_KEY);
  if (!saved) return;
  const guide = refresh(saved);
  const groupOfMove = guide.groups.flatMap((g) => g.moves.map(() => g));
  const total = groupOfMove.length;
  if (guide.step >= total) return;
  const state = planStates(guide.start, guide.groups)[guide.step];
  const where = guide.learn ? STAGES[groupOfMove[guide.step].stage].title : modeTitle("fast");
  const n = guide.step + 1;
  return {
    guide,
    resume: {
      face: state.slice(0, 9),
      title: tr({ fr: "Reprendre là où tu en étais", nl: "Verdergaan waar je was gebleven", en: "Pick up where you left off" }),
      detail: guide.course
        ? tr({ fr: `Le cours : ${where.toLowerCase()}`, nl: `De cursus: ${where.toLowerCase()}`, en: `The course: ${where.toLowerCase()}` })
        : `${where}, ${tr({ fr: "coup", nl: "zet", en: "move" })} ${nOf(n, total)}`,
    },
  };
}

const WIDE = "(min-width: 48rem)";
const useWide = () =>
  useSyncExternalStore(
    (onChange) => {
      const query = matchMedia(WIDE);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => matchMedia(WIDE).matches,
  );

export default function App() {
  const [screen, setScreen] = useState<Screen>(restore);
  useEffect(() => {
    if (screen.name === "solving") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(screen));
    // The course is always one tap away; only a guide on the user's own cube is worth resuming.
    if (screen.name === "guide" && !screen.course) localStorage.setItem(GUIDE_KEY, JSON.stringify(screen));
  }, [screen]);
  // Read once per visit to the home screen: it rebuilds the saved plan, which costs a solve.
  const saved = useMemo(() => (screen.name === "home" ? resumable() : undefined), [screen.name]);

  async function startGuide(edit: Extract<Screen, { name: "edit" }>) {
    const learn = edit.mode === "learn";
    setScreen({ name: "solving" });
    await new Promise((r) => setTimeout(r, 50)); // let the spinner paint before the solver blocks
    try {
      const groups = learn ? beginnerSolve(edit.state) : [{ stage: 0, text: "", moves: solve(edit.state) }];
      setScreen({ name: "guide", start: edit.state, groups, learn, step: 0 });
    } catch (e) {
      console.error(e);
      alert(
        tr({
          fr: "Le calcul de la solution a échoué. Vérifie les couleurs, ou reviens à l'accueil pour essayer l'autre mode.",
          nl: "Het berekenen van de oplossing is mislukt. Controleer de kleuren, of ga terug naar het begin om de andere modus te proberen.",
          en: "Working out the solution failed. Check the colors, or go back home to try the other mode.",
        }),
      );
      setScreen(edit);
    }
  }

  switch (screen.name) {
    case "home":
      return (
        <Home
          resume={saved?.resume}
          onResume={() => saved && setScreen(saved.guide)}
          onMode={(mode) =>
            setScreen(
              mode === "course"
                ? { name: "guide", start: COURSE[0].from!, groups: COURSE, learn: true, step: 0, course: true }
                : { name: "input", mode },
            )
          }
        />
      );
    case "input":
      return (
        <InputChoice
          mode={screen.mode}
          onScan={() => setScreen({ name: "scan", mode: screen.mode })}
          onManual={() => setScreen({ name: "edit", mode: screen.mode, state: SOLVED })}
          onBack={() => setScreen({ name: "home" })}
        />
      );
    case "scan":
      return (
        <Scanner
          initial={screen.scan}
          onDone={(state, scan) => setScreen({ name: "edit", mode: screen.mode, state, scan })}
          onManual={() => setScreen({ name: "edit", mode: screen.mode, state: SOLVED })}
          onCancel={() => setScreen({ name: "input", mode: screen.mode })}
        />
      );
    case "edit":
      return (
        <Editor
          state={screen.state}
          mode={screen.mode}
          scanned={!!screen.scan}
          onChange={(state) => setScreen({ ...screen, state })}
          onScan={() => setScreen({ name: "scan", mode: screen.mode, scan: screen.scan })}
          onBack={() => setScreen({ name: "input", mode: screen.mode })}
          onSolve={() => startGuide(screen)}
        />
      );
    case "solving":
      return <p className="grid w-full flex-1 place-items-center text-mist">{tr({ fr: "Calcul de la solution…", nl: "Oplossing berekenen…", en: "Working out the solution…" })}</p>;
    case "guide": {
      const mode = screen.learn ? "learn" : "fast";
      return (
        <Guide
          start={screen.start}
          groups={screen.groups}
          learn={screen.learn}
          course={screen.course}
          step={screen.step}
          onStep={(step) => setScreen({ ...screen, step })}
          onHome={() => setScreen({ name: "home" })}
          onScan={() => setScreen({ name: "scan", mode })}
          onEdit={(state) => setScreen({ name: "edit", mode, state })}
        />
      );
    }
  }
}

type EditorProps = {
  state: string;
  mode: CubeMode;
  scanned: boolean;
  onChange: (s: string) => void;
  onScan: () => void;
  onBack: () => void;
  onSolve: () => void;
};

function Editor({ state, mode, scanned, onChange, onScan, onBack, onSolve }: EditorProps) {
  const error = validate(state);
  // One 3D view at a time: beside the net on wide screens, folded under it on phones.
  const wide = useWide();
  const cube = (
    <div className="mx-auto aspect-square w-full max-w-sm md:max-w-none">
      <CubeView state={state} />
    </div>
  );
  return (
    <main className="mx-auto flex w-full flex-1 max-w-5xl flex-col gap-5 p-5 md:p-10">
      <div>
        {/* After a scan, going back means scanning again; after typing colors in, back to the choice. */}
        <Back
          label={scanned ? tr({ fr: "Rescanner", nl: "Opnieuw scannen", en: "Scan again" }) : tr({ fr: "Retour", nl: "Terug", en: "Back" })}
          onClick={scanned ? onScan : onBack}
        />
      </div>
      <div>
        <h1 className="wide text-3xl">{tr({ fr: "Vérifie les couleurs", nl: "Controleer de kleuren", en: "Check the colors" })}</h1>
        <p className="mt-1 text-mist">
          {tr({
            fr: "Touche une couleur, puis les cases à corriger.",
            nl: "Tik een kleur aan, dan de vakjes die je wilt corrigeren.",
            en: "Tap a color, then the squares to fix.",
          })}
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-[3fr_2fr] md:items-start md:gap-10">
        <div className="flex flex-col gap-4">
          <p
            className={`flex items-start gap-2.5 rounded-2xl border p-3 text-sm ${
              error ? "border-amber-400/30 bg-amber-400/10 text-amber-200" : "border-place/30 bg-place/10 text-emerald-200"
            }`}
          >
            <svg viewBox="0 0 24 24" aria-hidden className="mt-0.5 size-4 flex-none fill-none stroke-current stroke-2">
              <path d={error ? "M12 4l9 16H3zM12 10v4M12 17v.5" : "M5 12.5l4.5 4.5L19 7.5"} />
            </svg>
            <span>{error ? <Colored text={error} /> : tr({ fr: "Ce cube est valide.", nl: "Deze kubus is geldig.", en: "This cube is valid." })}</span>
          </p>
          <NetEditor state={state} onChange={onChange} highlight={error ? suspects(state) : undefined} />
          {!wide && (
            <details className="rounded-2xl border border-edge bg-shell">
              <summary className="cursor-pointer p-3 text-sm">
                <span className="font-semibold">{tr({ fr: "Voir en 3D", nl: "Bekijk in 3D", en: "See in 3D" })}</span>{" "}
                <span className="text-mist">
                  {tr({ fr: "pour comparer avec ton cube", nl: "om te vergelijken met je kubus", en: "to compare with your cube" })}
                </span>
              </summary>
              <div className="px-3 pb-3">{cube}</div>
            </details>
          )}
        </div>
        {wide && cube}
      </div>
      <button className="btn btn-main mt-auto w-full md:mt-0 md:w-auto md:self-start" disabled={!!error} onClick={onSolve}>
        {mode === "fast"
          ? tr({ fr: "Voir la solution", nl: "Oplossing bekijken", en: "See the solution" })
          : tr({ fr: "Commencer le guide", nl: "Start de gids", en: "Start the guide" })}
      </button>
    </main>
  );
}
