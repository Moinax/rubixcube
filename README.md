# Cubiste

A Rubik's Cube solver and teacher. *Résous ton cube, coup par coup.*

Pick a mode first, from the first steps to the shortest solution. The three
that solve your own cube then ask for it: scan it with the camera, type its
colors in, or take a random scramble (handy for testing). Then follow the moves
one by one on an animated 3D cube:

- **Learn the basics** (no scan), in three parts. Understanding the method
  (`src/plan.ts`): the idea, a "where am I?" list of drawings, then each of the
  8 stages for any cube, watched or read (the viewer's choice stays). Watched,
  the stage's cases play in the guide's player in the page: first the stage
  before and after on two 3D cubes, what doesn't count yet greyed out, then each
  case (`src/course.ts`), a demo cube built backwards from its algorithm, what its
  stage doesn't use greyed out. Read, the before/after and the whole text: what
  to look for, what to do, why it breaks nothing. Then reading the moves (the
  notation, then the beginner method case by case), or holding the cube: the home
  grip marked on the 3D cube and the finger or wrist that makes R, L, U and the
  sexy move, the fingers riding with the face they turn.
- **Beginner method**: layer by layer (`src/beginner.ts`), ~170 moves split into
  8 stages (daisy, white cross, white corners, middle layer, yellow cross, yellow
  edges, yellow corners placed then oriented), each with the rule it teaches and
  the piece it works on outlined in 3D.
- **Intermediate method**: 4-look CFOP (`src/cfop.ts`), ~80 moves: the white
  cross straight on the bottom (searched edge by edge), the first two layers pair
  by pair (top turns and the triggers R U R' / F' U F), then the last layer in two
  looks for its orientation (yellow cross, 7 corner cases) and two for its
  permutation (T or Y perm, then U, H or Z perm). Face turns only, no wide or
  slice moves.
- **Kociemba's method**: the shortest solution cubejs finds (~20 moves), split
  into its two phases (`phaseTwo` in `src/cube.ts`): every piece turned the right
  way round, then put in its place with U, D and half turns only.

- Solver: [cubejs](https://github.com/ldez/cubejs) (Kociemba two-phase, ≤ 22 moves),
  patched in `patches/` so its `this.Cube` lookup survives bundling.
- 3D: three.js. UI: React + Tailwind, Archivo (self-hosted via `@fontsource-variable/archivo`).

```sh
pnpm install
pnpm dev       # http://localhost:5173 (webcam works on localhost)
pnpm dev:lan   # HTTPS on the LAN, so a phone can use its camera
pnpm test      # move/solver/validation/color-classification checks
pnpm build
```

In French, Dutch or English (`src/i18n.ts`): the browser's language, switchable at
the top of every screen. Each text sits next to its code as `tr({ fr, nl, en })`.

Assumes the standard color scheme: white opposite yellow, green opposite blue,
red opposite orange. The guide starts white on top and green facing you, then
turns the cube over: both methods build the white at the bottom, yellow on top.
