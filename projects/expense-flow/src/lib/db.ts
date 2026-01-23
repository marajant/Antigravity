import Dexie, { type Table } from 'dexie';

export interface Expense {
    id?: number;
    amount: number;
    currency: string;
    merchant: string;
    date: Date;
    categoryId?: number;
    // New fields
    file_hash?: string;
    isTaxRelevant: number; // 0 or 1
    receiptImage?: string; // Base64 string
    createdAt: Date;
    description?: string;
}

export interface Category {
    id?: number;
    name: string;
    color: string;
    icon?: string;
}

export interface Budget {
    id?: number;
    categoryId: number;
    amount: number;
    period: string; // Format: YYYY-MM
}

export interface ExchangeRate {
    id?: string; // Currency code, e.g., 'EUR'
    rate: number; // Rate relative to base currency (USD)
    updatedAt: Date;
}

export interface UserSettings {
    id: string; // 'app_settings'
    baseCurrency: string;
    notificationsEnabled: boolean;
    showBudgetCard: boolean;
}

export class ExpenseDB extends Dexie {
    expenses!: Table<Expense>;
    categories!: Table<Category>;
    budgets!: Table<Budget>;
    exchangeRates!: Table<ExchangeRate>;
    settings!: Table<UserSettings>;

    constructor() {
        super('ExpenseFlowDB');

        // Version 5: Added exchangeRates and settings
        this.version(5).stores({
            expenses: '++id, date, categoryId, merchant, file_hash, isTaxRelevant',
            categories: '++id, &name',
            budgets: '++id, categoryId, period, [categoryId+period]',
            exchangeRates: 'id',
            settings: 'id'
        });

        // Version 4: Added budgets

        // Version 3: Added receiptImage
        this.version(3).stores({
            expenses: '++id, date, categoryId, merchant, file_hash, isTaxRelevant',
            categories: '++id, &name'
        });

        // Version 2: Added file_hash and isTaxRelevant
        this.version(2).stores({
            expenses: '++id, date, categoryId, merchant, file_hash, isTaxRelevant',
            categories: '++id, &name'
        }).upgrade(() => {
            // Optional: Populate defaults for existing rows if needed
            // But usually Dexie handles new optional fields fine (they will be undefined)
        });

        // Version 1 fallback if new install
        this.version(1).stores({
            expenses: '++id, date, categoryId, merchant',
            categories: '++id, &name'
        });
    }
}

export const db = new ExpenseDB();

// Populate initial data if DB is empty
db.on('populate', () => {
    db.categories.bulkAdd([
        { name: 'Food & Dining', color: 'hsl(340, 70%, 60%)', icon: 'utensils' },
        { name: 'Transportation', color: 'hsl(220, 70%, 60%)', icon: 'car' },
        { name: 'Utilities', color: 'hsl(40, 90%, 60%)', icon: 'zap' },
        { name: 'Rent/Lease', color: 'hsl(250, 70%, 60%)', icon: 'home' },
        { name: 'Office Supplies', color: 'hsl(150, 60%, 40%)', icon: 'briefcase' },
        { name: 'Others', color: 'hsl(0, 0%, 50%)', icon: 'circle' },
    ]);

    db.settings.add({
        id: 'app_settings',
        baseCurrency: 'USD',
        notificationsEnabled: false,
        showBudgetCard: true
    });

    db.exchangeRates.bulkAdd([
        { id: 'USD', rate: 1.0, updatedAt: new Date() },
        { id: 'EUR', rate: 0.92, updatedAt: new Date() },
        { id: 'GBP', rate: 0.79, updatedAt: new Date() },
        { id: 'JPY', rate: 151.45, updatedAt: new Date() },
        { id: 'CAD', rate: 1.35, updatedAt: new Date() },
        { id: 'AUD', rate: 1.52, updatedAt: new Date() },
        { id: 'CNY', rate: 7.24, updatedAt: new Date() },
        { id: 'INR', rate: 83.12, updatedAt: new Date() },
        { id: 'MXN', rate: 17.08, updatedAt: new Date() },
        { id: 'BRL', rate: 4.97, updatedAt: new Date() },
        { id: 'KRW', rate: 1329.50, updatedAt: new Date() },
        { id: 'CHF', rate: 0.88, updatedAt: new Date() },
        { id: 'SGD', rate: 1.34, updatedAt: new Date() },
        { id: 'NZD', rate: 1.67, updatedAt: new Date() },
        { id: 'HKD', rate: 7.81, updatedAt: new Date() },
    ]);
});

// Ensure currencies and settings exist for existing databases (migration for users who already have data)
db.on('ready', async () => {
    try {
        const currencyList = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CNY', 'INR', 'MXN', 'BRL', 'KRW', 'CHF', 'SGD', 'NZD', 'HKD'];
        const currencyRates: Record<string, number> = {
            USD: 1.0, EUR: 0.92, GBP: 0.79, JPY: 151.45, CAD: 1.35,
            AUD: 1.52, CNY: 7.24, INR: 83.12, MXN: 17.08, BRL: 4.97,
            KRW: 1329.50, CHF: 0.88, SGD: 1.34, NZD: 1.67, HKD: 7.81
        };

        const existing = await db.exchangeRates.toArray();
        const existingIds = new Set(existing.map(e => e.id));

        const missing = currencyList.filter(c => !existingIds.has(c));
        if (missing.length > 0) {
            await db.exchangeRates.bulkAdd(
                missing.map(id => ({ id, rate: currencyRates[id], updatedAt: new Date() }))
            );
        }

        // Ensure showBudgetCard exists for existing users
        // Ensure app_settings exists for existing users (migration)
        const settings = await db.settings.get('app_settings');
        if (!settings) {
            await db.settings.add({
                id: 'app_settings',
                baseCurrency: 'USD',
                notificationsEnabled: false,
                showBudgetCard: true
            });
        } else if (settings.showBudgetCard === undefined) {
            await db.settings.update('app_settings', { showBudgetCard: true });
        }
    } catch (error) {
        console.error('Database migration error:', error);
        // Non-fatal: app can still function with defaults
    }
});
