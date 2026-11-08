import assert from "node:assert/strict";
import test from "node:test";
import { beginnerSolve, planStates, STAGES } from "../src/beginner.ts";
import { cfopSolve } from "../src/cfop.ts";
import { COURSE, HAND_STAGES, HANDS, INTROS, riders } from "../src/course.ts";
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
  for (const g of COURSE.filter((g) => g.stage > 0)) {
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
  assert.equal(yellowEdgesUp(dot.moves.reduce(applyMove, dot.from!)).filter(Boolean).length, 2); // an L

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
    assert.equal(states[i], g.from, g.title);
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
  const drop = COURSE.find((g) => g.stage === 2)!;
  assert.equal(petals(drop.from!), 4); // the cross starts from the daisy
  for (const stage of [3, 4, 5, 6]) assert.ok(COURSE.filter((g) => g.stage === stage).every((g) => g.from!.includes(".")), `stage ${stage}`);
});

test("the daisy's presentation plays the whole stage, from a scrambled cube to the daisy", () => {
  const { from, moves } = INTROS[1]!;
  const petals = (s: string) => [[-1, 1, 0], [1, 1, 0], [0, 1, -1], [0, 1, 1]].filter((p) => at(s, p as Vec, [0, 1, 0]) === "U").length;
  assert.equal(center(from, [0, 1, 0]), "D"); // held yellow up
  assert.equal([...from].filter((c) => c !== ".").length, 6 + 8); // the centers and the white edges only
  assert.equal(petals(from), 0);
  assert.equal(petals(moves.reduce(applyMove, from)), 4);
  assert.ok(moves.every((m, i) => !i || m[0] !== moves[i - 1][0]), moves.join(" ")); // no move undone right after it
});
