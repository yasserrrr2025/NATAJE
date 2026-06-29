type PdfTextItemLike = {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
};

export function compactIdentityValue(value: string) {
  return value.replace(/[^\p{L}\p{N}]/gu, "").trim();
}

export function isValidSaudiId(id: string) {
  if (!id || id.length !== 10) return false;
  if (!id.startsWith("1") && !id.startsWith("2")) return false;

  let sum = 0;
  for (let index = 0; index < 10; index += 1) {
    let digit = Number.parseInt(id[index], 10);
    if (index % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }

  return sum % 10 === 0;
}

export function extractIdentityFromPdfItems(items: unknown[], fallbackText = ""): string | null {
  const positionedItems = items
    .map((rawItem) => {
      const item = rawItem as PdfTextItemLike;
      return {
      text: normalizeText(item.str || ""),
      x: Number(item.transform?.[4] || 0),
      y: Number(item.transform?.[5] || 0),
      width: Number(item.width || 0),
      height: Number(item.height || 0),
      };
    })
    .filter((item) => item.text);

  const candidates = positionedItems.flatMap((item) => {
    const matches = item.text.match(/[A-Z]?\d[\d/_\-\s]{5,}[A-Z0-9]?/gi) || [];
    return matches
      .map((match) => ({
        value: compactIdentityValue(match),
        source: item,
      }))
      .filter((candidate) => isPotentialIdentityCandidate(candidate.value));
  });

  const ranked = candidates
    .map((candidate) => ({
      ...candidate,
      score: scorePdfCandidate(candidate.value, candidate.source, positionedItems),
    }))
    .filter((candidate) => candidate.score >= 65)
    .sort((a, b) => b.score - a.score);

  if (ranked[0]) return ranked[0].value;
  return fallbackText ? extractIdentityFromText(fallbackText) : null;
}

export function extractIdentityFromText(text: string): string | null {
  const normalizedText = normalizeText(text);

  const labelPatterns = [
    /Identity\s*No\.?\s*([A-Z0-9/_\-\s]{6,})/i,
    /Passport\s*No\.?\s*([A-Z0-9/_\-\s]{6,})/i,
    /\u0631\u0642\u0645\s*\u0627\u0644\u0647\u0648\u064A\u0629\s*[:\uFF1A]?\s*([A-Z0-9/_\-\s]{6,})/i,
    /\u0631\u0642\u0645\s*\u062C\u0648\u0627\u0632\s*\u0627\u0644\u0633\u0641\u0631\s*[:\uFF1A]?\s*([A-Z0-9/_\-\s]{6,})/i,
  ];

  for (const pattern of labelPatterns) {
    const match = normalizedText.match(pattern);
    if (!match) continue;

    const value = compactIdentityValue(match[1]);
    if (isUsableIdentity(value)) return value;
  }

  const validSaudiId = findSaudiIdCandidate(normalizedText);
  if (validSaudiId) return validSaudiId;

  const candidates = normalizedText.match(/[A-Z]?\d[\d/_\-\s]{5,}[A-Z0-9]?/gi) || [];
  for (const candidate of candidates) {
    const value = compactIdentityValue(candidate);
    if (/^[A-Z]\d{6,20}$/i.test(value)) return value;
  }

  return null;
}

function normalizeText(text: string) {
  return text
    .replace(/[\u0000-\u001F\u007F\u200E\u200F\u202A-\u202E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findSaudiIdCandidate(text: string) {
  const directCandidates = text.match(/(?<!\d)[12]\d(?:[\s/_-]?\d){8}(?!\d)/g) || [];
  for (const candidate of directCandidates) {
    const value = compactIdentityValue(candidate);
    if (isValidSaudiId(value)) return value;
  }

  return null;
}

function isUsableIdentity(value: string) {
  if (isValidSaudiId(value)) return true;
  if (/^[A-Z]\d{6,20}$/i.test(value)) return true;
  return /^[12]\d{9}$/.test(value);
}

function isPotentialIdentityCandidate(value: string) {
  if (isUsableIdentity(value)) return true;
  return /^\d{10,20}$/.test(value);
}

function scorePdfCandidate(
  value: string,
  source: { text: string; x: number; y: number; width: number; height: number },
  items: { text: string; x: number; y: number; width: number; height: number }[],
) {
  if (isLikelyYearOrSerial(value, source)) return 0;

  const hasLabel = hasNearbyIdentityLabel(source, items);
  const inNoorIdentitySlot = source.x >= 20 && source.x <= 135 && source.y >= 680 && source.y <= 735;
  const nationalShape = /^[12]\d{9}$/.test(value);
  const passportShape = /^[A-Z]\d{6,20}$/i.test(value);

  let score = 0;
  if (hasLabel) score += 90;
  if (inNoorIdentitySlot && nationalShape) score += 70;
  if (isValidSaudiId(value)) score += 65;
  else if (nationalShape && hasLabel) score += 35;
  else if (passportShape && hasLabel) score += 30;
  if (source.y > 620) score += 8;
  if (/reportid/i.test(source.text) || source.y < 90) score -= 90;

  return score;
}

function hasNearbyIdentityLabel(
  source: { x: number; y: number },
  items: { text: string; x: number; y: number }[],
) {
  return items.some((item) => {
    if (Math.abs(item.y - source.y) > 8) return false;
    if (Math.abs(item.x - source.x) > 260) return false;
    return isIdentityLabel(item.text);
  });
}

function isIdentityLabel(text: string) {
  const lower = text.toLowerCase();
  const hasArabicIdentity =
    text.includes("\u0631\u0642\u0645") &&
    (text.includes("\u0627\u0644\u0647\u0648\u064A\u0629") || text.includes("\u062C\u0648\u0627\u0632"));
  const hasGlyphIdentity =
    text.includes("\u03E1\u03D7\u03AD") &&
    (text.includes("\u0394\u03F3\u03ED\u03EC") || text.includes("\u03B2\u03A7\u03D9"));

  return lower.includes("identity") || lower.includes("passport") || hasArabicIdentity || hasGlyphIdentity;
}

function isLikelyYearOrSerial(value: string, source: { text: string; x: number; y: number }) {
  if (/^1[34]\d{2}1[34]\d{2}$/.test(value)) return true;
  if (source.text.includes("-") && value.length === 8) return true;
  if (value.length < 6) return true;
  return false;
}
