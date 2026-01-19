import { type Insight } from '../lib/analytics';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';

interface InsightsWidgetProps {
    insights: Insight[];
}

export function InsightsWidget({ insights }: InsightsWidgetProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {insights.map((insight, idx) => (
                <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    style={{
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        background: insight.type === 'warning' ? 'hsla(var(--danger-hue), 80%, 60%, 0.1)' :
                            insight.type === 'positive' ? 'hsla(var(--success-hue), 80%, 60%, 0.1)' :
                                'var(--surface-color)',
                        border: insight.type === 'warning' ? '1px solid hsla(var(--danger-hue), 80%, 60%, 0.2)' :
                            insight.type === 'positive' ? '1px solid hsla(var(--success-hue), 80%, 60%, 0.2)' :
                                '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'start',
                        gap: '0.75rem'
                    }}
                >
                    {insight.type === 'warning' && <TrendingUp size={20} color="hsl(var(--danger-hue), 80%, 60%)" />}
                    {insight.type === 'positive' && <TrendingDown size={20} color="hsl(var(--success-hue), 80%, 60%)" />}
                    {insight.type === 'neutral' && <Info size={20} color="var(--primary)" />}

                    <div>
                        <p style={{ margin: 0, fontWeight: 500, fontSize: '0.95rem' }}>
                            {insight.type === 'warning' ? 'Spending Alert' :
                                insight.type === 'positive' ? 'Good Job!' : 'Insight'}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {insight.message}
                        </p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
