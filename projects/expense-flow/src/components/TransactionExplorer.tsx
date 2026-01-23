import { useState, useRef, useMemo } from 'react';
import { db } from '../lib/db';
import { motion } from 'framer-motion';
import { Search, Trash2, FileText, X, ChevronDown, ChevronRight, Plus, Edit } from 'lucide-react';
import { fileToBase64 } from '../lib/file';
import type { Expense, Category } from '../lib/db';

interface EnrichedExpense extends Expense {
    categoryName?: string;
    categoryColor?: string;
}

interface TransactionExplorerProps {
    expenses: Expense[];
    categories: Category[];
    onEdit?: (expense: Expense) => void;
}

export function TransactionExplorer({ expenses: allExpenses, categories, onEdit }: TransactionExplorerProps) {
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [activeUploadId, setActiveUploadId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Filter Logic using useMemo against the passed props
    const filteredExpenses = useMemo(() => {
        // Create lookup for categories
        const catMap = new Map(categories?.map(c => [c.id, c.name]) || []);
        const colorMap = new Map(categories?.map(c => [c.id, c.color]) || []);

        return allExpenses.map(e => ({
            ...e,
            categoryName: e.categoryId ? catMap.get(e.categoryId) : 'Uncategorized',
            categoryColor: e.categoryId ? colorMap.get(e.categoryId) : 'var(--text-secondary)'
        })).filter(e => {
            const matchesSearch = e.merchant.toLowerCase().includes(search.toLowerCase()) ||
                e.amount.toString().includes(search);
            const matchesCat = categoryFilter === 'all' || e.categoryId === categoryFilter;

            let matchesDate = true;
            if (dateStart) matchesDate = matchesDate && new Date(e.date) >= new Date(dateStart);
            if (dateEnd) matchesDate = matchesDate && new Date(e.date) <= new Date(dateEnd);

            return matchesSearch && matchesCat && matchesDate;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort desc
    }, [allExpenses, categories, search, categoryFilter, dateStart, dateEnd]);

    // Derived expenses list for rendering
    const expenses = filteredExpenses;

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this expense?')) {
            try {
                await db.expenses.delete(id);
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
            } catch (error) {
                console.error('Failed to delete expense:', error);
                alert('Failed to delete expense. Please try again.');
            }
        }
    };

    const toggleSelection = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked && expenses) {
            setSelectedIds(new Set(expenses.map(e => e.id!)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleBulkDelete = async () => {
        if (confirm(`Are you sure you want to delete ${selectedIds.size} transactions?`)) {
            try {
                await db.expenses.bulkDelete(Array.from(selectedIds));
                setSelectedIds(new Set());
            } catch (error) {
                console.error('Failed to delete expenses:', error);
                alert('Failed to delete some expenses. Please try again.');
            }
        }
    };

    const triggerUpload = (id: number) => {
        setActiveUploadId(id);
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && activeUploadId) {
            const file = e.target.files[0];
            try {
                // Convert to Base64 (simple storage for now, matching AddExpenseForm)
                const base64 = await fileToBase64(file);

                await db.expenses.update(activeUploadId, {
                    receiptImage: base64
                });

                // Clear state
                setActiveUploadId(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
            } catch (err) {
                console.error("Failed to upload receipt", err);
                alert("Failed to upload receipt. Please try again.");
            }
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Hidden Shared File Input */}
            <input
                type="file"
                hidden
                ref={fileInputRef}
                accept="image/*,application/pdf"
                onChange={handleFileChange}
            />

            {/* Filters Bar */}
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder="Search merchant or amount..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                                width: '100%', padding: '0.6rem 0.6rem 0.6rem 2.5rem',
                                borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
                                background: 'var(--bg-color)', color: 'var(--text-primary)'
                            }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Category:</label>
                    <select
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                    >
                        <option value="all">All</option>
                        {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>From:</label>
                    <input
                        type="date"
                        value={dateStart}
                        onChange={e => setDateStart(e.target.value)}
                        style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>To:</label>
                    <input
                        type="date"
                        value={dateEnd}
                        onChange={e => setDateEnd(e.target.value)}
                        style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                    />
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {expenses && expenses.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0 1rem', minHeight: '30px' }}>
                    {/* Spacer to align with row checkbox (Chevron 20px + Gap 1rem) */}
                    <div style={{ width: '20px', marginRight: '1rem' }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={expenses.length > 0 && selectedIds.size === expenses.length}
                            onChange={e => handleSelectAll(e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Select All</span>
                    </div>

                    {selectedIds.size === 1 && onEdit && (
                        <button
                            onClick={() => {
                                const id = Array.from(selectedIds)[0];
                                const expense = expenses.find(e => e.id === id);
                                if (expense) onEdit(expense);
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                background: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                            }}
                        >
                            <Edit size={16} />
                            Edit Selected
                        </button>
                    )}

                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                background: 'var(--error)',
                                color: 'white',
                                border: 'none',
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                            }}
                        >
                            <Trash2 size={16} />
                            Delete {selectedIds.size} Selected
                        </button>
                    )}
                </div>
            )}

            {/* List */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                maxHeight: '600px',
                overflowY: 'auto',
                paddingRight: '0.5rem'
            }}>
                {expenses?.map((expense) => {
                    const isExpanded = expandedId === expense.id;
                    const hasNotes = expense.description && expense.description.trim().length > 0;
                    const isSelected = selectedIds.has(expense.id!);

                    return (
                        <div
                            key={expense.id}
                            style={{
                                // overflow: 'hidden', // REMOVED to prevent clipping
                                display: 'block', // RESET TO BLOCK (safest layout mode)
                                position: 'relative',
                                background: isSelected ? 'rgba(115, 102, 255, 0.1)' : 'var(--surface-color)',
                                border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: 'var(--shadow-sm)'
                            }}
                        >
                            {/* Main Row - REFACTORED TO FLEXBOX FOR SAFETY */}
                            <div
                                style={{
                                    padding: '0.5rem 1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    cursor: hasNotes ? 'pointer' : 'default',
                                    width: '100%',
                                    boxSizing: 'border-box'
                                }}
                                onClick={(e) => {
                                    const target = e.target as HTMLElement;
                                    if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('button')) return;
                                    if (hasNotes) setExpandedId(isExpanded ? null : expense.id!);
                                }}
                            >
                                {/* Chevron */}
                                <div style={{ width: '20px', display: 'flex', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                    {hasNotes && (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
                                    {/* Debug: {expense.description ? 'Has Notes' : 'No Notes'} */}
                                </div>

                                {/* Checkbox */}
                                <div style={{ width: '30px', display: 'flex', justifyContent: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleSelection(expense.id!)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                </div>

                                {/* Category Icon */}
                                <div
                                    style={{
                                        width: '40px', height: '40px', borderRadius: '50%',
                                        background: (expense as EnrichedExpense).categoryColor || 'var(--text-secondary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontWeight: 'bold', fontSize: '0.9rem',
                                        flexShrink: 0
                                    }}
                                >
                                    {(expense as EnrichedExpense).categoryName?.[0] || '?'}
                                </div>

                                {/* Merchant & Date */}
                                <div style={{ flex: 1, overflow: 'hidden', minWidth: '100px' }}>
                                    <h4 style={{ margin: 0, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                        {expense.merchant || 'Unknown Merchant'}
                                    </h4>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        {new Date(expense.date).toLocaleDateString()}
                                        {expense.isTaxRelevant ? <span style={{ marginLeft: '0.5rem', color: 'var(--primary)', fontWeight: 600 }}>TAX</span> : null}
                                    </div>
                                </div>

                                {/* Category Name */}
                                <div style={{ width: '120px', fontSize: '0.9rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', display: 'block' }}>
                                    {(expense as EnrichedExpense).categoryName || 'Uncategorized'}
                                </div>

                                {/* Amount */}
                                <div style={{ width: '100px', fontWeight: 600, fontSize: '1.1rem', textAlign: 'right' }}>
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: expense.currency || 'USD' }).format(expense.amount)}
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {expense.receiptImage ? (
                                        <button
                                            onClick={() => setViewingReceipt(expense.receiptImage || null)}
                                            title="View Receipt"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}
                                        >
                                            <FileText size={18} />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => triggerUpload(expense.id!)}
                                            title="Add Receipt"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success-hue)' }}
                                        >
                                            <Plus size={18} strokeWidth={3} />
                                        </button>
                                    )}
                                    {onEdit && (
                                        <button
                                            onClick={() => onEdit(expense)}
                                            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                            title="Edit Expense"
                                        >
                                            <Edit size={16} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(expense.id!)}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                        title="Delete Expense"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Notes Panel - Stable Rendering */}
                            {isExpanded && hasNotes && (
                                <div
                                    style={{
                                        borderTop: '1px solid var(--border-color)',
                                        background: 'rgba(0, 0, 0, 0.2)', // Subtle dark overlay
                                        width: '100%',
                                        display: 'block',
                                        animation: 'fadeIn 0.2s ease-in-out' // Simple CSS fade
                                    }}
                                >
                                    <div style={{ padding: '1rem 1rem 1rem 4.5rem' }}>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            color: 'var(--primary)',
                                            marginBottom: '0.5rem',
                                            fontWeight: 600
                                        }}>
                                            Transaction Notes
                                        </div>
                                        <div style={{
                                            fontSize: '0.9rem',
                                            color: 'var(--text-secondary)',
                                            lineHeight: '1.5',
                                            whiteSpace: 'pre-wrap'
                                        }}>
                                            {expense.description}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}


                {expenses?.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        No transactions found matching your filters.
                    </div>
                )}
            </div>

            {/* Receipt Modal */}
            {
                viewingReceipt && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
                    }} onClick={() => setViewingReceipt(null)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setViewingReceipt(null)}
                                style={{ position: 'absolute', top: -40, right: 0, background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                            >
                                <X size={30} />
                            </button>
                            {viewingReceipt?.startsWith('data:application/pdf') ? (
                                <iframe
                                    src={viewingReceipt || undefined}
                                    title="Receipt PDF"
                                    style={{ width: '80vw', height: '80vh', border: 'none', borderRadius: 'var(--radius-md)', background: 'white' }}
                                />
                            ) : /^data:(image\/[a-z]+|application\/pdf);base64,/.test(viewingReceipt || '') ? (
                                <img src={viewingReceipt || undefined} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 'var(--radius-md)' }} />
                            ) : (
                                <div style={{ color: 'white', padding: '2rem' }}>Invalid receipt data</div>
                            )}
                        </motion.div>
                    </div>
                )
            }
        </div >
    );
}
