// Basic currency conversion logic (mock rates for now, can be connected to API later)
const EXCHANGE_RATES: Record<string, number> = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.78,
    JPY: 150.0,
    CAD: 1.35,
    AUD: 1.52,
};

export const AVAILABLE_CURRENCIES = Object.keys(EXCHANGE_RATES);

export function convertCurrency(amount: number, from: string, to: string): number {
    if (from === to) return amount;

    const fromRate = EXCHANGE_RATES[from] || 1;
    const toRate = EXCHANGE_RATES[to] || 1;

    // Convert to USD first (base), then to target
    const amountInUSD = amount / fromRate;
    return amountInUSD * toRate;
}

export function formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    }).format(amount);
}
