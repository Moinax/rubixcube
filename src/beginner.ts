import { capitalize, tr } from "./i18n.ts";
import { applyMove, colorsOf as key, FACE_NAMES, INFLECTED, NORMALS, PIECES, simplify, STICKERS, stickerAt, type Face, type Vec } from "./cube.ts";

// Layer-by-layer beginner method, played like a human would: hold the cube
// yellow up, turn it with y to face the slot you work on, and apply the
// handful of algorithms the method teaches. Each step is simulated, never searched,
// except the daisy, which is intuitive anyway.

/** `toHome`: the stage puts each piece in its final place, which the guide outlines. */
export type Stage = { title: string; goal: string; how: string; toHome?: boolean };
/** Moves to play with their instruction; course demos also carry a title and their own start cube. */
export type Group = { stage: number; text: string; moves: string[]; piece?: string; title?: string; from?: string };

export const STAGES: Stage[] = tr<Stage[]>({
  fr: [
    {
      title: "Prise en main",
      goal: "Tenir le cube jaune en haut, blanc en bas.",
      how: "Les centres ne bougent jamais les uns par rapport aux autres : ce sont eux qui donnent la couleur de chaque face. On construit le blanc en bas et on finit par le jaune en haut.",
    },
    {
      title: "La marguerite",
      goal: "Les 4 arêtes blanches autour du centre jaune, blanc vers le haut.",
      how: "Le dessus ne contient encore rien d'important, on peut donc y ranger les arêtes blanches librement. Si la place visée est déjà prise, tourne d'abord le haut pour ne pas déloger un pétale.",
    },
    {
      title: "La croix blanche",
      goal: "Les 4 arêtes blanches en bas, alignées avec leurs centres.",
      how: "Tourne le haut jusqu'à ce que la deuxième couleur d'un pétale soit au-dessus du centre de la même couleur, puis fais un demi-tour de cette face : le pétale descend à sa place, blanc en bas.",
    },
    {
      title: "Les coins blancs",
      goal: "Finir la première couronne.",
      how: "Mets la place du coin en bas à droite devant toi et le coin juste au-dessus. R U R' U' (le « sexy move ») sort le coin et le remet tourné d'un cran : répète-le jusqu'à ce que le blanc soit en bas. 6 répétitions ramènent le cube à l'identique, donc rien d'autre ne casse en bas.",
    },
    {
      title: "La deuxième couronne",
      goal: "Placer les 4 arêtes du milieu.",
      how: "Prends une arête du haut sans jaune, aligne sa couleur de devant avec le centre, puis glisse-la à droite (U R U' R' U' F' U F) ou à gauche (U' L' U L U F U' F'), selon la couleur du dessus. L'algorithme écarte la place, y glisse l'arête puis remet le coin blanc en place. Les deux versions sont le miroir l'une de l'autre.",
    },
    {
      title: "La croix jaune",
      goal: "Faire une croix jaune sur le dessus.",
      how: "F R U R' U' F' retourne des arêtes du haut sans toucher aux deux premières couronnes : le F … F' encadre le sexy move. On passe du point au « L », puis à la ligne, puis à la croix. Le L se tient derrière et à gauche, la ligne à l'horizontale.",
    },
    {
      title: "Les arêtes jaunes",
      goal: "Aligner les arêtes jaunes avec leurs centres.",
      how: "Tourne le haut pour aligner le plus d'arêtes possible. R U R' U R U2 R' U fait tourner trois arêtes du haut : tiens les deux arêtes déjà bonnes derrière et à droite. Si elles sont face à face, fais-le une fois pour en avoir deux côte à côte.",
    },
    {
      title: "Placer les coins jaunes",
      goal: "Chaque coin du haut à sa place, même mal tourné.",
      how: "Un coin est à sa place quand ses 3 couleurs sont celles des 3 faces qui l'entourent. U R U' L' U R' U' L fait tourner trois coins et laisse immobile celui en haut à droite devant toi : tiens-y un coin déjà bien placé.",
    },
    {
      title: "Orienter les coins jaunes",
      goal: "Tourner les coins pour finir le cube.",
      how: "R' D' R D tourne le coin en haut à droite devant toi : répète-le jusqu'à ce que le jaune soit en haut, puis amène le coin suivant à cet endroit en tournant seulement la face du haut. Le bas se mélange en route, c'est normal : les répétitions s'additionnent à un multiple de 6, et 6 R' D' R D ne changent rien, donc le bas se répare tout seul à la fin. Ne tourne jamais tout le cube pendant cette étape.",
    },
  ],
  nl: [
    {
      title: "Aan de slag",
      goal: "Houd de kubus met geel boven en wit onder.",
      how: "De middenstukken bewegen nooit ten opzichte van elkaar: zij bepalen de kleur van elke kant. We bouwen het wit onderaan op en eindigen met het geel bovenaan.",
    },
    {
      title: "Het madeliefje",
      goal: "De 4 witte randstukken rond het gele middenstuk, met wit naar boven.",
      how: "Bovenaan zit nog niets belangrijks, dus je kunt de witte randstukken daar vrij kwijt. Is de plek die je wilt al bezet, draai dan eerst de bovenkant zodat je geen blaadje wegduwt.",
    },
    {
      title: "Het witte kruis",
      goal: "De 4 witte randstukken onderaan, op één lijn met hun middenstukken.",
      how: "Draai de bovenkant tot de tweede kleur van een blaadje boven het middenstuk van dezelfde kleur staat, en draai die kant dan een halve slag: het blaadje zakt naar zijn plek, met wit onderaan.",
    },
    {
      title: "De witte hoeken",
      goal: "De eerste laag afmaken.",
      how: "Zet de plek van het hoekstuk rechtsonder vooraan, met het hoekstuk er recht boven. R U R' U' (de „sexy move”) haalt het hoekstuk eruit en zet het een slag gedraaid terug: herhaal tot het wit onderaan zit. Na 6 herhalingen is de kubus weer zoals hij was, dus onderaan gaat niets anders stuk.",
    },
    {
      title: "De tweede laag",
      goal: "De 4 middelste randstukken plaatsen.",
      how: "Neem een randstuk bovenaan zonder geel, zet zijn voorkleur op één lijn met het middenstuk en schuif het naar rechts (U R U' R' U' F' U F) of naar links (U' L' U L U F U' F'), afhankelijk van de kleur bovenop. Het algoritme schuift de plek opzij, schuift het randstuk erin en zet het witte hoekstuk terug. De twee versies zijn elkaars spiegelbeeld.",
    },
    {
      title: "Het gele kruis",
      goal: "Een geel kruis maken op de bovenkant.",
      how: "F R U R' U' F' draait randstukken bovenaan om zonder aan de eerste twee lagen te komen: de F … F' omsluit de sexy move. Je gaat van de stip naar de „L”, dan naar de lijn, dan naar het kruis. Houd de L achteraan links, de lijn horizontaal.",
    },
    {
      title: "De gele randstukken",
      goal: "De gele randstukken op één lijn brengen met hun middenstukken.",
      how: "Draai de bovenkant zodat zoveel mogelijk randstukken goed staan. R U R' U R U2 R' U wisselt drie randstukken bovenaan rond: houd de twee randstukken die al goed staan achteraan en rechts. Staan ze tegenover elkaar, doe het dan één keer om er twee naast elkaar te krijgen.",
    },
    {
      title: "De gele hoeken plaatsen",
      goal: "Elk hoekstuk bovenaan op zijn plek, ook als het verkeerd gedraaid is.",
      how: "Een hoekstuk staat op zijn plek als zijn 3 kleuren die van de 3 kanten eromheen zijn. U R U' L' U R' U' L wisselt drie hoekstukken rond en laat het hoekstuk rechtsboven vooraan stilstaan: houd daar een hoekstuk dat al goed staat.",
    },
    {
      title: "De gele hoeken draaien",
      goal: "De hoekstukken draaien om de kubus af te maken.",
      how: "R' D' R D draait het hoekstuk rechtsboven vooraan: herhaal tot het geel boven zit, en breng dan het volgende hoekstuk naar die plek door alleen de bovenkant te draaien. De onderkant raakt onderweg door elkaar, dat is normaal: de herhalingen tellen op tot een veelvoud van 6, en 6 keer R' D' R D verandert niets, dus de onderkant herstelt zich op het einde vanzelf. Draai tijdens deze stap nooit de hele kubus.",
    },
  ],
  en: [
    {
      title: "Getting started",
      goal: "Hold the cube yellow on top, white at the bottom.",
      how: "The centers never move relative to each other: they give each face its color. We build the white at the bottom and finish with the yellow on top.",
    },
    {
      title: "The daisy",
      goal: "The 4 white edges around the yellow center, white facing up.",
      how: "The top holds nothing important yet, so the white edges can go there freely. If the spot you aim for is taken, turn the top first so you don't knock out a petal.",
    },
    {
      title: "The white cross",
      goal: "The 4 white edges at the bottom, lined up with their centers.",
      how: "Turn the top until a petal's second color sits above the center of the same color, then give that face a half turn: the petal drops into its place, white at the bottom.",
    },
    {
      title: "The white corners",
      goal: "Finish the first layer.",
      how: "Put the corner's place at the bottom right in front of you, and the corner right above it. R U R' U' (the “sexy move”) takes the corner out and puts it back twisted one notch: repeat it until the white is at the bottom. 6 repetitions bring the cube back as it was, so nothing else breaks at the bottom.",
    },
    {
      title: "The second layer",
      goal: "Place the 4 middle edges.",
      how: "Take a top edge without yellow, line its front color up with the center, then slide it to the right (U R U' R' U' F' U F) or to the left (U' L' U L U F U' F'), depending on its top color. The algorithm moves the slot aside, slides the edge in, then puts the white corner back. The two versions mirror each other.",
    },
    {
      title: "The yellow cross",
      goal: "Make a yellow cross on top.",
      how: "F R U R' U' F' flips top edges without touching the first two layers: the F … F' wraps the sexy move. You go from the dot to the “L”, then to the line, then to the cross. Hold the L at the back left, the line horizontal.",
    },
    {
      title: "The yellow edges",
      goal: "Line the yellow edges up with their centers.",
      how: "Turn the top to line up as many edges as you can. R U R' U R U2 R' U cycles three top edges: hold the two edges that are already right at the back and on the right. If they are opposite each other, do it once to get two side by side.",
    },
    {
      title: "Place the yellow corners",
      goal: "Every top corner in its place, even if twisted.",
      how: "A corner is in its place when its 3 colors are those of the 3 faces around it. U R U' L' U R' U' L cycles three corners and leaves the top right front one still: hold a corner that is already placed there.",
    },
    {
      title: "Orient the yellow corners",
      goal: "Twist the corners to finish the cube.",
      how: "R' D' R D twists the top right front corner: repeat it until the yellow is on top, then bring the next corner to that spot by turning only the top face. The bottom gets scrambled along the way, that's normal: the repetitions add up to a multiple of 6, and 6 R' D' R D change nothing, so the bottom fixes itself at the end. Never turn the whole cube during this step.",
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

const same = (a: Vec, b: Vec) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const turns = (m: string, n: number) => Array(n % 4).fill(m) as string[];
export const play = (state: string, moves: string[]) => moves.reduce(applyMove, state);

// Cubies as their facelet indices, corners and edges only.
const CUBIES = PIECES.map((idx) => ({ pos: STICKERS[idx[0]].pos, idx }));

const center = (s: string, normal: Vec) => s[stickerAt(normal, normal)!];
const colorAt = (s: string, pos: Vec, normal: Vec) => s[stickerAt(pos, normal)!];
export const findPiece = (s: string, piece: string) => CUBIES.find((c) => key(s, c.idx) === piece)!.pos;
/** The cube before each move of a plan, then after the last; a group with `from` (a course demo) starts from it. */
export function planStates(start: string, groups: Group[]): string[] {
  const out = [start];
  for (const g of groups) {
    if (g.from) out[out.length - 1] = g.from;
    for (const m of g.moves) out.push(applyMove(out.at(-1)!, m));
  }
  return out;
}

/** Where `piece` belongs: next to the centers of its colors. */
export const homeOf = (s: string, piece: string) =>
  (Object.values(NORMALS) as Vec[]).filter((n) => piece.includes(center(s, n))).reduce((a, n) => a.map((v, i) => v + n[i]) as Vec, [0, 0, 0] as Vec);
const has = (moves: string[], turn: string) => moves.some((m) => m[0] === turn);
/** The setup in words: turn the cube (y) and/or the top (U), in that order; empty when there is none. */
const holdSteps = (moves: string[], turnCube: string, turnTop: string) =>
  [has(moves, "y") && turnCube, has(moves, "U") && turnTop].filter(Boolean).join(tr({ fr: ", puis ", nl: ", en ", en: ", then " }));
const solvedAt = (s: string, pos: Vec) =>
  CUBIES.find((c) => same(c.pos, pos))!.idx.every((i) => s[i] === center(s, STICKERS[i].normal));
/** The cubie at `pos` holds the colors of the centers around it, in any orientation. */
const placedAt = (s: string, pos: Vec) => {
  const c = CUBIES.find((c) => same(c.pos, pos))!;
  return key(s, c.idx) === c.idx.map((i) => center(s, STICKERS[i].normal)).sort().join("");
};
const pieces = (s: string, test: (colors: string, pos: Vec) => boolean) =>
  CUBIES.filter((c) => test(key(s, c.idx), c.pos));
const names = (piece: string) => [...piece].map((c) => FACE_NAMES[c as Face]).join("-");

/** Cheapest y^r U^k (r < ys, k < us) for which `ok` holds on the result. */
function setup(s: string, ok: (s: string) => boolean, ys = 4, us = 4): string[] | undefined {
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

/** Beginner-method plan for a cube held white up, green in front. */
export function beginnerSolve(start: string): Group[] {
  const groups: Group[] = [];
  let s = start;
  const emit = (stage: number, text: string, moves: string[], piece?: string) => {
    moves = simplify(moves);
    if (!moves.length) return;
    groups.push({ stage, text, moves, piece });
    s = play(s, moves);
  };
  const guard = (n: number) => {
    if (n > 30) throw new Error("beginner solver is looping");
  };

  emit(
    0,
    tr({
      fr: "Retourne le cube : le jaune passe en haut, garde le vert face à toi.",
      nl: "Draai de kubus om: geel gaat naar boven, houd groen naar je toe.",
      en: "Turn the cube over: yellow goes on top, keep green facing you.",
    }),
    ["z2"],
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
    const moves = search(s, (t) => isPetal(t, edge) && done.every((e) => isPetal(t, e)));
    const name = names(edge);
    emit(
      1,
      tr({
        fr: `Amène l'arête ${name} sur le dessus, blanc vers le haut, sans déloger les autres.`,
        nl: `Breng het randstuk ${name} naar de bovenkant, met wit naar boven, zonder de andere weg te duwen.`,
        en: `Bring the ${name} edge to the top, white facing up, without knocking the others out.`,
      }),
      moves,
      edge,
    );
  }

  // 2. White cross.
  for (const edge of crossDone ? [] : whiteEdges) {
    const other = edge.replace(W, "");
    const [face] = SIDE_FACES.find(([, n]) => center(s, n) === other)!;
    const k = [0, 1, 2, 3].find((k) => {
      const t = play(s, turns("U", k));
      const pos = findPiece(t, edge);
      return pos[1] === 1 && colorAt(t, pos, SIDE_FACES.find(([f]) => f === face)![1]) === other;
    })!;
    const name = names(edge);
    emit(
      2,
      tr({
        fr: `Tourne le haut pour mettre l'arête ${name} au-dessus du centre ${FACE_NAMES[other as Face]}, puis demi-tour de cette face.`,
        nl: `Draai de bovenkant om het randstuk ${name} boven het ${INFLECTED[other as Face]} middenstuk te zetten, en draai die kant dan een halve slag.`,
        en: `Turn the top to put the ${name} edge above the ${FACE_NAMES[other as Face]} center, then give that face a half turn.`,
      }),
      [...turns("U", k), face + "2"],
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
      const moves = setup(s, (t) => same(findPiece(t, corner), FRD), 4, 1)!;
      const y = has(moves, "y");
      const name = names(corner);
      const text = tr({
        fr: `Le coin ${name} est coincé en bas au mauvais endroit : ${y ? "tourne le cube pour l'avoir en bas à droite devant toi, puis fais" : "il est déjà en bas à droite devant toi, fais"} une fois R U R' U' pour le remonter.`,
        nl: `Het hoekstuk ${name} zit onderaan vast op de verkeerde plek: ${y ? "draai de kubus zodat het rechtsonder vooraan zit, en doe dan" : "het zit al rechtsonder vooraan, doe"} één keer R U R' U' om het naar boven te halen.`,
        en: `The ${name} corner is stuck at the bottom in the wrong place: ${y ? "turn the cube to have it at the bottom right in front of you, then do" : "it is already at the bottom right in front of you, do"} R U R' U' once to bring it up.`,
      });
      emit(3, text, [...moves, ...SEXY], corner);
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
    const name = names(corner);
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
        fr: `Coin ${name} : sa place, encadrée en vert, est en bas entre les centres ${front} et ${right}. ${hold ? capitalize(hold) : "Le coin est déjà juste au-dessus de sa place"}. Fais R U R' U' ${reps === 1 ? "une" : reps} fois, jusqu'à ce que le blanc soit en bas.`,
        nl: `Hoekstuk ${name}: zijn plek, groen omlijnd, zit onderaan tussen het ${INFLECTED[f]} en het ${INFLECTED[r]} middenstuk. ${hold ? capitalize(hold) : "Het hoekstuk staat al recht boven zijn plek"}. Doe R U R' U' ${reps === 1 ? "één" : reps} keer, tot het wit onderaan zit.`,
        en: `${capitalize(name)} corner: its place, outlined in green, is at the bottom between the ${front} and ${right} centers. ${hold ? capitalize(hold) : "The corner is already right above its place"}. Do R U R' U' ${reps === 1 ? "once" : `${reps} times`}, until the white is at the bottom.`,
      }),
      [...moves, ...Array(reps).fill(SEXY).flat()],
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
      const moves = setup(s, (t) => same(findPiece(t, edge), FR), 4, 1)!;
      const y = has(moves, "y");
      const name = names(edge);
      const text = tr({
        fr: `L'arête ${name} est au milieu mais mal placée : ${y ? "tourne le cube pour l'avoir à droite devant toi, puis fais" : "elle est déjà à droite devant toi, fais"} l'algorithme de droite pour la sortir en haut.`,
        nl: `Het randstuk ${name} zit in het midden maar op de verkeerde plek: ${y ? "draai de kubus zodat het rechts vooraan zit, en doe dan" : "het zit al rechts vooraan, doe"} het algoritme naar rechts om het naar boven te halen.`,
        en: `The ${name} edge is in the middle but misplaced: ${y ? "turn the cube to have it at the front right, then do" : "it is already at the front right, do"} the right-hand algorithm to bring it out on top.`,
      });
      emit(4, text, [...moves, ...RIGHT], edge);
      continue;
    }
    const edge = key(s, up.idx);
    const moves = setup(s, (t) => same(findPiece(t, edge), UF) && colorAt(t, UF, FRONT) === center(t, FRONT))!;
    const t = play(s, moves);
    const right = colorAt(t, UF, UP) === center(t, RIGHT_SIDE);
    const f = center(t, FRONT) as Face;
    const front = FACE_NAMES[f];
    const name = names(edge);
    const align = holdSteps(
      moves,
      tr({
        fr: `tourne le cube pour avoir le centre ${front} devant toi`,
        nl: `draai de kubus zodat het ${INFLECTED[f]} middenstuk vooraan staat`,
        en: `turn the cube to have the ${front} center in front of you`,
      }),
      tr({
        fr: `tourne le haut pour amener l'arête au-dessus du centre ${front}`,
        nl: `draai de bovenkant om het randstuk boven het ${INFLECTED[f]} middenstuk te brengen`,
        en: `turn the top to bring the edge above the ${front} center`,
      }),
    );
    emit(
      4,
      tr({
        fr: `Arête ${name} : ${align || `elle est déjà au-dessus du centre ${front}`}. Glisse-la vers la ${right ? "droite" : "gauche"}, à sa place encadrée en vert.`,
        nl: `Randstuk ${name}: ${align || `het staat al boven het ${INFLECTED[f]} middenstuk`}. Schuif het naar ${right ? "rechts" : "links"}, naar zijn plek die groen omlijnd is.`,
        en: `${capitalize(name)} edge: ${align || `it is already above the ${front} center`}. Slide it to the ${right ? "right" : "left"}, into its place outlined in green.`,
      }),
      [...moves, ...(right ? RIGHT : LEFT)],
      edge,
    );
  }

  // 5. Yellow cross.
  const yellowUp = (t: string, pos: Vec) => colorAt(t, pos, UP) === Y;
  const UL: Vec = [-1, 1, 0];
  const UR: Vec = [1, 1, 0];
  const UB: Vec = [0, 1, -1];
  for (let n = 0; ; n++) {
    guard(n);
    const count = [UL, UR, UB, UF].filter((p) => yellowUp(s, p)).length;
    if (count === 4) break;
    const line = setup(s, (t) => yellowUp(t, UL) && yellowUp(t, UR), 1);
    const shape = setup(s, (t) => yellowUp(t, UL) && yellowUp(t, UB), 1);
    const [moves, text] =
      count === 0
        ? [
            [],
            tr({
              fr: "Point jaune : fais F R U R' U' F' pour obtenir un L.",
              nl: "Gele stip: doe F R U R' U' F' om een L te krijgen.",
              en: "Yellow dot: do F R U R' U' F' to get an L.",
            }),
          ]
        : line
          ? [
              line,
              tr({
                fr: "Ligne jaune : mets-la à l'horizontale, puis F R U R' U' F'.",
                nl: "Gele lijn: houd hem horizontaal, dan F R U R' U' F'.",
                en: "Yellow line: hold it horizontal, then F R U R' U' F'.",
              }),
            ]
          : [
              shape!,
              tr({
                fr: "L jaune : tiens-le derrière et à gauche, puis F R U R' U' F'.",
                nl: "Gele L: houd hem achteraan links, dan F R U R' U' F'.",
                en: "Yellow L: hold it at the back left, then F R U R' U' F'.",
              }),
            ];
    emit(5, text, [...moves, ...FLIP]);
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
          fr: "Tourne le haut : toutes les arêtes jaunes s'alignent avec leurs centres.",
          nl: "Draai de bovenkant: alle gele randstukken komen op één lijn met hun middenstukken.",
          en: "Turn the top: all the yellow edges line up with their centers.",
        }),
        align,
      );
      break;
    }
    const pair = setup(s, (t) => edgeAligned(t, BACK) && edgeAligned(t, RIGHT_SIDE));
    emit(
      6,
      pair
        ? tr({
            fr: "Deux arêtes jaunes côte à côte sont bonnes : tiens-les derrière et à droite, puis R U R' U R U2 R' U.",
            nl: "Twee gele randstukken naast elkaar staan goed: houd ze achteraan en rechts, dan R U R' U R U2 R' U.",
            en: "Two yellow edges side by side are right: hold them at the back and on the right, then R U R' U R U2 R' U.",
          })
        : tr({
            fr: "Les arêtes bien placées sont face à face : fais R U R' U R U2 R' U une fois pour en avoir deux côte à côte.",
            nl: "De goede randstukken staan tegenover elkaar: doe één keer R U R' U R U2 R' U om er twee naast elkaar te krijgen.",
            en: "The edges that are right are opposite each other: do R U R' U R U2 R' U once to get two side by side.",
          }),
      [...(pair ?? []), ...SUNE],
    );
  }

  // 7. Place yellow corners.
  const topCorners: Vec[] = [URF, [-1, 1, 1], [-1, 1, -1], [1, 1, -1]];
  for (let n = 0; ; n++) {
    guard(n);
    if (topCorners.every((p) => placedAt(s, p))) break;
    const hold = setup(s, (t) => placedAt(t, URF), 4, 1);
    const rotation = hold ?? [];
    emit(
      7,
      hold
        ? tr({
            fr: "Tiens le coin déjà bien placé en haut à droite devant toi, puis U R U' L' U R' U' L.",
            nl: "Houd het hoekstuk dat al goed staat rechtsboven vooraan, dan U R U' L' U R' U' L.",
            en: "Hold the corner that is already placed at the top right front, then U R U' L' U R' U' L.",
          })
        : tr({
            fr: "Aucun coin n'est à sa place : fais U R U' L' U R' U' L une fois, depuis n'importe où.",
            nl: "Geen enkel hoekstuk staat op zijn plek: doe één keer U R U' L' U R' U' L, vanaf eender welke kant.",
            en: "No corner is in its place: do U R U' L' U R' U' L once, from anywhere.",
          }),
      [...rotation, ...CYCLE],
      hold ? key(play(s, rotation), CUBIES.find((c) => same(c.pos, URF))!.idx) : undefined,
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
        fr: `${k ? "Tourne le haut pour amener le coin suivant en haut à droite devant toi, puis" : "Coin en haut à droite devant toi :"} R' D' R D ${reps} fois, jusqu'à ce que le jaune soit en haut.`,
        nl: `${k ? "Draai de bovenkant om het volgende hoekstuk rechtsboven vooraan te brengen, dan" : "Hoekstuk rechtsboven vooraan:"} ${reps} keer R' D' R D, tot het geel boven zit.`,
        en: `${k ? "Turn the top to bring the next corner to the top right front, then" : "Corner at the top right front:"} R' D' R D ${reps} times, until the yellow is on top.`,
      }),
      [...turns("U", k), ...Array(reps).fill(TWIST).flat()],
      corner,
    );
  }
  emit(
    8,
    tr({
      fr: "Tourne le haut une dernière fois : le cube est résolu !",
      nl: "Draai de bovenkant nog een laatste keer: de kubus is opgelost!",
      en: "Turn the top one last time: the cube is solved!",
    }),
    setup(s, (t) => aligned(t) === 4, 1)!,
  );
  return groups;
}
