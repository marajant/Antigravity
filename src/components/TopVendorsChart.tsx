import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { VendorData } from '../lib/analytics';

interface TopVendorsChartProps {
    data: VendorData[];
    currencySymbol?: string;
}

export function TopVendorsChart({ data, currencySymbol = '$' }: TopVendorsChartProps) {
    if (data.length === 0) return (
        <div className="flex-center" style={{ height: '100%', color: 'var(--text-secondary)' }}>
            <p>No vendor data available</p>
        </div>
    );

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
                <XAxis type="number" hide />
                <YAxis
                    dataKey="name"
                    type="category"
                    width={80}
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            return (
                                <div style={{
                                    background: 'var(--surface-color)',
                                    padding: '0.5rem',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                }}>
                                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{payload[0].payload.name}</p>
                                    <p style={{ margin: 0, color: 'var(--primary)', fontWeight: 'bold' }}>
                                        {currencySymbol}{Number(payload[0].value).toFixed(2)}
                                    </p>
                                </div>
                            );
                        }
                        return null;
                    }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {data.map((_, index) => (
                        <Cell key={`cell-${index}`} fill="hsl(250, 70%, 65%)" />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
