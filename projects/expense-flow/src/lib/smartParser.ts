/**
 * Result of parsing a filename for expense-related information.
 */
export interface SmartParseResult {
    /** ISO date string (YYYY-MM-DD) if detected */
    date?: string;
    /** Merchant name extracted from filename */
    merchant?: string;
    /** Confidence score from 0 to 1 */
    confidence: number;
}

/** Patterns to remove from filenames when extracting merchant names */
const JUNK_PATTERNS: RegExp[] = [
    /eReceipt/gi,
    /Receipt/gi,
    /Invoice/gi,
    /DirectInvoice/gi,
    /Statement/gi,
    /Bill/gi,
    /aspx/gi,
    /contract/gi,
    /Page \d+ Of \d+/gi,
    /data \d+/gi,
];

/** Minimum word length to keep after filtering */
const MIN_WORD_LENGTH = 2;

/** Maximum length for ID-like strings with numbers */
const ID_STRING_MAX_LENGTH = 8;

/**
 * Extracts date and merchant information from a filename.
 * 
 * Uses heuristics to identify:
 * - Dates in YYYY-MM-DD format
 * - Merchant names by filtering out common junk patterns and IDs
 * 
 * @param filename - The filename to parse
 * @returns Parsed result with date, merchant, and confidence score
 * 
 * @example
 * smartParseFilename('2024-08-19_Starbucks_Receipt.pdf')
 * // { date: '2024-08-19', merchant: 'Starbucks', confidence: 0.8 }
 */
export function smartParseFilename(filename: string): SmartParseResult {
    let date: string | undefined;
    let merchant: string | undefined;
    let confidence = 0;

    // 1. Extract Date (YYYY-MM-DD format)
    const dateRegex = /(\d{4}-\d{2}-\d{2})/;
    const dateMatch = filename.match(dateRegex);
    if (dateMatch) {
        date = dateMatch[1];
        confidence += 0.4;
    }

    // 2. Extract Merchant
    let cleanName = filename;

    // Remove file extension
    cleanName = cleanName.replace(/\.[^/.]+$/, '');

    // Remove detected date
    if (date) {
        cleanName = cleanName.replace(date, '');
    }

    // Remove junk patterns
    for (const pattern of JUNK_PATTERNS) {
        cleanName = cleanName.replace(pattern, '');
    }

    // Normalize separators
    cleanName = cleanName
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .replace(/\s+/g, ' ');

    // Filter out ID-like strings and noise
    const words = cleanName.split(' ').filter(word => {
        const isIdString =
            (word.length > ID_STRING_MAX_LENGTH && /[0-9]/.test(word)) ||
            (word.startsWith('st') && /[0-9]/.test(word)) ||
            word.startsWith('tmp');

        const isNoise = /^[()\\d]+$/.test(word);

        return !isIdString && !isNoise && word.length > MIN_WORD_LENGTH;
    });

    if (words.length > 0) {
        // Capitalize each word
        merchant = words
            .join(' ')
            .trim()
            .replace(/\b\w/g, char => char.toUpperCase());
        confidence += 0.4;
    }

    return { date, merchant, confidence };
}
