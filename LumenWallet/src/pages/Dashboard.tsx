import { useExpenses } from "@/hooks/useExpenses";
import { Card, CardHeader, CardTitle, CardContent } from "@/ui/Card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { fadeIn, staggerContainer } from "@/lib/animations";

export default function Dashboard() {
    const { expenses, getCategory } = useExpenses();

    const totalSpent = expenses?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

    // Calculate category breakdown
    const categoryData = expenses?.reduce((acc, curr) => {
        const cat = getCategory(curr.categoryId)?.name || 'Unknown';
        acc[cat] = (acc[cat] || 0) + curr.amount;
        return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(categoryData || {}).map(([name, value]) => ({
        name,
        value,
    }));



    return (
        <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-6"
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div variants={fadeIn}>
                    <Card className="glass-panel border-l-4 border-l-primary">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-medium text-muted-foreground">
                                Total Spent
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{formatCurrency(totalSpent)}</div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center">
                                <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                                +12% from last month
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={fadeIn}>
                    <Card className="glass-panel">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-medium text-muted-foreground">Top Category</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold font-mono">
                                {chartData.length > 0
                                    ? chartData.sort((a, b) => b.value - a.value)[0].name
                                    : "N/A"}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center">
                                <TrendingUp className="h-4 w-4 text-primary mr-1" />
                                Most active this month
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={fadeIn}>
                    <Card className="glass-panel">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-medium text-muted-foreground">Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold font-mono">{expenses?.length || 0}</div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center">
                                Transactions recorded
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div >

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div variants={fadeIn}>
                    <Card className="h-[400px] glass-panel">
                        <CardHeader>
                            <CardTitle>Spending by Category</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {// Using Lumen Palette Colors - Cyan, Gold, Navy-ish variants
                                                chartData.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#66CCFF', '#EBD675', '#4CA3D9', '#C9B558', '#3380AA'][index % 5]} />
                                                ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsla(220, 25%, 12%, 0.8)',
                                                borderColor: 'rgba(255,255,255,0.1)',
                                                borderRadius: '12px',
                                                backdropFilter: 'blur(12px)',
                                                color: '#f2f2f2'
                                            }}
                                            itemStyle={{ color: '#EBD675', fontFamily: 'JetBrains Mono' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    No data available
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={fadeIn}>
                    <Card className="h-[400px] overflow-hidden flex flex-col glass-panel">
                        <CardHeader>
                            <CardTitle>Recent Expenses</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto">
                            <div className="space-y-4">
                                {expenses?.slice(0, 5).map((expense) => (
                                    <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                                {getCategory(expense.categoryId)?.name[0] || '?'}
                                            </div>
                                            <div>
                                                <p className="font-medium">{expense.merchant}</p>
                                                <p className="text-xs text-muted-foreground">{formatDate(expense.date)}</p>
                                            </div>
                                        </div>
                                        <span className="font-bold text-gradient font-mono">
                                            {formatCurrency(expense.amount, expense.currency)}
                                        </span>
                                    </div>
                                ))}
                                {(!expenses || expenses.length === 0) && (
                                    <div className="text-center text-muted-foreground py-8">No expenses yet.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </motion.div >
    );
}
