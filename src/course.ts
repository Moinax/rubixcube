import { CYCLE, FLIP, LEFT, play, RIGHT, SEXY, SUNE, TWIST, type Group } from "./beginner.ts";
import { applyMove, invert as undo, SOLVED } from "./cube.ts";

// The beginner method as a course, for a cube the app has not seen: each case
// of each stage is a demo cube that shows the situation, the moves that solve
// it, and how to recognise it on your own cube. Every demo start is built
// backwards: a finished position with the moves undone, so playing them is
// exactly the case. Demos hold yellow up, green in front, like the method.

const times = (moves: string[], n: number) => Array<string[]>(n).fill(moves).flat();
const YELLOW_UP = applyMove(SOLVED, "z2");

/** A case: `goal` is where its moves lead, its start is `goal` with the moves undone. */
function demo(stage: number, title: string, text: string, moves: string[], goal = YELLOW_UP, piece?: string): Group {
  return { stage, title, text, moves, from: play(goal, undo(moves)), piece };
}

// Pieces by color letters (white U, yellow D, green F, blue B, red R, orange L).
const WHITE_GREEN = "FU";
const WHITE_GREEN_ORANGE = "FLU";
const GREEN_ORANGE = "FL";
const GREEN_RED = "FR";
const PETAL_RIGHT = play(YELLOW_UP, ["F2", "U'"]); // white-green edge on top at the right, white up
const ONE_CORNER_PLACED = play(YELLOW_UP, ["y", ...undo(CYCLE), "y'"]);
const EDGE_FLIPPED_IN_SLOT = play(YELLOW_UP, [...RIGHT, "U2", ...RIGHT]); // green-orange in its slot, upside down
const OPPOSITE_DONE = play(YELLOW_UP, ["y", ...undo(SUNE), "y'", "U'"]);

const lesson = (title: string, text: string, moves: string[]): Group => ({ stage: 0, title, text, moves, from: SOLVED });

export const COURSE: Group[] = [
  lesson("Les lettres", "Chaque coup s'écrit avec l'initiale anglaise d'une face : R droite (Right), L gauche (Left), U haut (Up), D bas (Down), F avant (Front), B arrière (Back). Une lettre seule, c'est un quart de tour dans le sens des aiguilles d'une montre, comme si tu regardais cette face en face. Regarde les six, dans l'ordre.", ["R", "L", "U", "D", "F", "B"]),
  lesson("Le prime : '", "Une apostrophe (« prime ») tourne la même face dans l'autre sens : R' défait R.", ["R", "R'"]),
  lesson("Le 2", "Un 2 fait un demi-tour de la face, dans un sens ou dans l'autre : U2, c'est U deux fois.", ["U2"]),
  lesson("Tourner tout le cube : x, y, z", "x, y et z tournent tout le cube dans ta main, comme R, U et F. Rien ne change sur le cube : seule la face que tu regardes change. y amène la face droite devant toi, y' la remet.", ["y", "y'"]),
  lesson("Repérer les faces", "Les centres ne bougent jamais : le centre blanc donne la face blanche, le centre jaune la face jaune. Pour toute la méthode, tiens ton cube centre jaune en haut. Ici on part blanc en haut et on retourne le cube.", ["z2"]),

  demo(1, "En bas, blanc dessous", "Une arête blanche est en bas, blanc vers le bas : un demi-tour de sa face la monte, blanc vers le haut. Si la place juste au-dessus est déjà un pétale, tourne d'abord le haut pour la libérer.", ["F2"], play(YELLOW_UP, ["F2"]), WHITE_GREEN),
  demo(1, "Au milieu", "Une arête blanche est dans la couronne du milieu : tourne d'un quart la face de son autre couleur (ici l'avant), dans le sens qui amène le blanc en haut. Libère d'abord la place du haut où elle arrive.", ["F'"], play(YELLOW_UP, ["F2"]), WHITE_GREEN),
  demo(1, "En haut, blanc sur le côté", "Une arête blanche est en haut mais son blanc regarde sur le côté : descends-la au milieu (F), tourne le haut pour ne pas déloger un pétale (U'), puis remonte-la par le côté (R), blanc vers le haut.", ["F", "U'", "R"], PETAL_RIGHT, WHITE_GREEN),
  demo(1, "En bas, blanc sur le côté", "Une arête blanche est en bas, blanc sur le côté : un quart de tour de sa face (F') la met au milieu, puis la face d'à côté (R) la monte, blanc vers le haut. Libère d'abord les places du haut que ces deux faces touchent.", ["F'", "R"], PETAL_RIGHT, WHITE_GREEN),

  demo(2, "Descendre un pétale", "Tourne le haut jusqu'à ce que l'autre couleur d'un pétale soit au-dessus du centre de la même couleur (ici vert au-dessus du vert), puis fais un demi-tour de cette face : le pétale descend, blanc en bas. Recommence pour les 4 pétales.", ["U'", "F2"], YELLOW_UP, WHITE_GREEN),

  demo(3, "Blanc à droite", "La place du coin, encadrée en vert, est en bas entre les centres de ses deux autres couleurs. Tourne le cube pour l'avoir en bas à droite devant toi, puis le haut pour amener le coin juste au-dessus. Règle : répète R U R' U' jusqu'à ce que le coin soit en place, blanc en bas. Blanc vers la droite : une fois.", SEXY, YELLOW_UP, WHITE_GREEN_ORANGE),
  demo(3, "Blanc en haut", "Même règle. Blanc vers le haut : 3 fois R U R' U'.", times(SEXY, 3), YELLOW_UP, WHITE_GREEN_ORANGE),
  demo(3, "Blanc devant", "Même règle. Blanc vers toi : 5 fois R U R' U'.", times(SEXY, 5), YELLOW_UP, WHITE_GREEN_ORANGE),
  demo(3, "Coin en bas mal tourné", "Le coin est à sa place mais mal tourné : la même règle le répare (2 ou 4 fois). S'il est coincé dans une autre place du bas, mets cette place en bas à droite devant toi et fais une fois R U R' U' : il remonte, et tu reprends un des cas précédents.", times(SEXY, 2), YELLOW_UP, WHITE_GREEN_ORANGE),

  demo(4, "Vers la droite", "Prends une arête du haut sans jaune. Tourne le cube et le haut pour que sa couleur de devant soit au-dessus du centre de la même couleur (ici vert contre vert). Sa place est encadrée en vert. Sa couleur du dessus est celle de droite (ici orange) : U R U' R' U' F' U F.", RIGHT, YELLOW_UP, GREEN_ORANGE),
  demo(4, "Vers la gauche", "Même chose quand la couleur du dessus est celle de gauche (ici rouge) : U' L' U L U F U' F'.", LEFT, YELLOW_UP, GREEN_RED),
  demo(4, "Arête coincée au milieu", "Une arête du milieu est à sa place mais à l'envers, ou à la place d'une autre : mets-la à droite devant toi et fais une fois l'algorithme de droite. Elle remonte en haut, et c'est un des deux cas précédents.", RIGHT, play(EDGE_FLIPPED_IN_SLOT, RIGHT), GREEN_ORANGE),

  demo(5, "Le point", "Aucune arête jaune en haut, seulement le centre : F R U R' U' F' une fois, de n'importe quel côté. Tu obtiens un L.", FLIP, play(YELLOW_UP, [...undo(FLIP), "U", ...undo(FLIP)])),
  demo(5, "Le L", "Deux arêtes jaunes voisines forment un L : tiens-le derrière et à gauche, puis F R U R' U' F'. Tu obtiens une ligne.", FLIP, play(YELLOW_UP, undo(FLIP))),
  demo(5, "La ligne", "Deux arêtes jaunes en face forment une ligne : tiens-la à l'horizontale, puis F R U R' U' F'. La croix jaune est faite.", FLIP),

  demo(6, "Deux voisines bonnes", "Tourne le haut pour aligner le plus d'arêtes possible avec leurs centres. Si deux arêtes voisines sont bonnes, tiens-les derrière et à droite, puis R U R' U R U2 R' U.", SUNE),
  demo(6, "Deux en face", "Si les deux arêtes bonnes sont face à face : fais R U R' U R U2 R' U une fois, de n'importe quel côté. Tourne le haut : tu retombes sur deux voisines.", SUNE, OPPOSITE_DONE),

  demo(7, "Un coin bien placé", "Un coin est bien placé quand ses 3 couleurs sont celles des 3 faces autour, même s'il est mal tourné. Tiens un coin bien placé en haut à droite devant toi, puis U R U' L' U R' U' L. Répète jusqu'à ce que les 4 soient placés.", CYCLE),
  demo(7, "Aucun coin bien placé", "Aucun coin n'est à sa place : fais U R U' L' U R' U' L une fois, de n'importe où. Un coin se place, et c'est le cas précédent.", CYCLE, ONE_CORNER_PLACED),

  demo(8, "Tourner les coins", "Le coin à tourner en haut à droite devant toi : R' D' R D jusqu'à ce que son jaune soit en haut (2 ou 4 fois). Tourne ensuite seulement le haut pour amener le coin suivant au même endroit, et recommence. Le bas se mélange en route puis se répare tout seul : ne tourne jamais tout le cube.", [...times(TWIST, 2), "U", ...times(TWIST, 4), "U'"]),
];
