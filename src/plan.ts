import { play, YELLOW_UP } from "./beginner.ts";
import { COURSE } from "./course.ts";
import { STICKERS, type Vec } from "./cube.ts";
import { tr } from "./i18n.ts";

// The beginner method as a map, for any cube: for each stage, where you stand, what you look for, what you
// do and why it breaks nothing. Each stage shows the cube before and after it, held yellow up, with what is
// not done yet greyed out: whatever those stickers are, the stage works the same.

/** The cube with only the stickers `keep` picks, the others blank ("."). */
const mask = (s: string, keep: (pos: Vec, normal: Vec) => boolean) => STICKERS.map(({ pos, normal }, i) => (keep(pos, normal) ? s[i] : ".")).join("");
const kind = (pos: Vec) => pos.filter(Boolean).length; // 1 center, 2 edge, 3 corner
const isCenter = (pos: Vec) => kind(pos) === 1;
const topEdgeUp = (pos: Vec, normal: Vec) => pos[1] === 1 && kind(pos) === 2 && normal[1] === 1;
const lowLayers = (pos: Vec) => pos[1] <= 0 || isCenter(pos);

/** The cube at the end of each stage, 0 being the start: only the centers matter on a scrambled cube. */
export const MILESTONES: string[] = [
  mask(YELLOW_UP, isCenter),
  mask(play(YELLOW_UP, ["F2", "R2", "B2", "L2"]), (p, n) => isCenter(p) || topEdgeUp(p, n)),
  mask(YELLOW_UP, (p) => isCenter(p) || (p[1] === -1 && kind(p) === 2)),
  mask(YELLOW_UP, (p) => isCenter(p) || p[1] === -1),
  mask(YELLOW_UP, lowLayers),
  mask(YELLOW_UP, (p, n) => lowLayers(p) || topEdgeUp(p, n)),
  mask(YELLOW_UP, (p) => lowLayers(p) || kind(p) === 2),
  COURSE.find((g) => g.stage === 8)!.from!, // every corner placed, twisted
  YELLOW_UP,
];
/** The course's demos of each stage, its cases. */
export const CASES = MILESTONES.map((_, i) => COURSE.filter((g) => g.stage === i));
/** The milestones whose work sits at the bottom, seen from below. */
export const SEEN_FROM_BELOW = [2, 3];

/** The top of the cube, back row first, at each shape the yellow cross stage meets. */
export const TOPS: Record<number, (string | undefined)[]> = { 5: ["....D....", ".D.DD....", "...DDD...", ".D.DDD.D."] };

/** A scrambled cube, where nothing is done yet: the start of the "where am I?" list. */
export const SCRAMBLED = play(YELLOW_UP, "R U F' L2 D B' R2 U'".split(" "));

/** What the cube looks like at each milestone but the last, said the way you'd see it on yours: it follows
 * « Ton cube : ». */
/** Each milestone's name: what a stage starts from, and what it reaches. */
export const MILESTONE_NAMES: string[] = tr({
  fr: ["Un cube mélangé", "La marguerite", "La croix blanche", "Les coins blancs", "La deuxième couronne", "La croix jaune", "Les arêtes jaunes", "Les coins jaunes placés", "Le cube résolu"],
  nl: ["Een gemengde kubus", "Het madeliefje", "Het witte kruis", "De witte hoeken", "De tweede laag", "Het gele kruis", "De gele randstukken", "De geplaatste gele hoeken", "De opgeloste kubus"],
  en: ["A scrambled cube", "The daisy", "The white cross", "The white corners", "The second layer", "The yellow cross", "The yellow edges", "The yellow corners in place", "The solved cube"],
});

export const SEEN: string[] = tr({
  fr: [
    "mélangé, rien n'est encore en place.",
    "une marguerite, 4 pétales blancs autour du centre jaune.",
    "une croix blanche en bas, chaque branche sous le centre de sa couleur.",
    "toute la face du dessous blanche, la première couronne finie.",
    "les deux couronnes du bas finies.",
    "une croix jaune sur le dessus.",
    "la croix jaune, chaque arête au-dessus du centre de sa couleur.",
    "chaque coin du haut à sa place, mais certains mal tournés.",
  ],
  nl: [
    "gemengd, nog niets zit op zijn plek.",
    "een madeliefje, 4 witte blaadjes rond het gele middenstuk.",
    "een wit kruis onderaan, elke arm onder het middenstuk van zijn kleur.",
    "de hele onderkant wit, de eerste laag klaar.",
    "de twee onderste lagen klaar.",
    "een geel kruis bovenop.",
    "het gele kruis, elk randstuk boven het middenstuk van zijn kleur.",
    "elk hoekstuk bovenaan op zijn plek, maar sommige verkeerd gedraaid.",
  ],
  en: [
    "scrambled, nothing in place yet.",
    "a daisy, 4 white petals around the yellow center.",
    "a white cross at the bottom, each arm under the center of its color.",
    "the whole bottom face white, the first layer done.",
    "the two bottom layers done.",
    "a yellow cross on top.",
    "the yellow cross, each edge above the center of its color.",
    "every top corner in its place, but some twisted.",
  ],
});

/** `done`: when the stage is done, going on from « C'est fini quand… ». */
export type PlanStage = { look: string; how: string[]; why: string; done: string };

/** Before the stages: the idea of the method, in a few headed paragraphs. */
export const PRINCIPLES: [heading: string, text: string][] = tr({
  fr: [
    [
      "Une couronne à la fois",
      "On résout le cube comme on construit une maison : de bas en haut. D'abord la couronne du bas (la blanche), puis celle du milieu, enfin celle du haut (la jaune). Chaque étape ajoute un morceau sans casser ce qui est déjà fait : c'est tout le secret.",
    ],
    [
      "Pourquoi le jaune en haut ?",
      "On ne commence pas par le jaune : il est en haut parce que c'est la face qu'on finit en dernier. On commence par le blanc, en bas. Tiens toujours ton cube de la même façon, jaune en haut et blanc en bas : ce qui est fini reste en bas, ce qui reste à faire est en haut, et tu ne te perds pas.",
    ],
    [
      "Les centres ne bougent jamais",
      "Le centre de chaque face reste à sa place, quoi que tu tournes : c'est lui qui dit la couleur de la face. Une pièce verte et rouge va donc toujours entre le centre vert et le centre rouge.",
    ],
    [
      "Trois sortes de pièces",
      "Les centres ont 1 couleur, les arêtes 2 (il y en a 12), les coins 3 (il y en a 8). Chaque étape ne s'occupe que d'une sorte de pièce : tu sais toujours ce que tu cherches.",
    ],
  ],
  nl: [
    [
      "Eén laag tegelijk",
      "Je lost de kubus op zoals je een huis bouwt: van onder naar boven. Eerst de onderste laag (de witte), dan de middelste, en als laatste de bovenste (de gele). Elke stap voegt een stuk toe zonder kapot te maken wat al klaar is: dat is het hele geheim.",
    ],
    [
      "Waarom geel boven?",
      "Je begint niet met geel: geel zit boven omdat je die kant als laatste afmaakt. Je begint met wit, onderaan. Houd je kubus altijd op dezelfde manier, geel boven en wit onder: wat klaar is blijft onderaan, wat nog moet zit bovenaan, en je raakt niet de weg kwijt.",
    ],
    [
      "De middenstukken bewegen nooit",
      "Het middenstuk van elke kant blijft op zijn plek, wat je ook draait: het bepaalt de kleur van die kant. Een groen-rood stuk hoort dus altijd tussen het groene en het rode middenstuk.",
    ],
    [
      "Drie soorten stukken",
      "Middenstukken hebben 1 kleur, randstukken 2 (er zijn er 12), hoekstukken 3 (er zijn er 8). Elke stap werkt met maar één soort stuk: je weet altijd wat je zoekt.",
    ],
  ],
  en: [
    [
      "One layer at a time",
      "You solve the cube the way you build a house: from the bottom up. First the bottom layer (the white one), then the middle one, last the top one (the yellow one). Each stage adds a piece of it without breaking what is done: that's the whole secret.",
    ],
    [
      "Why yellow on top?",
      "You don't start with yellow: it's on top because it's the face you finish last. You start with white, at the bottom. Always hold your cube the same way, yellow on top and white at the bottom: what is done stays at the bottom, what is left is on top, and you never get lost.",
    ],
    [
      "The centers never move",
      "Each face's center stays put, whatever you turn: it gives the face its color. So a green and red piece always goes between the green center and the red center.",
    ],
    [
      "Three kinds of pieces",
      "Centers have 1 color, edges 2 (there are 12), corners 3 (there are 8). Each stage deals with one kind of piece only: you always know what you are looking for.",
    ],
  ],
});

/** Stages 1 to 8 of the beginner method (index 0 is unused: the principles stand in for it). */
export const PLAN: PlanStage[] = tr<PlanStage[]>({
  fr: [
    { look: "", how: [], why: "", done: "" },
    {
      look: "Les 4 arêtes qui ont du blanc : des pièces à 2 couleurs, dont une blanche (blanc-vert, blanc-rouge, blanc-bleu, blanc-orange).",
      how: [
        "Repère une arête blanche qui n'est pas encore un pétale, où qu'elle soit.",
        "Avant de la monter, tourne le haut pour mettre une place vide juste au-dessus d'elle : sinon tu ferais tomber un pétale déjà posé.",
        "Monte-la en tournant sa face, sa case blanche sur le dessus. Si son blanc regarde sur le côté, fais un détour : descends-la au milieu, puis remonte-la par la face d'à côté.",
        "Recommence jusqu'à avoir 4 pétales blancs autour du centre jaune.",
      ],
      why: "Pourquoi en haut, alors que la croix blanche ira en bas ? Parce qu'en haut il n'y a encore rien à protéger : tu peux tourner les faces comme tu veux pour y amener les pétales. C'est un parking : à l'étape suivante, tu les descends une par une à leur vraie place.",
      done: "le dessus montre une fleur\u00a0: le centre jaune entouré de 4 cases blanches.",
    },
    {
      look: "Chaque pétale, et le centre de son autre couleur : le centre vert pour le pétale blanc-vert.",
      how: [
        "Regarde la couleur du pétale qui n'est pas blanche, sur le côté.",
        "Tourne le haut jusqu'à ce que cette couleur soit juste au-dessus du centre de la même couleur : ils forment une petite barre de 2 cases.",
        "Fais un demi-tour de cette face : le pétale descend en bas, blanc dessous.",
        "Fais pareil pour les 3 autres pétales.",
      ],
      why: "Un demi-tour ne bouge qu'une face : les autres pétales, en haut, ne sont pas touchés. Et comme tu as aligné le pétale sur son centre avant de le descendre, sa branche de la croix arrive directement à la bonne place.",
      done: "une croix blanche est en bas, chaque branche sous le centre de sa couleur.",
    },
    {
      look: "Les 4 coins qui ont du blanc : des pièces à 3 couleurs. Le coin blanc-vert-orange va entre les centres blanc, vert et orange.",
      how: [
        "Trouve un coin blanc en haut. Ses deux autres couleurs te disent sa place : en bas, entre les deux centres de ces couleurs.",
        "Tourne le haut pour le mettre juste au-dessus de sa place, puis tourne tout le cube pour avoir cette place en bas à droite devant toi.",
        "Répète le sexy move (R U R' U') jusqu'à ce que le coin soit en place, blanc en bas : 1, 3 ou 5 fois selon où regarde son blanc.",
        "Un coin blanc coincé en bas, à la mauvaise place ou mal tourné ? Mets-le en bas à droite devant toi et fais un sexy move : il remonte, et tu reprends au début.",
      ],
      why: "Pendant le sexy move, la croix blanche et les autres coins du bas bougent un instant puis reviennent : en bas, seul le coin en bas à droite devant toi change. C'est pour ça qu'on met toujours la place à remplir à cet endroit.",
      done: "toute la face du dessous est blanche, et chaque côté a sa première rangée d'une seule couleur.",
    },
    {
      look: "Les 4 arêtes sans jaune : en haut, des arêtes à 2 couleurs dont aucune n'est jaune (vert-rouge, vert-orange…). Celles qui ont du jaune vont dans la couronne du haut : on les laisse pour plus tard.",
      how: [
        "Trouve en haut une arête sans jaune, et regarde sa couleur de côté (pas celle du dessus).",
        "Tourne le haut jusqu'à ce que cette couleur soit au-dessus du centre de même couleur, puis tourne tout le cube pour avoir cette face devant toi.",
        "Regarde la couleur du dessus de l'arête : c'est celle du centre où elle doit aller. Centre de droite : insertion à droite. Centre de gauche : insertion à gauche.",
        "Plus d'arête sans jaune en haut, mais une place pas finie ? Une arête est coincée au milieu : mets-la à droite devant toi, fais une insertion à droite pour la sortir, et reprends au début.",
      ],
      why: "L'insertion écarte un instant le coin blanc, glisse l'arête à sa place, puis remet le coin : la couronne blanche revient intacte. La gauche est le miroir de la droite.",
      done: "chaque côté a ses 2 rangées du bas d'une seule couleur.",
    },
    {
      look: "Il ne reste que le dessus. Ne cherche plus les pièces une par une : regarde le dessin jaune sur le dessus, seulement les arêtes autour du centre (pas les coins).",
      how: [
        "Un point (seul le centre est jaune) : fais F, le sexy move, puis F' (F R U R' U' F'), de n'importe quel côté. Tu obtiens un L.",
        "Un L : tourne le haut pour tenir le L derrière et à gauche, puis refais F R U R' U' F'. Tu obtiens une ligne.",
        "Une ligne : tiens-la à l'horizontale, de gauche à droite, et refais F R U R' U' F'.",
        "La croix est faite. Les coins et les côtés du haut ne comptent pas encore : laisse-les.",
      ],
      why: "La séquence ne change que le dessus : les deux couronnes du bas bougent pendant, mais reviennent intactes à la fin. Chaque passage retourne des arêtes du haut, et le point devient un L, le L une ligne, la ligne une croix.",
      done: "une croix jaune est sur le dessus, quelle que soit la couleur des coins.",
    },
    {
      look: "Les 4 arêtes de la croix jaune, et cette fois leur couleur de côté : chacune doit être au-dessus du centre de sa couleur.",
      how: [
        "Tourne le haut jusqu'à ce qu'un maximum d'arêtes soient au-dessus du centre de leur couleur. Il y en a toujours au moins 2.",
        "Les 4 sont bonnes ? L'étape est finie. 2 voisines sont bonnes ? Tiens-les derrière et à droite, et fais le Sune (R U R' U R U2 R' U) : les deux autres se mettent en place.",
        "Les 2 bonnes sont face à face ? Fais le Sune une fois de n'importe où, puis reprends au début : tu auras 2 voisines.",
      ],
      why: "Le Sune échange les arêtes de devant et de gauche, sans toucher à celles de derrière et de droite ni aux couronnes du bas. Les coins du haut se mélangent un peu : c'est l'affaire des deux dernières étapes.",
      done: "chaque arête de la croix jaune est au-dessus du centre de sa couleur.",
    },
    {
      look: "Les 4 coins du haut. Un coin est « placé » quand ses 3 couleurs sont celles des 3 centres autour de lui, même s'il est mal tourné (son jaune peut regarder sur le côté).",
      how: [
        "Cherche un coin placé, et tiens-le en haut à droite devant toi.",
        "Fais le Niklas (U R U' L' U R' U' L) : les 3 autres coins tournent entre eux, lui ne bouge pas. Recommence jusqu'à ce que les 4 soient placés.",
        "Aucun coin placé ? Fais le Niklas une fois de n'importe où : un coin se place, et tu reprends au début.",
      ],
      why: "On découpe le problème en deux : d'abord mettre chaque coin au bon endroit, ensuite le tourner. Le Niklas déplace 3 coins sans rien toucher d'autre : la croix jaune et ses arêtes restent en place.",
      done: "chaque coin du haut est entre les 3 centres de ses couleurs, même mal tourné.",
    },
    {
      look: "Les coins du haut dont le jaune n'est pas sur le dessus.",
      how: [
        "Tourne tout le cube une seule fois, pour avoir un coin mal tourné en haut à droite devant toi. À partir de là, ne tourne plus jamais tout le cube.",
        "Répète R' D' R D jusqu'à ce que son jaune soit en haut : 2 ou 4 fois. Le bas se mélange : c'est normal, continue.",
        "Tourne seulement le haut pour amener le coin mal tourné suivant en haut à droite devant toi, et recommence R' D' R D.",
        "Quand les 4 coins ont leur jaune en haut, le bas s'est réparé tout seul. Tourne le haut une dernière fois : c'est fini !",
      ],
      why: "C'est la seule étape où l'on dérange volontairement ce qui est fait : R' D' R D tourne le coin, mais mélange le bas. 6 R' D' R D de suite ne changent rien, et toutes tes répétitions finissent par faire un multiple de 6 : le bas revient donc tout seul à la fin. Mais si tu tournes tout le cube en route, il ne se répare pas.",
      done: "le cube est résolu !",
    },
  ],
  nl: [
    { look: "", how: [], why: "", done: "" },
    {
      look: "De 4 randstukken met wit: stukken met 2 kleuren, waarvan één wit (wit-groen, wit-rood, wit-blauw, wit-oranje).",
      how: [
        "Zoek een wit randstuk dat nog geen blaadje is, waar het ook zit.",
        "Draai eerst de bovenkant zodat er een lege plek recht boven het stuk komt: anders laat je een blaadje vallen dat er al ligt.",
        "Breng het naar boven door zijn kant te draaien, met het witte vakje bovenop. Kijkt zijn wit opzij, maak dan een omweg: breng het naar het midden, en dan via de kant ernaast weer naar boven.",
        "Herhaal tot er 4 witte blaadjes rond het gele middenstuk liggen.",
      ],
      why: "Waarom bovenaan, als het witte kruis onderaan hoort? Omdat er bovenaan nog niets te beschermen is: je kunt de kanten draaien zoals je wilt om de blaadjes daar te brengen. Het is een parkeerplaats: in de volgende stap laat je ze één voor één naar hun echte plek zakken.",
      done: "de bovenkant een bloem toont: het gele middenstuk omringd door 4 witte vakjes.",
    },
    {
      look: "Elk blaadje, en het middenstuk van zijn andere kleur: het groene middenstuk voor het wit-groene blaadje.",
      how: [
        "Kijk naar de kleur van het blaadje die niet wit is, aan de zijkant.",
        "Draai de bovenkant tot die kleur recht boven het middenstuk van dezelfde kleur staat: samen vormen ze een balkje van 2 vakjes.",
        "Draai die kant een halve slag: het blaadje zakt naar onderen, met wit onderaan.",
        "Doe hetzelfde met de 3 andere blaadjes.",
      ],
      why: "Een halve slag beweegt maar één kant: de andere blaadjes bovenaan blijven liggen. En omdat je het blaadje eerst boven zijn middenstuk hebt gezet, komt zijn arm van het kruis meteen op de goede plek.",
      done: "er onderaan een wit kruis ligt, elke arm onder het middenstuk van zijn kleur.",
    },
    {
      look: "De 4 hoekstukken met wit: stukken met 3 kleuren. Het wit-groen-oranje hoekstuk hoort tussen het witte, groene en oranje middenstuk.",
      how: [
        "Zoek een wit hoekstuk bovenaan. Zijn twee andere kleuren vertellen waar het hoort: onderaan, tussen de twee middenstukken van die kleuren.",
        "Draai de bovenkant om het recht boven zijn plek te zetten, en draai dan de hele kubus zodat die plek rechtsonder vooraan zit.",
        "Herhaal de sexy move (R U R' U') tot het hoekstuk op zijn plek zit, met wit onderaan: 1, 3 of 5 keer, afhankelijk van waar zijn wit naar kijkt.",
        "Zit een wit hoekstuk vast onderaan, op de verkeerde plek of verkeerd gedraaid? Zet het rechtsonder vooraan en doe één sexy move: het komt naar boven, en je begint opnieuw.",
      ],
      why: "Tijdens de sexy move bewegen het witte kruis en de andere hoekstukken onderaan even en komen dan terug: onderaan verandert alleen het hoekstuk rechtsonder vooraan. Daarom zet je de plek die je wilt vullen altijd daar.",
      done: "de hele onderkant wit is, en elke zijkant zijn eerste rij in één kleur heeft.",
    },
    {
      look: "De 4 randstukken zonder geel: bovenaan, randstukken met 2 kleuren waarvan geen enkele geel is (groen-rood, groen-oranje…). Die met geel horen in de bovenste laag: die laat je voor later.",
      how: [
        "Zoek bovenaan een randstuk zonder geel, en kijk naar zijn kleur aan de zijkant (niet die bovenop).",
        "Draai de bovenkant tot die kleur boven het middenstuk van dezelfde kleur staat, en draai dan de hele kubus zodat die kant voor je zit.",
        "Kijk naar de kleur bovenop het randstuk: dat is de kleur van het middenstuk waar het naartoe moet. Middenstuk rechts: invoegen naar rechts. Middenstuk links: invoegen naar links.",
        "Geen randstuk zonder geel meer bovenaan, maar is een plek nog niet klaar? Dan zit er een randstuk vast in het midden: zet het rechts vooraan, doe één keer invoegen naar rechts om het eruit te halen, en begin opnieuw.",
      ],
      why: "Het invoegen schuift het witte hoekstuk even opzij, schuift het randstuk op zijn plek en zet het hoekstuk terug: de witte laag blijft heel. Links is het spiegelbeeld van rechts.",
      done: "elke zijkant zijn 2 onderste rijen in één kleur heeft.",
    },
    {
      look: "Alleen de bovenkant blijft over. Zoek de stukken niet meer één voor één: kijk naar de gele tekening bovenop, alleen de randstukken rond het middenstuk (niet de hoekstukken).",
      how: [
        "Een stip (alleen het middenstuk is geel): doe F, de sexy move, en dan F' (F R U R' U' F'), vanaf eender welke kant. Je krijgt een L.",
        "Een L: draai de bovenkant zodat de L achteraan links ligt, en doe opnieuw F R U R' U' F'. Je krijgt een lijn.",
        "Een lijn: houd ze horizontaal, van links naar rechts, en doe opnieuw F R U R' U' F'.",
        "Het kruis is klaar. De hoekstukken en de zijkanten bovenaan tellen nog niet mee: laat ze zo.",
      ],
      why: "De reeks verandert alleen de bovenkant: de twee onderste lagen bewegen onderweg, maar zijn op het einde weer heel. Elke keer draaien er randstukken bovenaan om, en wordt de stip een L, de L een lijn, de lijn een kruis.",
      done: "er een geel kruis bovenop ligt, welke kleur de hoekstukken ook hebben.",
    },
    {
      look: "De 4 randstukken van het gele kruis, en nu hun kleur aan de zijkant: elk moet boven het middenstuk van zijn kleur staan.",
      how: [
        "Draai de bovenkant tot zoveel mogelijk randstukken boven het middenstuk van hun kleur staan. Dat zijn er altijd minstens 2.",
        "Alle 4 goed? Dan is de stap klaar. 2 buren goed? Houd ze achteraan en rechts, en doe de Sune (R U R' U R U2 R' U): de twee andere vallen op hun plek.",
        "Staan de 2 goede tegenover elkaar? Doe één keer de Sune vanaf eender waar, en begin opnieuw: dan heb je 2 buren.",
      ],
      why: "De Sune wisselt de randstukken vooraan en links, zonder aan die achteraan en rechts of aan de onderste lagen te komen. De hoekstukken bovenaan raken wat door elkaar: dat is werk voor de laatste twee stappen.",
      done: "elk randstuk van het gele kruis boven het middenstuk van zijn kleur staat.",
    },
    {
      look: "De 4 hoekstukken bovenaan. Een hoekstuk „staat goed” als zijn 3 kleuren die van de 3 middenstukken eromheen zijn, ook als het verkeerd gedraaid is (zijn geel mag opzij kijken).",
      how: [
        "Zoek een hoekstuk dat goed staat, en houd het rechtsboven vooraan.",
        "Doe de Niklas (U R U' L' U R' U' L): de 3 andere hoekstukken wisselen rond, het stilstaande niet. Herhaal tot ze alle 4 goed staan.",
        "Staat er geen enkel goed? Doe één keer de Niklas vanaf eender waar: één hoekstuk valt op zijn plek, en je begint opnieuw.",
      ],
      why: "Je splitst het probleem in twee: eerst elk hoekstuk op de goede plek, daarna draaien. De Niklas verplaatst 3 hoekstukken zonder iets anders aan te raken: het gele kruis en zijn randstukken blijven staan.",
      done: "elk hoekstuk bovenaan tussen de 3 middenstukken van zijn kleuren zit, ook verkeerd gedraaid.",
    },
    {
      look: "De hoekstukken bovenaan waarvan het geel niet bovenop zit.",
      how: [
        "Draai de hele kubus één keer, zodat er een verkeerd gedraaid hoekstuk rechtsboven vooraan zit. Vanaf dan draai je nooit meer de hele kubus.",
        "Herhaal R' D' R D tot zijn geel boven zit: 2 of 4 keer. De onderkant raakt door elkaar: dat is normaal, ga door.",
        "Draai alleen de bovenkant om het volgende verkeerd gedraaide hoekstuk rechtsboven vooraan te brengen, en doe opnieuw R' D' R D.",
        "Als alle 4 hoekstukken hun geel boven hebben, heeft de onderkant zich vanzelf hersteld. Draai de bovenkant nog een laatste keer: klaar!",
      ],
      why: "Dit is de enige stap waarin je bewust stukmaakt wat klaar is: R' D' R D draait het hoekstuk, maar haalt de onderkant door elkaar. 6 keer R' D' R D na elkaar verandert niets, en al je herhalingen samen worden een veelvoud van 6: de onderkant komt op het einde dus vanzelf terug. Maar draai je onderweg de hele kubus, dan herstelt hij zich niet.",
      done: "de kubus opgelost is!",
    },
  ],
  en: [
    { look: "", how: [], why: "", done: "" },
    {
      look: "The 4 edges with white: pieces with 2 colors, one of them white (white-green, white-red, white-blue, white-orange).",
      how: [
        "Find a white edge that isn't a petal yet, wherever it is.",
        "Before bringing it up, turn the top to put an empty spot right above it: otherwise you'd knock off a petal already in place.",
        "Bring it up by turning its face, its white square on top. If its white faces the side, take a detour: bring it down to the middle, then up again through the face next to it.",
        "Do it again until 4 white petals surround the yellow center.",
      ],
      why: "Why on top, when the white cross goes at the bottom? Because there's nothing to protect on top yet: you can turn the faces however you like to bring the petals there. It's a parking lot: in the next stage, you bring them down one by one to their real place.",
      done: "the top shows a flower: the yellow center ringed by 4 white squares.",
    },
    {
      look: "Each petal, and the center of its other color: the green center for the white-green petal.",
      how: [
        "Look at the petal's color that isn't white, on the side.",
        "Turn the top until that color sits right above the center of the same color: together they make a little bar of 2 squares.",
        "Give that face a half turn: the petal drops to the bottom, white underneath.",
        "Do the same for the other 3 petals.",
      ],
      why: "A half turn moves only one face: the other petals, on top, aren't touched. And since you lined the petal up with its center before bringing it down, its arm of the cross lands straight in the right place.",
      done: "a white cross is at the bottom, each arm under the center of its color.",
    },
    {
      look: "The 4 corners with white: pieces with 3 colors. The white-green-orange corner goes between the white, green and orange centers.",
      how: [
        "Find a white corner on top. Its two other colors tell you its place: at the bottom, between the two centers of those colors.",
        "Turn the top to put it right above its place, then turn the whole cube so that place is at the bottom right in front of you.",
        "Repeat the sexy move (R U R' U') until the corner is in place, white at the bottom: 1, 3 or 5 times depending on where its white faces.",
        "A white corner stuck at the bottom, in the wrong place or twisted? Put it at the bottom right in front of you and do one sexy move: it comes up, and you start again.",
      ],
      why: "During the sexy move, the white cross and the other bottom corners move for a moment, then come back: at the bottom, only the bottom right front corner changes. That's why the place to fill always goes there.",
      done: "the whole bottom face is white, and each side has its first row in one color.",
    },
    {
      look: "The 4 edges without yellow: on top, edges with 2 colors, neither of them yellow (green-red, green-orange…). The ones with yellow belong to the top layer: leave them for later.",
      how: [
        "Find an edge without yellow on top, and look at its side color (not the one on top).",
        "Turn the top until that color sits above the center of the same color, then turn the whole cube to have that face in front of you.",
        "Look at the edge's top color: it's the color of the center it must go to. Center on the right: right insert. Center on the left: left insert.",
        "No more edges without yellow on top, but a spot isn't done? An edge is stuck in the middle: put it at the front right, do one right insert to take it out, and start again.",
      ],
      why: "The insert moves the white corner aside for a moment, slides the edge into its place, then puts the corner back: the white layer comes back intact. The left one is the mirror of the right one.",
      done: "each side has its 2 bottom rows in one color.",
    },
    {
      look: "Only the top is left. Stop looking for pieces one by one: look at the yellow pattern on top, only the edges around the center (not the corners).",
      how: [
        "A dot (only the center is yellow): do F, the sexy move, then F' (F R U R' U' F'), from any side. You get an L.",
        "An L: turn the top to hold the L at the back left, then do F R U R' U' F' again. You get a line.",
        "A line: hold it horizontal, left to right, and do F R U R' U' F' again.",
        "The cross is done. The corners and the sides of the top don't count yet: leave them.",
      ],
      why: "The sequence only changes the top: the two bottom layers move during it, but come back intact at the end. Each time, some top edges flip over, and the dot becomes an L, the L a line, the line a cross.",
      done: "a yellow cross is on top, whatever the corners' colors.",
    },
    {
      look: "The 4 edges of the yellow cross, and this time their side color: each one must sit above the center of its color.",
      how: [
        "Turn the top until as many edges as possible sit above the center of their color. There are always at least 2.",
        "All 4 right? The stage is done. 2 neighbors right? Hold them at the back and on the right, and do the Sune (R U R' U R U2 R' U): the other two fall into place.",
        "Are the 2 right ones opposite each other? Do the Sune once from anywhere, then start again: you'll have 2 neighbors.",
      ],
      why: "The Sune swaps the front and left edges, without touching the back and right ones or the bottom layers. The top corners get mixed up a little: that's the job of the last two stages.",
      done: "each edge of the yellow cross sits above the center of its color.",
    },
    {
      look: "The 4 top corners. A corner is “placed” when its 3 colors are those of the 3 centers around it, even if it's twisted (its yellow may face the side).",
      how: [
        "Find a placed corner, and hold it at the top right in front of you.",
        "Do the Niklas (U R U' L' U R' U' L): the other 3 corners cycle around, it stays still. Repeat until all 4 are placed.",
        "No corner placed? Do the Niklas once from anywhere: one corner falls into place, and you start again.",
      ],
      why: "You split the problem in two: first each corner in the right spot, then twisting it. The Niklas moves 3 corners without touching anything else: the yellow cross and its edges stay in place.",
      done: "each top corner sits between the 3 centers of its colors, even twisted.",
    },
    {
      look: "The top corners whose yellow isn't on top.",
      how: [
        "Turn the whole cube once, to have a twisted corner at the top right in front of you. From then on, never turn the whole cube again.",
        "Repeat R' D' R D until its yellow is on top: 2 or 4 times. The bottom gets scrambled: that's normal, keep going.",
        "Turn only the top to bring the next twisted corner to the top right in front of you, and do R' D' R D again.",
        "When all 4 corners have their yellow on top, the bottom has fixed itself. Turn the top one last time: you're done!",
      ],
      why: "This is the only stage where you break what is done on purpose: R' D' R D twists the corner, but scrambles the bottom. 6 R' D' R D in a row change nothing, and all your repetitions end up adding to a multiple of 6: so the bottom comes back by itself at the end. But if you turn the whole cube along the way, it doesn't fix itself.",
      done: "the cube is solved!",
    },
  ],
});
