import Tesseract from "tesseract.js";
import fs from "fs";

const imagePath = process.argv[2];

if (!imagePath) {
    console.log("❌ Please provide image path");
    process.exit(1);
}

if (!fs.existsSync(imagePath)) {
    console.log("❌ File not found:", imagePath);
    process.exit(1);
}

console.log("🚀 Running OCR on:", imagePath);

// ⏱️ START TIMER
const startTime = Date.now();

const runOCR = async () => {
    try {
        const result = await Tesseract.recognize(imagePath, "eng", {
            logger: (m) => {
                if (m.status === "recognizing text") {
                    process.stdout.write(
                        `\r⏳ Progress: ${(m.progress * 100).toFixed(2)}%`
                    );
                }
            },
        });

        // ⏱️ END TIMER
        const endTime = Date.now();
        const timeTakenSec = ((endTime - startTime) / 1000).toFixed(2);

        console.log("\n\n✅ OCR COMPLETE\n");

        const data = result.data;

        const text = data.text || "";
        const words = data.words || [];
        const lines = data.lines || [];
        const blocks = data.blocks || [];

        let avgConfidence = 0;

        if (words.length > 0) {
            avgConfidence =
                words.reduce((sum, w) => sum + (w.confidence || 0), 0) /
                words.length;
        } else if (lines.length > 0) {
            avgConfidence =
                lines.reduce((sum, l) => sum + (l.confidence || 0), 0) /
                lines.length;
        } else if (blocks.length > 0) {
            avgConfidence =
                blocks.reduce((sum, b) => sum + (b.confidence || 0), 0) /
                blocks.length;
        }

        console.log("📝 Extracted Text:\n");
        console.log(text);

        console.log("\n📊 OCR METRICS:");
        console.log("Words:", words.length);
        console.log("Lines:", lines.length);
        console.log("Blocks:", blocks.length);
        console.log("Average Confidence Score:", avgConfidence.toFixed(2) + "%");

        console.log("\n⏱️ PERFORMANCE:");
        console.log("Total Time Taken:", timeTakenSec + " sec");

        // Quality breakdown
        const highConfidence =
            words.length > 0
                ? words.filter(w => (w.confidence || 0) > 80).length
                : 0;

        const lowConfidence =
            words.length > 0
                ? words.filter(w => (w.confidence || 0) < 50).length
                : 0;

        console.log("\n📌 QUALITY BREAKDOWN:");
        console.log("High confidence words (>80):", highConfidence);
        console.log("Low confidence words (<50):", lowConfidence);

    } catch (err) {
        console.error("❌ OCR Failed:", err.message);
    }
};

runOCR();