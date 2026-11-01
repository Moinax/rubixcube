import {
  colorAt,
  CUBIES,
  facing,
  cubieOf,
  FLIP,
  findPiece,
  homeOf,
  makeGroup,
  pieces,
  play,
  same,
  setup,
  solvedAt,
  SUNE,
  turns,
  ANTISUNE,
  BOWTIE,
  CHAMELEON,
  FLIP_L,
  H_PERM,
  HEADLIGHTS,
  OLL_H,
  OLL_PI,
  T_PERM,
  UA_PERM,
  UB_PERM,
  Y_PERM,
  Z_PERM,
  type Group,
  type Stage,
} from "./beginner.ts";
import { center, colorsOf as key, FACE_NAMES, INFLECTED, invert, NORMALS, permutationOf, STICKERS, stickerAt, type Face, type Vec } from "./cube.ts";
import { tr } from "./i18n.ts";

// CFOP in four looks, the step after the beginner method: the white cross straight on the bottom, the first
// two layers pair by pair (F2L), the top in two looks (OLL: the yellow cross, then the yellow face), then the
// last layer in two looks (PLL: the corners, then the edges). About 100 moves, and a dozen algorithms.
// The cross is searched, the F2L built from two triggers, the last layer picked from known algorithms.

export const CFOP_STAGES: Stage[] = tr<Stage[]>({
  fr: [
    {
      title: "Prise en main",
      goal: "Tenir le cube jaune en haut, blanc en bas.",
      why: "Les centres ne bougent jamais : ce sont eux qui donnent la couleur de chaque face.",
    },
    {
      title: "La croix blanche",
      goal: "Les 4 arêtes blanches en bas, chacune sous le centre de sa couleur, sans passer par la marguerite.",
      why: "Chaque arête prend le chemin le plus court vers sa place, sans déloger celles déjà posées.",
    },
    {
      title: "Les paires (F2L)",
      goal: "Les deux premières couronnes d'un coup : chaque coin blanc avec l'arête qui va au-dessus de lui.",
      why: "R U R' et F' U F ouvrent une place, laissent tourner le haut, puis la referment : rien d'autre ne bouge.",
    },
    {
      title: "La croix jaune (OLL 1)",
      goal: "Une croix jaune sur le dessus.",
      why: "Le F … F' autour du sexy move retourne des arêtes du haut sans toucher aux deux premières couronnes.",
    },
    {
      title: "La face jaune (OLL 2)",
      goal: "Tout le dessus jaune, avec un seul algorithme parmi 7.",
      why: "Chaque algorithme tourne les coins du haut sur eux-mêmes, et laisse la croix et les deux premières couronnes en place.",
    },
    {
      title: "Les coins du haut (PLL 1)",
      goal: "Chaque coin du haut à sa place.",
      why: "Le T-perm échange deux coins voisins, le Y-perm deux coins en diagonale ; les arêtes se règlent juste après.",
    },
    {
      title: "Les arêtes du haut (PLL 2)",
      goal: "Chaque arête du haut à sa place : le cube est résolu.",
      why: "Les perms U, H et Z déplacent seulement les arêtes du haut : les coins restent à leur place.",
    },
  ],
  nl: [
    {
      title: "Aan de slag",
      goal: "Houd de kubus met geel boven en wit onder.",
      why: "De middenstukken bewegen nooit: zij bepalen de kleur van elke kant.",
    },
    {
      title: "Het witte kruis",
      goal: "De 4 witte randstukken onderaan, elk onder het middenstuk van zijn kleur, zonder madeliefje.",
      why: "Elk randstuk neemt de kortste weg naar zijn plek, zonder de randstukken die al goed liggen weg te duwen.",
    },
    {
      title: "De paren (F2L)",
      goal: "De eerste twee lagen in één keer: elk wit hoekstuk met het randstuk dat erboven hoort.",
      why: "R U R' en F' U F openen een plek, laten de bovenkant draaien en sluiten die weer: verder beweegt er niets.",
    },
    {
      title: "Het gele kruis (OLL 1)",
      goal: "Een geel kruis op de bovenkant.",
      why: "De F … F' rond de sexy move draait randstukken bovenaan om zonder aan de eerste twee lagen te komen.",
    },
    {
      title: "De gele kant (OLL 2)",
      goal: "De hele bovenkant geel, met één algoritme uit 7.",
      why: "Elk algoritme draait de hoekstukken bovenaan om hun as, en laat het kruis en de eerste twee lagen op hun plek.",
    },
    {
      title: "De bovenste hoeken (PLL 1)",
      goal: "Elk hoekstuk bovenaan op zijn plek.",
      why: "De T-perm wisselt twee naburige hoekstukken, de Y-perm twee hoekstukken in diagonaal; de randstukken komen daarna.",
    },
    {
      title: "De bovenste randstukken (PLL 2)",
      goal: "Elk randstuk bovenaan op zijn plek: de kubus is opgelost.",
      why: "De U-, H- en Z-perms verplaatsen alleen de randstukken bovenaan: de hoekstukken blijven op hun plek.",
    },
  ],
  en: [
    {
      title: "Getting started",
      goal: "Hold the cube yellow on top, white at the bottom.",
      why: "The centers never move: they give each face its color.",
    },
    {
      title: "The white cross",
      goal: "The 4 white edges at the bottom, each under the center of its color, without the daisy.",
      why: "Each edge takes the shortest way to its place, without knocking out the ones already there.",
    },
    {
      title: "The pairs (F2L)",
      goal: "The first two layers at once: each white corner with the edge that goes above it.",
      why: "R U R' and F' U F open a slot, let the top turn, then close it: nothing else moves.",
    },
    {
      title: "The yellow cross (OLL 1)",
      goal: "A yellow cross on top.",
      why: "The F … F' around the sexy move flips top edges without touching the first two layers.",
    },
    {
      title: "The yellow face (OLL 2)",
      goal: "The whole top yellow, with one algorithm out of 7.",
      why: "Each algorithm twists the top corners in place, and leaves the cross and the first two layers where they are.",
    },
    {
      title: "The top corners (PLL 1)",
      goal: "Every top corner in its place.",
      why: "The T-perm swaps two neighboring corners, the Y-perm two diagonal ones; the edges come right after.",
    },
    {
      title: "The top edges (PLL 2)",
      goal: "Every top edge in its place: the cube is solved.",
      why: "The U, H and Z perms move only the top edges: the corners stay in their places.",
    },
  ],
});

const { U: UP, D: DOWN, F: FRONT, R: RIGHT_SIDE, L: LEFT_SIDE } = NORMALS;
const SIDES = Object.values(NORMALS) as Vec[];

// Where each move sends each sticker, to follow a few pieces without turning the whole cube.
const NEXT = new Map<string, number[]>();
function next(move: string) {
  if (!NEXT.has(move)) {
    const to: number[] = [];
    permutationOf(move).forEach((from, i) => (to[from] = i));
    NEXT.set(move, to);
  }
  return NEXT.get(move)!;
}
const follow = (i: number, moves: string[]) => moves.reduce((j, m) => next(m)[j], i);
/** The facelet of `piece` (its colors) showing `color`. */
const stickerOf = (s: string, piece: string, color: string) => cubieOf(s, piece).idx.find((i) => s[i] === color)!;

const FACE_MOVES = [..."URFDLB"].flatMap((f) => [f, `${f}'`, `${f}2`]);
const OPPOSITE: Record<string, string> = { U: "D", D: "U", R: "L", L: "R", F: "B", B: "F" };
/** The moves worth trying after `last`: never the same face twice, and two opposite faces in one order only. */
const AFTER = new Map([undefined, ...FACE_MOVES].map((last) => [last, FACE_MOVES.filter((m) => !last || (m[0] !== last[0] && !(OPPOSITE[m[0]] === last[0] && m[0] < last[0])))]));
const after = (last?: string) => AFTER.get(last)!;

type Tracked = { at: [number, number]; dist: Map<number, number> };
/** How many moves each placement of an edge (its two stickers) is from `home`. */
function distances(home: [number, number]): Map<number, number> {
  const dist = new Map([[home[0] * 54 + home[1], 0]]);
  let frontier = [home];
  for (let d = 1; frontier.length; d++) {
    const found: [number, number][] = [];
    for (const [a, b] of frontier)
      for (const m of FACE_MOVES) {
        const [x, y] = [next(m)[a], next(m)[b]];
        if (!dist.has(x * 54 + y)) dist.set(x * 54 + y, d), found.push([x, y]);
      }
    frontier = found;
  }
  return dist;
}
/** The fewest moves that bring every tracked edge home together (iterative deepening, bounded by each edge's own distance). */
function placeEdges(edges: Tracked[]): string[] {
  const h = (ats: [number, number][]) => Math.max(...ats.map(([a, b], i) => edges[i].dist.get(a * 54 + b)!));
  const dfs = (ats: [number, number][], budget: number, path: string[]): string[] | undefined => {
    const left = h(ats);
    if (!left) return path;
    if (left > budget) return;
    for (const m of after(path.at(-1))) {
      const to = next(m);
      const found = dfs(ats.map(([a, b]) => [to[a], to[b]]), budget - 1, [...path, m]);
      if (found) return found;
    }
  };
  const start = edges.map((e) => e.at);
  for (let budget = h(start); ; budget++) {
    const found = dfs(start, budget, []);
    if (found) return found;
  }
}

// The four first-two-layer slots, front right first, each as its corner and its edge.
const SLOTS: [corner: Vec, edge: Vec][] = [
  [[1, -1, 1], [1, 0, 1]],
  [[-1, -1, 1], [-1, 0, 1]],
  [[-1, -1, -1], [-1, 0, -1]],
  [[1, -1, -1], [1, 0, -1]],
];
const U_TURNS = ["U", "U'", "U2"];
/** For a slot, the turns of its two side faces that lift its corner to the top, each opened, turned and closed by U. */
function triggers([corner]: [Vec, Vec]): string[][] {
  const low = stickerAt(corner, DOWN)!;
  return SIDES.filter((n) => n[1] === 0 && n.some((v, i) => v && v === corner[i]))
    .flatMap((n) => {
      const face = Object.keys(NORMALS).find((f) => same(NORMALS[f as Face], n))!;
      return [face, `${face}'`].filter((m) => STICKERS[next(m)[low]].pos[1] === 1);
    })
    .flatMap((lift) => U_TURNS.map((u) => [lift, u, ...invert([lift])]));
}

/** The cheapest chain of top turns and slot triggers that brings the pair (its corner's white sticker, its
 * edge's front sticker) home to the front right slot, using only the slots still open. */
function pairUp(start: [number, number], goal: [number, number], open: number[]): string[][] {
  const macros = [...U_TURNS.map((u) => [u]), ...open.flatMap((i) => triggers(SLOTS[i]))];
  const id = ([c, e]: [number, number]) => c * 54 + e;
  const best = new Map([[id(start), { cost: 0, path: [] as string[][] }]]);
  const queue = [{ at: start, cost: 0 }];
  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const { at, cost } = queue.shift()!;
    if (id(at) === id(goal)) return best.get(id(at))!.path;
    if (cost > best.get(id(at))!.cost) continue;
    for (const m of macros) {
      const to: [number, number] = [follow(at[0], m), follow(at[1], m)];
      const c = cost + m.length;
      if (c >= (best.get(id(to))?.cost ?? Infinity)) continue;
      best.set(id(to), { cost: c, path: [...best.get(id(at))!.path, m] });
      queue.push({ at: to, cost: c });
    }
  }
  throw new Error("no way to pair up");
}

const TOP_CORNERS: Vec[] = [[1, 1, 1], [-1, 1, 1], [-1, 1, -1], [1, 1, -1]];
const TOP_EDGES: Vec[] = [[0, 1, 1], [1, 1, 0], [0, 1, -1], [-1, 1, 0]];
const solved = (s: string) => CUBIES.every((c) => solvedAt(s, c.pos));
/** The cheapest of a table's algorithms, each tried after 0 to 3 `turn`s, that brings the cube `s` to `ok`. */
function pick<T extends [moves: string[], ...rest: string[]]>(table: T[], s: string, turn: string, ok: (t: string) => boolean) {
  return table
    .flatMap((row) => [0, 1, 2, 3].map((k) => [row, k] as const))
    .filter(([[m], k]) => ok(play(s, [...turns(turn, k), ...m])))
    .reduce((a, b) => (b[0][0].length + +(b[1] > 0) < a[0][0].length + +(a[1] > 0) ? b : a));
}

/** CFOP plan for a cube held white up, green in front. */
export function cfopSolve(start: string): Group[] {
  const groups: Group[] = [];
  let s = start;
  const emit = (...args: Parameters<typeof makeGroup>) => {
    const g = makeGroup(...args);
    if (!g) return;
    groups.push(g);
    s = play(s, g.moves);
    return g;
  };

  emit(
    0,
    tr({
      fr: "On tient le cube jaune en haut pendant toute la méthode : la croix blanche se fait directement en bas.",
      nl: "Je houdt de kubus de hele methode met geel boven: het witte kruis maak je meteen onderaan.",
      en: "You hold the cube with yellow on top for the whole method: the white cross goes straight to the bottom.",
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

  // 1. The cross, one edge at a time: each time the edge that costs the fewest moves, keeping the others home.
  /** An edge's home stickers: its white one at the bottom, its other one on the side. */
  const homeOfEdge = (edge: string): [number, number] => {
    const pos = homeOf(s, edge);
    return [stickerAt(pos, DOWN)!, stickerAt(pos, [pos[0], 0, pos[2]])!];
  };
  const whites = pieces(s, (c) => c.length === 2 && c.includes(W)).map((c) => key(s, c.idx));
  let home = whites.filter((e) => solvedAt(s, findPiece(s, e)));
  while (home.length < 4) {
    // The cube may have turned since the last edge: the homes move with it.
    const dist = new Map(whites.map((e) => [e, distances(homeOfEdge(e))]));
    const tracked = (edge: string): Tracked => ({ at: [stickerOf(s, edge, W), stickerOf(s, edge, edge.replace(W, ""))], dist: dist.get(edge)! });
    const [edge, path] = whites
      .filter((e) => !home.includes(e))
      .map((e) => [e, placeEdges([...home, e].map(tracked))] as const)
      .reduce((a, b) => (b[1].length < a[1].length ? b : a));
    const [hold, moves] = facing(path);
    const other = edge.replace(W, "") as Face;
    const pos = findPiece(s, edge);
    const where = pos[1] === 1 ? "top" : pos[1] === 0 ? "middle" : "bottom";
    emit(
      1,
      tr({
        fr: `Elle est ${{ top: "en haut", middle: "dans la couronne du milieu", bottom: "en bas, mal placée ou à l'envers" }[where]}. Sa place est en bas, sous le centre ${FACE_NAMES[other]}, blanc dessous.`,
        nl: `Het zit ${{ top: "boven", middle: "in de middelste laag", bottom: "onderaan, op de verkeerde plek of omgekeerd" }[where]}. Zijn plek is onderaan, onder het ${INFLECTED[other]} middenstuk, met wit onderaan.`,
        en: `It is ${{ top: "on top", middle: "in the middle layer", bottom: "at the bottom, in the wrong place or flipped" }[where]}. Its place is at the bottom, under the ${FACE_NAMES[other]} center, white underneath.`,
      }),
      [
        [
          tr({
            fr: "Tourne le cube pour avoir devant toi ou à droite les faces à tourner : tu verras ce qu'elles font.",
            nl: "Draai de kubus zodat de kanten die je draait vooraan of rechts zitten: zo zie je wat ze doen.",
            en: "Turn the cube so the faces to turn are in front of you or on the right: you'll see what they do.",
          }),
          hold,
        ],
        [
          tr({
            fr: `Amène-la directement à sa place, sans déloger les arêtes déjà posées : ici ${moves.length === 1 ? "un seul coup" : `${moves.length} coups`}. Avec l'habitude, tu verras le chemin d'un coup d'œil.`,
            nl: `Breng het meteen naar zijn plek, zonder de randstukken die al liggen weg te duwen: hier ${moves.length === 1 ? "één zet" : `${moves.length} zetten`}. Met wat oefening zie je de weg in één oogopslag.`,
            en: `Bring it straight to its place, without knocking out the edges already there: here ${moves.length === 1 ? "a single move" : `${moves.length} moves`}. With practice, you'll see the way at a glance.`,
          }),
          moves,
        ],
      ],
      edge,
    );
    home = [...home, edge];
  }

  // 2. F2L: each time the pair that costs the fewest moves, turned to the front right slot.
  for (let n = 0; n < 4; n++) {
    const options = [0, 1, 2, 3].flatMap((r) => {
      const t = play(s, turns("y", r));
      if (solvedAt(t, SLOTS[0][0]) && solvedAt(t, SLOTS[0][1])) return [];
      const [f, rt] = [center(t, FRONT), center(t, RIGHT_SIDE)];
      const corner = [W, f, rt].sort().join("");
      const edge = [f, rt].sort().join("");
      const open = SLOTS.flatMap((slot, i) => (solvedAt(t, slot[0]) && solvedAt(t, slot[1]) ? [] : [i]));
      const path = pairUp([stickerOf(t, corner, W), stickerOf(t, edge, f)], [stickerAt(SLOTS[0][0], DOWN)!, stickerAt(SLOTS[0][1], FRONT)!], open);
      return [{ r, f: f as Face, rt: rt as Face, corner, edge, path, cost: +(r > 0) + path.flat().length }];
    });
    if (!options.length) break;
    const { r, f, rt, corner, edge, path } = options.reduce((a, b) => (b.cost < a.cost ? b : a));
    const [front, right] = [FACE_NAMES[f], FACE_NAMES[rt]];
    const insert = path.at(-1)!;
    emit(
      2,
      tr({
        fr: `Ils vont ensemble : leur place est en bas, entre les centres ${front} et ${right}.`,
        nl: `Ze horen samen: hun plek is onderaan, tussen het ${INFLECTED[f]} en het ${INFLECTED[rt]} middenstuk.`,
        en: `They go together: their place is at the bottom, between the ${front} and ${right} centers.`,
      }),
      [
        [
          tr({
            fr: `Tourne le cube pour avoir le centre ${front} devant toi et le centre ${right} à droite : leur place est en bas à droite devant toi.`,
            nl: `Draai de kubus zodat het ${INFLECTED[f]} middenstuk vooraan staat en het ${INFLECTED[rt]} middenstuk rechts: hun plek is rechtsonder vooraan.`,
            en: `Turn the cube to have the ${front} center in front of you and the ${right} center on the right: their place is at the bottom right in front of you.`,
          }),
          turns("y", r),
        ],
        [
          tr({
            fr: "Prépare la paire : le coin et l'arête se rejoignent en haut. Chaque ouverture se referme aussitôt, les places finies ne bougent pas.",
            nl: "Bereid het paar voor: hoekstuk en randstuk komen boven samen. Elke opening gaat meteen weer dicht, de afgewerkte plekken bewegen niet.",
            en: "Set up the pair: the corner and the edge meet on top. Each opening closes right away, so the finished slots don't move.",
          }),
          path.slice(0, -1).flat(),
        ],
        [
          tr({
            fr: `Insère la paire dans sa place : ${insert.join(" ")}.`,
            nl: `Voeg het paar in op zijn plek: ${insert.join(" ")}.`,
            en: `Insert the pair into its place: ${insert.join(" ")}.`,
          }),
          insert,
        ],
      ],
      corner,
      edge,
    );
  }

  // 3. OLL, first look: the yellow cross.
  const yellowUp = (t: string, pos: Vec) => colorAt(t, pos, UP) === Y;
  for (let n = 0; n < 3; n++) {
    const count = TOP_EDGES.filter((p) => yellowUp(s, p)).length;
    if (count === 4) break;
    if (!count) {
      emit(
        3,
        tr({
          fr: "Aucune arête jaune sur le dessus, seulement le centre : c'est le point.",
          nl: "Geen enkel geel randstuk bovenop, alleen het middenstuk: dat is de stip.",
          en: "No yellow edge on top, only the center: that's the dot.",
        }),
        [
          [
            tr({
              fr: "Fais F, le sexy move, puis F', de n'importe quel côté : le point devient un L.",
              nl: "Doe F, de sexy move, en dan F', vanaf eender welke kant: de stip wordt een L.",
              en: "Do F, the sexy move, then F', from any side: the dot becomes an L.",
            }),
            FLIP,
          ],
        ],
      );
      continue;
    }
    const line = setup(s, (t) => yellowUp(t, [-1, 1, 0]) && yellowUp(t, [1, 1, 0]), 1);
    const shape = setup(s, (t) => yellowUp(t, [-1, 1, 0]) && yellowUp(t, [0, 1, -1]), 1)!;
    emit(
      3,
      line
        ? tr({ fr: "Deux arêtes jaunes face à face forment une ligne.", nl: "Twee gele randstukken tegenover elkaar vormen een lijn.", en: "Two opposite yellow edges form a line." })
        : tr({ fr: "Deux arêtes jaunes voisines forment un L.", nl: "Twee naburige gele randstukken vormen een L.", en: "Two neighboring yellow edges form an L." }),
      line
        ? [
            [
              tr({
                fr: "Tourne le haut pour mettre la ligne à l'horizontale, de gauche à droite.",
                nl: "Draai de bovenkant zodat de lijn horizontaal ligt, van links naar rechts.",
                en: "Turn the top so the line lies horizontal, left to right.",
              }),
              line,
            ],
            [
              tr({
                fr: "Fais F, le sexy move, puis F' : la ligne devient la croix.",
                nl: "Doe F, de sexy move, en dan F': de lijn wordt het kruis.",
                en: "Do F, the sexy move, then F': the line becomes the cross.",
              }),
              FLIP,
            ],
          ]
        : [
            [
              tr({
                fr: "Tourne le haut pour tenir le L derrière et à gauche.",
                nl: "Draai de bovenkant zodat de L achteraan links ligt.",
                en: "Turn the top to hold the L at the back left.",
              }),
              shape,
            ],
            [
              tr({
                fr: "Fais F, le sexy move inversé (U R U' R'), puis F' : le L devient directement la croix.",
                nl: "Doe F, de omgekeerde sexy move (U R U' R'), en dan F': de L wordt meteen het kruis.",
                en: "Do F, the reverse sexy move (U R U' R'), then F': the L turns straight into the cross.",
              }),
              FLIP_L,
            ],
          ],
    );
  }

  // 4. OLL, second look: the yellow face, one of 7 cases, each held one way.
  const topYellow = (t: string) => TOP_CORNERS.every((p) => yellowUp(t, p));
  const OCLL: [moves: string[], case_: string, hold: string][] = [
    [
      SUNE,
      tr({ fr: "Un seul coin a son jaune en haut : c'est le Sune.", nl: "Eén hoekstuk heeft zijn geel boven: dat is de Sune.", en: "One corner has its yellow on top: that's the Sune." }),
      tr({ fr: "Tourne le haut pour avoir ce coin devant à gauche.", nl: "Draai de bovenkant zodat dat hoekstuk linksvoor zit.", en: "Turn the top to have that corner at the front left." }),
    ],
    [
      ANTISUNE,
      tr({ fr: "Un seul coin a son jaune en haut, tourné dans l'autre sens : c'est l'Antisune.", nl: "Eén hoekstuk heeft zijn geel boven, de andere kant op: dat is de Antisune.", en: "One corner has its yellow on top, the other way round: that's the Antisune." }),
      tr({ fr: "Tourne le haut pour avoir ce coin derrière à droite.", nl: "Draai de bovenkant zodat dat hoekstuk rechtsachter zit.", en: "Turn the top to have that corner at the back right." }),
    ],
    [
      OLL_H,
      tr({ fr: "Aucun coin jaune en haut, et leurs jaunes face à face, deux à gauche et deux à droite : c'est le H.", nl: "Geen hoekstuk met geel boven, en hun geel tegenover elkaar, twee links en twee rechts: dat is de H.", en: "No corner yellow on top, their yellows facing each other, two on the left and two on the right: that's the H." }),
      tr({ fr: "Tourne le haut pour avoir les jaunes à gauche et à droite.", nl: "Draai de bovenkant zodat het geel links en rechts zit.", en: "Turn the top to have the yellows on the left and the right." }),
    ],
    [
      OLL_PI,
      tr({ fr: "Aucun coin jaune en haut, deux jaunes côte à côte sur une face : c'est le Pi.", nl: "Geen hoekstuk met geel boven, twee keer geel naast elkaar op één kant: dat is de Pi.", en: "No corner yellow on top, two yellows side by side on one face: that's the Pi." }),
      tr({ fr: "Tourne le haut pour avoir ces deux jaunes sur la face de gauche.", nl: "Draai de bovenkant zodat die twee keer geel op de linkerkant zitten.", en: "Turn the top to have those two yellows on the left face." }),
    ],
    [
      HEADLIGHTS,
      tr({ fr: "Deux coins voisins ont leur jaune en haut, les deux autres le montrent du même côté : ce sont les phares.", nl: "Twee naburige hoekstukken hebben hun geel boven, de andere twee tonen het aan dezelfde kant: dat zijn de koplampen.", en: "Two neighboring corners have their yellow on top, the other two show it on the same side: those are the headlights." }),
      tr({ fr: "Tourne le haut pour avoir les phares devant toi : les deux coins jaunes en haut sont derrière.", nl: "Draai de bovenkant zodat de koplampen naar je toe kijken: de twee hoekstukken met geel boven zitten achteraan.", en: "Turn the top to have the headlights facing you: the two corners yellow on top are at the back." }),
    ],
    [
      CHAMELEON,
      tr({ fr: "Deux coins voisins ont leur jaune en haut, les deux autres le montrent devant et derrière : c'est le caméléon (T).", nl: "Twee naburige hoekstukken hebben hun geel boven, de andere twee tonen het voor en achter: dat is de kameleon (T).", en: "Two neighboring corners have their yellow on top, the other two show it front and back: that's the chameleon (T)." }),
      tr({ fr: "Tourne le haut pour avoir les deux coins jaunes en haut à droite.", nl: "Draai de bovenkant zodat de twee hoekstukken met geel boven rechts zitten.", en: "Turn the top to have the two corners yellow on top on the right." }),
    ],
    [
      BOWTIE,
      tr({ fr: "Deux coins en diagonale ont leur jaune en haut : c'est le nœud papillon.", nl: "Twee hoekstukken in diagonaal hebben hun geel boven: dat is het strikje.", en: "Two diagonal corners have their yellow on top: that's the bowtie." }),
      tr({ fr: "Tourne le haut pour avoir ces deux coins devant à droite et derrière à gauche, et le jaune du coin devant à gauche face à toi.", nl: "Draai de bovenkant zodat die twee hoekstukken rechtsvoor en linksachter zitten, en het geel van het hoekstuk linksvoor naar je toe kijkt.", en: "Turn the top to have those two corners at the front right and the back left, and the yellow of the front left corner facing you." }),
    ],
  ];
  if (!topYellow(s)) {
    const [[moves, case_, hold], k] = pick(OCLL, s, "U", topYellow);
    emit(4, case_, [
      [hold, turns("U", k)],
      [tr({ fr: "Fais l'algorithme : tout le dessus devient jaune.", nl: "Doe het algoritme: de hele bovenkant wordt geel.", en: "Do the algorithm: the whole top turns yellow." }), moves],
    ]);
  }

  // 5. PLL, first look: the top corners in place relative to each other.
  const leftAligned = (t: string) => colorAt(t, [-1, 1, 1], LEFT_SIDE) === colorAt(t, [-1, 1, -1], LEFT_SIDE);
  const cornersPlaced = (t: string) =>
    [0, 1, 2, 3].some((k) => {
      const u = play(t, turns("U", k));
      return TOP_CORNERS.every((p) => solvedAt(u, p));
    });
  if (!cornersPlaced(s)) {
    const k = [0, 1, 2, 3].find((k) => cornersPlaced(play(s, [...turns("U", k), ...T_PERM])) && leftAligned(play(s, turns("U", k))));
    emit(
      5,
      k !== undefined
        ? tr({
            fr: "Sur une face, deux coins voisins ont la même couleur côte à côte (des phares) : les deux coins d'en face sont à échanger.",
            nl: "Op één kant hebben twee naburige hoekstukken dezelfde kleur naast elkaar (koplampen): de twee hoekstukken ertegenover moeten wisselen.",
            en: "On one face, two neighboring corners show the same color side by side (headlights): the two corners opposite them need swapping.",
          })
        : tr({
            fr: "Aucune face n'a deux coins de même couleur côte à côte : deux coins en diagonale sont à échanger.",
            nl: "Geen enkele kant heeft twee hoekstukken met dezelfde kleur naast elkaar: twee hoekstukken in diagonaal moeten wisselen.",
            en: "No face has two corners of the same color side by side: two diagonal corners need swapping.",
          }),
      k !== undefined
        ? [
            [
              tr({ fr: "Tourne le haut pour avoir les phares à gauche.", nl: "Draai de bovenkant zodat de koplampen links zitten.", en: "Turn the top to have the headlights on the left." }),
              turns("U", k),
            ],
            [
              tr({ fr: "Fais le T-perm : il échange les deux coins de droite.", nl: "Doe de T-perm: hij wisselt de twee hoekstukken rechts.", en: "Do the T-perm: it swaps the two corners on the right." }),
              T_PERM,
            ],
          ]
        : [
            [
              tr({ fr: "Fais le Y-perm, de n'importe quel côté : il échange deux coins en diagonale.", nl: "Doe de Y-perm, vanaf eender welke kant: hij wisselt twee hoekstukken in diagonaal.", en: "Do the Y-perm, from any side: it swaps two diagonal corners." }),
              Y_PERM,
            ],
          ],
    );
  }

  // 6. PLL, second look: the corners lined up with their centers, then the edges, the cube held for the case.
  const align = [0, 1, 2, 3].find((k) => {
    const u = play(s, turns("U", k));
    return TOP_CORNERS.every((p) => solvedAt(u, p));
  })!;
  const PLL: [moves: string[], case_: string, hold: string][] = [
    [
      UA_PERM,
      tr({ fr: "Une face est déjà complète, et les trois autres arêtes doivent tourner dans le sens inverse des aiguilles d'une montre, vu du dessus : c'est l'Ua-perm.", nl: "Eén kant is al compleet, en de drie andere randstukken moeten tegen de klok in draaien, van bovenaf gezien: dat is de Ua-perm.", en: "One face is already complete, and the other three edges need to go round counterclockwise, seen from above: that's the Ua-perm." }),
      tr({ fr: "Tourne le cube pour avoir la face complète derrière.", nl: "Draai de kubus zodat de complete kant achteraan zit.", en: "Turn the cube to have the complete face at the back." }),
    ],
    [
      UB_PERM,
      tr({ fr: "Une face est déjà complète, et les trois autres arêtes doivent tourner dans le sens des aiguilles d'une montre, vu du dessus : c'est l'Ub-perm.", nl: "Eén kant is al compleet, en de drie andere randstukken moeten met de klok mee draaien, van bovenaf gezien: dat is de Ub-perm.", en: "One face is already complete, and the other three edges need to go round clockwise, seen from above: that's the Ub-perm." }),
      tr({ fr: "Tourne le cube pour avoir la face complète derrière.", nl: "Draai de kubus zodat de complete kant achteraan zit.", en: "Turn the cube to have the complete face at the back." }),
    ],
    [
      H_PERM,
      tr({ fr: "Aucune face complète : chaque arête est en face de sa place. C'est le H-perm.", nl: "Geen enkele kant is compleet: elk randstuk staat tegenover zijn plek. Dat is de H-perm.", en: "No face is complete: each edge sits opposite its place. That's the H-perm." }),
      tr({ fr: "Pas besoin de tourner le cube : le H-perm marche de n'importe quel côté.", nl: "De kubus draaien hoeft niet: de H-perm werkt vanaf elke kant.", en: "No need to turn the cube: the H-perm works from any side." }),
    ],
    [
      Z_PERM,
      tr({ fr: "Aucune face complète : les arêtes s'échangent deux à deux avec leurs voisines. C'est le Z-perm.", nl: "Geen enkele kant is compleet: de randstukken wisselen twee aan twee met hun buren. Dat is de Z-perm.", en: "No face is complete: the edges swap two by two with their neighbors. That's the Z-perm." }),
      tr({ fr: "Tourne le cube pour que les arêtes de devant et de gauche aient à s'échanger, comme celles de derrière et de droite.", nl: "Draai de kubus zodat de randstukken voor en links moeten wisselen, net als die achter en rechts.", en: "Turn the cube so the front and left edges need swapping, like the back and right ones." }),
    ],
  ];
  const t = play(s, turns("U", align));
  if (!solved(t)) {
    const [[moves, case_, hold], r] = pick(PLL, t, "y", solved);
    emit(6, case_, [
      [
        tr({
          fr: "Tourne le haut pour mettre les coins à leur place, chacun entre les centres de ses couleurs.",
          nl: "Draai de bovenkant zodat de hoekstukken op hun plek staan, elk tussen de middenstukken van zijn kleuren.",
          en: "Turn the top to put the corners in their places, each between the centers of its colors.",
        }),
        turns("U", align),
      ],
      [hold, turns("y", r)],
      [tr({ fr: "Fais l'algorithme : le cube est résolu !", nl: "Doe het algoritme: de kubus is opgelost!", en: "Do the algorithm: the cube is solved!" }), moves],
    ]);
  } else
    emit(6, tr({ fr: "Toutes les pièces sont à leur place : il ne reste que le haut à aligner.", nl: "Alle stukken staan op hun plek: alleen de bovenkant moet nog goed.", en: "Every piece is in its place: only the top is left to line up." }), [
      [tr({ fr: "Tourne le haut : le cube est résolu !", nl: "Draai de bovenkant: de kubus is opgelost!", en: "Turn the top: the cube is solved!" }), turns("U", align)],
    ]);
  return groups;
}
