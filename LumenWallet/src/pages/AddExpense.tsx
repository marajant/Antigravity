import { useState } from "react";
import { useExpenses } from "@/hooks/useExpenses";
import { useNavigate } from "react-router-dom";
import { Input } from "@/ui/Input";
import { Button } from "@/ui/Button";
import { Label } from "@/ui/Label";
import { Card, CardHeader, CardTitle, CardContent } from "@/ui/Card";
import { AVAILABLE_CURRENCIES } from "@/lib/currency";
import { Save, Loader2, Wand2 } from "lucide-react";
import { OCRScanner } from "@/components/OCRScanner";
import type { ScannedData } from "@/lib/ocr";
import { format } from "date-fns";

export default function AddExpense() {
    const { addExpense, categories } = useExpenses();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        amount: "",
        currency: "USD",
        date: new Date().toISOString().split("T")[0],
        merchant: "",
        categoryId: "",
        notes: "",
    });

    const handleScanComplete = (data: ScannedData) => {
        const updates: any = {};
        if (data.amount) updates.amount = data.amount.toString();
        if (data.merchant) updates.merchant = data.merchant;
        if (data.date) {
            try {
                updates.date = format(data.date, 'yyyy-MM-dd');
            } catch (e) { /* ignore invalid date fmt */ }
        }
        // Append Raw text to notes for reference
        if (data.text) {
            updates.notes = (formData.notes ? formData.notes + "\n\n" : "") + "OCR Text: " + data.text.substring(0, 100) + "...";
        }

        setFormData(prev => ({ ...prev, ...updates }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            await addExpense({
                amount: parseFloat(formData.amount),
                currency: formData.currency,
                date: new Date(formData.date),
                merchant: formData.merchant,
                categoryId: formData.categoryId || categories?.[0]?.id || "8", // Default to 'Other' if empty
                notes: formData.notes,
            });
            navigate("/");
        } catch (err: any) {
            setError(err.message || "Failed to save expense.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto">
            <Card className="glass-panel">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-2xl">Add New Expense</CardTitle>
                    <Wand2 className="h-5 w-5 text-purple-400 animate-pulse" />
                </CardHeader>
                <CardContent>
                    <OCRScanner onScanComplete={handleScanComplete} />

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border"></span>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or enter details</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm border border-destructive/20">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                    <Input
                                        id="amount"
                                        type="number"
                                        step="0.01"
                                        required
                                        className="pl-7"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="currency">Currency</Label>
                                <select
                                    id="currency"
                                    className="h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm glass-panel"
                                    value={formData.currency}
                                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                >
                                    {AVAILABLE_CURRENCIES.map((cur) => (
                                        <option key={cur} value={cur}>{cur}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input
                                id="date"
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="merchant">Merchant</Label>
                            <Input
                                id="merchant"
                                placeholder="e.g. Starbucks, Amazon"
                                required
                                value={formData.merchant}
                                onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <select
                                id="category"
                                className="h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm glass-panel"
                                value={formData.categoryId}
                                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                            >
                                <option value="" disabled>Select a category</option>
                                {categories?.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes (Optional)</Label>
                            <Input
                                id="notes"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>

                        <Button type="submit" className="w-full mt-6" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Expense
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
