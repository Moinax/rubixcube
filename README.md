# Rubik's Cube

Scan a real 3x3 cube with the camera (or type its colors in), then follow the
solution move by move on an animated 3D cube, in one of two modes, or learn the method without scanning:

- **Fast**: the shortest solution cubejs finds (~20 moves).
- **Learn**: the layer-by-layer beginner method (`src/beginner.ts`), ~170 moves
  split into 8 stages (daisy, white cross, white corners, middle layer, yellow
  cross, yellow edges, yellow corners placed then oriented), each with the rule
  it teaches and the piece it works on outlined in 3D.
- **Course** (no scan): the same method taught case by case (`src/course.ts`),
  each case a demo cube built backwards from its algorithm, to recognise on
  your own cube.

- Solver: [cubejs](https://github.com/ldez/cubejs) (Kociemba two-phase, ≤ 22 moves),
  patched in `patches/` so its `this.Cube` lookup survives bundling.
- 3D: three.js. UI: React + Tailwind.

```sh
pnpm install
pnpm dev       # http://localhost:5173 (webcam works on localhost)
pnpm dev:lan   # HTTPS on the LAN, so a phone can use its camera
pnpm test      # move/solver/validation/color-classification checks
pnpm build
```

Assumes the standard color scheme: white opposite yellow, green opposite blue,
red opposite orange. The guide keeps white on top and green facing you.
