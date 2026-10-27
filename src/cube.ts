import Cube from "cubejs";

// A cube state is 54 face letters in Kociemba facelet order: U1..U9 R1..R9
// F1..F9 D1..D9 L1..L9 B1..B9, each letter naming the face whose center has
// that color. Solving orientation: white up (U), green facing you (F).
export const FACES = "URFDLB";
export type Face = "U" | "R" | "F" | "D" | "L" | "B";
export type Vec = [number, number, number];
export type RGB = [number, number, number];

export const SOLVED = [...FACES].map((f) => f.repeat(9)).join("");

// ponytail: assumes the standard color scheme, which nearly every cube uses.
// Scanning still works on another scheme; only these names and swatches lie.
export const FACE_COLORS: Record<Face, string> = {
  U: "#f4f4f4",
  R: "#e8302a",
  F: "#1fb85a",
  D: "#ffd60a",
  L: "#ff8a1f",
  B: "#1e6fe8",
};
export const FACE_NAMES: Record<Face, string> = {
  U: "blanc",
  R: "rouge",
  F: "vert",
  D: "jaune",
  L: "orange",
  B: "bleu",
};

// x points right (R), y up (U), z toward you (F).
export const NORMALS: Record<Face, Vec> = {
  U: [0, 1, 0],
  R: [1, 0, 0],
  F: [0, 0, 1],
  D: [0, -1, 0],
  L: [-1, 0, 0],
  B: [0, 0, -1],
};

// Cubie holding sticker (row, col) of each face, read with the face toward
// you: U with B on top, D with F on top, the four sides with U on top.
const POSITIONS: Record<Face, (r: number, c: number) => Vec> = {
  U: (r, c) => [c - 1, 1, r - 1],
  R: (r, c) => [1, 1 - r, 1 - c],
  F: (r, c) => [c - 1, 1 - r, 1],
  D: (r, c) => [c - 1, -1, 1 - r],
  L: (r, c) => [-1, 1 - r, c - 1],
  B: (r, c) => [1 - c, 1 - r, -1],
};

export const STICKERS = [...FACES].flatMap((f) =>
  Array.from({ length: 9 }, (_, i) => ({
    pos: POSITIONS[f as Face](Math.floor(i / 3), i % 3),
    normal: NORMALS[f as Face],
  })),
);
const INDEX = new Map(STICKERS.map((s, i) => [`${s.pos}|${s.normal}`, i]));

/** Facelet index of the sticker on cubie `pos` facing `normal`, if any. */
export const stickerAt = (pos: Vec, normal: Vec) => INDEX.get(`${pos}|${normal}`);

export const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Clockwise quarter turn of `v` seen from the tip of the unit axis `a`. */
function turn(v: Vec, a: Vec): Vec {
  const d = dot(a, v);
  return [
    a[0] * d - (a[1] * v[2] - a[2] * v[1]),
    a[1] * d - (a[2] * v[0] - a[0] * v[2]),
    a[2] * d - (a[0] * v[1] - a[1] * v[0]),
  ];
}

/** Clockwise quarter turns of a move: 1, 2 or -1. */
export const quarterTurns = (move: string) => (move[1] === "2" ? 2 : move[1] === "'" ? -1 : 1);

// Whole-cube rotations turn like the face they are named after: x = R, y = U, z = F.
const ROTATIONS: Record<string, Face> = { x: "R", y: "U", z: "F" };
export const isRotation = (move: string) => move[0] in ROTATIONS;
export const moveAxis = (move: string) => NORMALS[(ROTATIONS[move[0]] ?? move[0]) as Face];

// Source facelet of each target facelet, per move, built on first use.
const PERMUTATIONS = new Map<string, number[]>();

function permutation(move: string): number[] {
  const axis = moveAxis(move);
  const turns = (quarterTurns(move) + 4) % 4;
  const p = STICKERS.map((_, i) => i);
  STICKERS.forEach(({ pos, normal }, i) => {
    if (!isRotation(move) && dot(pos, axis) !== 1) return;
    for (let t = 0; t < turns; t++) [pos, normal] = [turn(pos, axis), turn(normal, axis)];
    p[stickerAt(pos, normal)!] = i;
  });
  PERMUTATIONS.set(move, p);
  return p;
}

export function applyMove(state: string, move: string): string {
  const p = PERMUTATIONS.get(move) ?? permutation(move);
  let out = "";
  for (let i = 0; i < 54; i++) out += state[p[i]];
  return out;
}

/** The same cube turned back to white up, green in front. */
export function upright(state: string): string {
  for (const a of ["", "x", "x2", "x'", "z", "z'"])
    for (const b of ["", "y", "y2", "y'"]) {
      const s = [a, b].filter(Boolean).reduce(applyMove, state);
      if (s[4] === "U" && s[22] === "F") return s;
    }
  throw new Error("no white or green center");
}

/** Merges consecutive turns of the same face or rotation: U U → U2, R R' → nothing. */
export function simplify(moves: string[]): string[] {
  const out: string[] = [];
  for (const m of moves) {
    const last = out.at(-1);
    if (last?.[0] !== m[0]) {
      out.push(m);
      continue;
    }
    const turns = (quarterTurns(last) + quarterTurns(m) + 4) % 4;
    out.pop();
    if (turns) out.push(m[0] + ["", "", "2", "'"][turns]);
  }
  return out;
}

const parity = (p: number[]) =>
  p.reduce((n, a, i) => n + p.slice(i + 1).filter((b) => b < a).length, 0) % 2;
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

/** Why `state` cannot be a real cube, in French, or null when it can. */
export function validate(state: string): string | null {
  for (const f of FACES) {
    const n = [...state].filter((c) => c === f).length;
    if (n !== 9) return `Il y a ${n} cases ${FACE_NAMES[f as Face]} au lieu de 9.`;
  }
  const cube = Cube.fromString(state);
  if (cube.asString() !== state || new Set(cube.cp).size !== 8 || new Set(cube.ep).size !== 12)
    return "Certaines pièces n'existent pas ou apparaissent deux fois (cases encadrées) : une couleur est mal lue sur l'une d'elles.";
  if (sum(cube.co) % 3) return "Un coin est tourné sur lui-même : vérifie les couleurs des coins.";
  if (sum(cube.eo) % 2) return "Une arête est retournée : vérifie les couleurs des arêtes.";
  if (parity(cube.cp) !== parity(cube.ep))
    return "Deux pièces sont échangées : vérifie les couleurs.";
  return null;
}

let solverReady = false;

/** Shortest-ish (Kociemba two-phase, ≤ 22 moves) solution of a valid state. */
export function solve(state: string): string[] {
  if (state === SOLVED) return [];
  // ponytail: ~1 s table build on the main thread, move to a worker if it janks phones.
  if (!solverReady) Cube.initSolver();
  solverReady = true;
  return Cube.fromString(state).solve().split(" ").filter(Boolean);
}

const DIRECTIONS: Record<Face, [string, string, string]> = {
  U: ["Face du haut", "un quart de tour vers la gauche", "un quart de tour vers la droite"],
  D: ["Face du bas", "un quart de tour vers la droite", "un quart de tour vers la gauche"],
  R: ["Face droite", "un quart de tour vers le haut", "un quart de tour vers le bas"],
  L: ["Face gauche", "un quart de tour vers le bas", "un quart de tour vers le haut"],
  F: ["Face avant", "un quart de tour dans le sens horaire", "un quart de tour dans le sens anti-horaire"],
  B: ["Face arrière", "un quart de tour, le haut part vers la gauche", "un quart de tour, le haut part vers la droite"],
};

const ROTATION_TEXT: Record<string, [string, string, string]> = {
  y: ["la face droite vient devant toi", "la face gauche vient devant toi", "la face arrière vient devant toi"],
  x: ["la face avant monte en haut", "la face du bas vient devant toi", "le bas passe en haut"],
  z: ["le haut part à droite", "le haut part à gauche", "le bas passe en haut, garde la même face devant toi"],
};

/** French instruction for a move, as seen from the front. */
export function describeMove(move: string): string {
  const turns = quarterTurns(move);
  const pick = <T,>([cw, ccw, half]: [T, T, T]) => (turns === 2 ? half : turns === 1 ? cw : ccw);
  if (isRotation(move)) return `Tourne tout le cube : ${pick(ROTATION_TEXT[move[0]])}`;
  const [name, cw, ccw] = DIRECTIONS[move[0] as Face];
  return `${name} : ${pick([cw, ccw, "un demi-tour"])}`;
}

function lab([r, g, b]: RGB): RGB {
  const lin = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
  const y = f(0.2126 * R + 0.7152 * G + 0.0722 * B);
  const z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/**
 * Turns 54 sampled colors (facelet order) into a state. Each sticker goes to
 * the closest center color, closest pairs first, at most 9 per color, which
 * settles most red/orange and white/yellow doubts.
 */
export function classify(samples: RGB[]): string {
  const labs = samples.map(lab);
  // Lightness weighs half: shading varies more than hue across a photo.
  const dist = (a: RGB, b: RGB) => ((a[0] - b[0]) / 2) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const d = labs.map((l) => [...FACES].map((_, f) => dist(l, labs[9 * f + 4])));
  const pairs = d.flatMap((row, i) => row.map((d, f) => ({ i, f, d }))).sort((a, b) => a.d - b.d);
  const out: string[] = [];
  const left = Array(6).fill(9);
  for (const { i, f } of pairs)
    if (!out[i] && left[f]) {
      out[i] = FACES[f];
      left[f]--;
    }
  const state = out.join("");
  if (!validate(state)) return state;

  // One misread sticker makes the 9-per-color cap push another one the other
  // way, so the usual mistake is a swap: try the cheapest swap that gives a
  // real cube. ponytail: single swap only, two independent misreads stay manual.
  const f = (i: number) => FACES.indexOf(out[i]);
  const swaps = [];
  for (let i = 0; i < 54; i++)
    for (let j = i + 1; j < 54; j++)
      if (out[i] !== out[j]) swaps.push({ i, j, cost: d[i][f(j)] + d[j][f(i)] - d[i][f(i)] - d[j][f(j)] });
  for (const { i, j } of swaps.sort((a, b) => a.cost - b.cost)) {
    const s = out.with(i, out[j]).with(j, out[i]).join("");
    if (!validate(s)) return s;
  }
  return state;
}

// Facelet indices of each corner and edge, grouped by cubie.
const PIECES = [
  ...STICKERS.reduce((m, s, i) => m.set(`${s.pos}`, [...(m.get(`${s.pos}`) ?? []), i]), new Map<string, number[]>()).values(),
].filter((p) => p.length > 1);
const colorsOf = (state: string, piece: number[]) => piece.map((i) => state[i]).sort().join("");
const REAL_PIECES = new Set(PIECES.map((p) => colorsOf(SOLVED, p)));

/** Facelets of pieces that cannot exist or appear twice: where a misread hides. */
export function suspects(state: string): Set<number> {
  const keys = PIECES.map((p) => colorsOf(state, p));
  return new Set(
    PIECES.filter((_, k) => !REAL_PIECES.has(keys[k]) || keys.indexOf(keys[k]) !== keys.lastIndexOf(keys[k])).flat(),
  );
}
