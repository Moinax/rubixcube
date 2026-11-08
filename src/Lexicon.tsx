import { useEffect, useRef, useState } from "react";
import CubeView from "./CubeView";
import { ALGS, YELLOW_UP } from "./beginner";
import { describeMove } from "./cube";
import { lang, tr } from "./i18n";

export type Tab = "moves" | "sequences" | "pieces";
const TABS: [Tab, string][] = [
  ["moves", tr({ fr: "Coups", nl: "Zetten", en: "Moves" })],
  ["sequences", tr({ fr: "Séquences", nl: "Reeksen", en: "Sequences" })],
  ["pieces", tr({ fr: "Pièces", nl: "Stukken", en: "Pieces" })],
];

const FACES: [string, string][] = [["R", "Right"], ["L", "Left"], ["U", "Up"], ["D", "Down"], ["F", "Front"], ["B", "Back"]];
const MORE: [string, string][] = [
  ["R'", tr({ fr: "« prime » : la même face, dans l'autre sens", nl: "„prime”: dezelfde kant, de andere kant op", en: "“prime”: the same face, the other way" })],
  ["U2", tr({ fr: "un demi-tour, dans un sens ou dans l'autre", nl: "een halve slag, de ene of de andere kant op", en: "a half turn, either way" })],
  ["x", tr({ fr: "tout le cube, comme R", nl: "de hele kubus, zoals R", en: "the whole cube, like R" })],
  ["y", tr({ fr: "tout le cube, comme U", nl: "de hele kubus, zoals U", en: "the whole cube, like U" })],
  ["z", tr({ fr: "tout le cube, comme F", nl: "de hele kubus, zoals F", en: "the whole cube, like F" })],
];
/** The words of the method, with the piece to outline (its colors) when there is one. */
const WORDS: [word: string, text: string, piece?: string][] = tr({
  fr: [
    ["Centre", "La pièce au milieu de chaque face. Les centres ne bougent jamais : ce sont eux qui donnent la couleur de la face."],
    ["Arête", "Une pièce à 2 couleurs, entre deux centres. Il y en a 12.", "DF"],
    ["Coin", "Une pièce à 3 couleurs, à l'angle de trois faces. Il y en a 8.", "DFR"],
    ["Couronne", "Un étage du cube : celle du bas, celle du milieu, celle du haut. La méthode les fait une par une."],
    ["Pétale, marguerite", "Un pétale est une arête blanche posée autour du centre jaune, sa case blanche sur le dessus. Les 4 pétales forment la marguerite."],
    ["Place", "L'endroit où va une pièce : entre les centres de ses couleurs. Le guide l'encadre en vert."],
  ],
  nl: [
    ["Middenstuk", "Het stuk in het midden van elke kant. Middenstukken bewegen nooit: zij bepalen de kleur van de kant."],
    ["Randstuk", "Een stuk met 2 kleuren, tussen twee middenstukken. Er zijn er 12.", "DF"],
    ["Hoekstuk", "Een stuk met 3 kleuren, op de hoek van drie kanten. Er zijn er 8.", "DFR"],
    ["Laag", "Een verdieping van de kubus: de onderste, de middelste, de bovenste. De methode maakt ze een voor een."],
    ["Blaadje, madeliefje", "Een blaadje is een wit randstuk rond het gele middenstuk, met het witte vakje bovenop. De 4 blaadjes vormen het madeliefje."],
    ["Plek", "Waar een stuk hoort: tussen de middenstukken van zijn kleuren. De gids omlijnt die in het groen."],
  ],
  en: [
    ["Center", "The piece in the middle of each face. Centers never move: they give the face its color."],
    ["Edge", "A piece with 2 colors, between two centers. There are 12.", "DF"],
    ["Corner", "A piece with 3 colors, where three faces meet. There are 8.", "DFR"],
    ["Layer", "One level of the cube: the bottom, the middle, the top. The method does them one by one."],
    ["Petal, daisy", "A petal is a white edge around the yellow center, its white square on top. The 4 petals make the daisy."],
    ["Place", "Where a piece belongs: between the centers of its colors. The guide outlines it in green."],
  ],
});

const CLOSE = tr({ fr: "Fermer", nl: "Sluiten", en: "Close" });
const CARD = "rounded-xl border border-edge bg-raised p-2.5 text-left hover:border-mist/60 aria-pressed:border-chalk";

/**
 * The notation, the named sequences and the words of the method, in a dialog: a sheet from the bottom on a
 * phone. A card's moves play on the small cube; `focus`, a move, plays first.
 */
/** The glossary's button, in the top bar of every screen that offers it. */
export const LexiconButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    onMouseDown={(e) => e.preventDefault()} // the guide's keys keep working
    title={tr({ fr: "Lexique (?)", nl: "Woordenlijst (?)", en: "Glossary (?)" })}
    aria-label={tr({ fr: "Lexique", nl: "Woordenlijst", en: "Glossary" })}
    className="flex h-8 items-center gap-1.5 rounded-full border border-edge px-2.5 text-sm text-chalk hover:border-mist/60"
  >
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" />
    </svg>
    <span className="max-sm:hidden">{tr({ fr: "Lexique", nl: "Woordenlijst", en: "Glossary" })}</span>
  </button>
);

export default function Lexicon({ tab, focus, onClose }: { tab: Tab; focus?: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [shown, setShown] = useState(tab);
  // What the cube shows: moves to play, or a piece to outline; each tap counts, so the same card replays.
  const [demo, setDemo] = useState<{ moves?: string[]; piece?: string; tap: number }>({ moves: focus ? [focus] : undefined, tap: 0 });
  const show = (d: { moves?: string[]; piece?: string }) => setDemo({ ...d, tap: demo.tap + 1 });
  const pressed = (d: { moves?: string[]; piece?: string }) => `${demo.moves}|${demo.piece}` === `${d.moves}|${d.piece}`;
  useEffect(() => dialog.current!.showModal(), []);
  const close = () => dialog.current!.close();

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && close()} // a tap on the backdrop
      className="m-0 mt-auto max-h-[88dvh] w-full max-w-none rounded-t-3xl border border-edge bg-shell p-0 text-chalk backdrop:bg-black/60 md:m-auto md:max-h-[85dvh] md:w-[min(56rem,92vw)] md:rounded-3xl"
    >
      <div className="flex max-h-[inherit] flex-col md:grid md:grid-cols-[16rem_1fr]">
        <div className="relative h-40 flex-none bg-plastic md:aspect-square md:h-auto md:self-start">
          <CubeView state={YELLOW_UP} moves={demo.moves} replay={demo.tap} piece={demo.piece} />
          <button
            onClick={close}
            aria-label={CLOSE}
            className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-white/10 text-lg md:hidden"
          >
            ×
          </button>
        </div>
        <div className="flex min-h-0 flex-col p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="wide text-xl">{tr({ fr: "Lexique", nl: "Woordenlijst", en: "Glossary" })}</h2>
            <button onClick={close} className="hidden text-sm text-mist hover:text-chalk md:block">
              {CLOSE} · Esc
            </button>
          </div>
          <div className="mt-3 flex gap-1" role="tablist">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={id === shown}
                onClick={() => setShown(id)}
                className={`rounded-full px-3 py-1 text-sm font-semibold ${id === shown ? "bg-chalk text-plastic" : "text-mist hover:text-chalk"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-3 min-h-0 overflow-y-auto text-sm">
            {shown === "moves" && (
              <>
                <p className="text-mist">
                  {tr({
                    fr: "La notation standard des cubeurs : chaque lettre est l'initiale anglaise d'une face. Seule, elle veut dire un quart de tour dans le sens des aiguilles d'une montre, comme si tu regardais cette face en face. Touche une carte pour la voir sur le cube.",
                    nl: "De standaardnotatie van kubers: elke letter is de Engelse beginletter van een kant. Alleen betekent ze een kwartslag met de klok mee, alsof je recht naar die kant kijkt. Tik op een kaart om ze op de kubus te zien.",
                    en: "The standard notation cubers use: each letter is the initial of a face. On its own, it means a quarter turn clockwise, as if you were looking straight at that face. Tap a card to see it on the cube.",
                  })}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {FACES.map(([m, en]) => (
                    <button key={m} onClick={() => show({ moves: [m] })} aria-pressed={pressed({ moves: [m] })} className={`${CARD} text-center`}>
                      <span className="wide block text-2xl">{m}</span>
                      <span className="block text-xs text-mist">
                        {describeMove(m)[0]}
                        {lang !== "en" && <span className="opacity-70"> ({en})</span>}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {MORE.map(([m, text]) => (
                    <button key={m} onClick={() => show({ moves: [m] })} aria-pressed={pressed({ moves: [m] })} className={CARD}>
                      <span className="wide block text-xl">{m}</span>
                      <span className="block text-xs text-mist">{text}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            {shown === "sequences" && (
              <div className="grid gap-2 sm:grid-cols-2">
                {ALGS.map(([moves, name, use]) => (
                  <button key={name} onClick={() => show({ moves })} aria-pressed={pressed({ moves })} className={CARD}>
                    <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <span className="font-semibold first-letter:uppercase">{name}</span>
                      <span className="text-xs font-semibold [font-stretch:125%]">{moves.join(" ")}</span>
                    </span>
                    <span className="mt-1 block text-xs text-mist">{use}</span>
                  </button>
                ))}
              </div>
            )}
            {shown === "pieces" && (
              <div className="grid gap-2 sm:grid-cols-2">
                {WORDS.map(([word, text, piece]) =>
                  piece ? (
                    <button key={word} onClick={() => show({ piece })} aria-pressed={pressed({ piece })} className={CARD}>
                      <span className="font-semibold">{word}</span>
                      <span className="mt-1 block text-xs text-mist">{text}</span>
                    </button>
                  ) : (
                    <div key={word} className="rounded-xl border border-edge p-2.5">
                      <span className="font-semibold">{word}</span>
                      <span className="mt-1 block text-xs text-mist">{text}</span>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
