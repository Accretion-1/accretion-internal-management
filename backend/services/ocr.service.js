import Tesseract from "tesseract.js";
import { MIN_MATCH_SCORE } from "../constants.js";
import ocrMatchData from "../ocr-match.js";
import { ApiError } from "../utils/api.util.js";
import { CUSTOM_ERROR } from "../utils/message.util.js";

const DEFAULT_MIN_MATCH_SCORE = 70;
const OCR_LANGUAGES = "eng+hin";
const OCR_OPTIONS = {
  tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
  preserve_interword_spaces: "1",
};

const getMinMatchScore = () => {
  const score = Number(MIN_MATCH_SCORE || DEFAULT_MIN_MATCH_SCORE);
  return Number.isFinite(score) ? Math.min(Math.max(score, 0), 100) : DEFAULT_MIN_MATCH_SCORE;
};

const normalizeText = (value = "") => String(value)
  .normalize("NFKD")
  .toUpperCase()
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .replace(/\s+/g, " ")
  .trim();

const normalizeCompact = (value = "") => normalizeText(value).replace(/\s+/g, "");

const normalizeIdentifier = (value = "") => normalizeCompact(value)
  .replace(/[|IL]/g, "1")
  .replace(/O/g, "0");

const isIdentifierLike = (value = "") => {
  const compact = normalizeCompact(value);
  return compact.length >= 8 && /[A-Z]/.test(compact) && /\d/.test(compact);
};

const levenshteinDistance = (first = "", second = "") => {
  if (first === second) return 0;
  if (!first.length) return second.length;
  if (!second.length) return first.length;

  const previousRow = Array.from({ length: second.length + 1 }, (_, index) => index);

  for (let firstIndex = 0; firstIndex < first.length; firstIndex += 1) {
    const currentRow = [firstIndex + 1];

    for (let secondIndex = 0; secondIndex < second.length; secondIndex += 1) {
      const insertCost = currentRow[secondIndex] + 1;
      const deleteCost = previousRow[secondIndex + 1] + 1;
      const replaceCost = previousRow[secondIndex] + (first[firstIndex] === second[secondIndex] ? 0 : 1);
      currentRow.push(Math.min(insertCost, deleteCost, replaceCost));
    }

    previousRow.splice(0, previousRow.length, ...currentRow);
  }

  return previousRow[second.length];
};

const getSimilarityRatio = (first = "", second = "") => {
  const longestLength = Math.max(first.length, second.length);
  if (!longestLength) return 1;
  return 1 - (levenshteinDistance(first, second) / longestLength);
};

const flattenValues = (value) => {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.flatMap(flattenValues);
  if (typeof value === "object") return Object.values(value).flatMap(flattenValues);
  return [String(value)];
};

const uniqueTerms = (terms = []) => [
  ...new Set(
    terms
      .map((term) => String(term || "").trim())
      .filter(Boolean),
  ),
];

const buildWeightedTerms = (documentConfig) => [
  ...uniqueTerms(flattenValues(documentConfig.requiredFields)).map((term) => ({
    term,
    type: "required",
  })),
  ...uniqueTerms(flattenValues(documentConfig.optionalFields)).map((term) => ({
    term,
    type: "optional",
  })),
  ...uniqueTerms(flattenValues(documentConfig.addressDetails)).map((term) => ({
    term,
    type: "address",
  })),
  ...uniqueTerms(documentConfig.keywords).map((term) => ({
    term,
    type: "keyword",
  })),
];

const getTermMatchRatio = (normalizedOcrText, normalizedTerm) => {
  if (!normalizedTerm) return 0;
  if (normalizedOcrText.includes(normalizedTerm)) return 1;

  const compactOcrText = normalizeCompact(normalizedOcrText);
  const compactTerm = normalizeCompact(normalizedTerm);

  if (compactTerm && compactOcrText.includes(compactTerm)) return 1;

  if (isIdentifierLike(normalizedTerm)) {
    const identifierOcrText = normalizeIdentifier(normalizedOcrText);
    const identifierTerm = normalizeIdentifier(normalizedTerm);

    if (identifierTerm && identifierOcrText.includes(identifierTerm)) return 1;

    const windowSize = identifierTerm.length;
    let bestRatio = 0;

    for (let index = 0; index <= identifierOcrText.length - Math.max(windowSize - 2, 1); index += 1) {
      const candidate = identifierOcrText.slice(index, index + windowSize);
      bestRatio = Math.max(bestRatio, getSimilarityRatio(identifierTerm, candidate));
      if (bestRatio >= 0.9) return bestRatio;
    }

    return bestRatio >= 0.82 ? bestRatio : 0;
  }

  const tokens = normalizedTerm.split(" ").filter((token) => token.length > 1);
  if (!tokens.length) return 0;

  const ocrTokens = normalizedOcrText.split(" ").filter((token) => token.length > 1);
  const matchedTokens = tokens.filter((token) => {
    if (normalizedOcrText.includes(token)) return true;
    if (token.length < 5) return false;
    return ocrTokens.some((ocrToken) => getSimilarityRatio(token, ocrToken) >= 0.84);
  });

  return matchedTokens.length / tokens.length;
};

const scoreDocument = (documentConfig, ocrText) => {
  const normalizedOcrText = normalizeText(ocrText);
  const terms = buildWeightedTerms(documentConfig);

  if (!terms.length) {
    return {
      ...documentConfig,
      score: 0,
      matched_terms: [],
      missing_required_terms: [],
    };
  }

  const scoredTerms = terms.map((term) => {
    const normalizedTerm = normalizeText(term.term);
    const ratio = getTermMatchRatio(normalizedOcrText, normalizedTerm);

    return {
      ...term,
      matched: ratio >= (term.type === "required" ? 0.75 : 0.6),
      ratio,
    };
  });

  const getAverageRatio = (type) => {
    const categoryTerms = scoredTerms.filter((term) => term.type === type);
    if (!categoryTerms.length) return null;
    return categoryTerms.reduce((sum, term) => sum + term.ratio, 0) / categoryTerms.length;
  };

  const requiredRatio = getAverageRatio("required");
  const keywordRatio = getAverageRatio("keyword");
  const optionalRatio = getAverageRatio("optional");
  const addressRatio = getAverageRatio("address");
  const evidenceRatios = [optionalRatio, addressRatio].filter((ratio) => ratio !== null);
  const evidenceRatio = evidenceRatios.length
    ? evidenceRatios.reduce((sum, ratio) => sum + ratio, 0) / evidenceRatios.length
    : 0;

  const score = Number((
    ((requiredRatio ?? 1) * 55) +
    ((keywordRatio ?? 0) * 25) +
    (evidenceRatio * 20)
  ).toFixed(2));

  return {
    id: documentConfig.id,
    name: documentConfig.name,
    documentType: documentConfig.documentType,
    language: documentConfig.language,
    configured_threshold: Number(((documentConfig.matchThreshold || 0) * 100).toFixed(2)),
    score,
    matched_terms: scoredTerms
      .filter((term) => term.matched)
      .map(({ term, type, ratio }) => ({
        term,
        type,
        confidence: Number((ratio * 100).toFixed(2)),
      })),
    missing_required_terms: scoredTerms
      .filter((term) => term.type === "required" && term.ratio < 0.75)
      .map(({ term }) => term),
  };
};

const extractTextFromImage = async (imageBuffer) => {
  const { data } = await Tesseract.recognize(imageBuffer, OCR_LANGUAGES, OCR_OPTIONS);

  return {
    text: data?.text || "",
    confidence: Number((data?.confidence || 0).toFixed(2)),
  };
};

export const verifyOcrImageService = async (file) => {
  try {
    if (!file?.buffer?.length) {
      throw new ApiError(CUSTOM_ERROR, "Image file is required");
    }

    const minMatchScore = getMinMatchScore();
    const ocrResult = await extractTextFromImage(file.buffer);
    const matches = ocrMatchData
      .map((documentConfig) => scoreDocument(documentConfig, ocrResult.text))
      .sort((first, second) => second.score - first.score);

    const bestMatch = matches[0] || null;
    const isMatched = Boolean(bestMatch && bestMatch.score >= minMatchScore);

    return {
      is_matched: isMatched,
      min_match_score: minMatchScore,
      best_match: bestMatch,
      matches,
      ocr: {
        text: ocrResult.text,
        confidence: ocrResult.confidence,
      },
      file: {
        original_name: file.originalname,
        mime_type: file.mimetype,
        size: file.size,
      },
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(CUSTOM_ERROR, "Unable to verify OCR image", error, false);
  }
};
