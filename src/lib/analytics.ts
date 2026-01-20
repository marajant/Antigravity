import { type Expense, type ExchangeRate, type Category, type Budget } from './db';

export interface DailySpend {
    date: string; // YYYY-MM-DD
    amount: number;
}

export interface ForecastSpend extends DailySpend {
    isForecast: true;
}

export interface Insight {
    type: 'warning' | 'positive' | 'neutral';
    message: string;
}

export function getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
        'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'CAD': '$',
        'AUD': '$', 'CNY': '¥', 'INR': '₹', 'MXN': '$', 'BRL': 'R$',
        'KRW': '₩', 'CHF': 'Fr', 'SGD': '$', 'NZD': '$', 'HKD': '$'
    };
    return symbols[currency] || currency;
}

/**
 * Convert an amount from source currency to target currency using USD-based rates.
 * Logic: Source -> USD -> Target
 */
export function convertAmount(amount: number, sourceCurrency: string, targetCurrency: string, rates: ExchangeRate[]): number {
    if (sourceCurrency === targetCurrency) return amount;

    // 1. Normalize to USD
    let usdAmount = amount;
    if (sourceCurrency !== 'USD') {
        const rate = rates.find(r => r.id === sourceCurrency);
        if (rate && rate.rate > 0) {
            usdAmount = amount / rate.rate;
        } else {
            console.warn(`Missing rate for ${sourceCurrency}, assuming 1:1 to USD`);
        }
    }

    // 2. Convert USD to Target
    if (targetCurrency === 'USD') return usdAmount;

    const targetRate = rates.find(r => r.id === targetCurrency);
    if (!targetRate || targetRate.rate === 0) {
        console.warn(`Missing rate for ${targetCurrency}, keeping as USD`);
        return usdAmount;
    }

    return usdAmount * targetRate.rate;
}

export function calculateMonthlyTotal(
    expenses: Expense[],
    date: Date = new Date(),
    rates: ExchangeRate[] = [],
    targetCurrency: string = 'USD'
): number {
    return expenses
        .filter(e => {
            const d = new Date(e.date);
            return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
        })
        .reduce((sum, e) => sum + convertAmount(e.amount, e.currency || 'USD', targetCurrency, rates), 0);
}

export function calculateSpendingTrend(expenses: Expense[], rates: ExchangeRate[] = [], targetCurrency: string = 'USD'): DailySpend[] {
    const dailyMap = new Map<string, number>();

    expenses.forEach(e => {
        const d = new Date(e.date);
        const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
        const val = convertAmount(e.amount, e.currency || 'USD', targetCurrency, rates);
        dailyMap.set(key, (dailyMap.get(key) || 0) + val);
    });

    return Array.from(dailyMap.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

export function generateInsights(expenses: Expense[], rates: ExchangeRate[] = [], targetCurrency: string = 'USD'): Insight[] {
    const insights: Insight[] = [];

    if (expenses.length === 0) {
        return [{ type: 'neutral', message: 'Add expenses to see AI insights.' }];
    }

    const thisMonthTotal = calculateMonthlyTotal(expenses, new Date(), rates, targetCurrency);
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonthTotal = calculateMonthlyTotal(expenses, lastMonthDate, rates, targetCurrency);

    // 1. Month-over-Month Comparison
    if (lastMonthTotal > 0) {
        const diff = thisMonthTotal - lastMonthTotal;
        const pct = (diff / lastMonthTotal) * 100;

        if (diff > 0) {
            insights.push({
                type: 'warning',
                message: `Spending is up ${pct.toFixed(0)}% vs last month.`
            });
        } else {
            insights.push({
                type: 'positive',
                message: `You've saved ${Math.abs(pct).toFixed(0)}% vs last month!`
            });
        }
    } else if (thisMonthTotal > 0) {
        const currencySymbol = getCurrencySymbol(targetCurrency);
        insights.push({ type: 'neutral', message: `Total spending this month: ${currencySymbol}${thisMonthTotal.toFixed(2)}` });
    }

    // 2. High Value Transaction Detection (use spread to avoid mutating original array)
    // Note: This check logic relies on native amounts, which might be mixed. Ideally convert to base first.
    // For simplicity, we'll convert all to Target for sorting.
    const sortedByVal = [...expenses]
        .map(e => ({ ...e, convertedAmount: convertAmount(e.amount, e.currency || 'USD', targetCurrency, rates) }))
        .sort((a, b) => b.convertedAmount - a.convertedAmount);

    const highValue = sortedByVal[0];
    // Threshold: 500 USD roughly. If Target != USD, we arguably should scale threshold. 
    // Let's approximate threshold as 500 units of target for now or use convertAmount(500, 'USD', target).
    const threshold = convertAmount(500, 'USD', targetCurrency, rates);

    if (highValue && highValue.convertedAmount > threshold) {
        const currencySymbol = getCurrencySymbol(targetCurrency);
        insights.push({
            type: 'neutral',
            message: `Big ticket item detected: ${highValue.merchant} (${currencySymbol}${highValue.convertedAmount.toFixed(0)})`
        });
    }

    // 3. Tax Insight
    const taxCount = expenses.filter(e => e.isTaxRelevant === 1).length;
    if (taxCount > 0) {
        insights.push({
            type: 'positive',
            message: `${taxCount} tax-deductible items tracked this period.`
        });
    }

    return insights;
}

/**
 * Triple Exponential Smoothing (Holt-Winters)
 * Seasonality is assumed to be 12 (monthly)
 */
export function generateForecast(expenses: Expense[], monthsToForecast = 3, rates: ExchangeRate[] = [], targetCurrency: string = 'USD'): DailySpend[] {
    // 1. Prepare monthly historical data
    const monthlyMap = new Map<string, number>();
    const now = new Date();

    // Get last 24 months
    for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap.set(key, 0);
    }

    expenses.forEach(e => {
        const d = new Date(e.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyMap.has(key)) {
            monthlyMap.set(key, (monthlyMap.get(key) || 0) + convertAmount(e.amount, e.currency || 'USD', targetCurrency, rates));
        }
    });

    const data = Array.from(monthlyMap.values());
    const nonZeroMonths = data.filter(v => v > 0).length;

    // Fallback: Simple Average Projection
    if (nonZeroMonths === 0) return []; // No data at all

    const forecast: DailySpend[] = [];

    // HEURISTIC: If first 12 months are ALL zero, Holt-Winters init fails.
    const firstYearSum = data.slice(0, 12).reduce((a, b) => a + b, 0);

    if (firstYearSum === 0) {
        // Use Simple Moving Average / Last Value logic
        const sum = data.reduce((a, b) => a + b, 0);
        const avg = sum / nonZeroMonths;

        for (let m = 1; m <= monthsToForecast; m++) {
            const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
            forecast.push({
                date: d.toISOString().split('T')[0],
                amount: Math.round(avg), // Simple average
                isForecast: true
            } as ForecastSpend);
        }
        return forecast;
    }

    // Holt-Winters Triple Exponential Smoothing Parameters
    const SMOOTHING_CONFIG = {
        alpha: 0.3,       // Level
        beta: 0.1,        // Trend
        gamma: 0.2,       // Seasonality
        seasonLength: 12  // Monthly cycle
    } as const;

    const { alpha, beta, gamma, seasonLength } = SMOOTHING_CONFIG;

    // Initial values
    let level = data[0];
    let trend = data.length > seasonLength ? (data[seasonLength] - data[0]) / seasonLength : 0;
    // Safe divide for seasonality
    const avg = data.reduce((a, b) => a + b) / data.length || 1;
    const seasonals = Array(seasonLength).fill(1).map((_, i) => data[i] / avg);

    // Smoothing loops
    for (let i = 0; i < data.length; i++) {
        const value = data[i];
        const lastLevel = level;
        // avoid divide by zero if seasonal is 0?
        const seas = seasonals[i % seasonLength] || 1;

        level = alpha * (value / seas) + (1 - alpha) * (level + trend);
        trend = beta * (level - lastLevel) + (1 - beta) * trend;
        seasonals[i % seasonLength] = gamma * (value / level) + (1 - gamma) * seasonals[i % seasonLength];
    }

    // Predict
    for (let m = 1; m <= monthsToForecast; m++) {
        const seas = seasonals[(data.length + m - 1) % seasonLength] || 1;
        const predictedVal = (level + m * trend) * seas;
        const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
        forecast.push({
            date: d.toISOString().split('T')[0],
            amount: Math.max(0, predictedVal),
            isForecast: true
        } as ForecastSpend);
    }

    return forecast;
}

export interface CategoryData {
    name: string;
    value: number;
    color: string;
}

export function calculateCategoryBreakdown(expenses: Expense[], categories: Category[], rates: ExchangeRate[] = [], targetCurrency: string = 'USD'): CategoryData[] {
    const map = new Map<number, number>();
    expenses.forEach(e => {
        const amount = convertAmount(e.amount, e.currency || 'USD', targetCurrency, rates);
        if (e.categoryId) {
            map.set(e.categoryId, (map.get(e.categoryId) || 0) + amount);
        } else {
            // ID -1 for Uncategorized
            map.set(-1, (map.get(-1) || 0) + amount);
        }
    });

    const result: CategoryData[] = [];
    map.forEach((total, id) => {
        if (id === -1) {
            result.push({ name: 'Uncategorized', value: total, color: '#999' });
        } else {
            const cat = categories.find(c => c.id === id);
            if (cat) {
                result.push({ name: cat.name, value: total, color: cat.color });
            }
        }
    });

    return result.sort((a, b) => b.value - a.value);
}

export interface VendorData {
    name: string;
    value: number;
}

export function calculateTopVendors(expenses: Expense[], topN = 5, rates: ExchangeRate[] = [], targetCurrency: string = 'USD'): VendorData[] {
    const map = new Map<string, number>();
    expenses.forEach(e => {
        const name = e.merchant || 'Unknown';
        map.set(name, (map.get(name) || 0) + convertAmount(e.amount, e.currency || 'USD', targetCurrency, rates));
    });

    return Array.from(map.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, topN);
}

export interface BudgetProgress {
    categoryId: number;
    categoryName: string;
    spent: number;
    budget: number;
    color: string;
    percentage: number;
}

export function calculateBudgetProgress(
    expenses: Expense[],
    budgets: Budget[],
    categories: Category[],
    period: string,
    rates: ExchangeRate[] = [],
    targetCurrency: string = 'USD'
): BudgetProgress[] {
    const periodBudgets = budgets.filter(b => b.period === period && b.amount > 0);
    if (periodBudgets.length === 0) return [];

    return periodBudgets.map(budget => {
        const category = categories.find(c => c.id === budget.categoryId);
        const categoryExpenses = expenses.filter(e => {
            const expenseMonth = new Date(e.date).toISOString().slice(0, 7);
            return e.categoryId === budget.categoryId && expenseMonth === period;
        });

        // Convert budget amount? Usually user sets budget in BASE currency naturally.
        // We assume budget amounts are always in User's Base Currency.
        // Expenses might be mixed, so we convert expense -> target(Base).
        const spent = categoryExpenses.reduce((sum, e) => sum + convertAmount(e.amount, e.currency || 'USD', targetCurrency, rates), 0);
        const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

        return {
            categoryId: budget.categoryId,
            categoryName: category?.name || 'Unknown',
            spent,
            budget: budget.amount,
            color: category?.color || '#999',
            percentage
        };
    }).sort((a, b) => b.budget - a.budget);
}
