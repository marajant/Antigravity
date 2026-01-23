import Dexie, { type EntityTable } from 'dexie';

export interface Expense {
    id: string; // UUID
    amount: number;
    currency: string;
    date: Date;
    categoryId: string;
    merchant: string;
    notes?: string;
    receiptImage?: string; // Base64 or Blob URL
    createdAt: Date;
    updatedAt: Date;
    hash?: string; // SHA-256 for duplicate detection
    confidence?: number; // OCR confidence score
}

export interface Category {
    id: string;
    name: string;
    icon: string; // Lucide icon name
    color: string; // Hex or Tailwind class
    isDefault?: boolean;
}

export interface Budget {
    id: string;
    categoryId: string;
    amount: number;
    period: 'monthly' | 'weekly' | 'yearly';
}

const db = new Dexie('ExpenseFlowDB') as Dexie & {
    expenses: EntityTable<Expense, 'id'>;
    categories: EntityTable<Category, 'id'>;
    budgets: EntityTable<Budget, 'id'>;
};

// Schema definition
db.version(1).stores({
    expenses: 'id, date, categoryId, merchant, hash, createdAt',
    categories: 'id, name',
    budgets: 'id, categoryId'
});

// Pre-populate default categories
db.on('populate', async () => {
    await db.categories.bulkAdd([
        { id: '1', name: 'Food & Dining', icon: 'Utensils', color: 'text-orange-500', isDefault: true },
        { id: '2', name: 'Transportation', icon: 'Car', color: 'text-blue-500', isDefault: true },
        { id: '3', name: 'Shopping', icon: 'ShoppingBag', color: 'text-pink-500', isDefault: true },
        { id: '4', name: 'Entertainment', icon: 'Film', color: 'text-purple-500', isDefault: true },
        { id: '5', name: 'Bills & Utilities', icon: 'Zap', color: 'text-yellow-500', isDefault: true },
        { id: '6', name: 'Health', icon: 'Heart', color: 'text-red-500', isDefault: true },
        { id: '7', name: 'Travel', icon: 'Plane', color: 'text-sky-500', isDefault: true },
        { id: '8', name: 'Other', icon: 'Circle', color: 'text-gray-500', isDefault: true },
    ]);
});

export { db };
