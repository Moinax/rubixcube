declare module "cubejs" {
  export default class Cube {
    static fromString(state: string): Cube;
    static initSolver(): void;
    static random(): Cube;
    cp: number[];
    co: number[];
    ep: number[];
    eo: number[];
    asString(): string;
    move(alg: string): this;
    solve(maxDepth?: number): string;
  }
}
