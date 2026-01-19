export interface SmartParseResult {
    date?: string;
    merchant?: string;
    confidence: number;
}

export function smartParseFilename(filename: string): SmartParseResult {
    let date: string | undefined;
    let merchant: string | undefined;
    let confidence = 0;

    // 1. Extract Date (YYYY-MM-DD)
    // Looking for patterns like 2024-08-19 or 2023-12-01
    const dateRegex = /(\d{4}-\d{2}-\d{2})/;
    const dateMatch = filename.match(dateRegex);
    if (dateMatch) {
        date = dateMatch[1];
        confidence += 0.4;
    }

    // 2. Extract Merchant
    // Logic: 
    // - Remove date
    // - Remove extension
    // - Remove common suffixes like "Receipt", "eReceipt", "contract"
    // - Remove random IDs (e.g., "tmpcm1ygdvj", "st2203-442217")

    let cleanName = filename;

    // Remove extension
    cleanName = cleanName.replace(/\.[^/.]+$/, "");

    // Remove Date
    if (date) {
        cleanName = cleanName.replace(date, "");
    }

    // Remove common junk words/patterns
    cleanName = cleanName
        .replace(/eReceipt/gi, "")
        .replace(/Receipt/gi, "")
        .replace(/Invoice/gi, "") // Added
        .replace(/DirectInvoice/gi, "") // Added
        .replace(/Statement/gi, "") // Added
        .replace(/Bill/gi, "") // Added
        .replace(/aspx/gi, "") // Added
        .replace(/contract/gi, "")
        .replace(/Page \d+ Of \d+/gi, "") // "Page 1 Of 2"
        .replace(/data \d+/gi, "") // "data 16"
        .replace(/_/g, " ") // Convert underscores to spaces
        .replace(/-/g, " ") // Convert dashes to spaces
        .replace(/\s+/g, " "); // Collapse multiple spaces

    // Remove ID-like strings (mixed numbers/letters, usually > 6 chars, or specifically "st..." style IDs)
    // Example: "tmpcm1ygdvj", "st2203 442217"
    const words = cleanName.split(' ').filter(w => {
        // Filter out:
        // - Long mixed strings (IDs)
        // - "st" style IDs
        // - "tmp" style IDs
        // - Purely numeric strings or strings like "(1)"
        const isId = (w.length > 8 && /[0-9]/.test(w)) ||
            (w.startsWith('st') && /[0-9]/.test(w)) ||
            (w.startsWith('tmp'));

        const isNoise = /^[\(\)\d]+$/.test(w); // Matches "(1)", "123", "()"

        return !isId && !isNoise && w.length > 2; // Keep words > 2 chars
    });

    if (words.length > 0) {
        merchant = words.join(' ').trim();
        // Capitalize words
        merchant = merchant.replace(/\b\w/g, l => l.toUpperCase());
        confidence += 0.4;
    }

    return { date, merchant, confidence };
}
