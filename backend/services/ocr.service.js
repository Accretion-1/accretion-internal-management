import Tesseract from "tesseract.js";
import { MIN_MATCH_SCORE } from "../constants.js";
import ocrMatchData from "../ocr-match.js";
import { ApiError } from "../utils/api.util.js";
import { CUSTOM_ERROR } from "../utils/message.util.js";

const DEFAULT_MIN_MATCH_SCORE = 70;
const OCR_LANGUAGES = "eng+hin";

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
    weight: 3,
  })),
  ...uniqueTerms(flattenValues(documentConfig.optionalFields)).map((term) => ({
    term,
    type: "optional",
    weight: 1.5,
  })),
  ...uniqueTerms(flattenValues(documentConfig.addressDetails)).map((term) => ({
    term,
    type: "address",
    weight: 1,
  })),
  ...uniqueTerms(documentConfig.keywords).map((term) => ({
    term,
    type: "keyword",
    weight: 1,
  })),
];

const getTermMatchRatio = (normalizedOcrText, normalizedTerm) => {
  if (!normalizedTerm) return 0;
  if (normalizedOcrText.includes(normalizedTerm)) return 1;

  const tokens = normalizedTerm.split(" ").filter((token) => token.length > 1);
  if (!tokens.length) return 0;

  const matchedTokens = tokens.filter((token) => normalizedOcrText.includes(token));
  return matchedTokens.length / tokens.length;
};

const scoreDocument = (documentConfig, ocrText) => {
  const normalizedOcrText = normalizeText(ocrText);
  const terms = buildWeightedTerms(documentConfig);
  const totalWeight = terms.reduce((sum, term) => sum + term.weight, 0);

  if (!totalWeight) {
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
      matched: ratio >= 0.7,
      ratio,
      weightedScore: term.weight * ratio,
    };
  });

  const score = Number((
    (scoredTerms.reduce((sum, term) => sum + term.weightedScore, 0) / totalWeight) * 100
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
      .filter((term) => term.type === "required" && !term.matched)
      .map(({ term }) => term),
  };
};

const extractTextFromImage = async (imageBuffer) => {
  const { data } = await Tesseract.recognize(imageBuffer, OCR_LANGUAGES);

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
