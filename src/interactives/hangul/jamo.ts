/**
 * Hangul syllable composition, the same arithmetic Korean Quest's syllable
 * builder uses. Every syllable block in Unicode sits at
 *
 *   0xAC00 + (initial × 21 + vowel) × 28 + final
 *
 * where each index is the jamo's position in Unicode's ordering. No library,
 * no lookup table of 11,172 syllables.
 */

export type Jamo = {
  char: string;
  /** Position in Unicode's ordering for its slot. */
  index: number;
  /** Revised Romanization, as heard in that slot. */
  sound: string;
};

/** The 14 basic consonants as a syllable's first sound (doubles left out). */
export const INITIALS: Jamo[] = [
  { char: "ㄱ", index: 0, sound: "g" },
  { char: "ㄴ", index: 2, sound: "n" },
  { char: "ㄷ", index: 3, sound: "d" },
  { char: "ㄹ", index: 5, sound: "r" },
  { char: "ㅁ", index: 6, sound: "m" },
  { char: "ㅂ", index: 7, sound: "b" },
  { char: "ㅅ", index: 9, sound: "s" },
  // Silent at the start of a syllable: 아 is just "a".
  { char: "ㅇ", index: 11, sound: "" },
  { char: "ㅈ", index: 12, sound: "j" },
  { char: "ㅊ", index: 14, sound: "ch" },
  { char: "ㅋ", index: 15, sound: "k" },
  { char: "ㅌ", index: 16, sound: "t" },
  { char: "ㅍ", index: 17, sound: "p" },
  { char: "ㅎ", index: 18, sound: "h" },
];

export const VOWELS: Jamo[] = [
  { char: "ㅏ", index: 0, sound: "a" },
  { char: "ㅐ", index: 1, sound: "ae" },
  { char: "ㅑ", index: 2, sound: "ya" },
  { char: "ㅓ", index: 4, sound: "eo" },
  { char: "ㅔ", index: 5, sound: "e" },
  { char: "ㅕ", index: 6, sound: "yeo" },
  { char: "ㅗ", index: 8, sound: "o" },
  { char: "ㅛ", index: 12, sound: "yo" },
  { char: "ㅜ", index: 13, sound: "u" },
  { char: "ㅠ", index: 17, sound: "yu" },
  { char: "ㅡ", index: 18, sound: "eu" },
  { char: "ㅣ", index: 20, sound: "i" },
];

/**
 * The same consonants as a final sound (batchim). At the end of a syllable
 * several collapse to one sound: ㄷ ㅅ ㅈ ㅊ ㅌ ㅎ are all a stopped "t".
 */
export const FINALS: Jamo[] = [
  { char: "ㄱ", index: 1, sound: "k" },
  { char: "ㄴ", index: 4, sound: "n" },
  { char: "ㄷ", index: 7, sound: "t" },
  { char: "ㄹ", index: 8, sound: "l" },
  { char: "ㅁ", index: 16, sound: "m" },
  { char: "ㅂ", index: 17, sound: "p" },
  { char: "ㅅ", index: 19, sound: "t" },
  { char: "ㅇ", index: 21, sound: "ng" },
  { char: "ㅈ", index: 22, sound: "t" },
  { char: "ㅊ", index: 23, sound: "t" },
  { char: "ㅋ", index: 24, sound: "k" },
  { char: "ㅌ", index: 25, sound: "t" },
  { char: "ㅍ", index: 26, sound: "p" },
  { char: "ㅎ", index: 27, sound: "t" },
];

export function compose(initial: Jamo, vowel: Jamo, final: Jamo | null): string {
  return String.fromCharCode(0xac00 + (initial.index * 21 + vowel.index) * 28 + (final?.index ?? 0));
}

export function romanize(initial: Jamo, vowel: Jamo, final: Jamo | null): string {
  return `${initial.sound}${vowel.sound}${final?.sound ?? ""}`;
}

/** One-syllable words for the quiz, all buildable from the sets above. */
export const WORDS: { syllable: string; meaning: string; sound: string }[] = [
  { syllable: "물", meaning: "water", sound: "mul" },
  { syllable: "밥", meaning: "rice, a meal", sound: "bap" },
  { syllable: "달", meaning: "moon", sound: "dal" },
  { syllable: "산", meaning: "mountain", sound: "san" },
  { syllable: "집", meaning: "house", sound: "jip" },
  { syllable: "눈", meaning: "eye, or snow", sound: "nun" },
  { syllable: "손", meaning: "hand", sound: "son" },
  { syllable: "문", meaning: "door", sound: "mun" },
  { syllable: "강", meaning: "river", sound: "gang" },
  { syllable: "별", meaning: "star", sound: "byeol" },
  { syllable: "공", meaning: "ball", sound: "gong" },
  { syllable: "차", meaning: "tea, or car", sound: "cha" },
];

export const QUIZ_LENGTH = 5;

/** Splits a syllable back into its jamo, for hints. */
export function decompose(syllable: string): { initial: Jamo; vowel: Jamo; final: Jamo | null } | null {
  const offset = syllable.charCodeAt(0) - 0xac00;
  if (offset < 0 || offset > 11171) return null;
  const finalIndex = offset % 28;
  const vowelIndex = Math.floor(offset / 28) % 21;
  const initialIndex = Math.floor(offset / 28 / 21);
  const initial = INITIALS.find((j) => j.index === initialIndex);
  const vowel = VOWELS.find((j) => j.index === vowelIndex);
  const final = finalIndex === 0 ? null : (FINALS.find((j) => j.index === finalIndex) ?? undefined);
  if (!initial || !vowel || final === undefined) return null;
  return { initial, vowel, final };
}
