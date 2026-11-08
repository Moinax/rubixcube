import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import CubeView from "./CubeView";
import Guide from "./Guide";
import { BasicsChoice, Home, InputChoice, modeTitle, TopBar, type Mode, type Resume } from "./Home";
import Plan, { type View } from "./Plan";
import NetEditor from "./NetEditor";
import Scanner, { Colored, type Scan } from "./Scanner";
import { beginnerSolve, planStates, STAGES, type Group } from "./beginner";
import { CFOP_STAGES, cfopSolve } from "./cfop";
import { COURSE, HAND_STAGES, HANDS } from "./course";
import { phaseTwo, randomCube, SOLVED, solve, suspects, upright, validate } from "./cube";
import { nOf, tr } from "./i18n";

/** Modes that solve the user's own cube, so need its colors first. */
type CubeMode = Exclude<Mode, "course">;
/** `hands`: the course on holding the cube, rather than on reading the moves. */
type GuideScreen = { name: "guide"; start: string; groups: Group[]; learn: boolean; step: number; course?: boolean; hands?: boolean; cfop?: boolean };
type Screen =
  | { name: "home" }
  | { name: "basics" }
  /** `view`: what was chosen from the stage's presentation; `cases`: the step in its cases, when watched. */
  | { name: "plan"; stage: number; view?: View; cases?: number }
  | { name: "input"; mode: CubeMode }
  | { name: "scan"; mode: CubeMode; scan?: Scan }
  | { name: "edit"; mode: CubeMode; state: string; scan?: Scan }
  | { name: "solving" }
  | GuideScreen;

// The current screen survives a reload, so a scanned cube never has to be scanned again,
// and the last guide stays one tap away from the home screen.
const STORAGE_KEY = "rubixcube";
const GUIDE_KEY = "rubixcube:guide";

/** The fast solution in the two phases of Kociemba's method, each with what it does. */
function fastPlan(start: string, moves: string[]): Group[] {
  const k = phaseTwo(start, moves);
  const phases: Group[] = [
    {
      stage: 0,
      title: tr({ fr: "Phase 1 : tout remettre dans le bon sens", nl: "Fase 1: alles in de goede richting", en: "Phase 1: every piece the right way round" }),
      text: tr({
        fr: "La méthode de Kociemba, calculée pour ton cube : aucune séquence à retenir. Cette phase tourne chaque pièce dans le bon sens. À la fin, le haut et le bas ne montrent plus que du blanc et du jaune, et les 4 arêtes sans blanc ni jaune sont dans la couronne du milieu. Le cube a encore l'air mélangé, c'est normal.",
        nl: "De methode van Kociemba, berekend voor jouw kubus: geen reeksen om te onthouden. Deze fase draait elk stuk in de goede richting. Op het einde tonen boven- en onderkant alleen nog wit en geel, en zitten de 4 randstukken zonder wit of geel in de middelste laag. De kubus ziet er nog door elkaar uit, dat is normaal.",
        en: "Kociemba's method, worked out for your cube: no sequence to learn. This phase turns every piece the right way round. At the end, the top and bottom show only white and yellow, and the 4 edges without white or yellow sit in the middle layer. The cube still looks scrambled, that's normal.",
      }),
      moves: moves.slice(0, k),
    },
    {
      stage: 0,
      title: tr({ fr: "Phase 2 : tout remettre en place", nl: "Fase 2: alles op zijn plek", en: "Phase 2: every piece in its place" }),
      text: tr({
        fr: "Plus que des quarts de tour du haut et du bas, et des demi-tours des côtés : ces coups gardent chaque pièce dans le bon sens et la ramènent à sa place.",
        nl: "Alleen nog kwartslagen van boven- en onderkant, en halve slagen van de zijkanten: die zetten houden elk stuk in de goede richting en brengen het naar zijn plek.",
        en: "Only quarter turns of the top and bottom, and half turns of the sides: these moves keep every piece the right way round and bring it home.",
      }),
      moves: moves.slice(k),
    },
  ];
  return phases.filter((g) => g.moves.length);
}

/** The two courses of the basics, reading the moves or holding the cube, each with its stages. */
const courseOf = (hands?: boolean) => (hands ? { groups: HANDS, stages: HAND_STAGES } : { groups: COURSE, stages: STAGES });
/** The plan of a learning method for a cube: CFOP or the beginner method, and its stages. */
const method = (cfop?: boolean) => (cfop ? { solve: cfopSolve, stages: CFOP_STAGES } : { solve: beginnerSolve, stages: STAGES });

/** Rebuilds a saved plan from the code, so text updates reach a guide in progress: learn and course plans
 * anew, the fast solution split again from its saved moves (solving anew costs a solver warm-up). The
 * saved plan stays if that fails, or if the new plan never reaches the cube where the guide was left. */
function refresh(saved: GuideScreen): GuideScreen {
  try {
    if (!saved.learn) return { ...saved, groups: fastPlan(saved.start, saved.groups.flatMap((g) => g.moves)) };
    const guide = { ...saved, groups: saved.course ? courseOf(saved.hands).groups : method(saved.cfop).solve(saved.start) };
    // The rebuilt plan may split its moves differently, or turn the cube elsewhere: resume on the same cube,
    // however it is held, the closest match to the saved step.
    const reached = planStates(saved.start, saved.groups)[saved.step];
    const held = reached && upright(reached);
    const same = (s: string) => s === reached || (!!held && upright(s) === held);
    const states = planStates(guide.start, guide.groups);
    const matches = states.flatMap((s, i) => (same(s) ? [i] : []));
    if (matches.length) return { ...guide, step: matches.reduce((a, b) => (Math.abs(b - saved.step) < Math.abs(a - saved.step) ? b : a)) };
    // The new plan never passes through that cube: the saved plan goes on, older texts and all, rather than another cube.
    return saved;
  } catch (e) {
    console.error(e);
    return saved;
  }
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
  const where = guide.learn ? method(guide.cfop).stages[groupOfMove[guide.step].stage].title : modeTitle("fast");
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
  // The browser's back button (and a phone's back gesture) goes back one screen: each is a history entry, a change
  // within it (a stage, a move) only updates it. A screen restored from history isn't pushed again.
  const shown = useRef<string>(undefined);
  const popped = useRef(false);
  useEffect(() => {
    if (screen.name === "solving") return;
    if (shown.current === undefined || popped.current || shown.current === screen.name) history.replaceState(screen, "");
    else history.pushState(screen, "");
    [shown.current, popped.current] = [screen.name, false];
  }, [screen]);
  useEffect(() => {
    const back = (e: PopStateEvent) => {
      popped.current = true;
      setScreen(e.state ?? { name: "home" });
    };
    addEventListener("popstate", back);
    return () => removeEventListener("popstate", back);
  }, []);
  // Read once per visit to the home screen: it rebuilds the saved plan, which costs a solve.
  const saved = useMemo(() => (screen.name === "home" ? resumable() : undefined), [screen.name]);

  async function startGuide(edit: Extract<Screen, { name: "edit" }>) {
    const [learn, cfop] = [edit.mode !== "fast", edit.mode === "cfop"];
    setScreen({ name: "solving" });
    await new Promise((r) => setTimeout(r, 50)); // let the spinner paint before the solver blocks
    try {
      const groups = learn ? method(cfop).solve(edit.state) : fastPlan(edit.state, solve(edit.state));
      setScreen({ name: "guide", start: edit.state, groups, learn, step: 0, ...(cfop && { cfop }) });
    } catch (e) {
      console.error(e);
      alert(
        tr({
          fr: "Le calcul de la solution a échoué. Vérifie les couleurs, ou reviens à l'accueil pour essayer un autre mode.",
          nl: "Het berekenen van de oplossing is mislukt. Controleer de kleuren, of ga terug naar het begin om een andere modus te proberen.",
          en: "Working out the solution failed. Check the colors, or go back home to try another mode.",
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
              mode === "course" ? { name: "basics" } : { name: "input", mode },
            )
          }
        />
      );
    case "basics":
      return (
        <BasicsChoice
          onPick={(part) => {
            if (part === "plan") return setScreen({ name: "plan", stage: 0 });
            const { groups } = courseOf(part === "hands");
            setScreen({ name: "guide", start: groups[0].from!, groups, learn: true, step: 0, course: true, ...(part === "hands" && { hands: true }) });
          }}
          onBack={() => setScreen({ name: "home" })}
        />
      );
    case "plan":
      return (
        <Plan
          stage={screen.stage}
          view={screen.view}
          onView={(view) => setScreen({ ...screen, view })}
          cases={screen.cases}
          onCases={(cases) => setScreen({ ...screen, cases })}
          onStage={(stage) => {
            setScreen({ name: "plan", stage });
            scrollTo(0, 0);
          }}
          onBack={() => setScreen({ name: "basics" })}
          onMyCube={() => setScreen({ name: "input", mode: "learn" })}
        />
      );
    case "input":
      return (
        <InputChoice
          mode={screen.mode}
          onScan={() => setScreen({ name: "scan", mode: screen.mode })}
          onManual={() => setScreen({ name: "edit", mode: screen.mode, state: SOLVED })}
          onRandom={() => setScreen({ name: "edit", mode: screen.mode, state: randomCube() })}
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
      const mode = screen.cfop ? "cfop" : screen.learn ? "learn" : "fast";
      return (
        <Guide
          start={screen.start}
          groups={screen.groups}
          learn={screen.learn}
          course={screen.course}
          stages={screen.course ? courseOf(screen.hands).stages : method(screen.cfop).stages}
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
    <>
      <TopBar
        back={{
          label: scanned ? tr({ fr: "Rescanner", nl: "Opnieuw scannen", en: "Scan again" }) : tr({ fr: "Annuler", nl: "Annuleren", en: "Cancel" }),
          onClick: scanned ? onScan : onBack,
        }}
      />
      <main className="mx-auto flex w-full flex-1 max-w-5xl flex-col gap-5 p-4 md:p-8">
        {/* After a scan, going back means scanning again; after typing colors in, dropping them for the choice. */}
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
    </>
  );
}
