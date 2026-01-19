import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { type DailySpend, type ForecastSpend } from '../lib/analytics';
import { motion } from 'framer-motion';

type ChartData = DailySpend | ForecastSpend;

interface SpendingChartProps {
    data: ChartData[];
    currencySymbol?: string;
}

export function SpendingChart({ data, currencySymbol = '$' }: SpendingChartProps) {
    if (data.length === 0) {
        return (
            <div className="flex-center" style={{ height: '300px', color: 'var(--text-secondary)' }}>
                Not enough data to show forecast.
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ width: '100%', height: '100%', minHeight: 300, display: 'flex', flexDirection: 'column' }}
        >
            <div style={{ flex: 1, position: 'relative', width: '100%', minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                        <XAxis
                            dataKey="date"
                            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => {
                                const d = new Date(value);
                                return `${d.getMonth() + 1}/${d.getDate()}`;
                            }}
                        />
                        <YAxis
                            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => `${currencySymbol}${val}`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--surface-color)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                boxShadow: 'var(--shadow-lg)'
                            }}
                            itemStyle={{ color: 'var(--text-primary)' }}
                            formatter={(value, _name, item) => {
                                const isForecast = (item?.payload as { isForecast?: boolean })?.isForecast;
                                const label = isForecast ? 'Forecast' : 'Spent';
                                return [`${currencySymbol}${(Number(value) || 0).toFixed(2)}`, label];
                            }}
                            labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        />
                        <Area
                            type="monotone"
                            dataKey="amount"
                            stroke="var(--primary)"
                            fillOpacity={1}
                            fill="url(#colorSpend)"
                            strokeWidth={2}
                            activeDot={{ r: 6 }}
                            // Only draw solid line for non-forecast
                            connectNulls
                        />
                        <Area
                            type="monotone"
                            dataKey="amount"
                            stroke="var(--primary)"
                            strokeDasharray="5 5"
                            fill="none"
                            strokeWidth={2}
                            connectNulls
                            data={data.filter((d): d is ForecastSpend => 'isForecast' in d && d.isForecast)}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}
