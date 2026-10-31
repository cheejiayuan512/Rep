/**
 * Forgiving exercise search. Every word you type has to land somewhere in the
 * exercise (name, muscle group, or equipment), but it may be a prefix, a
 * shorthand like "db" or "ohp", letters in order ("bnch"), or one typo away.
 * Higher scores sort first.
 */

export interface Searchable {
  name: string;
  muscleGroup: string;
  equipment: string;
}

/** Gym shorthand, expanded before matching. */
const ALIASES: Record<string, string> = {
  bb: 'barbell',
  bi: 'biceps',
  bis: 'biceps',
  bp: 'bench press',
  cgbp: 'close grip bench press',
  db: 'dumbbell',
  dl: 'deadlift',
  ext: 'extension',
  hammy: 'hamstrings',
  kb: 'kettlebell',
  lat: 'lat',
  ohp: 'overhead press',
  pec: 'chest',
  pecs: 'chest',
  pullups: 'pull up',
  pushups: 'push up',
  chinups: 'chin up',
  quad: 'quads',
  rdl: 'romanian deadlift',
  situp: 'sit up',
  situps: 'sit up',
  sldl: 'stiff leg deadlift',
  tri: 'triceps',
  tris: 'triceps',
  ups: 'up',
};

/** A name people say for an exercise that already has another title. Longest first. */
const PHRASES: Array<[string, string]> = [
  ['farmers walk', 'farmer carry'],
  ['farmer s walk', 'farmer carry'],
  ['farmer walk', 'farmer carry'],
  ['conventional deadlift', 'deadlift'],
  ['military press', 'overhead press'],
  ['strict press', 'overhead press'],
  ['hyperextension', 'back extension'],
  ['air squat', 'bodyweight squat'],
];

/** 0 when nothing matches; otherwise higher is better. */
export function fuzzyScore(query: string, item: Searchable): number {
  const spoken = applyPhrases(query);
  const tokens = expand(words(spoken));
  if (tokens.length === 0) {
    return 1;
  }
  const nameWords = words(item.name);
  const nameJoined = nameWords.join('');
  const extraWords = [...words(item.muscleGroup), ...words(item.equipment)];
  let total = 0;
  for (const token of tokens) {
    const inName = bestWordScore(token, nameWords, nameJoined);
    const inExtra = bestWordScore(token, extraWords, extraWords.join('')) * 0.6;
    const best = Math.max(inName, inExtra);
    if (best <= 0) {
      return 0;
    }
    total += best;
  }
  const whole = normalize(spoken);
  const phraseBonus = whole.length > 2 && normalize(item.name).includes(whole) ? 40 : 0;
  // Shorter names win ties, so "Squat" beats "Bulgarian Split Squat" for "squat".
  return total / tokens.length + phraseBonus - nameWords.length;
}

/** Items that match, best first. Ties keep their incoming order. */
export function fuzzyFilter<T extends Searchable>(items: T[], query: string): T[] {
  if (words(query).length === 0) {
    return items;
  }
  return items
    .map((item, index) => ({ index, item, score: fuzzyScore(query, item) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => entry.item);
}

function bestWordScore(token: string, candidates: string[], joined: string): number {
  let best = 0;
  for (const word of candidates) {
    best = Math.max(best, wordScore(token, word));
  }
  if (best < 60 && token.length >= 3 && joined.includes(token)) {
    // "pulldown" inside "latpulldown", "pushup" for "Push-Up".
    best = Math.max(best, 60);
  }
  if (best === 0 && token.length >= 3 && isSubsequence(token, joined)) {
    best = 25;
  }
  return best;
}

function wordScore(token: string, word: string): number {
  if (word === token) {
    return 100;
  }
  if (word.startsWith(token)) {
    return 80 + Math.min(10, token.length);
  }
  if (token.length >= 3 && word.includes(token)) {
    return 55;
  }
  if (token.length >= 4) {
    const allowed = token.length >= 7 ? 2 : 1;
    const prefix = word.slice(0, Math.min(word.length, token.length + 1));
    const distance = Math.min(editDistance(token, word), editDistance(token, prefix), editDistance(token, word.slice(0, token.length)));
    if (distance <= allowed) {
      return 50 - distance * 10;
    }
  }
  if (token.length >= 2 && token.length < word.length && token[0] === word[0] && isSubsequence(token, word)) {
    return 30;
  }
  return 0;
}

function applyPhrases(query: string): string {
  let text = normalize(query);
  for (const [from, to] of PHRASES) {
    text = text.replaceAll(from, to);
  }
  return text;
}

function expand(tokens: string[]): string[] {
  return tokens.flatMap((token) => (ALIASES[token] ?? token).split(' '));
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((word) => word.length > 0);
}

function normalize(text: string): string {
  return words(text).join(' ');
}

function isSubsequence(needle: string, haystack: string): boolean {
  let at = 0;
  for (const char of haystack) {
    if (char === needle[at]) {
      at += 1;
      if (at === needle.length) {
        return true;
      }
    }
  }
  return needle.length === 0;
}

/** Optimal string alignment distance: insertions, deletions, substitutions, and swapped neighbours. */
function editDistance(left: string, right: string): number {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const table: number[][] = Array.from({ length: rows }, (_, row) => Array.from({ length: cols }, (_, col) => (row === 0 ? col : col === 0 ? row : 0)));
  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      let value = Math.min(table[row - 1][col] + 1, table[row][col - 1] + 1, table[row - 1][col - 1] + cost);
      if (row > 1 && col > 1 && left[row - 1] === right[col - 2] && left[row - 2] === right[col - 1]) {
        value = Math.min(value, table[row - 2][col - 2] + 1);
      }
      table[row][col] = value;
    }
  }
  return table[left.length][right.length];
}
