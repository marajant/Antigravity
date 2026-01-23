import Tesseract from 'tesseract.js';

export interface ScannedData {
    text: string;
    amount?: number;
    date?: Date;
    merchant?: string;
    confidence: number;
}

// Preprocess image for better OCR results
export async function preprocessImage(imageFile: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            // Resize logic
            const MAX_WIDTH = 1800;
            let width = img.width;
            let height = img.height;
            if (width > MAX_WIDTH) {
                height = (MAX_WIDTH / width) * height;
                width = MAX_WIDTH;
            }
            canvas.width = width;
            canvas.height = height;

            ctx.drawImage(img, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            // Contrast factor
            const contrast = 1.2;
            const intercept = 128 * (1 - contrast);

            for (let i = 0; i < data.length; i += 4) {
                const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                let newPixel = gray * contrast + intercept;
                newPixel = Math.max(0, Math.min(255, newPixel));
                data[i] = newPixel;
                data[i + 1] = newPixel;
                data[i + 2] = newPixel;
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = (err) => reject(err);
        img.src = URL.createObjectURL(imageFile);
    });
}

const PRICE_REGEX = /(\$|€|£)?\s?([0-9]+[.,][0-9]{2})\b/g;
const DATE_REGEX = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})|(\d{4}[/-]\d{1,2}[/-]\d{1,2})|([A-Za-z]{3}\s\d{1,2},?\s\d{4})/;

export function parseReceiptText(text: string): Partial<ScannedData> {
    // Amount: Find standard price formats, pick the largest one (usually Total)
    const priceMatches = [...text.matchAll(PRICE_REGEX)];
    let maxAmount = 0;
    for (const match of priceMatches) {
        const valStr = match[2].replace(',', '.'); // Normalize decimal
        const val = parseFloat(valStr);
        if (!isNaN(val) && val > maxAmount && val < 10000) { // sanity cap lower
            maxAmount = val;
        }
    }

    // Date
    const dateMatch = text.match(DATE_REGEX);
    let dateObj: Date | undefined;
    if (dateMatch) {
        const dateStr = dateMatch[0];
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
            dateObj = parsed;
        }
    }

    // Merchant (First non-empty line)
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
    const merchant = lines.length > 0 ? lines[0] : undefined;

    return {
        amount: maxAmount > 0 ? maxAmount : undefined,
        date: dateObj,
        merchant
    };
}

export async function scanReceipt(imageFile: File, language = 'eng'): Promise<ScannedData> {
    try {
        const processedImage = await preprocessImage(imageFile);
        const worker = await Tesseract.createWorker(language);
        const ret = await worker.recognize(processedImage);
        const text = ret.data.text;
        const confidence = ret.data.confidence;
        await worker.terminate();

        const parsed = parseReceiptText(text);

        return {
            text,
            confidence,
            ...parsed
        } as ScannedData;

    } catch (error) {
        console.error("OCR Error:", error);
        throw new Error("Failed to scan receipt.");
    }
}
