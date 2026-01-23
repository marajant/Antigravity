import { useState, useEffect } from 'react';

const BACKUP_KEY = 'last_backup_date';
const REMINDER_DAYS = 30;

export function useBackupReminder() {
    const [shouldRemind, setShouldRemind] = useState(false);

    useEffect(() => {
        const lastBackup = localStorage.getItem(BACKUP_KEY);
        if (!lastBackup) {
            // If never backed up, remind after a few days of usage? 
            // For now, let's just assume immediate first reminder isn't needed unless user has data.
            return;
        }

        const lastDate = new Date(lastBackup);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > REMINDER_DAYS) {
            setShouldRemind(true);
        }
    }, []);

    const dismissReminder = () => {
        setShouldRemind(false);
        // Snooze or reset? Let's just reset timer for simplicity in this MVP
        localStorage.setItem(BACKUP_KEY, new Date().toISOString());
    };

    return { shouldRemind, dismissReminder };
}

export function recordBackup() {
    localStorage.setItem(BACKUP_KEY, new Date().toISOString());
}
