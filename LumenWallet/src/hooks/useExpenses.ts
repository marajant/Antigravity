import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Expense } from '@/lib/db';
import { generateExpenseHash } from '@/lib/hashing';

export function useExpenses() {
    const expenses = useLiveQuery(() => db.expenses.orderBy('date').reverse().toArray());
    const categories = useLiveQuery(() => db.categories.toArray());

    const addExpense = async (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'hash'>) => {
        const hash = await generateExpenseHash(
            expense.amount,
            expense.date,
            expense.merchant,
            expense.currency
        );

        const existing = await db.expenses.where('hash').equals(hash).first();
        if (existing) {
            throw new Error('Duplicate expense detected.');
        }

        await db.expenses.add({
            ...expense,
            id: crypto.randomUUID(),
            hash,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    };

    const updateExpense = async (id: string, updates: Partial<Expense>) => {
        await db.expenses.update(id, {
            ...updates,
            updatedAt: new Date(),
        });
    };

    const deleteExpense = async (id: string) => {
        await db.expenses.delete(id);
    };

    const getCategory = (id: string) => categories?.find((c) => c.id === id);

    return {
        expenses,
        categories,
        addExpense,
        updateExpense,
        deleteExpense,
        getCategory,
    };
}
