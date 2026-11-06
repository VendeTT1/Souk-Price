// Text matching used by the searchable pickers.
// Goal: "tanger", "Tánger", "طنجة" and "m'diq" / "mdiq" all find what a person means.

export function fold(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')       // accents and Arabic diacritics / hamza marks (أ إ آ -> ا)
    .replace(/ى/g, 'ي')           // alef maqsura -> yaa
    .replace(/ة/g, 'ه')           // taa marbuta -> haa
    .replace(/ـ/g, '')            // tatweel
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/['’‘`]/g, '')       // m'diq -> mdiq
    .replace(/[-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// options: [{ value, label, keywords?: string, ... }]
// Returns the matching options, best first. An empty query returns everything, untouched.
export function rankOptions(options, query) {
  const q = fold(query);
  if (!q) return options;
  const tokens = q.split(' ');
  const scored = [];
  options.forEach((opt, index) => {
    const label = fold(opt.label);
    const hay = `${label} ${fold(opt.keywords)}`;
    if (!tokens.every((t) => hay.includes(t))) return;
    let score = 3;                                   // matches somewhere (another language / keyword)
    if (label.includes(q)) score = 2;                // matches inside the label
    if (label.split(' ').some((w) => w.startsWith(tokens[0]))) score = 1; // a word of the label starts with it
    if (label.startsWith(q)) score = 0;              // label starts with it
    scored.push({ opt, score, index });
  });
  scored.sort((a, b) => a.score - b.score || a.index - b.index);
  return scored.map((s) => s.opt);
}
