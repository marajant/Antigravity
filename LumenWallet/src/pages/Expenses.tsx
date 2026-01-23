import { useState } from "react";
import { useExpenses } from "@/hooks/useExpenses";
import { Input } from "@/ui/Input";
import { Button } from "@/ui/Button";
import { Card, CardContent } from "@/ui/Card";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Search, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, slideUp } from "@/lib/animations";

export default function Expenses() {
    const { expenses, categories, deleteExpense, getCategory } = useExpenses();
    const [search, setSearch] = useState("");
    const [filterCategory, setFilterCategory] = useState<string | "all">("all");

    const filteredExpenses = expenses?.filter((expense) => {
        const matchesSearch = expense.merchant.toLowerCase().includes(search.toLowerCase()) ||
            (expense.notes?.toLowerCase().includes(search.toLowerCase()));
        const matchesCategory = filterCategory === "all" || expense.categoryId === filterCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <h2 className="text-3xl font-bold text-gradient">All Expenses</h2>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search merchant or notes..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <select
                        className="h-10 rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 glass-panel"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                    >
                        <option value="all">All Categories</option>
                        {categories?.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid gap-4"
            >
                <AnimatePresence>
                    {filteredExpenses?.map((expense) => (
                        <motion.div key={expense.id} variants={slideUp} layout>
                            <Card className="glass-panel overflow-hidden hover:bg-white/5 transition-colors">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-12 h-12 rounded-full flex items-center justify-center text-xl",
                                            getCategory(expense.categoryId)?.color?.replace('text-', 'bg-') + '/20',
                                            getCategory(expense.categoryId)?.color || 'text-gray-500'
                                        )}>
                                            {/* Ideally Render Icon Here */}
                                            {getCategory(expense.categoryId)?.name[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">{expense.merchant}</h3>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <span>{formatDate(expense.date)}</span>
                                                <span>•</span>
                                                <span>{getCategory(expense.categoryId)?.name}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="font-bold text-lg text-primary font-mono">
                                                {formatCurrency(expense.amount, expense.currency)}
                                            </div>
                                            {expense.currency !== 'USD' && (
                                                <div className="text-xs text-muted-foreground">
                                                    {expense.currency}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => deleteExpense(expense.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {filteredExpenses?.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        No expenses found.
                    </div>
                )}
            </motion.div>
        </div>
    );
}
