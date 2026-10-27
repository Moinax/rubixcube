import { applyMove, FACE_NAMES, simplify, STICKERS, stickerAt, type Face, type Vec } from "./cube.ts";

// Layer-by-layer beginner method, played like a human would: hold the cube
// yellow up, turn it with y to face the slot you work on, and apply the
// handful of algorithms the method teaches. Each step is simulated, never searched,
// except the daisy, which is intuitive anyway.

export type Stage = { title: string; goal: string; how: string };
export type Group = { stage: number; text: string; moves: string[]; piece?: string };

export const STAGES: Stage[] = [
  {
    title: "Prise en main",
    goal: "Tenir le cube jaune en haut, blanc en bas.",
    how: "Les centres ne bougent jamais les uns par rapport aux autres : ce sont eux qui donnent la couleur de chaque face. On construit le blanc en bas et on finit par le jaune en haut.",
  },
  {
    title: "La marguerite",
    goal: "Les 4 arêtes blanches autour du centre jaune, blanc vers le haut.",
    how: "Le dessus ne contient encore rien d'important, on peut donc y ranger les arêtes blanches librement. Si la place visée est déjà prise, tourne d'abord le haut pour ne pas déloger une pétale.",
  },
  {
    title: "La croix blanche",
    goal: "Les 4 arêtes blanches en bas, alignées avec leurs centres.",
    how: "Tourne le haut jusqu'à ce que la deuxième couleur d'une pétale soit au-dessus du centre de la même couleur, puis fais un demi-tour de cette face : la pétale descend à sa place, blanc en bas.",
  },
  {
    title: "Les coins blancs",
    goal: "Finir la première couronne.",
    how: "Place l'emplacement du coin en bas à droite devant toi et le coin juste au-dessus. R U R' U' (le « sexy move ») sort le coin et le remet tourné d'un cran : répète-le jusqu'à ce que le blanc soit en bas. 6 répétitions ramènent le cube à l'identique, donc rien d'autre ne casse en bas.",
  },
  {
    title: "La deuxième couronne",
    goal: "Placer les 4 arêtes du milieu.",
    how: "Prends une arête du haut sans jaune, aligne sa couleur de devant avec le centre, puis glisse-la à droite (U R U' R' U' F' U F) ou à gauche (U' L' U L U F U' F'), selon la couleur du dessus. L'algorithme écarte l'emplacement, y glisse l'arête puis remet le coin blanc en place. Les deux versions sont le miroir l'une de l'autre.",
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
];

const UP: Vec = [0, 1, 0];
const DOWN: Vec = [0, -1, 0];
const FRONT: Vec = [0, 0, 1];
const SIDE_FACES: [Face, Vec][] = [
  ["F", [0, 0, 1]],
  ["R", [1, 0, 0]],
  ["B", [0, 0, -1]],
  ["L", [-1, 0, 0]],
];
const SEXY = ["R", "U", "R'", "U'"];
const RIGHT = "U R U' R' U' F' U F".split(" ");
const LEFT = "U' L' U L U F U' F'".split(" ");
const FLIP = "F R U R' U' F'".split(" ");
const SUNE = "R U R' U R U2 R' U".split(" ");
const CYCLE = "U R U' L' U R' U' L".split(" ");
const TWIST = "R' D' R D".split(" ");

const same = (a: Vec, b: Vec) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const turns = (m: string, n: number) => Array(n % 4).fill(m) as string[];
const play = (state: string, moves: string[]) => moves.reduce(applyMove, state);

// Cubies as their facelet indices, corners and edges only.
const CUBIES = [
  ...STICKERS.reduce((m, s, i) => m.set(`${s.pos}`, [...(m.get(`${s.pos}`) ?? []), i]), new Map<string, number[]>()).values(),
]
  .filter((c) => c.length > 1)
  .map((idx) => ({ pos: STICKERS[idx[0]].pos, idx }));

const center = (s: string, normal: Vec) => s[stickerAt(normal, normal)!];
const colorAt = (s: string, pos: Vec, normal: Vec) => s[stickerAt(pos, normal)!];
const key = (s: string, idx: number[]) => idx.map((i) => s[i]).sort().join("");
export const findPiece = (s: string, piece: string) => CUBIES.find((c) => key(s, c.idx) === piece)!.pos;
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

  emit(0, "Retourne le cube : le jaune passe en haut, garde le vert face à toi.", ["z2"]);
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
    emit(1, `Amène l'arête ${names(edge)} sur le dessus, blanc vers le haut, sans déloger les autres.`, moves, edge);
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
    emit(
      2,
      `Tourne le haut pour mettre l'arête ${names(edge)} au-dessus du centre ${FACE_NAMES[other as Face]}, puis demi-tour de cette face.`,
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
      emit(3, `Le coin ${names(corner)} est coincé en bas : mets-le en bas à droite devant toi et fais une fois R U R' U' pour le remonter.`, [...moves, ...SEXY], corner);
      continue;
    }
    // Slot below the corner's two side colors, at front-right, corner right above it.
    const sides = corner.replace(W, "");
    const moves = setup(s, (t) => same(findPiece(t, corner), URF) && [...sides].every((c) => [center(t, FRONT), center(t, [1, 0, 0])].includes(c)))!;
    let t = play(s, moves);
    let reps = 0;
    while (!solvedAt(t, FRD)) (t = play(t, SEXY)), reps++;
    emit(
      3,
      `Coin ${names(corner)} : mets son emplacement en bas à droite devant toi, le coin juste au-dessus, puis R U R' U' ${reps} fois.`,
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
      emit(4, `L'arête ${names(edge)} est mal placée au milieu : mets-la à droite devant toi et fais l'algorithme de droite pour la sortir.`, [...moves, ...RIGHT], edge);
      continue;
    }
    const edge = key(s, up.idx);
    const moves = setup(s, (t) => same(findPiece(t, edge), UF) && colorAt(t, UF, FRONT) === center(t, FRONT))!;
    const t = play(s, moves);
    const right = colorAt(t, UF, UP) === center(t, [1, 0, 0]);
    emit(
      4,
      `Arête ${names(edge)} : aligne sa couleur de devant avec le centre, puis glisse-la vers la ${right ? "droite" : "gauche"}.`,
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
        ? [[], "Point jaune : fais F R U R' U' F' pour obtenir un L."]
        : line
          ? [line, "Ligne jaune : mets-la à l'horizontale, puis F R U R' U' F'."]
          : [shape!, "L jaune : tiens-le derrière et à gauche, puis F R U R' U' F'."];
    emit(5, text, [...moves, ...FLIP]);
  }

  // 6. Yellow edges.
  const edgeAligned = (t: string, n: Vec) => colorAt(t, [n[0], 1, n[2]], n) === center(t, n);
  const aligned = (t: string) => SIDE_FACES.filter(([, n]) => edgeAligned(t, n)).length;
  for (let n = 0; ; n++) {
    guard(n);
    const align = setup(s, (t) => aligned(t) === 4, 1);
    if (align) {
      emit(6, "Tourne le haut : toutes les arêtes jaunes s'alignent avec leurs centres.", align);
      break;
    }
    const pair = setup(s, (t) => edgeAligned(t, [0, 0, -1]) && edgeAligned(t, [1, 0, 0]));
    emit(
      6,
      pair
        ? "Deux arêtes jaunes côte à côte sont bonnes : tiens-les derrière et à droite, puis R U R' U R U2 R' U."
        : "Les arêtes bien placées sont face à face : fais R U R' U R U2 R' U une fois pour en avoir deux côte à côte.",
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
        ? "Tiens le coin déjà bien placé en haut à droite devant toi, puis U R U' L' U R' U' L."
        : "Aucun coin n'est à sa place : fais U R U' L' U R' U' L une fois, depuis n'importe où.",
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
      `${k ? "Tourne le haut pour amener le coin suivant en haut à droite devant toi, puis" : "Coin en haut à droite devant toi :"} R' D' R D ${reps} fois, jusqu'à ce que le jaune soit en haut.`,
      [...turns("U", k), ...Array(reps).fill(TWIST).flat()],
      corner,
    );
  }
  emit(8, "Tourne le haut une dernière fois : le cube est résolu !", setup(s, (t) => aligned(t) === 4, 1)!);
  return groups;
}
