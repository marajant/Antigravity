import { type BudgetProgress } from './analytics';

export const NotificationService = {
    async requestPermission(): Promise<boolean> {
        if (!('Notification' in window)) {
            console.warn('This browser does not support notifications.');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    },

    send(title: string, body: string, icon: string = '/vite.svg') {
        if (Notification.permission === 'granted') {
            new Notification(title, {
                body,
                icon,
                tag: title // Prevent duplicate notifications for same event
            });
        }
    },

    checkBudgetAlerts(budgetProgress: BudgetProgress[], lastAlerted: Set<number>): Set<number> {
        const newlyAlerted = new Set(lastAlerted);

        budgetProgress.forEach(item => {
            if (item.percentage >= 100 && !lastAlerted.has(item.categoryId)) {
                this.send(
                    'Budget Exceeded!',
                    `You have spent $${item.spent.toFixed(2)} in ${item.categoryName}, exceeding your budget of $${item.budget.toFixed(0)}!`
                );
                newlyAlerted.add(item.categoryId);
            } else if (item.percentage >= 90 && item.percentage < 100 && !lastAlerted.has(item.categoryId)) {
                this.send(
                    'Budget Warning',
                    `You have used ${item.percentage.toFixed(0)}% of your ${item.categoryName} budget ($${item.spent.toFixed(2)} / $${item.budget.toFixed(0)}).`
                );
                // We might not want to block 100% alert if we alert at 90%, 
                // but let's say we only alert once per category until it resets.
                // Actually, let's just track the 'highest' alert level.
                newlyAlerted.add(item.categoryId);
            }
        });

        return newlyAlerted;
    }
};
