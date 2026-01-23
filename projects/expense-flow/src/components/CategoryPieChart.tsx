import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { type CategoryData } from '../lib/analytics';

interface CategoryPieChartProps {
    data: CategoryData[];
    currencySymbol?: string;
}

export function CategoryPieChart({ data, currencySymbol = '$' }: CategoryPieChartProps) {
    if (data.length === 0) {
        return <div className="flex-center" style={{ height: '300px', color: 'var(--text-secondary)' }}>No category data</div>;
    }

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data as any}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value) => `${currencySymbol}${Number(value).toFixed(2)}`}
                        contentStyle={{ borderRadius: 'var(--radius-md)', background: 'var(--surface-color)', border: '1px solid var(--border-color)' }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '0.85rem', paddingTop: '10px' }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
