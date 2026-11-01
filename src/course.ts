import { algOf, CYCLE, FLIP, LEFT, play, RIGHT, SEXY, SUNE, times, TWIST, YELLOW_UP, type Group } from "./beginner.ts";
import { invert as undo, SOLVED } from "./cube.ts";
import { tr, type Lang } from "./i18n.ts";

// The beginner method as a course, for a cube the app has not seen: each case
// of each stage is a demo cube that shows the situation, the moves that solve
// it, and how to recognise it on your own cube. Every demo start is built
// backwards: a finished position with the moves undone, so playing them is
// exactly the case. Demos hold yellow up, green in front, like the method.

/** A title, where things stand, then what to do: one text per part of the moves. */
type Texts = Record<Lang, [title: string, text: string, ...steps: string[]]>;

/** The case's steps, each with its share of `moves`: given by `split`, else the setup then the named sequence. */
function group(stage: number, texts: Texts, moves: string[], from: string, piece?: string, split?: number[]): Group {
  const [title, text, ...steps] = tr(texts);
  const alg = algOf(moves);
  const counts = split ?? (steps.length === 1 ? [moves.length] : [alg!.setup, moves.length - alg!.setup]);
  return { stage, title, text, moves, steps: steps.map((text, i) => ({ text, count: counts[i] })), from, piece, alg };
}

/** A case: `goal` is where its moves lead, its start is `goal` with the moves undone. */
const demo = (stage: number, texts: Texts, moves: string[], goal = YELLOW_UP, piece?: string, split?: number[]) =>
  group(stage, texts, moves, play(goal, undo(moves)), piece, split);
const lesson = (texts: Texts, moves: string[]) => group(0, texts, moves, SOLVED);

// Pieces by color letters (white U, yellow D, green F, blue B, red R, orange L).
const WHITE_GREEN = "FU";
const WHITE_GREEN_ORANGE = "FLU";
const GREEN_ORANGE = "FL";
const GREEN_RED = "FR";
const PETAL_RIGHT = play(YELLOW_UP, ["F2", "U'"]); // white-green edge on top at the right, white up
const ONE_CORNER_PLACED = play(YELLOW_UP, ["y", ...undo(CYCLE), "y'"]);
const EDGE_FLIPPED_IN_SLOT = play(YELLOW_UP, [...RIGHT, "U2", ...RIGHT]); // green-orange in its slot, upside down
const OPPOSITE_DONE = play(YELLOW_UP, ["y", ...undo(SUNE), "y'", "U'"]);

export const COURSE: Group[] = [
  lesson(
    {
      fr: ["Les lettres", "Chaque coup s'écrit avec l'initiale anglaise d'une face : R droite (Right), L gauche (Left), U haut (Up), D bas (Down), F avant (Front), B arrière (Back). Une lettre seule, c'est un quart de tour dans le sens des aiguilles d'une montre, comme si tu regardais cette face en face.", "Regarde les six, dans l'ordre."],
      nl: ["De letters", "Elke zet schrijf je met de Engelse beginletter van een kant: R rechts (Right), L links (Left), U boven (Up), D onder (Down), F voor (Front), B achter (Back). Een letter alleen is een kwartslag met de klok mee, alsof je recht naar die kant kijkt.", "Bekijk ze alle zes, in volgorde."],
      en: ["The letters", "Each move is written with the initial of a face: R right, L left, U up, D down, F front, B back. A letter on its own is a quarter turn clockwise, as if you were looking straight at that face.", "Watch all six, in order."],
    },
    ["R", "L", "U", "D", "F", "B"],
  ),
  lesson(
    {
      fr: ["Le prime : '", "Une apostrophe (« prime ») tourne la même face dans l'autre sens.", "Regarde R, puis R' qui le défait."],
      nl: ["De prime: '", "Een apostrof („prime”) draait dezelfde kant in de omgekeerde richting.", "Kijk naar R, en dan naar R' die hem ongedaan maakt."],
      en: ["The prime: '", "An apostrophe (“prime”) turns the same face the other way.", "Watch R, then R' undoing it."],
    },
    ["R", "R'"],
  ),
  lesson(
    {
      fr: ["Le 2", "Un 2 fait un demi-tour de la face, dans un sens ou dans l'autre.", "U2, c'est U deux fois."],
      nl: ["De 2", "Een 2 draait de kant een halve slag, in de ene of de andere richting.", "U2 is twee keer U."],
      en: ["The 2", "A 2 gives the face a half turn, either way.", "U2 is U twice."],
    },
    ["U2"],
  ),
  lesson(
    {
      fr: ["Tourner tout le cube : x, y, z", "x, y et z tournent tout le cube dans ta main, comme R, U et F. Rien ne change sur le cube : seule la face que tu regardes change.", "y amène la face droite devant toi, y' la remet."],
      nl: ["De hele kubus draaien: x, y, z", "x, y en z draaien de hele kubus in je hand, zoals R, U en F. Er verandert niets aan de kubus: alleen de kant waar je naar kijkt verandert.", "y brengt de rechterkant naar voren, y' zet hem terug."],
      en: ["Turning the whole cube: x, y, z", "x, y and z turn the whole cube in your hand, like R, U and F. Nothing changes on the cube: only the face you are looking at changes.", "y brings the right face to the front, y' puts it back."],
    },
    ["y", "y'"],
  ),
  lesson(
    {
      fr: ["Repérer les faces", "Les centres ne bougent jamais : le centre blanc donne la face blanche, le centre jaune la face jaune. Pour toute la méthode, tiens ton cube centre jaune en haut.", "Ici on part blanc en haut et on retourne le cube."],
      nl: ["De kanten herkennen", "De middenstukken bewegen nooit: het witte middenstuk bepaalt de witte kant, het gele middenstuk de gele kant. Houd je kubus de hele methode lang met het gele middenstuk boven.", "Hier beginnen we met wit boven en draaien we de kubus om."],
      en: ["Finding the faces", "The centers never move: the white center gives the white face, the yellow center the yellow face. For the whole method, hold your cube with the yellow center on top.", "Here we start white on top and turn the cube over."],
    },
    ["z2"],
  ),

  demo(
    1,
    {
      fr: ["En bas, blanc dessous", "Une arête blanche est en bas, son blanc vers le bas.", "Fais un demi-tour de sa face : elle monte, blanc vers le haut. Si la place juste au-dessus est déjà un pétale, tourne d'abord le haut pour la libérer."],
      nl: ["Onderaan, wit naar beneden", "Een wit randstuk zit onderaan, met zijn wit naar beneden.", "Draai zijn kant een halve slag: het gaat naar boven, met wit naar boven. Is de plek er recht boven al een blaadje, draai dan eerst de bovenkant om die vrij te maken."],
      en: ["Bottom, white facing down", "A white edge is at the bottom, its white facing down.", "Give its face a half turn: it goes up, white facing up. If the spot right above is already a petal, turn the top first to free it."],
    },
    ["F2"],
    play(YELLOW_UP, ["F2"]),
    WHITE_GREEN,
  ),
  demo(
    1,
    {
      fr: ["Au milieu", "Une arête blanche est dans la couronne du milieu.", "Tourne d'un quart la face de son autre couleur (ici l'avant), dans le sens qui amène le blanc en haut. Libère d'abord la place du haut où elle arrive."],
      nl: ["In het midden", "Een wit randstuk zit in de middelste laag.", "Draai de kant van zijn andere kleur (hier de voorkant) een kwartslag, in de richting die het wit naar boven brengt. Maak eerst de plek bovenaan vrij waar het terechtkomt."],
      en: ["In the middle", "A white edge is in the middle layer.", "Give the face of its other color (here the front) a quarter turn, the way that brings the white up. First free the top spot it lands in."],
    },
    ["F'"],
    play(YELLOW_UP, ["F2"]),
    WHITE_GREEN,
  ),
  demo(
    1,
    {
      fr: ["En haut, blanc sur le côté", "Une arête blanche est en haut, mais son blanc regarde sur le côté.", "Descends-la au milieu.", "Tourne le haut pour mettre les pétales à l'abri.", "Remonte-la par le côté, blanc vers le haut."],
      nl: ["Boven, wit opzij", "Een wit randstuk zit boven, maar zijn wit kijkt opzij.", "Breng het naar het midden.", "Draai de bovenkant zodat de blaadjes veilig zijn.", "Breng het langs de zijkant weer naar boven, met wit naar boven."],
      en: ["Top, white on the side", "A white edge is on top, but its white faces the side.", "Bring it down to the middle.", "Turn the top to keep the petals safe.", "Bring it back up from the side, white facing up."],
    },
    ["F", "U'", "R"],
    PETAL_RIGHT,
    WHITE_GREEN,
    [1, 1, 1],
  ),
  demo(
    1,
    {
      fr: ["En bas, blanc sur le côté", "Une arête blanche est en bas, son blanc sur le côté.", "Un quart de tour de sa face la met au milieu.", "La face d'à côté la monte, blanc vers le haut."],
      nl: ["Onderaan, wit opzij", "Een wit randstuk zit onderaan, met zijn wit opzij.", "Een kwartslag van zijn kant brengt het naar het midden.", "De kant ernaast brengt het naar boven, met wit naar boven."],
      en: ["Bottom, white on the side", "A white edge is at the bottom, its white on the side.", "A quarter turn of its face puts it in the middle.", "The face next to it brings it up, white facing up."],
    },
    ["F'", "R"],
    PETAL_RIGHT,
    WHITE_GREEN,
    [1, 1],
  ),

  demo(
    2,
    {
      fr: ["Descendre un pétale", "Un pétale attend sur le dessus : il doit descendre sous le centre de son autre couleur (ici le vert).", "Tourne le haut jusqu'à ce que le vert du pétale soit juste au-dessus du centre vert.", "Fais un demi-tour de cette face : le pétale descend, blanc en bas. Recommence pour les 4 pétales."],
      nl: ["Een blaadje laten zakken", "Een blaadje wacht bovenaan: het moet zakken onder het middenstuk van zijn andere kleur (hier groen).", "Draai de bovenkant tot het groen van het blaadje recht boven het groene middenstuk staat.", "Draai die kant een halve slag: het blaadje zakt, met wit onderaan. Herhaal voor alle 4 de blaadjes."],
      en: ["Bringing a petal down", "A petal waits on top: it has to drop under the center of its other color (here green).", "Turn the top until the petal's green sits right above the green center.", "Give that face a half turn: the petal drops, white at the bottom. Do it again for all 4 petals."],
    },
    ["U'", "F2"],
    YELLOW_UP,
    WHITE_GREEN,
    [1, 1],
  ),

  demo(
    3,
    {
      fr: ["Blanc à droite", "Le coin est en haut, juste au-dessus de sa place (en bas à droite devant toi), son blanc vers la droite. Sur ton cube, tourne le cube puis le haut pour arriver là.", "Répète le sexy move jusqu'à ce que le coin soit à sa place, blanc en bas. Blanc vers la droite : une fois."],
      nl: ["Wit rechts", "Het hoekstuk zit boven, recht boven zijn plek (rechtsonder vooraan), met zijn wit naar rechts. Draai op je eigen kubus eerst de kubus en dan de bovenkant om daar te komen.", "Herhaal de sexy move tot het hoekstuk op zijn plek zit, met wit onderaan. Wit naar rechts: één keer."],
      en: ["White on the right", "The corner is on top, right above its place (bottom right in front of you), its white facing right. On your cube, turn the cube and then the top to get there.", "Repeat the sexy move until the corner sits in its place, white at the bottom. White facing right: once."],
    },
    SEXY,
    YELLOW_UP,
    WHITE_GREEN_ORANGE,
  ),
  demo(
    3,
    {
      fr: ["Blanc en haut", "Même position, mais le blanc du coin regarde vers le haut.", "Même règle : le sexy move 3 fois."],
      nl: ["Wit boven", "Zelfde positie, maar het wit van het hoekstuk kijkt naar boven.", "Zelfde regel: 3 keer de sexy move."],
      en: ["White on top", "Same position, but the corner's white faces up.", "Same rule: the sexy move 3 times."],
    },
    times(SEXY, 3),
    YELLOW_UP,
    WHITE_GREEN_ORANGE,
  ),
  demo(
    3,
    {
      fr: ["Blanc devant", "Même position, le blanc du coin vers toi.", "Même règle : le sexy move 5 fois."],
      nl: ["Wit vooraan", "Zelfde positie, met het wit van het hoekstuk naar je toe.", "Zelfde regel: 5 keer de sexy move."],
      en: ["White in front", "Same position, the corner's white facing you.", "Same rule: the sexy move 5 times."],
    },
    times(SEXY, 5),
    YELLOW_UP,
    WHITE_GREEN_ORANGE,
  ),
  demo(
    3,
    {
      fr: ["Coin en bas mal tourné", "Le coin est déjà à sa place, mais mal tourné.", "La même règle le répare : le sexy move 2 ou 4 fois. S'il est coincé à une autre place du bas, mets cette place en bas à droite devant toi et fais une fois le sexy move : il remonte, et tu reprends un des cas précédents."],
      nl: ["Hoekstuk onderaan verkeerd gedraaid", "Het hoekstuk zit al op zijn plek, maar verkeerd gedraaid.", "Dezelfde regel herstelt het: 2 of 4 keer de sexy move. Zit het vast op een andere plek onderaan, zet die plek dan rechtsonder vooraan en doe één keer de sexy move: het komt naar boven, en je gaat verder met een van de vorige gevallen."],
      en: ["Bottom corner twisted", "The corner is already in its place, but twisted.", "The same rule fixes it: the sexy move 2 or 4 times. If it is stuck in another bottom spot, put that spot at the bottom right in front of you and do the sexy move once: it comes up, and you go on with one of the previous cases."],
    },
    times(SEXY, 2),
    YELLOW_UP,
    WHITE_GREEN_ORANGE,
  ),

  demo(
    4,
    {
      fr: ["Vers la droite", "Une arête du haut sans jaune : son vert est au-dessus du centre vert, son orange regarde vers le haut, et le centre orange est à droite. Sur ton cube, tourne le cube et le haut pour arriver là.", "Fais l'insertion à droite : l'arête glisse à sa place, entre le vert et l'orange."],
      nl: ["Naar rechts", "Een randstuk bovenaan zonder geel: zijn groen staat boven het groene middenstuk, zijn oranje kijkt naar boven, en het oranje middenstuk zit rechts. Draai op je eigen kubus de kubus en de bovenkant om daar te komen.", "Doe het invoegen naar rechts: het randstuk schuift op zijn plek, tussen groen en oranje."],
      en: ["To the right", "A top edge without yellow: its green is above the green center, its orange faces up, and the orange center is on the right. On your cube, turn the cube and the top to get there.", "Do the right insert: the edge slides into its place, between green and orange."],
    },
    RIGHT,
    YELLOW_UP,
    GREEN_ORANGE,
  ),
  demo(
    4,
    {
      fr: ["Vers la gauche", "Même chose, mais sa couleur du dessus (rouge) est celle du centre de gauche.", "Fais l'insertion à gauche : l'arête glisse à sa place, entre le vert et le rouge."],
      nl: ["Naar links", "Hetzelfde, maar zijn kleur bovenop (rood) is die van het linker middenstuk.", "Doe het invoegen naar links: het randstuk schuift op zijn plek, tussen groen en rood."],
      en: ["To the left", "Same thing, but its top color (red) is the left center's.", "Do the left insert: the edge slides into its place, between green and red."],
    },
    LEFT,
    YELLOW_UP,
    GREEN_RED,
  ),
  demo(
    4,
    {
      fr: ["Arête coincée au milieu", "Une arête du milieu est coincée : à sa place mais à l'envers, ou à la place d'une autre.", "Mets-la à droite devant toi et fais une fois l'insertion à droite : elle remonte en haut, et c'est un des deux cas précédents."],
      nl: ["Randstuk vast in het midden", "Een randstuk in het midden zit vast: op zijn plek maar omgekeerd, of op de plek van een ander.", "Zet het rechts vooraan en doe één keer het invoegen naar rechts: het komt weer boven, en dan is het een van de twee vorige gevallen."],
      en: ["Edge stuck in the middle", "A middle edge is stuck: in its place but flipped, or in another edge's place.", "Put it at the front right and do the right insert once: it comes back up, and it is one of the two previous cases."],
    },
    RIGHT,
    play(EDGE_FLIPPED_IN_SLOT, RIGHT),
    GREEN_ORANGE,
  ),

  demo(
    5,
    {
      fr: ["Le point", "Aucune arête jaune sur le dessus, seulement le centre.", "Fais F, le sexy move, puis F', de n'importe quel côté : tu obtiens un L."],
      nl: ["De stip", "Geen enkel geel randstuk bovenop, alleen het middenstuk.", "Doe F, de sexy move, en dan F', vanaf eender welke kant: je krijgt een L."],
      en: ["The dot", "No yellow edge on top, only the center.", "Do F, the sexy move, then F', from any side: you get an L."],
    },
    FLIP,
    play(YELLOW_UP, [...undo(FLIP), "U", ...undo(FLIP)]),
  ),
  demo(
    5,
    {
      fr: ["Le L", "Deux arêtes jaunes voisines forment un L, tenu derrière et à gauche.", "Fais F, le sexy move, puis F' : tu obtiens une ligne."],
      nl: ["De L", "Twee naburige gele randstukken vormen een L, achteraan links.", "Doe F, de sexy move, en dan F': je krijgt een lijn."],
      en: ["The L", "Two neighboring yellow edges form an L, held at the back left.", "Do F, the sexy move, then F': you get a line."],
    },
    FLIP,
    play(YELLOW_UP, undo(FLIP)),
  ),
  demo(
    5,
    {
      fr: ["La ligne", "Deux arêtes jaunes face à face forment une ligne, tenue à l'horizontale.", "Fais F, le sexy move, puis F' : la croix jaune est faite."],
      nl: ["De lijn", "Twee gele randstukken tegenover elkaar vormen een lijn, horizontaal.", "Doe F, de sexy move, en dan F': het gele kruis is klaar."],
      en: ["The line", "Two opposite yellow edges form a line, held horizontal.", "Do F, the sexy move, then F': the yellow cross is done."],
    },
    FLIP,
  ),

  demo(
    6,
    {
      fr: ["Deux voisines bonnes", "Après un tour du haut, deux arêtes voisines sont au-dessus du centre de leur couleur, tenues derrière et à droite.", "Fais le Sune : les deux autres arêtes se mettent en place."],
      nl: ["Twee buren goed", "Na een draai van de bovenkant staan twee naburige randstukken boven het middenstuk van hun kleur, achteraan en rechts.", "Doe de Sune: de twee andere randstukken vallen op hun plek."],
      en: ["Two neighbors right", "After a turn of the top, two neighboring edges sit above the center of their color, held at the back and on the right.", "Do the Sune: the other two edges fall into place."],
    },
    SUNE,
  ),
  demo(
    6,
    {
      fr: ["Deux en face", "Les deux arêtes bonnes sont face à face.", "Fais le Sune une fois, de n'importe quel côté, puis tourne le haut : tu retombes sur deux voisines."],
      nl: ["Twee tegenover elkaar", "De twee goede randstukken staan tegenover elkaar.", "Doe één keer de Sune, vanaf eender welke kant, en draai dan de bovenkant: je komt uit bij twee buren."],
      en: ["Two opposite", "The two right edges are opposite each other.", "Do the Sune once, from any side, then turn the top: you are back to two neighbors."],
    },
    SUNE,
    OPPOSITE_DONE,
  ),

  demo(
    7,
    {
      fr: ["Un coin bien placé", "Un coin est bien placé quand ses 3 couleurs sont celles des 3 faces autour, même s'il est mal tourné. Ici, celui en haut à droite devant toi.", "Fais le Niklas : les trois autres coins tournent autour de lui. Recommence jusqu'à ce que les 4 soient placés."],
      nl: ["Eén hoekstuk goed", "Een hoekstuk staat goed als zijn 3 kleuren die van de 3 kanten eromheen zijn, ook als het verkeerd gedraaid is. Hier het hoekstuk rechtsboven vooraan.", "Doe de Niklas: de drie andere hoekstukken draaien eromheen. Herhaal tot ze alle 4 goed staan."],
      en: ["One corner placed", "A corner is placed when its 3 colors are those of the 3 faces around it, even if it is twisted. Here, the top right front one.", "Do the Niklas: the other three corners cycle around it. Repeat until all 4 are placed."],
    },
    CYCLE,
  ),
  demo(
    7,
    {
      fr: ["Aucun coin bien placé", "Aucun coin du haut n'est à sa place.", "Fais le Niklas une fois, de n'importe où : un coin se place, et c'est le cas précédent."],
      nl: ["Geen hoekstuk goed", "Geen enkel hoekstuk bovenaan staat op zijn plek.", "Doe één keer de Niklas, vanaf eender waar: één hoekstuk valt op zijn plek, en dan is het het vorige geval."],
      en: ["No corner placed", "No top corner is in its place.", "Do the Niklas once, from anywhere: one corner falls into place, and it is the previous case."],
    },
    CYCLE,
    ONE_CORNER_PLACED,
  ),

  demo(
    8,
    {
      fr: ["Tourner les coins", "Le coin en haut à droite devant toi n'a pas son jaune en haut. Ne tourne jamais tout le cube pendant cette étape.", "Répète R' D' R D jusqu'à ce que son jaune soit en haut : ici 2 fois. Le bas se mélange, c'est normal.", "Tourne seulement le haut pour amener le coin suivant au même endroit.", "Recommence R' D' R D : ici 4 fois. Le bas se répare tout seul.", "Tourne le haut une dernière fois : le cube est résolu."],
      nl: ["De hoekstukken draaien", "Het hoekstuk rechtsboven vooraan heeft zijn geel niet boven. Draai tijdens deze stap nooit de hele kubus.", "Herhaal R' D' R D tot zijn geel boven zit: hier 2 keer. De onderkant raakt door elkaar, dat is normaal.", "Draai alleen de bovenkant om het volgende hoekstuk naar dezelfde plek te brengen.", "Opnieuw R' D' R D: hier 4 keer. De onderkant herstelt zich vanzelf.", "Draai de bovenkant nog een laatste keer: de kubus is opgelost."],
      en: ["Twisting the corners", "The top right front corner doesn't have its yellow on top. Never turn the whole cube during this step.", "Repeat R' D' R D until its yellow is on top: here 2 times. The bottom gets scrambled, that's normal.", "Turn only the top to bring the next corner to the same spot.", "R' D' R D again: here 4 times. The bottom fixes itself.", "Turn the top one last time: the cube is solved."],
    },
    [...times(TWIST, 2), "U", ...times(TWIST, 4), "U'"],
    YELLOW_UP,
    undefined,
    [8, 1, 16, 1],
  ),
];
