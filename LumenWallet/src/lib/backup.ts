import { db, type Expense, type Category } from './db';
import { encryptData, decryptData, importKey } from './crypto';

export interface BackupData {
    version: number;
    date: string;
    expenses: Expense[];
    categories: Category[];
}

export async function createBackup(encryptionKey?: string): Promise<string> {
    const expenses = await db.expenses.toArray();
    const categories = await db.categories.toArray();

    const data: BackupData = {
        version: 1,
        date: new Date().toISOString(),
        expenses,
        categories,
    };

    const jsonString = JSON.stringify(data);

    if (encryptionKey) {
        try {
            const key = await importKey(encryptionKey);
            const { cipherText, iv } = await encryptData(jsonString, key);
            return JSON.stringify({ encrypted: true, cipherText, iv });
        } catch (e) {
            console.error("Encryption failed", e);
            throw new Error("Failed to encrypt backup.");
        }
    }

    return jsonString;
}

export async function importBackup(jsonContent: string, encryptionKey?: string): Promise<void> {
    let data: BackupData;

    try {
        const parsed = JSON.parse(jsonContent);

        if (parsed.encrypted && parsed.cipherText && parsed.iv) {
            if (!encryptionKey) {
                throw new Error("Backup is encrypted. Please provide a key.");
            }
            const key = await importKey(encryptionKey);
            const decryptedJson = await decryptData(parsed.cipherText, parsed.iv, key);
            data = JSON.parse(decryptedJson);
        } else {
            data = parsed;
        }

        if (!data.expenses || !data.categories) {
            throw new Error("Invalid backup format.");
        }

        await db.transaction('rw', db.expenses, db.categories, async () => {
            await db.expenses.clear();
            await db.categories.clear();
            await db.expenses.bulkAdd(data.expenses);
            await db.categories.bulkAdd(data.categories);
        });

    } catch (error) {
        console.error("Import failed", error);
        throw error;
    }
}

export function downloadBackup(content: string, filename = 'expenseflow-backup.json') {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
