import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import { type VendorData } from '../lib/analytics';
import { motion } from 'framer-motion';

interface VendorBarChartProps {
    data: VendorData[];
    currencySymbol?: string;
}

export function VendorBarChart({ data, currencySymbol = '$' }: VendorBarChartProps) {
    if (data.length === 0) {
        return <div className="flex-center" style={{ height: '300px', color: 'var(--text-secondary)' }}>No vendor data</div>;
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', flex: 1, minHeight: 300 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={200}>
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border-color)" />
                    <XAxis type="number" hide />
                    <YAxis
                        dataKey="name"
                        type="category"
                        width={100}
                        tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip
                        cursor={{ fill: 'transparent' }}
                        formatter={(value) => `${currencySymbol}${Number(value).toFixed(2)}`}
                        contentStyle={{ borderRadius: 'var(--radius-md)', background: 'var(--surface-color)', border: '1px solid var(--border-color)' }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                        {data.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill="var(--primary)" fillOpacity={0.8 - (index * 0.1)} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </motion.div>
    );
}
