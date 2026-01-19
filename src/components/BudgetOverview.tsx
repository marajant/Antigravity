import { motion } from 'framer-motion';
import { type BudgetProgress } from '../lib/analytics';

interface BudgetOverviewProps {
    data: BudgetProgress[];
    currencySymbol?: string;
}

export function BudgetOverview({ data, currencySymbol = '$' }: BudgetOverviewProps) {
    if (data.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                <p>No budgets set for this month.</p>
                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Go to Settings to set monthly budgets.</p>
            </div>
        );
    }

    return (
        <div className="custom-scrollbar" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            maxHeight: '400px',
            overflowY: 'auto',
            paddingRight: '0.5rem', // Prevent scrollbar overlap
            flex: 1
        }}>
            <style>
                {`
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 6px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: var(--border-color);
                        border-radius: 3px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: var(--text-secondary);
                    }
                `}
            </style>
            {data.map((item) => (
                <div key={item.categoryId} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.categoryName}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <span style={{ color: item.percentage > 100 ? 'var(--error)' : 'var(--text-primary)', fontWeight: 600 }}>
                                {currencySymbol}{item.spent.toFixed(2)}
                            </span>
                            {' / '}{currencySymbol}{item.budget.toFixed(0)}
                        </span>
                    </div>

                    <div style={{
                        height: '8px',
                        background: 'var(--border-color)',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(item.percentage, 100)}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            style={{
                                height: '100%',
                                background: item.percentage > 90 ? (item.percentage > 100 ? 'var(--error)' : 'orange') : item.color,
                                borderRadius: '4px'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: item.percentage > 100 ? 'var(--error)' : 'var(--text-secondary)'
                        }}>
                            {item.percentage.toFixed(0)}%
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
