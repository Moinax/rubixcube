import assert from "node:assert/strict";
import test from "node:test";
import { beginnerSolve, planStates, STAGES, type Group } from "../src/beginner.ts";
import { cfopSolve } from "../src/cfop.ts";
import { COURSE, HAND_STAGES, HANDS, riders } from "../src/course.ts";
import { applyMove, colorsOf, PIECES, SOLVED, STICKERS, stickerAt, type Vec } from "../src/cube.ts";

const at = (s: string, pos: Vec, normal: Vec) => s[stickerAt(pos, normal)!];
const center = (s: string, n: Vec) => at(s, n, n);
const SIDES: Vec[] = [[0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0]];
const yellowEdgesUp = (s: string) => [[-1, 1, 0], [1, 1, 0], [0, 1, -1], [0, 1, 1]].map((p) => at(s, p as Vec, [0, 1, 0]) === "D");
const edgesAligned = (s: string) => SIDES.map((n) => at(s, [n[0], 1, n[2]], n) === center(s, n));
const placed = (s: string) =>
  [[1, 1, 1], [-1, 1, 1], [-1, 1, -1], [1, 1, -1]].filter((pos) => {
    const c = PIECES.find((p) => `${STICKERS[p[0]].pos}` === `${pos}`)!;
    return colorsOf(s, c) === c.map((i) => center(s, STICKERS[i].normal)).sort().join("");
  }).length;
const demo = (title: string) => COURSE.find((g) => g.title === title)!.from!;

test("the course covers every stage in order, each demo held yellow up and green in front", () => {
  assert.deepEqual([...new Set(COURSE.map((g) => g.stage))], STAGES.map((_, i) => i));
  for (const g of COURSE.filter((g) => g.stage > 0 && g.from)) {
    assert.equal(center(g.from!, [0, 1, 0]), "D", g.title);
    assert.equal(center(g.from!, [0, 0, 1]), "F", g.title);
  }
});

test("each demo starts on the case its text describes", () => {
  const whiteGreen = (s: string, pos: Vec, whiteSide: Vec) => at(s, pos, whiteSide) === "U";
  assert.ok(whiteGreen(demo("Arête en bas, blanc vers le sol"), [0, -1, 1], [0, -1, 0]));
  assert.ok(whiteGreen(demo("Arête dans la couronne du milieu"), [1, 0, 1], [1, 0, 0]));
  assert.ok(whiteGreen(demo("Arête en haut, blanc sur le côté"), [0, 1, 1], [0, 0, 1]));
  assert.ok(whiteGreen(demo("Arête en bas, blanc sur le côté"), [0, -1, 1], [0, 0, 1]));
  assert.equal(at(demo("Blanc à droite"), [1, 1, 1], [1, 0, 0]), "U");
  assert.equal(at(demo("Blanc en haut"), [1, 1, 1], [0, 1, 0]), "U");
  assert.equal(at(demo("Blanc devant"), [1, 1, 1], [0, 0, 1]), "U");
  assert.equal(at(demo("Coin en bas mal tourné"), [1, -1, 1], [1, 0, 0]), "U");
  assert.equal(at(demo("Vers la droite"), [0, 1, 1], [0, 1, 0]), "L"); // orange on top, orange on the right
  assert.equal(at(demo("Vers la gauche"), [0, 1, 1], [0, 1, 0]), "R");
  const stuck = demo("Arête coincée au milieu");
  assert.deepEqual([at(stuck, [1, 0, 1], [0, 0, 1]), at(stuck, [1, 0, 1], [1, 0, 0])], ["L", "F"]); // green-orange, flipped
  assert.deepEqual(yellowEdgesUp(demo("Le point")), [false, false, false, false]);
  const dot = COURSE.find((g) => g.title === "Le point")!;
  assert.equal(yellowEdgesUp(dot.moves.slice(0, 6).reduce(applyMove, dot.from!)).filter(Boolean).length, 2); // an L

  assert.deepEqual(yellowEdgesUp(demo("Le L")), [true, false, true, false]); // left and back
  assert.deepEqual(yellowEdgesUp(demo("La ligne")), [true, true, false, false]); // left and right
  assert.deepEqual(edgesAligned(demo("Deux voisines bonnes")), [false, true, true, false]); // right and back
  assert.ok([[true, false, true, false], [false, true, false, true]].some((a) => `${a}` === `${edgesAligned(demo("Deux en face"))}`));
  assert.equal(placed(demo("Un coin bien placé")), 1);
  assert.equal(placed(demo("Aucun coin bien placé")), 0);
});

test("the last demo turns the corners and leaves the cube solved", () => {
  const last = COURSE.at(-1)!;
  const end = last.moves.reduce(applyMove, last.from!);
  assert.equal(end, applyMove("UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB", "z2"));
  assert.notEqual(at(last.from!, [1, 1, 1], [0, 1, 0]), "D");
});

test("planStates starts each course demo from its own cube and ends a beginner plan solved", () => {
  const states = planStates(COURSE[0].from!, COURSE);
  let i = 0;
  for (const g of COURSE) {
    if (g.from) assert.equal(states[i], g.from, g.title); // a case that goes on from the last one keeps its cube
    i += g.moves.length;
  }
  assert.equal(states.length, i + 1);
  const start = "R U F' L2 D B' R2 U' F2 L".split(" ").reduce(applyMove, SOLVED);
  const end = planStates(start, beginnerSolve(start)).at(-1)!;
  assert.ok([0, 1, 2, 3, 4, 5].every((f) => new Set(end.slice(9 * f, 9 * f + 9)).size === 1));
});

test("stages come in order, so each stage's moves are one run the progress bar can measure", () => {
  const ordered = (groups: { stage: number }[]) => groups.every((g, i) => i === 0 || groups[i - 1].stage <= g.stage);
  assert.ok(ordered(COURSE));
  const start = "D' R2 F U' L B2 R' D F2 U".split(" ").reduce(applyMove, SOLVED);
  assert.ok(ordered(beginnerSolve(start)));
});

test("each group's steps share out its moves, in the course and in a beginner or CFOP plan", () => {
  const start = "L2 B U' R F2 D' L U2 B' R'".split(" ").reduce(applyMove, SOLVED);
  for (const g of [...COURSE, ...beginnerSolve(start), ...cfopSolve(start)]) {
    assert.ok(g.steps?.length && g.steps.every((s) => s.count > 0 && s.text), g.text);
    assert.equal(g.steps.reduce((n, s) => n + s.count, 0), g.moves.length, g.text);
  }
});

test("each move of the hands lessons names its finger, on the cube held yellow up", () => {
  for (const g of HANDS) {
    assert.equal(g.fingers?.length, g.moves.length, g.title);
    assert.equal(g.steps!.reduce((n, s) => n + s.count, 0), g.moves.length, g.title);
    assert.equal(center(g.from!, [0, 1, 0]), "D", g.title);
    assert.ok(g.stage < HAND_STAGES.length);
  }
  // The finger the bar names is the one the cube shows playing.
  const named: Record<string, string[]> = {
    "poignet droit": ["right thumb", "right index"],
    "poignet gauche": ["left thumb", "left index"],
    "index droit": ["right index"],
    "index droit ×2": ["right index"],
    "index gauche": ["left index"],
  };
  for (const g of HANDS) g.moves.forEach((m, i) => assert.deepEqual(riders(m), named[g.fingers![i]], `${g.title} ${m}`));
});

test("a demo shows only what its stage works with, and the daisy's demos end on the whole daisy", () => {
  const petals = (s: string) => [[-1, 1, 0], [1, 1, 0], [0, 1, -1], [0, 1, 1]].filter((p) => at(s, p as Vec, [0, 1, 0]) === "U").length;
  const colored = (s: string) => [...s].filter((c) => c !== ".").length;
  for (const g of COURSE.filter((g) => g.stage === 1)) {
    assert.equal(colored(g.from!), 6 + 8, g.title); // the centers and the 4 white edges, nothing else
    assert.equal(petals(g.moves.reduce(applyMove, g.from!)), 4, g.title);
  }
  const drop = COURSE.filter((g) => g.stage === 2);
  assert.equal(drop.length, 4); // one case a petal, on one cube
  assert.equal(petals(drop[0].from!), 4); // the cross starts from the daisy…
  const cross = drop.flatMap((g) => g.moves).reduce(applyMove, drop[0].from!);
  const down: Vec = [0, -1, 0];
  assert.ok(SIDES.every((n) => at(cross, [n[0], -1, n[2]] as Vec, down) === "U" && at(cross, [n[0], -1, n[2]] as Vec, n) === center(cross, n))); // …and ends on it
  for (const stage of [3, 4, 5, 6]) assert.ok(COURSE.filter((g) => g.stage === stage).every((g) => g.from!.includes(".")), `stage ${stage}`);
});


test("every case ends on its stage done, through the states its steps name", () => {
  const kind = (p: Vec) => p.filter(Boolean).length;
  const right = (s: string, keep: (p: Vec, n: Vec) => boolean) => STICKERS.every(({ pos, normal }, i) => !keep(pos, normal) || s[i] === center(s, normal));
  const done: Record<number, (s: string) => boolean> = {
    1: (s) => yellowEdgesUp(s).every((up, i) => up || at(s, [[-1, 1, 0], [1, 1, 0], [0, 1, -1], [0, 1, 1]][i] as Vec, [0, 1, 0]) === "U"),
    2: (s) => right(s, (p) => p[1] === -1 && kind(p) === 2),
    3: (s) => right(s, (p) => p[1] === -1),
    4: (s) => right(s, (p) => p[1] <= 0),
    5: (s) => right(s, (p) => p[1] <= 0) && yellowEdgesUp(s).every(Boolean),
    6: (s) => right(s, (p) => p[1] <= 0 || kind(p) === 2),
    7: (s) => right(s, (p) => p[1] <= 0 || kind(p) === 2) && placed(s) === 4,
    8: (s) => right(s, () => true),
  };
  // A demo: a case with its own cube, and the cases that go on from it on the same cube (the cross, petal by petal).
  const demos = COURSE.reduce<Group[][]>((all, g) => (g.from ? [...all, [g]] : (all.at(-1)!.push(g), all)), []);
  for (const d of demos.filter(([g]) => g.stage > 0)) assert.ok(done[d[0].stage](d.flatMap((g) => g.moves).reduce(applyMove, d[0].from!)), d.at(-1)!.title);
  const after = (title: string, n: number) => {
    const g = COURSE.find((g) => g.title === title)!;
    return g.moves.slice(0, n).reduce(applyMove, g.from!);
  };
  assert.deepEqual(yellowEdgesUp(after("Le point", 13)), [true, true, false, false]); // a line, held horizontal
  assert.deepEqual(edgesAligned(after("Deux en face", 10)), [false, true, true, false]); // two neighbors, right and back
  assert.ok(placed(after("Aucun coin bien placé", 9)) >= 1);
  const stuck = after("Arête coincée au milieu", 9);
  assert.deepEqual([at(stuck, [0, 1, 1], [0, 0, 1]), at(stuck, [0, 1, 1], [0, 1, 0])], ["F", "L"]); // green over green, orange on top
});
