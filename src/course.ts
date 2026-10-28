import { CYCLE, FLIP, LEFT, play, RIGHT, SEXY, SUNE, TWIST, type Group } from "./beginner.ts";
import { applyMove, invert as undo, SOLVED } from "./cube.ts";
import { tr, type Lang } from "./i18n.ts";

// The beginner method as a course, for a cube the app has not seen: each case
// of each stage is a demo cube that shows the situation, the moves that solve
// it, and how to recognise it on your own cube. Every demo start is built
// backwards: a finished position with the moves undone, so playing them is
// exactly the case. Demos hold yellow up, green in front, like the method.

const times = (moves: string[], n: number) => Array<string[]>(n).fill(moves).flat();
const YELLOW_UP = applyMove(SOLVED, "z2");

type Texts = Record<Lang, [title: string, text: string]>;

/** A case: `goal` is where its moves lead, its start is `goal` with the moves undone. */
function demo(stage: number, texts: Texts, moves: string[], goal = YELLOW_UP, piece?: string): Group {
  const [title, text] = tr(texts);
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

const lesson = (texts: Texts, moves: string[]): Group => {
  const [title, text] = tr(texts);
  return { stage: 0, title, text, moves, from: SOLVED };
};

export const COURSE: Group[] = [
  lesson(
    {
      fr: ["Les lettres", "Chaque coup s'écrit avec l'initiale anglaise d'une face : R droite (Right), L gauche (Left), U haut (Up), D bas (Down), F avant (Front), B arrière (Back). Une lettre seule, c'est un quart de tour dans le sens des aiguilles d'une montre, comme si tu regardais cette face en face. Regarde les six, dans l'ordre."],
      nl: ["De letters", "Elke zet schrijf je met de Engelse beginletter van een kant: R rechts (Right), L links (Left), U boven (Up), D onder (Down), F voor (Front), B achter (Back). Een letter alleen is een kwartslag met de klok mee, alsof je recht naar die kant kijkt. Bekijk ze alle zes, in volgorde."],
      en: ["The letters", "Each move is written with the initial of a face: R right, L left, U up, D down, F front, B back. A letter on its own is a quarter turn clockwise, as if you were looking straight at that face. Watch all six, in order."],
    },
    ["R", "L", "U", "D", "F", "B"],
  ),
  lesson(
    {
      fr: ["Le prime : '", "Une apostrophe (« prime ») tourne la même face dans l'autre sens : R' défait R."],
      nl: ["De prime: '", "Een apostrof („prime”) draait dezelfde kant in de omgekeerde richting: R' maakt R ongedaan."],
      en: ["The prime: '", "An apostrophe (“prime”) turns the same face the other way: R' undoes R."],
    },
    ["R", "R'"],
  ),
  lesson(
    {
      fr: ["Le 2", "Un 2 fait un demi-tour de la face, dans un sens ou dans l'autre : U2, c'est U deux fois."],
      nl: ["De 2", "Een 2 draait de kant een halve slag, in de ene of de andere richting: U2 is twee keer U."],
      en: ["The 2", "A 2 gives the face a half turn, either way: U2 is U twice."],
    },
    ["U2"],
  ),
  lesson(
    {
      fr: ["Tourner tout le cube : x, y, z", "x, y et z tournent tout le cube dans ta main, comme R, U et F. Rien ne change sur le cube : seule la face que tu regardes change. y amène la face droite devant toi, y' la remet."],
      nl: ["De hele kubus draaien: x, y, z", "x, y en z draaien de hele kubus in je hand, zoals R, U en F. Er verandert niets aan de kubus: alleen de kant waar je naar kijkt verandert. y brengt de rechterkant naar voren, y' zet hem terug."],
      en: ["Turning the whole cube: x, y, z", "x, y and z turn the whole cube in your hand, like R, U and F. Nothing changes on the cube: only the face you are looking at changes. y brings the right face to the front, y' puts it back."],
    },
    ["y", "y'"],
  ),
  lesson(
    {
      fr: ["Repérer les faces", "Les centres ne bougent jamais : le centre blanc donne la face blanche, le centre jaune la face jaune. Pour toute la méthode, tiens ton cube centre jaune en haut. Ici on part blanc en haut et on retourne le cube."],
      nl: ["De kanten herkennen", "De middenstukken bewegen nooit: het witte middenstuk bepaalt de witte kant, het gele middenstuk de gele kant. Houd je kubus de hele methode lang met het gele middenstuk boven. Hier beginnen we met wit boven en draaien we de kubus om."],
      en: ["Finding the faces", "The centers never move: the white center gives the white face, the yellow center the yellow face. For the whole method, hold your cube yellow center on top. Here we start white on top and turn the cube over."],
    },
    ["z2"],
  ),

  demo(
    1,
    {
      fr: ["En bas, blanc dessous", "Une arête blanche est en bas, blanc vers le bas : un demi-tour de sa face la monte, blanc vers le haut. Si la place juste au-dessus est déjà un pétale, tourne d'abord le haut pour la libérer."],
      nl: ["Onderaan, wit naar beneden", "Een wit randstuk zit onderaan, met wit naar beneden: een halve slag van zijn kant brengt het naar boven, met wit naar boven. Is de plek er recht boven al een blaadje, draai dan eerst de bovenkant om die vrij te maken."],
      en: ["Bottom, white facing down", "A white edge is at the bottom, white facing down: a half turn of its face brings it up, white facing up. If the spot right above is already a petal, turn the top first to free it."],
    },
    ["F2"],
    play(YELLOW_UP, ["F2"]),
    WHITE_GREEN,
  ),
  demo(
    1,
    {
      fr: ["Au milieu", "Une arête blanche est dans la couronne du milieu : tourne d'un quart la face de son autre couleur (ici l'avant), dans le sens qui amène le blanc en haut. Libère d'abord la place du haut où elle arrive."],
      nl: ["In het midden", "Een wit randstuk zit in de middelste laag: draai de kant van zijn andere kleur (hier de voorkant) een kwartslag, in de richting die het wit naar boven brengt. Maak eerst de plek bovenaan vrij waar het terechtkomt."],
      en: ["In the middle", "A white edge is in the middle layer: give the face of its other color (here the front) a quarter turn, in the direction that brings the white up. First free the top spot it lands in."],
    },
    ["F'"],
    play(YELLOW_UP, ["F2"]),
    WHITE_GREEN,
  ),
  demo(
    1,
    {
      fr: ["En haut, blanc sur le côté", "Une arête blanche est en haut mais son blanc regarde sur le côté : descends-la au milieu (F), tourne le haut pour ne pas déloger un pétale (U'), puis remonte-la par le côté (R), blanc vers le haut."],
      nl: ["Boven, wit opzij", "Een wit randstuk zit boven, maar zijn wit kijkt opzij: breng het naar het midden (F), draai de bovenkant zodat je geen blaadje wegduwt (U'), en breng het dan langs de zijkant weer naar boven (R), met wit naar boven."],
      en: ["Top, white on the side", "A white edge is on top but its white faces the side: bring it down to the middle (F), turn the top so you don't knock out a petal (U'), then bring it back up from the side (R), white facing up."],
    },
    ["F", "U'", "R"],
    PETAL_RIGHT,
    WHITE_GREEN,
  ),
  demo(
    1,
    {
      fr: ["En bas, blanc sur le côté", "Une arête blanche est en bas, blanc sur le côté : un quart de tour de sa face (F') la met au milieu, puis la face d'à côté (R) la monte, blanc vers le haut. Libère d'abord les places du haut que ces deux faces touchent."],
      nl: ["Onderaan, wit opzij", "Een wit randstuk zit onderaan, met wit opzij: een kwartslag van zijn kant (F') brengt het naar het midden, daarna brengt de kant ernaast (R) het naar boven, met wit naar boven. Maak eerst de plekken bovenaan vrij die deze twee kanten raken."],
      en: ["Bottom, white on the side", "A white edge is at the bottom, white on the side: a quarter turn of its face (F') puts it in the middle, then the face next to it (R) brings it up, white facing up. First free the top spots these two faces touch."],
    },
    ["F'", "R"],
    PETAL_RIGHT,
    WHITE_GREEN,
  ),

  demo(
    2,
    {
      fr: ["Descendre un pétale", "Tourne le haut jusqu'à ce que l'autre couleur d'un pétale soit au-dessus du centre de la même couleur (ici vert au-dessus du vert), puis fais un demi-tour de cette face : le pétale descend, blanc en bas. Recommence pour les 4 pétales."],
      nl: ["Een blaadje laten zakken", "Draai de bovenkant tot de andere kleur van een blaadje boven het middenstuk van dezelfde kleur staat (hier groen boven groen), en draai die kant dan een halve slag: het blaadje zakt, met wit onderaan. Herhaal voor alle 4 de blaadjes."],
      en: ["Bringing a petal down", "Turn the top until a petal's other color is above the center of the same color (here green above green), then give that face a half turn: the petal comes down, white at the bottom. Do it again for all 4 petals."],
    },
    ["U'", "F2"],
    YELLOW_UP,
    WHITE_GREEN,
  ),

  demo(
    3,
    {
      fr: ["Blanc à droite", "La place du coin, encadrée en vert, est en bas entre les centres de ses deux autres couleurs. Tourne le cube pour l'avoir en bas à droite devant toi, puis le haut pour amener le coin juste au-dessus. Règle : répète R U R' U' jusqu'à ce que le coin soit en place, blanc en bas. Blanc vers la droite : une fois."],
      nl: ["Wit rechts", "De plek van het hoekstuk, groen omlijnd, zit onderaan tussen de middenstukken van zijn twee andere kleuren. Draai de kubus zodat die plek rechtsonder vooraan zit, en dan de bovenkant om het hoekstuk er recht boven te brengen. Regel: herhaal R U R' U' tot het hoekstuk op zijn plek zit, met wit onderaan. Wit naar rechts: één keer."],
      en: ["White on the right", "The corner's place, outlined in green, is at the bottom between the centers of its two other colors. Turn the cube to have it at the bottom right in front of you, then the top to bring the corner right above it. Rule: repeat R U R' U' until the corner is in place, white at the bottom. White facing right: once."],
    },
    SEXY,
    YELLOW_UP,
    WHITE_GREEN_ORANGE,
  ),
  demo(
    3,
    {
      fr: ["Blanc en haut", "Même règle. Blanc vers le haut : 3 fois R U R' U'."],
      nl: ["Wit boven", "Zelfde regel. Wit naar boven: 3 keer R U R' U'."],
      en: ["White on top", "Same rule. White facing up: R U R' U' 3 times."],
    },
    times(SEXY, 3),
    YELLOW_UP,
    WHITE_GREEN_ORANGE,
  ),
  demo(
    3,
    {
      fr: ["Blanc devant", "Même règle. Blanc vers toi : 5 fois R U R' U'."],
      nl: ["Wit vooraan", "Zelfde regel. Wit naar je toe: 5 keer R U R' U'."],
      en: ["White in front", "Same rule. White facing you: R U R' U' 5 times."],
    },
    times(SEXY, 5),
    YELLOW_UP,
    WHITE_GREEN_ORANGE,
  ),
  demo(
    3,
    {
      fr: ["Coin en bas mal tourné", "Le coin est à sa place mais mal tourné : la même règle le répare (2 ou 4 fois). S'il est coincé dans une autre place du bas, mets cette place en bas à droite devant toi et fais une fois R U R' U' : il remonte, et tu reprends un des cas précédents."],
      nl: ["Hoekstuk onderaan verkeerd gedraaid", "Het hoekstuk zit op zijn plek maar is verkeerd gedraaid: dezelfde regel herstelt het (2 of 4 keer). Zit het vast op een andere plek onderaan, zet die plek dan rechtsonder vooraan en doe één keer R U R' U': het komt naar boven, en je gaat verder met een van de vorige gevallen."],
      en: ["Bottom corner twisted", "The corner is in its place but twisted: the same rule fixes it (2 or 4 times). If it is stuck in another bottom spot, put that spot at the bottom right in front of you and do R U R' U' once: it comes up, and you go on with one of the previous cases."],
    },
    times(SEXY, 2),
    YELLOW_UP,
    WHITE_GREEN_ORANGE,
  ),

  demo(
    4,
    {
      fr: ["Vers la droite", "Prends une arête du haut sans jaune. Tourne le cube et le haut pour que sa couleur de devant soit au-dessus du centre de la même couleur (ici vert contre vert). Sa place est encadrée en vert. Sa couleur du dessus est celle de droite (ici orange) : U R U' R' U' F' U F."],
      nl: ["Naar rechts", "Neem een randstuk bovenaan zonder geel. Draai de kubus en de bovenkant zodat zijn voorkleur boven het middenstuk van dezelfde kleur staat (hier groen bij groen). Zijn plek is groen omlijnd. Zijn kleur bovenop is die van rechts (hier oranje): U R U' R' U' F' U F."],
      en: ["To the right", "Take a top edge without yellow. Turn the cube and the top so its front color is above the center of the same color (here green on green). Its place is outlined in green. Its top color is the one on the right (here orange): U R U' R' U' F' U F."],
    },
    RIGHT,
    YELLOW_UP,
    GREEN_ORANGE,
  ),
  demo(
    4,
    {
      fr: ["Vers la gauche", "Même chose quand la couleur du dessus est celle de gauche (ici rouge) : U' L' U L U F U' F'."],
      nl: ["Naar links", "Hetzelfde als de kleur bovenop die van links is (hier rood): U' L' U L U F U' F'."],
      en: ["To the left", "Same thing when the top color is the one on the left (here red): U' L' U L U F U' F'."],
    },
    LEFT,
    YELLOW_UP,
    GREEN_RED,
  ),
  demo(
    4,
    {
      fr: ["Arête coincée au milieu", "Une arête du milieu est à sa place mais à l'envers, ou à la place d'une autre : mets-la à droite devant toi et fais une fois l'algorithme de droite. Elle remonte en haut, et c'est un des deux cas précédents."],
      nl: ["Randstuk vast in het midden", "Een randstuk in het midden zit op zijn plek maar omgekeerd, of op de plek van een ander: zet het rechts vooraan en doe één keer het algoritme naar rechts. Het komt weer boven, en dan is het een van de twee vorige gevallen."],
      en: ["Edge stuck in the middle", "A middle edge is in its place but flipped, or in another edge's place: put it at the front right and do the right-hand algorithm once. It comes back up, and it is one of the two previous cases."],
    },
    RIGHT,
    play(EDGE_FLIPPED_IN_SLOT, RIGHT),
    GREEN_ORANGE,
  ),

  demo(
    5,
    {
      fr: ["Le point", "Aucune arête jaune en haut, seulement le centre : F R U R' U' F' une fois, de n'importe quel côté. Tu obtiens un L."],
      nl: ["De stip", "Geen enkel geel randstuk boven, alleen het middenstuk: één keer F R U R' U' F', vanaf eender welke kant. Je krijgt een L."],
      en: ["The dot", "No yellow edge on top, only the center: F R U R' U' F' once, from any side. You get an L."],
    },
    FLIP,
    play(YELLOW_UP, [...undo(FLIP), "U", ...undo(FLIP)]),
  ),
  demo(
    5,
    {
      fr: ["Le L", "Deux arêtes jaunes voisines forment un L : tiens-le derrière et à gauche, puis F R U R' U' F'. Tu obtiens une ligne."],
      nl: ["De L", "Twee naburige gele randstukken vormen een L: houd hem achteraan links, dan F R U R' U' F'. Je krijgt een lijn."],
      en: ["The L", "Two neighboring yellow edges form an L: hold it at the back left, then F R U R' U' F'. You get a line."],
    },
    FLIP,
    play(YELLOW_UP, undo(FLIP)),
  ),
  demo(
    5,
    {
      fr: ["La ligne", "Deux arêtes jaunes en face forment une ligne : tiens-la à l'horizontale, puis F R U R' U' F'. La croix jaune est faite."],
      nl: ["De lijn", "Twee tegenover elkaar liggende gele randstukken vormen een lijn: houd hem horizontaal, dan F R U R' U' F'. Het gele kruis is klaar."],
      en: ["The line", "Two opposite yellow edges form a line: hold it horizontal, then F R U R' U' F'. The yellow cross is done."],
    },
    FLIP,
  ),

  demo(
    6,
    {
      fr: ["Deux voisines bonnes", "Tourne le haut pour aligner le plus d'arêtes possible avec leurs centres. Si deux arêtes voisines sont bonnes, tiens-les derrière et à droite, puis R U R' U R U2 R' U."],
      nl: ["Twee buren goed", "Draai de bovenkant zodat zoveel mogelijk randstukken op één lijn staan met hun middenstukken. Staan twee naburige randstukken goed, houd ze dan achteraan en rechts, en doe R U R' U R U2 R' U."],
      en: ["Two neighbors right", "Turn the top to line up as many edges as you can with their centers. If two neighboring edges are right, hold them at the back and on the right, then R U R' U R U2 R' U."],
    },
    SUNE,
  ),
  demo(
    6,
    {
      fr: ["Deux en face", "Si les deux arêtes bonnes sont face à face : fais R U R' U R U2 R' U une fois, de n'importe quel côté. Tourne le haut : tu retombes sur deux voisines."],
      nl: ["Twee tegenover elkaar", "Staan de twee goede randstukken tegenover elkaar: doe één keer R U R' U R U2 R' U, vanaf eender welke kant. Draai de bovenkant: je komt uit bij twee buren."],
      en: ["Two opposite", "If the two right edges are opposite each other: do R U R' U R U2 R' U once, from any side. Turn the top: you are back to two neighbors."],
    },
    SUNE,
    OPPOSITE_DONE,
  ),

  demo(
    7,
    {
      fr: ["Un coin bien placé", "Un coin est bien placé quand ses 3 couleurs sont celles des 3 faces autour, même s'il est mal tourné. Tiens un coin bien placé en haut à droite devant toi, puis U R U' L' U R' U' L. Répète jusqu'à ce que les 4 soient placés."],
      nl: ["Eén hoekstuk goed", "Een hoekstuk staat goed als zijn 3 kleuren die van de 3 kanten eromheen zijn, ook als het verkeerd gedraaid is. Houd een goed geplaatst hoekstuk rechtsboven vooraan, dan U R U' L' U R' U' L. Herhaal tot ze alle 4 goed staan."],
      en: ["One corner placed", "A corner is placed when its 3 colors are those of the 3 faces around it, even if it is twisted. Hold a placed corner at the top right front, then U R U' L' U R' U' L. Repeat until all 4 are placed."],
    },
    CYCLE,
  ),
  demo(
    7,
    {
      fr: ["Aucun coin bien placé", "Aucun coin n'est à sa place : fais U R U' L' U R' U' L une fois, de n'importe où. Un coin se place, et c'est le cas précédent."],
      nl: ["Geen hoekstuk goed", "Geen enkel hoekstuk staat op zijn plek: doe één keer U R U' L' U R' U' L, vanaf eender waar. Eén hoekstuk valt op zijn plek, en dan is het het vorige geval."],
      en: ["No corner placed", "No corner is in its place: do U R U' L' U R' U' L once, from anywhere. One corner falls into place, and it is the previous case."],
    },
    CYCLE,
    ONE_CORNER_PLACED,
  ),

  demo(
    8,
    {
      fr: ["Tourner les coins", "Le coin à tourner en haut à droite devant toi : R' D' R D jusqu'à ce que son jaune soit en haut (2 ou 4 fois). Tourne ensuite seulement le haut pour amener le coin suivant au même endroit, et recommence. Le bas se mélange en route puis se répare tout seul : ne tourne jamais tout le cube."],
      nl: ["De hoekstukken draaien", "Het hoekstuk dat je moet draaien rechtsboven vooraan: R' D' R D tot zijn geel boven zit (2 of 4 keer). Draai daarna alleen de bovenkant om het volgende hoekstuk naar dezelfde plek te brengen, en begin opnieuw. De onderkant raakt onderweg door elkaar en herstelt zich daarna vanzelf: draai nooit de hele kubus."],
      en: ["Twisting the corners", "The corner to twist at the top right front: R' D' R D until its yellow is on top (2 or 4 times). Then turn only the top to bring the next corner to the same spot, and start again. The bottom gets scrambled along the way, then fixes itself: never turn the whole cube."],
    },
    [...times(TWIST, 2), "U", ...times(TWIST, 4), "U'"],
  ),
];
