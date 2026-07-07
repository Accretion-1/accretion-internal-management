import ocrMatchData from '../data/ocr-match';

const DEFAULT_MIN_MATCH_SCORE = 70;
const OCR_IMAGE_MAX_SIDE = 1600;
const PADDLE_OCR_OPTIONS = {
    textDetectionModelName: 'PP-OCRv6_tiny_det',
    textRecognitionModelName: 'PP-OCRv6_tiny_rec',
    textDetectionBatchSize: 1,
    textRecognitionBatchSize: 4,
    ortOptions: {
        backend: 'wasm',
        numThreads: Math.min(typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2, 4),
        simd: true,
    },
    worker: true,
};

let paddleOcrInstancePromise = null;

const getMinMatchScore = () => {
    const score = Number(import.meta.env.VITE_MIN_MATCH_SCORE || DEFAULT_MIN_MATCH_SCORE);
    return Number.isFinite(score) ? Math.min(Math.max(score, 0), 100) : DEFAULT_MIN_MATCH_SCORE;
};

const normalizeText = (value = '') => String(value)
    .normalize('NFKD')
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeCompact = (value = '') => normalizeText(value).replace(/\s+/g, '');

const normalizeIdentifier = (value = '') => normalizeCompact(value)
    .replace(/[|IL]/g, '1')
    .replace(/O/g, '0');

const isIdentifierLike = (value = '') => {
    const compact = normalizeCompact(value);
    return compact.length >= 8 && /[A-Z]/.test(compact) && /\d/.test(compact);
};

const levenshteinDistance = (first = '', second = '') => {
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

const getSimilarityRatio = (first = '', second = '') => {
    const longestLength = Math.max(first.length, second.length);
    if (!longestLength) return 1;
    return 1 - (levenshteinDistance(first, second) / longestLength);
};

const flattenValues = (value) => {
    if (value === null || value === undefined) return [];
    if (Array.isArray(value)) return value.flatMap(flattenValues);
    if (typeof value === 'object') return Object.values(value).flatMap(flattenValues);
    return [String(value)];
};

const uniqueTerms = (terms = []) => [
    ...new Set(
        terms
            .map((term) => String(term || '').trim())
            .filter(Boolean),
    ),
];

const buildWeightedTerms = (documentConfig) => [
    ...uniqueTerms(flattenValues(documentConfig.requiredFields)).map((term) => ({
        term,
        type: 'required',
    })),
    ...uniqueTerms(flattenValues(documentConfig.optionalFields)).map((term) => ({
        term,
        type: 'optional',
    })),
    ...uniqueTerms(flattenValues(documentConfig.addressDetails)).map((term) => ({
        term,
        type: 'address',
    })),
    ...uniqueTerms(documentConfig.keywords).map((term) => ({
        term,
        type: 'keyword',
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

    const tokens = normalizedTerm.split(' ').filter((token) => token.length > 1);
    if (!tokens.length) return 0;

    const ocrTokens = normalizedOcrText.split(' ').filter((token) => token.length > 1);
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
            matched: ratio >= (term.type === 'required' ? 0.75 : 0.6),
            ratio,
        };
    });

    const getAverageRatio = (type) => {
        const categoryTerms = scoredTerms.filter((term) => term.type === type);
        if (!categoryTerms.length) return null;
        return categoryTerms.reduce((sum, term) => sum + term.ratio, 0) / categoryTerms.length;
    };

    const requiredRatio = getAverageRatio('required');
    const keywordRatio = getAverageRatio('keyword');
    const optionalRatio = getAverageRatio('optional');
    const addressRatio = getAverageRatio('address');
    const evidenceRatios = [optionalRatio, addressRatio].filter((ratio) => ratio !== null);
    const evidenceRatio = evidenceRatios.length
        ? evidenceRatios.reduce((sum, ratio) => sum + ratio, 0) / evidenceRatios.length
        : 0;

    const score = Number((
        ((requiredRatio ?? 1) * 55)
        + ((keywordRatio ?? 0) * 25)
        + (evidenceRatio * 20)
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
            .filter((term) => term.type === 'required' && term.ratio < 0.75)
            .map(({ term }) => term),
    };
};

const ensurePaddleSupported = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('OCR is available only in a browser.');
    }

    if (typeof Blob === 'undefined') {
        throw new Error('This browser does not support OCR file processing.');
    }
};

const getPaddleOcrInstance = async () => {
    ensurePaddleSupported();

    if (!paddleOcrInstancePromise) {
        paddleOcrInstancePromise = import('@paddleocr/paddleocr-js')
            .then(({ PaddleOCR }) => PaddleOCR.create(PADDLE_OCR_OPTIONS));
    }

    return paddleOcrInstancePromise;
};

export const warmUpOcrEngine = async () => {
    await getPaddleOcrInstance();
};

const getAverageConfidence = (items = []) => {
    if (!items.length) return 0;
    const confidence = items.reduce((sum, item) => sum + Number(item.score || 0), 0) / items.length;
    return confidence <= 1 ? confidence * 100 : confidence;
};

const createImageElement = (file) => new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
    };
    image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Unable to read captured photo for OCR.'));
    };
    image.src = objectUrl;
});

const prepareImageForOcr = async (file) => {
    if (!file?.type?.startsWith('image/')) return file;

    const image = await createImageElement(file);
    const scale = Math.min(1, OCR_IMAGE_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));

    if (scale >= 1 && file.size <= 1.5 * 1024 * 1024) {
        return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return file;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file);
        }, 'image/jpeg', 0.9);
    });
};

const extractTextWithPaddleOcr = async (file) => {
    const ocr = await getPaddleOcrInstance();
    const ocrFile = await prepareImageForOcr(file);
    const [result] = await ocr.predict(ocrFile, {
        textDetLimitSideLen: 960,
        textDetLimitType: 'max',
        textDetMaxSideLimit: OCR_IMAGE_MAX_SIDE,
        textRecScoreThresh: 0,
    });
    const items = Array.isArray(result?.items) ? result.items : [];

    return {
        text: items.map((item) => item.text).filter(Boolean).join('\n'),
        confidence: Number(getAverageConfidence(items).toFixed(2)),
        engine: 'paddleocr',
        raw: result || null,
    };
};

export const verifyOcrFile = async (file) => {
    if (!file) {
        throw new Error('Photo is required for OCR verification.');
    }

    const minMatchScore = getMinMatchScore();
    const ocrResult = await extractTextWithPaddleOcr(file);
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
            engine: ocrResult.engine,
        },
        file: {
            original_name: file.name,
            mime_type: file.type,
            size: file.size,
        },
    };
};
