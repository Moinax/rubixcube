import { useEffect, useRef, type ReactNode } from "react";
import CubeView from "./CubeView";
import { applyMove, FACE_COLORS, SOLVED, type Face } from "./cube";
import { lang, LANGS, setLang, tr, type Lang } from "./i18n";

export type Mode = "fast" | "learn" | "cfop" | "course";

const SHOWCASE = "R U F' L2 D B' R2 U'".split(" ").reduce(applyMove, SOLVED);

/** A 3x3 face drawn from 9 face letters, "." for an empty cell; `marks` outlines cells as piece or place. */
export function MiniFace({ cells, marks = {}, small }: { cells: string; marks?: Record<number, "piece" | "place">; small?: boolean }) {
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

// From the first steps to the shortest solution.
const MODES: { id: Mode; title: string; text: string; face: string; marks?: Record<number, "piece" | "place"> }[] = [
  {
    id: "course",
    title: tr({ fr: "Apprendre les bases", nl: "De basis leren", en: "Learn the basics" }),
    text: tr({
      fr: "Lire les coups et chaque cas de la méthode débutant sur un cube d'exemple, ou tenir le cube et le tourner du bout des doigts. Pas de scan.",
      nl: "De zetten lezen en elk geval van de beginnersmethode op een voorbeeldkubus, of de kubus vasthouden en met je vingertoppen draaien. Geen scan.",
      en: "Read the moves and each case of the beginner method on a sample cube, or hold the cube and turn it at your fingertips. No scan.",
    }),
    face: ".........",
    marks: { 5: "piece", 8: "place" },
  },
  {
    id: "learn",
    title: tr({ fr: "Méthode débutant", nl: "Beginnersmethode", en: "Beginner method" }),
    text: tr({
      fr: "Couche par couche, environ 170 coups : chaque geste expliqué sur ton propre cube.",
      nl: "Laag per laag, ongeveer 170 zetten: elke beweging uitgelegd op je eigen kubus.",
      en: "Layer by layer, about 170 moves: every move explained on your own cube.",
    }),
    face: ".U.UUU.U.",
  },
  {
    id: "cfop",
    title: tr({ fr: "Méthode intermédiaire", nl: "Methode voor halfgevorderden", en: "Intermediate method" }),
    text: tr({
      fr: "CFOP en 4 temps, environ 80 coups, avec les algorithmes des speedcubers.",
      nl: "CFOP in 4 stappen, ongeveer 80 zetten, met de algoritmes van speedcubers.",
      en: "4-look CFOP, about 80 moves, with the speedcubers' algorithms.",
    }),
    face: "DDDDDDDDD",
  },
  {
    id: "fast",
    title: tr({ fr: "Méthode de Kociemba", nl: "Methode van Kociemba", en: "Kociemba's method" }),
    text: tr({
      fr: "Le chemin le plus court, une vingtaine de coups calculés pour ton cube : rien à retenir.",
      nl: "De kortste weg, een twintigtal zetten berekend voor je kubus: niets te onthouden.",
      en: "The shortest path, about twenty moves worked out for your cube: nothing to memorize.",
    }),
    face: "UDUDUDUDU", // the end of phase 1: only white and yellow on top
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

/** A <details> used as a popover menu: it closes when `on` changes (a choice was made), on a tap outside it, or Escape. */
export function usePopover(on: unknown) {
  const ref = useRef<HTMLDetailsElement>(null);
  const close = () => ref.current?.removeAttribute("open");
  useEffect(close, [on]);
  useEffect(() => {
    const outside = (e: PointerEvent) => ref.current?.contains(e.target as Node) || close();
    const escape = (e: KeyboardEvent) => e.key === "Escape" && close();
    addEventListener("pointerdown", outside);
    addEventListener("keydown", escape);
    return () => {
      removeEventListener("pointerdown", outside);
      removeEventListener("keydown", escape);
    };
  }, []);
  return { ref, close };
}

/** The way back, named after where it leads: the same button in the same place on every screen. */
const Back = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    onMouseDown={(e) => e.preventDefault()} // keeps the focus where it was, so the guide's keys keep working
    className="inline-flex h-10 min-w-0 items-center gap-1.5 rounded-full border border-edge bg-shell pr-4 pl-2.5 text-sm font-semibold whitespace-nowrap text-chalk hover:bg-raised"
  >
    <Chevron to="left" />
    <span className="truncate">{label}</span>
  </button>
);

/** The top of every screen: the way back on the left (none at home), the screen's tools then the languages on the right. */
export const TopBar = ({ back, children }: { back?: { label: string; onClick: () => void }; children?: ReactNode }) => (
  <header className="mx-auto flex min-h-10 w-full max-w-5xl flex-none items-center gap-2 px-4 pt-4 md:px-8">
    {back && <Back {...back} />}
    <span className="ml-auto flex flex-none items-center gap-1.5">
      {children}
      <Langs />
    </span>
  </header>
);

const LANG_NAMES: Record<Lang, string> = { fr: "Français", nl: "Nederlands", en: "English" };

/** The three languages, at the top right of every screen. */
const Langs = () => (
  <nav className="flex gap-0.5 text-xs font-semibold" aria-label="Language">
    {LANGS.map((l) => (
      <button
        key={l}
        lang={l}
        title={LANG_NAMES[l]}
        aria-label={LANG_NAMES[l]}
        aria-pressed={l === lang}
        onClick={() => l !== lang && setLang(l)}
        className={`h-8 rounded-full px-2 ${l === lang ? "bg-shell text-chalk" : "text-mist hover:text-chalk"}`}
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
    <>
      <TopBar />
      <main className="mx-auto flex w-full flex-1 max-w-5xl flex-col gap-2 p-4 md:p-8 md:pt-4">
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
            <h1 className="wide pt-2 text-2xl md:text-3xl">{tr({ fr: "Que veux-tu faire\u00a0?", nl: "Wat wil je doen?", en: "What do you want to do?" })}</h1>
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
    </>
  );
}

type InputProps = { mode: Mode; onScan: () => void; onManual: () => void; onRandom: () => void; onBack: () => void };

/** For the modes that need the user's cube: scan it, or type its colors in. */
export function InputChoice({ mode: id, onScan, onManual, onRandom, onBack }: InputProps) {
  const m = mode(id);
  return (
    <>
      <TopBar back={{ label: HOME, onClick: onBack }} />
      <main className="mx-auto flex w-full flex-1 max-w-2xl flex-col gap-5 p-5 md:justify-center md:p-10">
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
        <p className="text-sm text-mist">
          {tr({ fr: "Pas de cube sous la main ? ", nl: "Geen kubus bij de hand? ", en: "No cube at hand? " })}
          <button onClick={onRandom} className="font-semibold text-chalk underline underline-offset-2">
            {tr({ fr: "Prendre un cube mélangé au hasard", nl: "Neem een willekeurig gemengde kubus", en: "Take a randomly scrambled cube" })}
          </button>
        </p>
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
    </>
  );
}

export type Part = "plan" | "moves" | "hands";
type BasicsProps = { onPick: (part: Part) => void; onBack: () => void };

/** The basics come in three parts, each on its own: the plan of the method, reading the moves, or holding the cube. */
export function BasicsChoice({ onPick, onBack }: BasicsProps) {
  const parts: [Part, string, string][] = [
    [
      "plan",
      tr({ fr: "Comprendre la méthode", nl: "De methode begrijpen", en: "Understanding the method" }),
      tr({
        fr: "Les 8 étapes, de la marguerite au dernier coin : ce que tu cherches à chaque fois, quoi faire, et pourquoi. Pour savoir où tu en es sur n'importe quel cube.",
        nl: "De 8 stappen, van het madeliefje tot het laatste hoekstuk: wat je telkens zoekt, wat je doet, en waarom. Om te weten waar je staat, op eender welke kubus.",
        en: "The 8 stages, from the daisy to the last corner: what you look for each time, what to do, and why. To know where you stand on any cube.",
      }),
    ],
    [
      "moves",
      tr({ fr: "Lire les coups", nl: "De zetten lezen", en: "Reading the moves" }),
      tr({
        fr: "Les lettres R, U, F…, puis chaque cas de la méthode débutant, sur un cube d'exemple.",
        nl: "De letters R, U, F…, daarna elk geval van de beginnersmethode, op een voorbeeldkubus.",
        en: "The letters R, U, F…, then each case of the beginner method, on a sample cube.",
      }),
    ],
    [
      "hands",
      tr({ fr: "Tenir le cube", nl: "De kubus vasthouden", en: "Holding the cube" }),
      tr({
        fr: "Où poser les doigts, et quel doigt fait chaque coup. Cinq minutes, ton cube en main.",
        nl: "Waar je je vingers legt, en welke vinger elke zet doet. Vijf minuten, met je kubus in de hand.",
        en: "Where your fingers rest, and which finger makes each move. Five minutes, your cube in hand.",
      }),
    ],
  ];
  return (
    <>
      <TopBar back={{ label: HOME, onClick: onBack }} />
      <main className="mx-auto flex w-full flex-1 max-w-2xl flex-col gap-5 p-5 md:justify-center md:p-10">
        <h1 className="wide text-3xl">{tr({ fr: "Par quoi commencer\u00a0?", nl: "Waarmee begin je?", en: "Where to start?" })}</h1>
        <div className="grid gap-3 md:grid-cols-2">
          {parts.map(([id, title, text]) => (
            <button
              key={id}
              onClick={() => onPick(id)}
              className={`grid gap-1.5 rounded-2xl p-5 text-left ${id === "plan" ? "bg-chalk text-plastic hover:bg-white md:col-span-2" : "border border-edge bg-shell hover:bg-raised"}`}
            >
              <span className="text-lg font-bold">{title}</span>
              <span className={`text-sm ${id === "plan" ? "text-[#4b4f58]" : "text-mist"}`}>{text}</span>
            </button>
          ))}
        </div>
      </main>
    </>
  );
}
