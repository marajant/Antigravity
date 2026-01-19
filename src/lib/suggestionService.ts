import { db } from './db';

/**
 * Computes Levenshtein distance between two strings.
 */
function levenshtein(a: string, b: string): number {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

/**
 * Scans the raw text of a receipt to find any known merchant names from the user's history.
 * Uses strict inclusion FIRST, then fuzzy matching.
 */
export function findMerchantInText(rawText: string, knownMerchants: string[]): string | undefined {
    if (!rawText || knownMerchants.length === 0) return undefined;

    const normalizedText = rawText.toLowerCase();
    const normalizedRawSquashed = normalizedText.replace(/[^a-z0-9]/g, ''); // "dotloop"

    // Sort merchants by length descending. 
    const sorted = [...knownMerchants].sort((a, b) => b.length - a.length);

    // 1. Strict Include Check (Standard)
    // Good for "Welcome to Home Depot"
    for (const merchant of sorted) {
        if (merchant.length >= 2 && normalizedText.includes(merchant.toLowerCase())) {
            return merchant;
        }
    }

    // 2. Super Strict Include Check (Squashed)
    // Good for "888-DOTLOOP" vs "Dot Loop" -> "888dotloop" includes "dotloop"
    for (const merchant of sorted) {
        const squashedMerchant = merchant.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (squashedMerchant.length < 3) continue; // Safety

        if (normalizedRawSquashed.includes(squashedMerchant)) {
            return merchant;
        }
    }

    // 3. Fuzzy Check (Slower but robust for OCR errors)
    // Improvement: Split by non-alphanumeric to handle "dotioop.com" -> "dotioop"
    const headerText = rawText.substring(0, 1000).toLowerCase(); // Increased limit
    const tokens = headerText.split(/[^a-z0-9]+/);
    const relevantTokens = tokens.filter(t => t.length > 2);

    for (const merchant of sorted) {
        if (merchant.length < 4) continue;
        const squashedMerchant = merchant.toLowerCase().replace(/[^a-z0-9]/g, '');

        for (const token of relevantTokens) {
            // Optimization: Length diff
            if (Math.abs(token.length - squashedMerchant.length) > 2) continue;

            const dist = levenshtein(token, squashedMerchant);

            // Tolerance: 1 error for short (<6), 2 for longer
            const threshold = squashedMerchant.length > 6 ? 2 : 1;

            if (dist <= threshold) {
                return merchant;
            }
        }
    }

    // 4. Special Case Aliases (Hardcoded for common issues)
    if (normalizedText.includes("waste management") || normalizedText.includes("wm corporate")) {
        const target = knownMerchants.find(m => m === "WM" || m === "Waste Management");
        if (target) return target;
    }

    return undefined;
}

/**
 * Predicts the category for a given merchant based on historical data.
 * Uses a "Most Frequent" strategy (Profile Mode) rather than just "Last Used".
 */
export async function predictCategory(merchantName: string): Promise<number | undefined> {
    const expenses = await db.expenses
        .where('merchant').equalsIgnoreCase(merchantName)
        .toArray();

    if (expenses.length === 0) return undefined;

    // Count occurrences of each category for this merchant
    const counts: Record<number, number> = {};
    for (const e of expenses) {
        if (e.categoryId) {
            counts[e.categoryId] = (counts[e.categoryId] || 0) + 1;
        }
    }

    // Find the category with the highest count
    let bestCatId: number | undefined;
    let maxCount = 0;

    for (const [catId, count] of Object.entries(counts)) {
        if (count > maxCount) {
            maxCount = count;
            bestCatId = Number(catId);
        }
    }

    return bestCatId;
}
