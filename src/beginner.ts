import { capitalize, tr } from "./i18n.ts";
import { applyMove, center, colorsOf as key, FACE_NAMES, INFLECTED, NORMALS, PIECES, simplify, SOLVED, STICKERS, stickerAt, type Face, type Vec } from "./cube.ts";

// Layer-by-layer beginner method, played like a human would: hold the cube
// yellow up, turn it with y to face the slot you work on, and apply the
// handful of algorithms the method teaches. Each step is simulated, never searched,
// except the daisy, which is intuitive anyway.

/** `goal`: what the stage builds; `aim`: what one case, one group of its moves, does toward it; `why`: in one line, why its
 * moves work. `toHome`: the stage puts each piece in its final place. */
export type Stage = { title: string; goal: string; why: string; aim?: string; toHome?: boolean };
/** One part of a group's moves, with what to do: the setup, then the sequence. */
export type Step = { text: string; count: number };
/** Moves to play: `text` says where the piece stands and where it goes, `steps` how to get it there, and the
 * named sequence they end with; `pair` is the edge that goes with the piece (a corner) into its slot; course
 * demos also carry a title and their own start cube. */
export type Group = {
  stage: number;
  text: string;
  moves: string[];
  steps?: Step[];
  piece?: string;
  pair?: string;
  alg?: Alg;
  title?: string;
  from?: string;
  /** The finger or wrist that makes each move, in the lessons on holding the cube, where the grip shows too. */
  fingers?: string[];
};

export const STAGES: Stage[] = tr<Stage[]>({
  fr: [
    {
      title: "Prise en main",
      goal: "Tenir le cube jaune en haut, blanc en bas.",
      why: "Les centres ne bougent jamais : ce sont eux qui donnent la couleur de chaque face.",
    },
    {
      title: "La marguerite",
      goal: "Les 4 arêtes blanches autour du centre jaune, blanc vers le haut.",
      aim: "Faire de cette arête un pétale\u00a0: en haut, autour du centre jaune, blanc vers le haut.",
      why: "Le dessus ne contient encore rien d'important : on peut y ranger les arêtes blanches sans rien casser.",
    },
    {
      title: "La croix blanche",
      goal: "Les 4 arêtes blanches en bas, chacune sous le centre de sa couleur.",
      aim: "Descendre ce pétale en bas, sous le centre de son autre couleur.",
      why: "Un demi-tour ne touche qu'une face : le pétale descend, les autres restent en haut.",
    },
    {
      title: "Les coins blancs",
      goal: "Les 4 coins blancs en bas, pour finir la première couronne.",
      aim: "Mettre ce coin à sa place en bas, blanc dessous.",
      why: "6 sexy moves ramènent le cube à l'identique : en route, rien d'autre ne casse en bas.",
    },
    {
      title: "La deuxième couronne",
      goal: "Les 4 arêtes de la couronne du milieu à leur place.",
      aim: "Glisser cette arête à sa place, dans la couronne du milieu.",
      why: "L'insertion écarte la place, y glisse l'arête, puis remet le coin blanc comme avant ; à gauche, c'est le miroir.",
    },
    {
      title: "La croix jaune",
      goal: "Une croix jaune sur le dessus.",
      aim: "Passer au dessin jaune suivant\u00a0: du point au L, du L à la ligne, de la ligne à la croix.",
      why: "Le F … F' autour du sexy move retourne des arêtes du haut sans toucher aux deux premières couronnes.",
    },
    {
      title: "Les arêtes jaunes",
      goal: "Chaque arête jaune au-dessus du centre de sa couleur.",
      aim: "Amener chaque arête de la croix au-dessus du centre de sa couleur.",
      why: "Le Sune fait tourner trois arêtes du haut et laisse le reste du cube intact.",
    },
    {
      title: "Placer les coins jaunes",
      goal: "Chaque coin du haut à sa place, même mal tourné.",
      aim: "Mettre chaque coin du haut à sa place, même mal tourné.",
      why: "Le Niklas fait tourner trois coins et laisse immobile celui en haut à droite devant toi.",
    },
    {
      title: "Orienter les coins jaunes",
      goal: "Tourner les coins jaunes pour finir le cube.",
      aim: "Tourner les coins du haut un par un, jusqu'à ce que leur jaune soit sur le dessus.",
      why: "Le bas se mélange en route puis se répare tout seul : les répétitions font un multiple de 6, et 6 R' D' R D ne changent rien.",
    },
  ],
  nl: [
    {
      title: "Aan de slag",
      goal: "Houd de kubus met geel boven en wit onder.",
      why: "De middenstukken bewegen nooit: zij bepalen de kleur van elke kant.",
    },
    {
      title: "Het madeliefje",
      goal: "De 4 witte randstukken rond het gele middenstuk, met wit naar boven.",
      aim: "Van dit randstuk een blaadje maken: bovenaan, rond het gele middenstuk, met wit naar boven.",
      why: "Bovenaan zit nog niets belangrijks: je kunt de witte randstukken daar kwijt zonder iets stuk te maken.",
    },
    {
      title: "Het witte kruis",
      goal: "De 4 witte randstukken onderaan, elk onder het middenstuk van zijn kleur.",
      aim: "Dit blaadje naar onderen brengen, onder het middenstuk van zijn andere kleur.",
      why: "Een halve slag raakt maar één kant: het blaadje zakt, de andere blijven boven.",
    },
    {
      title: "De witte hoeken",
      goal: "De 4 witte hoekstukken onderaan, om de eerste laag af te maken.",
      aim: "Dit hoekstuk op zijn plek onderaan zetten, met wit onderaan.",
      why: "6 sexy moves brengen de kubus terug zoals hij was: onderweg gaat onderaan niets anders stuk.",
    },
    {
      title: "De tweede laag",
      goal: "De 4 randstukken van de middelste laag op hun plek.",
      aim: "Dit randstuk op zijn plek schuiven, in de middelste laag.",
      why: "Het invoegen schuift de plek opzij, schuift het randstuk erin en zet het witte hoekstuk terug; naar links is het spiegelbeeld.",
    },
    {
      title: "Het gele kruis",
      goal: "Een geel kruis op de bovenkant.",
      aim: "Naar de volgende gele tekening: van stip naar L, van L naar lijn, van lijn naar kruis.",
      why: "De F … F' rond de sexy move draait randstukken bovenaan om zonder aan de eerste twee lagen te komen.",
    },
    {
      title: "De gele randstukken",
      goal: "Elk geel randstuk boven het middenstuk van zijn kleur.",
      aim: "Elk randstuk van het kruis boven het middenstuk van zijn kleur brengen.",
      why: "De Sune wisselt drie randstukken bovenaan rond en laat de rest van de kubus heel.",
    },
    {
      title: "De gele hoeken plaatsen",
      goal: "Elk hoekstuk bovenaan op zijn plek, ook als het verkeerd gedraaid is.",
      aim: "Elk hoekstuk bovenaan op zijn plek zetten, ook als het verkeerd gedraaid is.",
      why: "De Niklas wisselt drie hoekstukken rond en laat het hoekstuk rechtsboven vooraan stilstaan.",
    },
    {
      title: "De gele hoeken draaien",
      goal: "De gele hoekstukken draaien om de kubus af te maken.",
      aim: "De hoekstukken bovenaan één voor één draaien, tot hun geel bovenop zit.",
      why: "De onderkant raakt onderweg door elkaar en herstelt zich vanzelf: de herhalingen tellen op tot een veelvoud van 6, en 6 keer R' D' R D verandert niets.",
    },
  ],
  en: [
    {
      title: "Getting started",
      goal: "Hold the cube yellow on top, white at the bottom.",
      why: "The centers never move: they give each face its color.",
    },
    {
      title: "The daisy",
      goal: "The 4 white edges around the yellow center, white facing up.",
      aim: "Turn this edge into a petal: on top, around the yellow center, white facing up.",
      why: "The top holds nothing important yet: the white edges can wait there without breaking anything.",
    },
    {
      title: "The white cross",
      goal: "The 4 white edges at the bottom, each under the center of its color.",
      aim: "Bring this petal down, under the center of its other color.",
      why: "A half turn moves only one face: the petal drops, the others stay on top.",
    },
    {
      title: "The white corners",
      goal: "The 4 white corners at the bottom, to finish the first layer.",
      aim: "Put this corner in its place at the bottom, white underneath.",
      why: "6 sexy moves bring the cube back as it was: along the way, nothing else breaks at the bottom.",
    },
    {
      title: "The second layer",
      goal: "The 4 middle-layer edges in their places.",
      aim: "Slide this edge into its place, in the middle layer.",
      why: "The insert moves the slot aside, slides the edge in, then puts the white corner back; to the left, it's the mirror.",
    },
    {
      title: "The yellow cross",
      goal: "A yellow cross on top.",
      aim: "Move on to the next yellow shape: dot to L, L to line, line to cross.",
      why: "The F … F' around the sexy move flips top edges without touching the first two layers.",
    },
    {
      title: "The yellow edges",
      goal: "Each yellow edge above the center of its color.",
      aim: "Get each edge of the cross above the center of its color.",
      why: "The Sune cycles three top edges and leaves the rest of the cube intact.",
    },
    {
      title: "Place the yellow corners",
      goal: "Every top corner in its place, even if twisted.",
      aim: "Put each top corner in its place, even if twisted.",
      why: "The Niklas cycles three corners and leaves the top right front one still.",
    },
    {
      title: "Orient the yellow corners",
      goal: "Twist the yellow corners to finish the cube.",
      aim: "Twist the top corners one by one, until their yellow is on top.",
      why: "The bottom gets scrambled along the way, then fixes itself: the repetitions add up to a multiple of 6, and 6 R' D' R D change nothing.",
    },
  ],
  // The white cross, the white corners and the second layer put each piece in its final place.
}).map((stage, i) => ({ ...stage, toHome: i >= 2 && i <= 4 }));

const { U: UP, D: DOWN, F: FRONT, R: RIGHT_SIDE, B: BACK } = NORMALS;
const SIDE_FACES = (["F", "R", "B", "L"] as Face[]).map((f) => [f, NORMALS[f]] as const);
export const SEXY = ["R", "U", "R'", "U'"];
export const RIGHT = "U R U' R' U' F' U F".split(" ");
export const LEFT = "U' L' U L U F U' F'".split(" ");
export const FLIP = "F R U R' U' F'".split(" ");
export const SUNE = "R U R' U R U2 R' U".split(" ");
export const CYCLE = "U R U' L' U R' U' L".split(" ");
export const TWIST = "R' D' R D".split(" ");
// CFOP's last layer (see cfop.ts): face turns only, no wide or slice moves.
export const FLIP_L = "F U R U' R' F'".split(" ");
export const ANTISUNE = "R U2 R' U' R U' R'".split(" ");
export const OLL_H = "R U R' U R U' R' U R U2 R'".split(" ");
export const OLL_PI = "R U2 R2 U' R2 U' R2 U2 R".split(" ");
export const HEADLIGHTS = "R2 D R' U2 R D' R' U2 R'".split(" ");
export const CHAMELEON = "L F R' F' L' F R F'".split(" ");
export const BOWTIE = "F R' F' L F R F' L'".split(" ");
export const T_PERM = "R U R' U' R' F R2 U' R' U' R U R' F'".split(" ");
export const Y_PERM = "F R U' R' U' R U R' F' R U R' U' R' F R F'".split(" ");
export const UA_PERM = "R U' R U R U R U' R' U' R2".split(" ");
export const UB_PERM = "R2 U R U R' U' R' U' R' U R'".split(" ");
export const H_PERM = "R2 U2 R U2 R2 U2 R2 U2 R U2 R2".split(" ");
export const Z_PERM = "R' U' R U' R U R U' R' U R U R2 U' R' U2".split(" ");

/** `moves` played `n` times in a row. */
export const times = (moves: string[], n: number) => Array<string[]>(n).fill(moves).flat();

/** The named sequences of both methods and what each does, the beginner method's first. */
export const ALGS: [moves: string[], name: string, use: string][] = [
  [
    RIGHT,
    tr({ fr: "insertion à droite", nl: "invoegen naar rechts", en: "right insert" }),
    tr({
      fr: "Glisse une arête du haut dans la couronne du milieu, vers la droite.",
      nl: "Schuift een randstuk van boven in de middelste laag, naar rechts.",
      en: "Slides a top edge into the middle layer, to the right.",
    }),
  ],
  [
    LEFT,
    tr({ fr: "insertion à gauche", nl: "invoegen naar links", en: "left insert" }),
    tr({ fr: "Le miroir : glisse l'arête vers la gauche.", nl: "Het spiegelbeeld: schuift het randstuk naar links.", en: "The mirror: slides the edge to the left." }),
  ],
  [
    SUNE,
    "Sune",
    tr({
      fr: "Fait tourner trois arêtes du haut, pour les aligner avec leurs centres.",
      nl: "Wisselt drie randstukken bovenaan rond, om ze op één lijn te brengen met hun middenstukken.",
      en: "Cycles three top edges, to line them up with their centers.",
    }),
  ],
  [
    CYCLE,
    "Niklas",
    tr({
      fr: "Fait tourner trois coins du haut, sans bouger celui en haut à droite devant toi.",
      nl: "Wisselt drie hoekstukken bovenaan rond, zonder het hoekstuk rechtsboven vooraan te verplaatsen.",
      en: "Cycles three top corners, without moving the top right front one.",
    }),
  ],
  [
    FLIP,
    "F sexy move F'",
    tr({
      fr: "Retourne des arêtes du haut : le point devient un L, le L une ligne, la ligne la croix jaune.",
      nl: "Draait randstukken bovenaan om: de stip wordt een L, de L een lijn, de lijn het gele kruis.",
      en: "Flips top edges: the dot becomes an L, the L a line, the line the yellow cross.",
    }),
  ],
  [
    SEXY,
    "sexy move",
    tr({
      fr: "La base de la méthode : sort le coin en bas à droite et le remet tourné d'un cran. 6 fois de suite ramènent le cube à l'identique.",
      nl: "De basis van de methode: haalt het hoekstuk rechtsonder eruit en zet het een slag gedraaid terug. 6 keer na elkaar brengt de kubus terug zoals hij was.",
      en: "The base of the method: takes the bottom right corner out and puts it back twisted one notch. 6 in a row bring the cube back as it was.",
    }),
  ],
  [
    TWIST,
    tr({ fr: "torsion du coin", nl: "hoek draaien", en: "corner twist" }),
    tr({
      fr: "Tourne le coin en haut à droite devant toi ; le bas se mélange, puis se répare quand tous les coins sont faits.",
      nl: "Draait het hoekstuk rechtsboven vooraan; de onderkant raakt door elkaar en herstelt zich als alle hoekstukken klaar zijn.",
      en: "Twists the top right front corner; the bottom gets scrambled, then fixes itself once every corner is done.",
    }),
  ],
  [
    FLIP_L,
    tr({ fr: "F sexy inversé F'", nl: "F omgekeerde sexy F'", en: "F reverse sexy F'" }),
    tr({
      fr: "CFOP : fait d'un L jaune, tenu derrière à gauche, la croix jaune d'un coup.",
      nl: "CFOP: maakt van een gele L, achteraan links, in één keer het gele kruis.",
      en: "CFOP: turns a yellow L, held at the back left, straight into the yellow cross.",
    }),
  ],
  [
    ANTISUNE,
    "Antisune",
    tr({
      fr: "CFOP : un seul coin jaune en haut, tenu derrière à droite ; tout le dessus devient jaune.",
      nl: "CFOP: één hoekstuk met geel boven, rechtsachter; de hele bovenkant wordt geel.",
      en: "CFOP: one corner yellow on top, held at the back right; the whole top turns yellow.",
    }),
  ],
  [
    OLL_H,
    "H",
    tr({
      fr: "CFOP : aucun coin jaune en haut, les jaunes face à face à gauche et à droite.",
      nl: "CFOP: geen hoekstuk met geel boven, het geel tegenover elkaar links en rechts.",
      en: "CFOP: no corner yellow on top, the yellows facing each other left and right.",
    }),
  ],
  [
    OLL_PI,
    "Pi",
    tr({
      fr: "CFOP : aucun coin jaune en haut, deux jaunes côte à côte sur la face de gauche.",
      nl: "CFOP: geen hoekstuk met geel boven, twee keer geel naast elkaar op de linkerkant.",
      en: "CFOP: no corner yellow on top, two yellows side by side on the left face.",
    }),
  ],
  [
    HEADLIGHTS,
    tr({ fr: "phares", nl: "koplampen", en: "headlights" }),
    tr({
      fr: "CFOP : deux coins jaunes en haut derrière, les deux autres montrent leur jaune devant toi.",
      nl: "CFOP: twee hoekstukken met geel boven achteraan, de andere twee tonen hun geel naar je toe.",
      en: "CFOP: two corners yellow on top at the back, the other two show their yellow facing you.",
    }),
  ],
  [
    CHAMELEON,
    tr({ fr: "caméléon", nl: "kameleon", en: "chameleon" }),
    tr({
      fr: "CFOP : deux coins jaunes en haut à droite, les deux autres montrent leur jaune devant et derrière.",
      nl: "CFOP: twee hoekstukken met geel boven rechts, de andere twee tonen hun geel voor en achter.",
      en: "CFOP: two corners yellow on top on the right, the other two show their yellow front and back.",
    }),
  ],
  [
    BOWTIE,
    tr({ fr: "nœud papillon", nl: "strikje", en: "bowtie" }),
    tr({
      fr: "CFOP : deux coins jaunes en haut, en diagonale, devant à droite et derrière à gauche.",
      nl: "CFOP: twee hoekstukken met geel boven, in diagonaal, rechtsvoor en linksachter.",
      en: "CFOP: two corners yellow on top, diagonally, at the front right and the back left.",
    }),
  ],
  [
    T_PERM,
    "T-perm",
    tr({
      fr: "CFOP : échange les deux coins de droite (et deux arêtes) ; les phares se tiennent à gauche.",
      nl: "CFOP: wisselt de twee hoekstukken rechts (en twee randstukken); de koplampen zitten links.",
      en: "CFOP: swaps the two corners on the right (and two edges); hold the headlights on the left.",
    }),
  ],
  [
    Y_PERM,
    "Y-perm",
    tr({
      fr: "CFOP : échange deux coins en diagonale, de n'importe quel côté.",
      nl: "CFOP: wisselt twee hoekstukken in diagonaal, vanaf eender welke kant.",
      en: "CFOP: swaps two diagonal corners, from any side.",
    }),
  ],
  [
    UA_PERM,
    "Ua-perm",
    tr({
      fr: "CFOP : face complète derrière, les trois autres arêtes tournent dans le sens inverse des aiguilles d'une montre.",
      nl: "CFOP: complete kant achteraan, de drie andere randstukken draaien tegen de klok in.",
      en: "CFOP: complete face at the back, the other three edges go round counterclockwise.",
    }),
  ],
  [
    UB_PERM,
    "Ub-perm",
    tr({
      fr: "CFOP : face complète derrière, les trois autres arêtes tournent dans le sens des aiguilles d'une montre.",
      nl: "CFOP: complete kant achteraan, de drie andere randstukken draaien met de klok mee.",
      en: "CFOP: complete face at the back, the other three edges go round clockwise.",
    }),
  ],
  [
    H_PERM,
    "H-perm",
    tr({
      fr: "CFOP : échange les arêtes d'en face, deux à deux, de n'importe quel côté.",
      nl: "CFOP: wisselt de randstukken die tegenover elkaar staan, twee aan twee, vanaf elke kant.",
      en: "CFOP: swaps opposite edges, two by two, from any side.",
    }),
  ],
  [
    Z_PERM,
    "Z-perm",
    tr({
      fr: "CFOP : échange les arêtes voisines deux à deux : devant avec gauche, derrière avec droite.",
      nl: "CFOP: wisselt naburige randstukken twee aan twee: voor met links, achter met rechts.",
      en: "CFOP: swaps neighboring edges two by two: front with left, back with right.",
    }),
  ],
];
// Longest first, so a longer sequence never hides behind a shorter one's name; ALGS keeps the method order for the glossary.
const BY_LENGTH = [...ALGS].sort((a, b) => b[0].length - a[0].length);
/** A named sequence played `reps` times at the end of a group's moves, after `setup` moves that prepare it. */
export type Alg = { name: string; moves: string[]; reps: number; setup: number };

/** The named sequence `moves` end with, if any. */
export function algOf(moves: string[]): Alg | undefined {
  const line = ` ${moves.join(" ")}`;
  for (const [alg, name] of BY_LENGTH) {
    let reps = 0;
    while (line.endsWith(` ${times(alg, reps + 1).join(" ")}`)) reps++;
    if (reps) return { name, moves: alg, reps, setup: moves.length - reps * alg.length };
  }
}

export const same = (a: Vec, b: Vec) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
export const turns = (m: string, n: number) => Array(n % 4).fill(m) as string[];
export const play = (state: string, moves: string[]) => moves.reduce(applyMove, state);
// After a y, the face that was on the right is in front, and so on round: each face's new name.
const AFTER_Y: Record<string, string> = { R: "F", F: "L", L: "B", B: "R" };
const turned = (moves: string[], r: number) =>
  moves.map((m) => Array.from({ length: r }).reduce<string>((f) => AFTER_Y[f] ?? f, m[0]) + m.slice(1));
// Turning the back blind is hard for a beginner, the left a little less, and the front is the easiest to watch.
const BLIND: Record<string, number> = { B: 4, L: 2, R: 1 };
/** The cube turn (none, y, y2 or y') that brings the faces `moves` turns in front of you or to the right,
 * with the same moves named from there: what was B2 at the back becomes y2 then F2. */
export function facing(moves: string[]): [turn: string[], moves: string[]] {
  const options = [0, 1, 2, 3].map((r) => turned(moves, r));
  // Turning the cube costs a move too: never worth it for a face already on the right.
  const costs = options.map((o, r) => +(r > 0) + o.reduce((n, m) => n + (BLIND[m[0]] ?? 0), 0));
  const r = costs.indexOf(Math.min(...costs));
  return [turns("y", r), options[r]];
}
/** The step that turns the cube for `facing`. */
export const TURN_TO_FACE = tr({
  fr: "Tourne le cube pour avoir devant toi ou à droite les faces à tourner : tu verras ce qu'elles font.",
  nl: "Draai de kubus zodat de kanten die je draait vooraan of rechts zitten: zo zie je wat ze doen.",
  en: "Turn the cube so the faces to turn are in front of you or on the right: you'll see what they do.",
});
/** The cube as the method holds it, solved: yellow on top, green in front. */
export const YELLOW_UP = applyMove(SOLVED, "z2");

// Cubies as their facelet indices, corners and edges only.
export const CUBIES = PIECES.map((idx) => ({ pos: STICKERS[idx[0]].pos, idx }));

export const colorAt = (s: string, pos: Vec, normal: Vec) => s[stickerAt(pos, normal)!];
/** The cubie holding `piece` (its colors), with its facelets. */
export const cubieOf = (s: string, piece: string) => CUBIES.find((c) => key(s, c.idx) === piece)!;
export const findPiece = (s: string, piece: string) => cubieOf(s, piece).pos;
/** The cube before each move of a plan, then after the last; a group with `from` (a course demo) starts from it. */
export function planStates(start: string, groups: Group[]): string[] {
  const out = [start];
  for (const g of groups) {
    if (g.from) out[out.length - 1] = g.from;
    for (const m of g.moves) out.push(applyMove(out.at(-1)!, m));
  }
  return out;
}

/** The place at `pos`, named by the centers around it: `homeOf` finds it again on the cube turned. */
export const slotOf = (s: string, pos: Vec) =>
  (Object.values(NORMALS) as Vec[]).filter((n) => n.some((v, i) => v && v === pos[i])).map((n) => center(s, n)).join("");
/** Where `piece` belongs: next to the centers of its colors. */
export const homeOf = (s: string, piece: string) =>
  (Object.values(NORMALS) as Vec[]).filter((n) => piece.includes(center(s, n))).reduce((a, n) => a.map((v, i) => v + n[i]) as Vec, [0, 0, 0] as Vec);
const has = (moves: string[], turn: string) => moves.some((m) => m[0] === turn);
/** The setup in words: turn the cube (y) and/or the top (U), in that order; empty when there is none. */
const holdSteps = (moves: string[], turnCube: string, turnTop: string) =>
  [has(moves, "y") && turnCube, has(moves, "U") && turnTop].filter(Boolean).join(tr({ fr: ", puis ", nl: ", en ", en: ", then " }));
export const solvedAt = (s: string, pos: Vec) =>
  CUBIES.find((c) => same(c.pos, pos))!.idx.every((i) => s[i] === center(s, STICKERS[i].normal));
/** The cubie at `pos` holds the colors of the centers around it, in any orientation. */
const placedAt = (s: string, pos: Vec) => {
  const c = CUBIES.find((c) => same(c.pos, pos))!;
  return key(s, c.idx) === c.idx.map((i) => center(s, STICKERS[i].normal)).sort().join("");
};
export const pieces = (s: string, test: (colors: string, pos: Vec) => boolean) =>
  CUBIES.filter((c) => test(key(s, c.idx), c.pos));
/** A piece's colors, white or yellow first, as cubers name it. */
export const pieceColors = (piece: string) => [...piece].sort((a, b) => "UDFBRL".indexOf(a) - "UDFBRL".indexOf(b)) as Face[];
/** « blanc-vert-orange ». */
export const names = (piece: string) => pieceColors(piece).map((c) => FACE_NAMES[c]).join("-");

/** Cheapest y^r U^k (r < ys, k < us) for which `ok` holds on the result. */
export function setup(s: string, ok: (s: string) => boolean, ys = 4, us = 4): string[] | undefined {
  const options = [];
  for (let r = 0; r < ys; r++) for (let k = 0; k < us; k++) options.push([...turns("y", r), ...turns("U", k)]);
  const cost = (m: string[]) => simplify(m).length;
  return options.sort((a, b) => cost(a) - cost(b)).find((m) => ok(play(s, m)));
}

/** Shortest face-turn sequence (quarter turns, ≤ 6) reaching `ok`. */
function search(s: string, ok: (s: string) => boolean): string[] {
  const moves = [..."URFDLB"].flatMap((f) => [f, f + "'"]);
  const dfs = (s: string, depth: number, path: string[]): string[] | undefined => {
    if (!depth) return ok(s) ? path : undefined;
    for (const m of moves) {
      const last = path.at(-1);
      if (last && last[0] === m[0] && last !== m) continue; // R R' undoes itself
      if (path.length >= 2 && path.at(-2) === m && last === m) continue; // R R R is R'
      const found = dfs(applyMove(s, m), depth - 1, [...path, m]);
      if (found) return found;
    }
  };
  for (let depth = 0; depth <= 6; depth++) {
    const found = dfs(s, depth, []);
    if (found) return found;
  }
  throw new Error("daisy search failed");
}

/** A group: `text` says where things stand, each step what to do with its moves; none when there is nothing
 * to play. The last step's moves are the sequence, kept whole so the guide can name it; the steps before it
 * (cube and top turns) are simplified. */
export function makeGroup(stage: number, text: string, steps: [text: string, moves: string[]][], piece?: string, pair?: string): Group | undefined {
  const last = steps.at(-1)![1];
  const named = algOf(last); // undefined when empty: an empty last step is dropped below, never named
  const parts = steps
    .map(([text, moves], i) => [text, i === steps.length - 1 && named ? moves : simplify(moves)] as const)
    .filter(([, moves]) => moves.length);
  const moves = parts.flatMap(([, m]) => m);
  if (!moves.length) return;
  const alg = named && { ...named, setup: moves.length - last.length };
  return { stage, text, moves, steps: parts.map(([text, m]) => ({ text, count: m.length })), piece, pair, alg };
}

/** Beginner-method plan for a cube held white up, green in front. */
export function beginnerSolve(start: string): Group[] {
  const groups: Group[] = [];
  let s = start;
  const emit = (...args: Parameters<typeof makeGroup>) => {
    const g = makeGroup(...args);
    if (!g) return;
    groups.push(g);
    s = play(s, g.moves);
  };
  const guard = (n: number) => {
    if (n > 30) throw new Error("beginner solver is looping");
  };

  emit(
    0,
    tr({
      fr: "On tient le cube jaune en haut pendant toute la méthode : le blanc se construit en bas.",
      nl: "Je houdt de kubus de hele methode met geel boven: het wit bouw je onderaan op.",
      en: "You hold the cube with yellow on top for the whole method: the white gets built at the bottom.",
    }),
    [
      [
        tr({
          fr: "Fais pivoter le cube d'un demi-tour, comme un volant : le jaune passe en haut, le vert reste face à toi.",
          nl: "Draai de kubus een halve slag, zoals een stuur: geel gaat naar boven, groen blijft naar je toe gericht.",
          en: "Spin the cube half a turn, like a steering wheel: yellow goes on top, green stays facing you.",
        }),
        ["z2"],
      ],
    ],
  );
  const W = center(s, DOWN);
  const Y = center(s, UP);
  const whiteEdges = pieces(s, (c) => c.length === 2 && c.includes(W)).map((c) => key(s, c.idx));
  const isPetal = (s: string, edge: string) => {
    const pos = findPiece(s, edge);
    return pos[1] === 1 && colorAt(s, pos, UP) === W;
  };

  const crossDone = whiteEdges.every((e) => solvedAt(s, findPiece(s, e)));

  // 1. Daisy.
  for (let n = 0; !crossDone; n++) {
    guard(n);
    const done = whiteEdges.filter((e) => isPetal(s, e));
    const edge = whiteEdges.find((e) => !done.includes(e));
    if (!edge) break;
    const [hold, moves] = facing(search(s, (t) => isPetal(t, edge) && done.every((e) => isPetal(t, e))));
    const pos = findPiece(s, edge);
    const where = pos[1] === 0 ? "middle" : pos[1] === 1 ? "top" : colorAt(s, pos, DOWN) === W ? "down" : "bottom";
    // A turn of the top first frees the spot it lands in.
    const free = moves.findIndex((m) => m[0] !== "U");
    emit(
      1,
      tr({
        fr: `Elle est ${{ down: "en bas, blanc dessous", bottom: "en bas, blanc sur le côté", middle: "dans la couronne du milieu", top: "en haut, mais blanc sur le côté" }[where]}. Elle doit rejoindre le dessus, blanc vers le haut, comme un pétale autour du centre jaune.`,
        nl: `Het zit ${{ down: "onderaan, met wit naar beneden", bottom: "onderaan, met wit opzij", middle: "in de middelste laag", top: "boven, maar met wit opzij" }[where]}. Het moet naar de bovenkant, met wit naar boven, als een blaadje rond het gele middenstuk.`,
        en: `It is ${{ down: "at the bottom, white facing down", bottom: "at the bottom, white on the side", middle: "in the middle layer", top: "on top, but white on the side" }[where]}. It has to reach the top, white facing up, as a petal around the yellow center.`,
      }),
      [
        [TURN_TO_FACE, hold],
        [
          tr({
            fr: "Tourne le haut pour libérer la place où elle va arriver : aucun pétale ne sera délogé.",
            nl: "Draai de bovenkant om de plek vrij te maken waar het aankomt: zo duw je geen blaadje weg.",
            en: "Turn the top to free the spot it will land in, so no petal gets knocked out.",
          }),
          moves.slice(0, free),
        ],
        [
          {
            down: tr({
              fr: "Fais un demi-tour de sa face : elle monte, blanc vers le haut.",
              nl: "Draai zijn kant een halve slag: het gaat naar boven, met wit naar boven.",
              en: "Give its face a half turn: it goes up, white facing up.",
            }),
            bottom: tr({
              fr: "Un quart de tour de sa face la met au milieu, puis la face d'à côté la monte, blanc vers le haut.",
              nl: "Een kwartslag van zijn kant brengt het naar het midden, daarna brengt de kant ernaast het naar boven, met wit naar boven.",
              en: "A quarter turn of its face puts it in the middle, then the face next to it brings it up, white facing up.",
            }),
            middle: tr({
              fr: "Tourne d'un quart la face de son autre couleur, dans le sens qui amène le blanc en haut.",
              nl: "Draai de kant van zijn andere kleur een kwartslag, in de richting die het wit naar boven brengt.",
              en: "Give the face of its other color a quarter turn, the way that brings the white up.",
            }),
            top: tr({
              fr: "Descends-la au milieu, puis remonte-la par le côté, blanc vers le haut ; un tour du haut entre les deux met les pétales à l'abri.",
              nl: "Breng het naar het midden en dan langs de zijkant weer naar boven, met wit naar boven; een draai van de bovenkant ertussen houdt de blaadjes veilig.",
              en: "Bring it down to the middle, then back up from the side, white facing up; a turn of the top in between keeps the petals safe.",
            }),
          }[where],
          moves.slice(free),
        ],
      ],
      edge,
    );
  }

  // 2. White cross.
  for (const edge of crossDone ? [] : whiteEdges) {
    const other = edge.replace(W, "") as Face;
    const [face] = SIDE_FACES.find(([, n]) => center(s, n) === other)!;
    const k = [0, 1, 2, 3].find((k) => {
      const t = play(s, turns("U", k));
      const pos = findPiece(t, edge);
      return pos[1] === 1 && colorAt(t, pos, SIDE_FACES.find(([f]) => f === face)![1]) === other;
    })!;
    const color = FACE_NAMES[other];
    // Its face comes in front of you first, where the half turn is easy to watch, unless it is already on the right.
    const [hold, drop] = facing([face + "2"]);
    emit(
      2,
      tr({
        fr: `Ce pétale doit descendre à sa place : en bas, sous le centre ${color}, blanc dessous.`,
        nl: `Dit blaadje moet naar zijn plek zakken: onderaan, onder het ${INFLECTED[other]} middenstuk, met wit onderaan.`,
        en: `This petal has to drop into its place: at the bottom, under the ${color} center, white underneath.`,
      }),
      [
        [
          tr({
            fr: `Tourne le cube pour avoir le centre ${color} devant toi.`,
            nl: `Draai de kubus zodat het ${INFLECTED[other]} middenstuk vooraan staat.`,
            en: `Turn the cube to have the ${color} center in front of you.`,
          }),
          hold,
        ],
        [
          tr({
            fr: `Tourne le haut jusqu'à ce que le ${color} du pétale soit juste au-dessus du centre ${color}.`,
            nl: `Draai de bovenkant tot het ${color} van het blaadje recht boven het ${INFLECTED[other]} middenstuk staat.`,
            en: `Turn the top until the petal's ${color} sits right above the ${color} center.`,
          }),
          turns("U", k),
        ],
        [
          tr({
            fr: "Fais un demi-tour de cette face : le pétale descend, blanc en bas.",
            nl: "Draai die kant een halve slag: het blaadje zakt, met wit onderaan.",
            en: "Give that face a half turn: the petal drops, white at the bottom.",
          }),
          drop,
        ],
      ],
      edge,
    );
  }

  // 3. White corners.
  const FRD: Vec = [1, -1, 1];
  const URF: Vec = [1, 1, 1];
  for (let n = 0; ; n++) {
    guard(n);
    const corners = pieces(s, (c) => c.length === 3 && c.includes(W));
    const todo = corners.filter((c) => !solvedAt(s, c.pos));
    if (!todo.length) break;
    const up = todo.find((c) => c.pos[1] === 1);
    const corner = key(s, (up ?? todo[0]).idx);
    if (!up) {
      emit(
        3,
        tr({
          fr: `Il est coincé en bas, au mauvais endroit ou mal tourné : on le remonte d'abord en haut.`,
          nl: `Het zit onderaan vast, op de verkeerde plek of verkeerd gedraaid: eerst halen we het naar boven.`,
          en: `It is stuck at the bottom, in the wrong place or twisted: first we bring it back up.`,
        }),
        [
          [
            tr({
              fr: "Tourne le cube pour l'avoir en bas à droite devant toi.",
              nl: "Draai de kubus zodat het rechtsonder vooraan zit.",
              en: "Turn the cube to have it at the bottom right in front of you.",
            }),
            setup(s, (t) => same(findPiece(t, corner), FRD), 4, 1)!,
          ],
          [
            tr({
              fr: "Fais une fois le sexy move : le coin remonte en haut, et tu reprends comme pour un coin en haut.",
              nl: "Doe één keer de sexy move: het hoekstuk komt naar boven, en je gaat verder zoals bij een hoekstuk bovenaan.",
              en: "Do the sexy move once: the corner comes up, and you carry on as for a corner on top.",
            }),
            SEXY,
          ],
        ],
        corner,
      );
      continue;
    }
    // Slot below the corner's two side colors, at front-right, corner right above it.
    const sides = corner.replace(W, "");
    const moves = setup(s, (t) => same(findPiece(t, corner), URF) && [...sides].every((c) => [center(t, FRONT), center(t, RIGHT_SIDE)].includes(c)))!;
    let t = play(s, moves);
    let reps = 0;
    while (!solvedAt(t, FRD)) (t = play(t, SEXY)), reps++;
    const [f, r] = [center(t, FRONT), center(t, RIGHT_SIDE)] as Face[];
    const [front, right] = [FACE_NAMES[f], FACE_NAMES[r]];
    const hold = holdSteps(
      moves,
      tr({
        fr: `tourne le cube pour avoir le centre ${front} devant toi et le centre ${right} à droite`,
        nl: `draai de kubus zodat het ${INFLECTED[f]} middenstuk vooraan staat en het ${INFLECTED[r]} middenstuk rechts`,
        en: `turn the cube to have the ${front} center in front of you and the ${right} center on the right`,
      }),
      tr({
        fr: "tourne le haut pour amener le coin juste au-dessus de sa place",
        nl: "draai de bovenkant om het hoekstuk recht boven zijn plek te brengen",
        en: "turn the top to bring the corner right above its place",
      }),
    );
    emit(
      3,
      tr({
        fr: `Il est en haut. Sa place est en bas, entre les centres ${front} et ${right}.`,
        nl: `Het zit boven. Zijn plek is onderaan, tussen het ${INFLECTED[f]} en het ${INFLECTED[r]} middenstuk.`,
        en: `It is on top. Its place is at the bottom, between the ${front} and ${right} centers.`,
      }),
      [
        [hold && `${capitalize(hold)}.`, moves],
        [
          tr({
            fr: `Répète le sexy move jusqu'à ce que le coin soit à sa place, blanc en bas : ici ${reps === 1 ? "une fois" : `${reps} fois`}.`,
            nl: `Herhaal de sexy move tot het hoekstuk op zijn plek zit, met wit onderaan: hier ${reps === 1 ? "één keer" : `${reps} keer`}.`,
            en: `Repeat the sexy move until the corner sits in its place, white at the bottom: here ${reps === 1 ? "once" : `${reps} times`}.`,
          }),
          times(SEXY, reps),
        ],
      ],
      corner,
    );
  }

  // 4. Middle layer.
  const FR: Vec = [1, 0, 1];
  const UF: Vec = [0, 1, 1];
  const middle = (c: string) => c.length === 2 && !c.includes(W) && !c.includes(Y);
  for (let n = 0; ; n++) {
    guard(n);
    const todo = pieces(s, (c, pos) => middle(c) && !solvedAt(s, pos));
    if (!todo.length) break;
    const up = todo.find((c) => c.pos[1] === 1);
    if (!up) {
      const edge = key(s, todo[0].idx);
      emit(
        4,
        tr({
          fr: `Elle est coincée dans la couronne du milieu, à l'envers ou à la place d'une autre : on la sort d'abord en haut.`,
          nl: `Het zit vast in de middelste laag, omgekeerd of op de plek van een ander: eerst halen we het naar boven.`,
          en: `It is stuck in the middle layer, flipped or in another edge's place: first we bring it out on top.`,
        }),
        [
          [
            tr({
              fr: "Tourne le cube pour l'avoir à droite devant toi.",
              nl: "Draai de kubus zodat het rechts vooraan zit.",
              en: "Turn the cube to have it at the front right.",
            }),
            setup(s, (t) => same(findPiece(t, edge), FR), 4, 1)!,
          ],
          [
            tr({
              fr: "Fais une fois l'insertion à droite : l'arête remonte en haut, et tu reprends comme pour une arête en haut.",
              nl: "Doe één keer het invoegen naar rechts: het randstuk komt naar boven, en je gaat verder zoals bij een randstuk bovenaan.",
              en: "Do the right insert once: the edge comes up, and you carry on as for an edge on top.",
            }),
            RIGHT,
          ],
        ],
        edge,
      );
      continue;
    }
    const edge = key(s, up.idx);
    const moves = setup(s, (t) => same(findPiece(t, edge), UF) && colorAt(t, UF, FRONT) === center(t, FRONT))!;
    const t = play(s, moves);
    const right = colorAt(t, UF, UP) === center(t, RIGHT_SIDE);
    const f = center(t, FRONT) as Face;
    const o = colorAt(t, UF, UP) as Face;
    const [front, other] = [FACE_NAMES[f], FACE_NAMES[o]];
    const align = holdSteps(
      moves,
      tr({
        fr: `tourne le cube pour avoir le centre ${front} devant toi`,
        nl: `draai de kubus zodat het ${INFLECTED[f]} middenstuk vooraan staat`,
        en: `turn the cube to have the ${front} center in front of you`,
      }),
      tr({
        fr: `tourne le haut pour amener l'arête au-dessus, son ${front} contre le centre ${front}`,
        nl: `draai de bovenkant om het randstuk erboven te brengen, zijn ${front} tegen het ${INFLECTED[f]} middenstuk`,
        en: `turn the top to bring the edge above it, its ${front} against the ${front} center`,
      }),
    );
    emit(
      4,
      tr({
        fr: `Elle est en haut. Sa place est dans la couronne du milieu, entre les centres ${front} et ${other}.`,
        nl: `Het zit boven. Zijn plek is in de middelste laag, tussen het ${INFLECTED[f]} en het ${INFLECTED[o]} middenstuk.`,
        en: `It is on top. Its place is in the middle layer, between the ${front} and ${other} centers.`,
      }),
      [
        [align && `${capitalize(align)}.`, moves],
        [
          tr({
            fr: `Son ${other} est sur le dessus, et le centre ${other} est à ${right ? "droite" : "gauche"} : fais l'insertion à ${right ? "droite" : "gauche"}.`,
            nl: `Zijn ${other} zit bovenop, en het ${INFLECTED[o]} middenstuk zit ${right ? "rechts" : "links"}: doe het invoegen naar ${right ? "rechts" : "links"}.`,
            en: `Its ${other} is on top, and the ${other} center is on the ${right ? "right" : "left"}: do the ${right ? "right" : "left"} insert.`,
          }),
          right ? RIGHT : LEFT,
        ],
      ],
      edge,
    );
  }

  // 5. Yellow cross.
  const yellowUp = (t: string, pos: Vec) => colorAt(t, pos, UP) === Y;
  const UL: Vec = [-1, 1, 0];
  const UR: Vec = [1, 1, 0];
  const UB: Vec = [0, 1, -1];
  const flip = (then: string) =>
    tr({
      fr: `Fais F, le sexy move, puis F' : ${then}.`,
      nl: `Doe F, de sexy move, en dan F': ${then}.`,
      en: `Do F, the sexy move, then F': ${then}.`,
    });
  for (let n = 0; ; n++) {
    guard(n);
    const count = [UL, UR, UB, UF].filter((p) => yellowUp(s, p)).length;
    if (count === 4) break;
    const line = setup(s, (t) => yellowUp(t, UL) && yellowUp(t, UR), 1);
    const shape = setup(s, (t) => yellowUp(t, UL) && yellowUp(t, UB), 1);
    if (!count)
      emit(
        5,
        tr({
          fr: "Aucune arête jaune sur le dessus, seulement le centre : c'est le point.",
          nl: "Geen enkel geel randstuk bovenop, alleen het middenstuk: dat is de stip.",
          en: "No yellow edge on top, only the center: that's the dot.",
        }),
        [[flip(tr({ fr: "le point devient un L", nl: "de stip wordt een L", en: "the dot becomes an L" })), FLIP]],
      );
    else if (line)
      emit(
        5,
        tr({
          fr: "Deux arêtes jaunes face à face forment une ligne.",
          nl: "Twee gele randstukken tegenover elkaar vormen een lijn.",
          en: "Two opposite yellow edges form a line.",
        }),
        [
          [
            tr({
              fr: "Tourne le haut pour mettre la ligne à l'horizontale, de gauche à droite.",
              nl: "Draai de bovenkant zodat de lijn horizontaal ligt, van links naar rechts.",
              en: "Turn the top so the line lies horizontal, left to right.",
            }),
            line,
          ],
          [flip(tr({ fr: "la ligne devient la croix", nl: "de lijn wordt het kruis", en: "the line becomes the cross" })), FLIP],
        ],
      );
    else
      emit(
        5,
        tr({
          fr: "Deux arêtes jaunes voisines forment un L.",
          nl: "Twee naburige gele randstukken vormen een L.",
          en: "Two neighboring yellow edges form an L.",
        }),
        [
          [
            tr({
              fr: "Tourne le haut pour tenir le L derrière et à gauche.",
              nl: "Draai de bovenkant zodat de L achteraan links ligt.",
              en: "Turn the top to hold the L at the back left.",
            }),
            shape!,
          ],
          [flip(tr({ fr: "le L devient une ligne", nl: "de L wordt een lijn", en: "the L becomes a line" })), FLIP],
        ],
      );
  }

  // 6. Yellow edges.
  const edgeAligned = (t: string, n: Vec) => colorAt(t, [n[0], 1, n[2]], n) === center(t, n);
  const aligned = (t: string) => SIDE_FACES.filter(([, n]) => edgeAligned(t, n)).length;
  for (let n = 0; ; n++) {
    guard(n);
    const align = setup(s, (t) => aligned(t) === 4, 1);
    if (align) {
      emit(
        6,
        tr({
          fr: "Les arêtes jaunes sont déjà dans le bon ordre.",
          nl: "De gele randstukken staan al in de goede volgorde.",
          en: "The yellow edges are already in the right order.",
        }),
        [
          [
            tr({
              fr: "Tourne le haut : chaque arête jaune se met au-dessus du centre de sa couleur.",
              nl: "Draai de bovenkant: elk geel randstuk komt boven het middenstuk van zijn kleur.",
              en: "Turn the top: each yellow edge lands above the center of its color.",
            }),
            align,
          ],
        ],
      );
      break;
    }
    const pair = setup(s, (t) => edgeAligned(t, BACK) && edgeAligned(t, RIGHT_SIDE));
    if (pair)
      emit(
        6,
        tr({
          fr: "Deux arêtes jaunes voisines peuvent se mettre au-dessus du centre de leur couleur.",
          nl: "Twee naburige gele randstukken kunnen boven het middenstuk van hun kleur komen.",
          en: "Two neighboring yellow edges can sit above the center of their color.",
        }),
        [
          [
            tr({
              fr: "Tourne le cube et le haut pour les tenir derrière et à droite, chacune au-dessus de son centre.",
              nl: "Draai de kubus en de bovenkant zodat ze achteraan en rechts staan, elk boven zijn middenstuk.",
              en: "Turn the cube and the top to hold them at the back and on the right, each above its center.",
            }),
            pair,
          ],
          [
            tr({
              fr: "Fais le Sune : les deux autres arêtes se mettent en place.",
              nl: "Doe de Sune: de twee andere randstukken vallen op hun plek.",
              en: "Do the Sune: the other two edges fall into place.",
            }),
            SUNE,
          ],
        ],
      );
    else
      emit(
        6,
        tr({
          fr: "Les deux arêtes jaunes qui peuvent être bonnes sont face à face.",
          nl: "De twee gele randstukken die goed kunnen staan, staan tegenover elkaar.",
          en: "The two yellow edges that can be right are opposite each other.",
        }),
        [
          [
            tr({
              fr: "Fais le Sune une fois, depuis n'importe quel côté : tu auras deux arêtes voisines bonnes.",
              nl: "Doe één keer de Sune, vanaf eender welke kant: daarna staan er twee naburige goed.",
              en: "Do the Sune once, from any side: you'll get two neighboring edges right.",
            }),
            SUNE,
          ],
        ],
      );
  }

  // 7. Place yellow corners.
  const topCorners: Vec[] = [URF, [-1, 1, 1], [-1, 1, -1], [1, 1, -1]];
  for (let n = 0; ; n++) {
    guard(n);
    if (topCorners.every((p) => placedAt(s, p))) break;
    const hold = setup(s, (t) => placedAt(t, URF), 4, 1);
    if (hold) {
      const corner = key(play(s, hold), CUBIES.find((c) => same(c.pos, URF))!.idx);
      emit(
        7,
        tr({
          fr: `Il est déjà bien placé : ses 3 couleurs sont celles des 3 faces autour de lui, même s'il est mal tourné.`,
          nl: `Het staat al goed: zijn 3 kleuren zijn die van de 3 kanten eromheen, ook als het verkeerd gedraaid is.`,
          en: `It is already placed: its 3 colors are those of the 3 faces around it, even if it is twisted.`,
        }),
        [
          [
            tr({
              fr: "Tourne le cube pour l'avoir en haut à droite devant toi.",
              nl: "Draai de kubus zodat het rechtsboven vooraan zit.",
              en: "Turn the cube to have it at the top right in front of you.",
            }),
            hold,
          ],
          [
            tr({
              fr: "Fais le Niklas : les trois autres coins tournent, celui-ci ne bouge pas.",
              nl: "Doe de Niklas: de drie andere hoekstukken draaien rond, dit blijft staan.",
              en: "Do the Niklas: the other three corners cycle, this one stays put.",
            }),
            CYCLE,
          ],
        ],
        corner,
      );
    } else
      emit(
        7,
        tr({
          fr: "Aucun coin du haut n'est à sa place.",
          nl: "Geen enkel hoekstuk bovenaan staat op zijn plek.",
          en: "No top corner is in its place.",
        }),
        [
          [
            tr({
              fr: "Fais le Niklas une fois, depuis n'importe où : un coin se met en place.",
              nl: "Doe één keer de Niklas, vanaf eender waar: één hoekstuk valt op zijn plek.",
              en: "Do the Niklas once, from anywhere: one corner falls into place.",
            }),
            CYCLE,
          ],
        ],
      );
  }

  // 8. Orient yellow corners, then align the top layer.
  for (let n = 0; ; n++) {
    guard(n);
    const k = [0, 1, 2, 3].find((k) => colorAt(play(s, turns("U", k)), URF, UP) !== Y);
    if (k === undefined) break;
    let t = play(s, turns("U", k));
    const corner = key(t, CUBIES.find((c) => same(c.pos, URF))!.idx);
    let reps = 0;
    while (colorAt(t, URF, UP) !== Y) (t = play(t, TWIST)), reps++;
    emit(
      8,
      tr({
        fr: `Il doit être tourné : son jaune n'est pas encore en haut.`,
        nl: `Het moet gedraaid worden: zijn geel zit nog niet boven.`,
        en: `It needs twisting: its yellow isn't on top yet.`,
      }),
      [
        [
          tr({
            fr: "Tourne seulement le haut pour l'amener en haut à droite devant toi. Ne tourne jamais tout le cube pendant cette étape.",
            nl: "Draai alleen de bovenkant om het rechtsboven vooraan te brengen. Draai tijdens deze stap nooit de hele kubus.",
            en: "Turn only the top to bring it to the top right in front of you. Never turn the whole cube during this step.",
          }),
          turns("U", k),
        ],
        [
          tr({
            fr: `Répète R' D' R D jusqu'à ce que son jaune soit en haut : ici ${reps} fois. Le bas se mélange, c'est normal.`,
            nl: `Herhaal R' D' R D tot zijn geel boven zit: hier ${reps} keer. De onderkant raakt door elkaar, dat is normaal.`,
            en: `Repeat R' D' R D until its yellow is on top: here ${reps} times. The bottom gets scrambled, that's normal.`,
          }),
          times(TWIST, reps),
        ],
      ],
      corner,
    );
  }
  emit(
    8,
    tr({
      fr: "Tous les coins sont tournés : il ne reste que le haut à aligner.",
      nl: "Alle hoekstukken zijn gedraaid: alleen de bovenkant moet nog goed.",
      en: "Every corner is twisted right: only the top is left to line up.",
    }),
    [
      [
        tr({ fr: "Tourne le haut : le cube est résolu !", nl: "Draai de bovenkant: de kubus is opgelost!", en: "Turn the top: the cube is solved!" }),
        setup(s, (t) => aligned(t) === 4, 1)!,
      ],
    ],
  );
  return groups;
}

