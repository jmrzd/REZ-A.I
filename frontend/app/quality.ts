/**
 * Lightweight guard against the word loops sometimes produced by small
 * quantized models, particularly 135M CPU models.
 * This is not a factuality / truthfulness checker.
 */
export function hasRunawayRepetition(text: string): boolean {
  const words = (text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .match(/[a-z0-9]+/g) ?? []);
  if (words.length < 12) return false;
  const tail = words.slice(-12);
  if (tail.length >= 8 && new Set(tail.slice(-8)).size <= 2) return true;
  // Detect adjacent repeated phrases such as "ajudar com" repeated 3+ times.
  for (const width of [2, 3, 4]) {
    if (words.length < width * 3) continue;
    const end = words.slice(-width).join(' ');
    if (words.slice(-width * 2, -width).join(' ') === end &&
        words.slice(-width * 3, -width * 2).join(' ') === end) return true;
  }
  // Detect duplicated entire short phrases when there are separators.
  const segments = text.split(/[.!?;\n]+/).map(x => x.trim().toLowerCase()).filter(Boolean);
  return segments.length >= 3 && segments.slice(-3).every(x => x === segments.at(-1));
}
