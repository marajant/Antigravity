export async function generateExpenseHash(
    amount: number,
    date: Date,
    merchant: string,
    currency: string
): Promise<string> {
    // Normalize data for consistent hashing
    const data = `${amount.toFixed(2)}|${date.toISOString().split('T')[0]}|${merchant.toLowerCase().trim()}|${currency}`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}
