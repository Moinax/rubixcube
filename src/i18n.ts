// The interface speaks French, Dutch or English: the saved choice, else the
// browser's first language among them, else English. Texts are picked once at
// load, so switching reloads the page; the saved screen survives it, and a
// guide in progress is rebuilt from the code in the new language.
export type Lang = "fr" | "nl" | "en";
export const LANGS: Lang[] = ["fr", "nl", "en"];
const KEY = "rubixcube:lang";

/** The first supported language among `wanted` ("nl-BE" counts as "nl"), else English. */
export function pickLang(wanted: (string | null)[]): Lang {
  const codes = wanted.map((l) => l?.slice(0, 2).toLowerCase());
  return (codes.find((l) => LANGS.includes(l as Lang)) as Lang | undefined) ?? "en";
}

function saved(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null; // storage blocked: fall back to the browser's languages
  }
}

// Outside a browser (the tests), the texts stay in French, the language they were written in.
export const lang: Lang = typeof window === "undefined" ? "fr" : pickLang([saved(), ...navigator.languages]);

/** The text, or anything else, in the current language. */
export const tr = <T>(texts: Record<Lang, T>): T => texts[lang];

export function setLang(next: Lang) {
  localStorage.setItem(KEY, next);
  location.reload();
}

/** « 3 sur 20 », "3 of 20". */
export const nOf = (n: number, total: number) => tr({ fr: `${n} sur ${total}`, nl: `${n} van ${total}`, en: `${n} of ${total}` });

export const capitalize = (text: string) => text[0].toUpperCase() + text.slice(1);
