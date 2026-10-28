import CubeView from "./CubeView";
import { applyMove, FACE_COLORS, SOLVED, type Face } from "./cube";
import { lang, LANGS, setLang, tr, type Lang } from "./i18n";

export type Mode = "fast" | "learn" | "course";

const SHOWCASE = "R U F' L2 D B' R2 U'".split(" ").reduce(applyMove, SOLVED);

/** A 3x3 face drawn from 9 face letters, "." for an empty cell; `marks` outlines cells as piece or place. */
function MiniFace({ cells, marks = {}, small }: { cells: string; marks?: Record<number, "piece" | "place">; small?: boolean }) {
  return (
    <span className={`grid flex-none grid-cols-3 bg-black ${small ? "size-6 gap-px rounded-[5px] p-0.5" : "size-10 gap-0.5 rounded-lg p-[3px]"}`}>
      {[...cells].map((c, i) => (
        <span
          key={i}
          className={`rounded-[2px] ${marks[i] === "piece" ? "outline-2 outline-piece" : marks[i] === "place" ? "outline-2 outline-place" : ""}`}
          style={{ background: c === "." ? "var(--color-blank)" : FACE_COLORS[c as Face] }}
        />
      ))}
    </span>
  );
}

const MODES: { id: Mode; title: string; text: string; face: string; marks?: Record<number, "piece" | "place"> }[] = [
  {
    id: "fast",
    title: tr({ fr: "Résoudre mon cube", nl: "Mijn kubus oplossen", en: "Solve my cube" }),
    text: tr({
      fr: "Le chemin le plus court, une vingtaine de coups.",
      nl: "De kortste weg, een twintigtal zetten.",
      en: "The shortest path, about twenty moves.",
    }),
    face: "RUFBLDFRU",
  },
  {
    id: "learn",
    title: tr({ fr: "Apprendre sur mon cube", nl: "Leren op mijn kubus", en: "Learn on my cube" }),
    text: tr({
      fr: "La méthode débutant, chaque geste expliqué sur ton propre cube.",
      nl: "De beginnersmethode, elke beweging uitgelegd op je eigen kubus.",
      en: "The beginner method, every move explained on your own cube.",
    }),
    face: ".U.UUU.U.",
  },
  {
    id: "course",
    title: tr({ fr: "Apprendre sans mon cube", nl: "Leren zonder mijn kubus", en: "Learn without my cube" }),
    text: tr({
      fr: "Le cours cas par cas, sur un cube d'exemple. Pas de scan.",
      nl: "De cursus geval per geval, op een voorbeeldkubus. Geen scan.",
      en: "The course case by case, on a sample cube. No scan.",
    }),
    face: ".........",
    marks: { 5: "piece", 8: "place" },
  },
];
const mode = (id: Mode) => MODES.find((m) => m.id === id)!;
export const modeTitle = (id: Mode) => mode(id).title;
export const HOME = tr({ fr: "Accueil", nl: "Start", en: "Home" });
export const ENTER_COLORS = tr({ fr: "Saisir les couleurs", nl: "Kleuren invoeren", en: "Enter the colors" });

const CHEVRONS = { left: "M15 5l-7 7 7 7", right: "M9 5l7 7-7 7", down: "M6 9l6 6 6-6" };
export const Chevron = ({ to = "right", className = "" }: { to?: keyof typeof CHEVRONS; className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={`size-4 flex-none fill-none stroke-current stroke-[2.2] ${className}`}>
    <path d={CHEVRONS[to]} />
  </svg>
);

/** The "← Label" link at the top of every screen. */
export const Back = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button onClick={onClick} className="inline-flex items-center gap-1 text-sm whitespace-nowrap text-mist hover:text-chalk">
    <Chevron to="left" />
    {label}
  </button>
);

const LANG_NAMES: Record<Lang, string> = { fr: "Français", nl: "Nederlands", en: "English" };

/** The three languages, at the top of every screen. */
export const Langs = () => (
  <nav className="mx-auto flex w-full max-w-5xl justify-end gap-1 px-4 pt-2 text-xs font-semibold md:px-8">
    {LANGS.map((l) => (
      <button
        key={l}
        lang={l}
        title={LANG_NAMES[l]}
        aria-label={LANG_NAMES[l]}
        aria-pressed={l === lang}
        onClick={() => l !== lang && setLang(l)}
        className={`rounded-full px-2.5 py-1 ${l === lang ? "bg-shell text-chalk" : "text-mist hover:text-chalk"}`}
      >
        {l.toUpperCase()}
      </button>
    ))}
  </nav>
);

export type Resume = { face: string; title: string; detail: string };
type HomeProps = { resume?: Resume; onResume: () => void; onMode: (mode: Mode) => void };

/** The mode comes first; how to show the cube is asked next, only when the mode needs it. */
export function Home({ resume, onResume, onMode }: HomeProps) {
  return (
    <main className="mx-auto flex w-full flex-1 max-w-5xl flex-col p-5 md:p-10">
      <header className="flex items-center gap-3">
        <img src="/favicon.svg" alt="" className="size-9" />
        <div>
          <p className="wide text-xl leading-none">Cubiste</p>
          <p className="mt-1 text-sm text-mist">
            {tr({ fr: "Résous ton cube, coup par coup.", nl: "Los je kubus op, zet voor zet.", en: "Solve your cube, move by move." })}
          </p>
        </div>
      </header>
      <div className="grid flex-1 content-center items-center gap-6 py-6 md:grid-cols-2 md:gap-14">
        <div className="mx-auto aspect-square w-full max-w-56 md:max-w-md">
          <CubeView state={SHOWCASE} autoRotate />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          {resume && (
            <button
              onClick={onResume}
              className="flex items-center gap-3 rounded-2xl border border-edge bg-shell p-3 text-left hover:bg-raised"
            >
              <MiniFace cells={resume.face} />
              <span className="flex-1">
                <span className="block font-semibold">{resume.title}</span>
                <span className="text-sm text-mist">{resume.detail}</span>
              </span>
              <Chevron />
            </button>
          )}
          <h1 className="wide pt-2 text-2xl md:text-3xl">{tr({ fr: "Que veux-tu faire ?", nl: "Wat wil je doen?", en: "What do you want to do?" })}</h1>
          <ul className="overflow-hidden rounded-2xl border border-edge">
            {MODES.map((m) => (
              <li key={m.id} className="border-edge not-first:border-t">
                <button onClick={() => onMode(m.id)} className="flex w-full items-center gap-3 bg-shell p-3.5 text-left hover:bg-raised">
                  <MiniFace cells={m.face} marks={m.marks} />
                  <span className="flex-1">
                    <span className="block font-semibold">{m.title}</span>
                    <span className="block text-sm leading-snug text-mist">{m.text}</span>
                  </span>
                  <span className="text-mist">
                    <Chevron />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}

type InputProps = { mode: Mode; onScan: () => void; onManual: () => void; onBack: () => void };

/** For the modes that need the user's cube: scan it, or type its colors in. */
export function InputChoice({ mode: id, onScan, onManual, onBack }: InputProps) {
  const m = mode(id);
  return (
    <main className="mx-auto flex w-full flex-1 max-w-2xl flex-col gap-5 p-5 md:justify-center md:p-10">
      <div>
        <Back label={HOME} onClick={onBack} />
      </div>
      <div className="flex items-center gap-2 self-start rounded-full border border-edge bg-shell py-1 pr-3 pl-1 text-sm">
        <MiniFace cells={m.face} marks={m.marks} small />
        {m.title}
        <button onClick={onBack} className="text-mist underline underline-offset-2 hover:text-chalk">
          {tr({ fr: "Changer", nl: "Wijzigen", en: "Change" })}
        </button>
      </div>
      <div>
        <h1 className="wide text-3xl">{tr({ fr: "Montre-moi ton cube", nl: "Laat me je kubus zien", en: "Show me your cube" })}</h1>
        <p className="mt-1 text-mist">
          {tr({
            fr: `Il me faut ses couleurs pour ${id === "fast" ? "calculer la solution" : "te guider pas à pas"}.`,
            nl: `Ik heb de kleuren nodig om ${id === "fast" ? "de oplossing te berekenen" : "je stap voor stap te begeleiden"}.`,
            en: `I need its colors to ${id === "fast" ? "work out the solution" : "guide you step by step"}.`,
          })}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <button onClick={onScan} className="grid gap-1.5 rounded-2xl bg-chalk p-5 text-left text-plastic hover:bg-white">
          <svg viewBox="0 0 24 24" aria-hidden className="mb-1 size-8 fill-none stroke-current stroke-[1.8]">
            <path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <circle cx="12" cy="12.5" r="3.5" />
          </svg>
          <span className="text-lg font-bold">{tr({ fr: "Scanner avec la caméra", nl: "Scannen met de camera", en: "Scan with the camera" })}</span>
          <span className="text-sm text-[#4b4f58]">
            {tr({
              fr: "Montre les 6 faces une par une, elles se capturent toutes seules. Environ une minute.",
              nl: "Toon de 6 kanten één voor één, ze worden vanzelf vastgelegd. Ongeveer een minuut.",
              en: "Show the 6 faces one by one, they capture themselves. About a minute.",
            })}
          </span>
        </button>
        <button onClick={onManual} className="grid gap-1.5 rounded-2xl border border-edge bg-shell p-5 text-left hover:bg-raised">
          <svg viewBox="0 0 24 24" aria-hidden className="mb-1 size-8 fill-none stroke-current stroke-[1.8]">
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <path d="M9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16" />
          </svg>
          <span className="text-lg font-bold">{ENTER_COLORS}</span>
          <span className="text-sm text-mist">
            {tr({
              fr: "Touche les cases d'un patron à plat. Pratique sans caméra ou sous une lumière difficile.",
              nl: "Tik de vakjes aan op een uitgeklapte kubus. Handig zonder camera of bij lastig licht.",
              en: "Tap the squares of a flat pattern. Handy without a camera or in tricky light.",
            })}
          </span>
        </button>
      </div>
      <p className="mt-auto flex items-start gap-2 text-xs text-mist md:mt-2">
        <svg viewBox="0 0 24 24" aria-hidden className="size-3.5 flex-none fill-none stroke-current stroke-2">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        {tr({
          fr: "L'image de la caméra reste sur ton appareil, rien n'est envoyé.",
          nl: "Het camerabeeld blijft op je toestel, er wordt niets verstuurd.",
          en: "The camera image stays on your device, nothing is sent.",
        })}
      </p>
    </main>
  );
}
