const LOCAL_PROJECT_IMAGE_PATH = '/@fs/Users/rohangupta/Rohan/UltraTech Management/frontend/image.png';

const OCR_IMAGE_MAX_SIDE = 1600;
const PADDLE_OCR_OPTIONS = {
    textDetectionModelName: 'PP-OCRv6_tiny_det',
    textRecognitionModelName: 'PP-OCRv6_tiny_rec',
    textDetectionBatchSize: 1,
    textRecognitionBatchSize: 4,
    ortOptions: {
        backend: 'wasm',
        wasmPaths: 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/',
        numThreads: 1,
        simd: false,
    },
};

const createImageElement = (blob) => new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(blob);

    image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
    };

    image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Unable to read image for OCR.'));
    };

    image.src = objectUrl;
});

const prepareImageForOcr = async (blob) => {
    if (!blob?.type?.startsWith('image/')) return blob;

    const image = await createImageElement(blob);
    const scale = Math.min(1, OCR_IMAGE_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));

    if (scale >= 1 && blob.size <= 1.5 * 1024 * 1024) {
        return blob;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return blob;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
        canvas.toBlob((scaledBlob) => {
            resolve(scaledBlob || blob);
        }, blob.type || 'image/png', 0.9);
    });
};

const getAverageConfidence = (items = []) => {
    if (!items.length) return 0;
    const confidence = items.reduce((sum, item) => sum + Number(item.score || 0), 0) / items.length;
    return confidence <= 1 ? confidence * 100 : confidence;
};

export async function runLocalProjectImageOcr() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('OCR check must run in a browser context.');
    }

    const response = await fetch(LOCAL_PROJECT_IMAGE_PATH);
    if (!response.ok) {
        throw new Error('Unable to load frontend/image.png for OCR verification.');
    }

    const blob = await response.blob();
    const preparedBlob = await prepareImageForOcr(blob);
    const imageForOcr = preparedBlob instanceof Blob ? preparedBlob : blob;

    const { PaddleOCR } = await import('@paddleocr/paddleocr-js');
    const ocr = await PaddleOCR.create(PADDLE_OCR_OPTIONS);

    const [result] = await ocr.predict(imageForOcr, {
        textDetLimitSideLen: 960,
        textDetLimitType: 'max',
        textDetMaxSideLimit: OCR_IMAGE_MAX_SIDE,
        textRecScoreThresh: 0,
    });

    const items = Array.isArray(result?.items) ? result.items : [];
    const extractedText = items.map((item) => item.text).filter(Boolean).join('\n');
    const confidence = Number(getAverageConfidence(items).toFixed(2));

    return {
        text: extractedText,
        confidence,
        raw: result || null,
        file: {
            original_name: 'image.png',
            mime_type: blob.type || 'image/png',
            size: blob.size,
        },
    };
}
