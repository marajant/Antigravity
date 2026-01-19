import { Button } from './ui/Button';
import { db } from '../lib/db';
import { X, Download, Trash2, HardDrive, Plus, Tag, Settings, Bell, Coins } from 'lucide-react';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { NotificationService } from '../lib/notificationService';
import { ToggleSwitch } from './ui/ToggleSwitch';

export interface SettingsModalProps {
    onClose: () => void;
    isOpen?: boolean;
    inlineMode?: boolean;
}

const COLOR_SWATCHES = [
    'hsl(340, 70%, 60%)', // Pink
    'hsl(220, 70%, 60%)', // Blue
    'hsl(40, 90%, 60%)',  // Orange
    'hsl(250, 70%, 60%)', // Purple
    'hsl(150, 60%, 40%)', // Green
    'hsl(0, 0%, 50%)',    // Gray
    'hsl(180, 70%, 50%)', // Teal
    'hsl(10, 80%, 60%)',  // Red-Orange
    'hsl(290, 70%, 60%)', // Magenta
];

export function SettingsModal({ onClose, inlineMode = false }: SettingsModalProps) {
    const categories = useLiveQuery(() => db.categories.toArray());
    const budgets = useLiveQuery(() => db.budgets.toArray());
    const settings = useLiveQuery(() => db.settings.get('app_settings'));

    const [newCatName, setNewCatName] = useState('');
    const [newCatColor, setNewCatColor] = useState(COLOR_SWATCHES[0]);
    const [budgetMonth, setBudgetMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    const handleAddCategory = async () => {
        if (!newCatName.trim()) return;
        try {
            await db.categories.add({
                name: newCatName.trim(),
                color: newCatColor,
                icon: 'circle'
            });
            setNewCatName('');
            setNewCatColor(COLOR_SWATCHES[Math.floor(Math.random() * COLOR_SWATCHES.length)]);
        } catch (error) {
            console.error('Failed to add category:', error);
            alert('Failed to add category. Please try again.');
        }
    };

    const handleDeleteCategory = async (id: number) => {
        if (confirm('Delete this category? Transactions using it will lose their category association.')) {
            try {
                await db.categories.delete(id);
                // Also delete associated budgets
                await db.budgets.where('categoryId').equals(id).delete();
            } catch (error) {
                console.error('Failed to delete category:', error);
                alert('Failed to delete category. Please try again.');
            }
        }
    };

    const handleExport = async () => {
        const expenses = await db.expenses.toArray();
        const cats = await db.categories.toArray();
        const catMap = new Map(cats.map(c => [c.id!, c.name]));

        const csv = Papa.unparse(expenses.map(e => ({
            Date: new Date(e.date).toISOString().split('T')[0],
            Merchant: e.merchant,
            Amount: e.amount,
            Category: e.categoryId ? catMap.get(e.categoryId) || 'Unknown' : 'Uncategorized',
            TaxDeductible: e.isTaxRelevant ? 'Yes' : 'No',
            Note: e.description || ''
        })));

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expense_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const handleClearReset = async () => {
        if (confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
            try {
                await Promise.all(db.tables.map(table => table.clear()));
                window.location.reload();
            } catch (error) {
                console.error('Failed to clear data:', error);
                alert('Failed to clear data. Please try again.');
            }
        }
    };

    const handleSeedData = async () => {
        try {
            await db.expenses.add({ amount: 5, merchant: 'Starbucks', categoryId: 1, date: new Date(), createdAt: new Date(), currency: 'USD', isTaxRelevant: 0, file_hash: 'seed1' });
            await db.expenses.add({ amount: 5, merchant: 'Starbucks', categoryId: 1, date: new Date(), createdAt: new Date(), currency: 'USD', isTaxRelevant: 0, file_hash: 'seed2' });
            await db.expenses.add({ amount: 5, merchant: 'Starbucks', categoryId: 1, date: new Date(), createdAt: new Date(), currency: 'USD', isTaxRelevant: 0, file_hash: 'seed3' });
            await db.expenses.add({ amount: 20, merchant: 'Starbucks', categoryId: 2, date: new Date(), createdAt: new Date(), currency: 'USD', isTaxRelevant: 0, file_hash: 'seed4' });
            await db.expenses.add({ amount: 100, merchant: 'Micro Center', categoryId: 3, date: new Date(), createdAt: new Date(), currency: 'USD', isTaxRelevant: 0, file_hash: 'seed5' });
            alert("Seeded: Starbucks (3x Cat 1, 1x Cat 2), Micro Center (1x Cat 3)");
        } catch (error) {
            console.error('Failed to seed data:', error);
            alert('Failed to seed data. Please try again.');
        }
    };

    const getBudgetForCategory = (catId: number) => {
        return budgets?.find(b => b.categoryId === catId && b.period === budgetMonth)?.amount || 0;
    };

    const handleToggleNotifications = async (enabled: boolean) => {
        if (enabled) {
            const granted = await NotificationService.requestPermission();
            if (!granted) {
                alert('Notification permission denied. You can enable it in your browser settings later.');
            }
        }
        try {
            const exists = await db.settings.get('app_settings');
            if (exists) {
                await db.settings.update('app_settings', { notificationsEnabled: enabled });
            } else {
                await db.settings.add({
                    id: 'app_settings',
                    baseCurrency: 'USD',
                    notificationsEnabled: enabled,
                    showBudgetCard: true
                });
            }
        } catch (error) {
            console.error('Failed to toggle notifications:', error);
        }
    };

    // Shared Content Logic
    const content = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: inlineMode ? 'visible' : 'auto', flex: 1, paddingRight: inlineMode ? 0 : '0.5rem', width: '100%', height: '100%' }}>

            {/* App Settings */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--card-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <Settings size={20} color="var(--primary)" />
                    <h3 style={{ margin: 0 }}>App Settings</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Bell size={18} color="var(--text-secondary)" />
                            <span>Budget Notifications</span>
                        </div>
                        <ToggleSwitch
                            checked={settings?.notificationsEnabled || false}
                            onChange={(checked) => handleToggleNotifications(checked)}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Coins size={18} color="var(--text-secondary)" />
                            <span>Base Currency</span>
                        </div>
                        <select
                            value={settings?.baseCurrency || 'USD'}
                            onChange={async (e) => {
                                const newCurrency = e.target.value;
                                try {
                                    const exists = await db.settings.get('app_settings');
                                    if (exists) {
                                        await db.settings.update('app_settings', { baseCurrency: newCurrency });
                                    } else {
                                        await db.settings.add({
                                            id: 'app_settings',
                                            baseCurrency: newCurrency,
                                            notificationsEnabled: false,
                                            showBudgetCard: true
                                        });
                                    }
                                } catch (error) {
                                    console.error('Failed to update currency:', error);
                                }
                            }}
                            style={{
                                padding: '0.4rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-color)',
                                color: 'var(--text-primary)',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="JPY">JPY (¥)</option>
                            <option value="CAD">CAD ($)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Category Management */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--card-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Tag size={20} color="var(--primary)" />
                    <h3 style={{ margin: 0 }}>Categories</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Add New */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                            placeholder="New Category Name"
                            value={newCatName}
                            onChange={e => setNewCatName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                            style={{
                                flex: 1,
                                background: 'var(--bg-color)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '0.5rem 1rem',
                                color: 'var(--text-primary)'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                            {COLOR_SWATCHES.slice(0, 3).map(color => (
                                <div
                                    key={color}
                                    onClick={() => setNewCatColor(color)}
                                    style={{
                                        width: '24px', height: '24px',
                                        borderRadius: '50%',
                                        background: color,
                                        cursor: 'pointer',
                                        border: newCatColor === color ? '2px solid white' : '2px solid transparent',
                                        boxShadow: newCatColor === color ? '0 0 0 2px var(--primary)' : 'none'
                                    }}
                                />
                            ))}
                            <div
                                onClick={() => setNewCatColor(COLOR_SWATCHES[Math.floor(Math.random() * COLOR_SWATCHES.length)])}
                                style={{
                                    width: '24px', height: '24px',
                                    borderRadius: '50%',
                                    background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                                    cursor: 'pointer',
                                    border: '2px solid transparent'
                                }}
                                title="Random Color"
                            />
                        </div>
                        <Button onClick={handleAddCategory} disabled={!newCatName.trim()}>
                            <Plus size={18} />
                        </Button>
                        <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: newCatColor, border: '1px solid var(--border-color)' }} title="Selected Color" />
                    </div>

                    {/* List */}
                    <div style={{
                        maxHeight: '200px', overflowY: 'auto',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-color)'
                    }}>
                        {categories?.map(cat => (
                            <div key={cat.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '0.75rem 1rem',
                                borderBottom: '1px solid var(--border-color)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: cat.color }} />
                                    <span style={{ fontWeight: 500 }}>{cat.name}</span>
                                </div>
                                <button
                                    onClick={() => cat.id && handleDeleteCategory(cat.id)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', opacity: 0.6 }}
                                    className="hover-danger"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Budget Management */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--card-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Download size={20} color="var(--primary)" style={{ transform: 'rotate(180deg)' }} />
                        <h3 style={{ margin: 0 }}>Monthly Budgets</h3>
                    </div>
                    <ToggleSwitch
                        checked={settings?.showBudgetCard ?? true}
                        onChange={async (checked) => {
                            try {
                                const exists = await db.settings.get('app_settings');
                                if (exists) {
                                    await db.settings.update('app_settings', { showBudgetCard: checked });
                                } else {
                                    await db.settings.add({
                                        id: 'app_settings',
                                        baseCurrency: 'USD',
                                        notificationsEnabled: false,
                                        showBudgetCard: checked
                                    });
                                }
                            } catch (e) {
                                console.error("Failed to toggle budget card", e);
                            }
                        }}
                        label="Show on Dashboard"
                    />
                </div>

                {(settings?.showBudgetCard ?? true) ? (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                            <input
                                type="month"
                                value={budgetMonth}
                                onChange={e => setBudgetMonth(e.target.value)}
                                style={{
                                    background: 'var(--bg-color)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '0.25rem 0.5rem',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.9rem'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {categories?.map(cat => (
                                <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color }} />
                                        <span style={{ fontSize: '0.9rem' }}>{cat.name}</span>
                                    </div>
                                    <BudgetInput
                                        key={`${cat.id}-${budgetMonth}`}
                                        categoryId={cat.id!}
                                        period={budgetMonth}
                                        initialAmount={getBudgetForCategory(cat.id!)}
                                    />
                                </div>
                            ))}
                            {(!categories || categories.length === 0) && (
                                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Add categories first to set budgets.</p>
                            )}
                        </div>
                    </>
                ) : (
                    <div style={{ padding: '1rem', background: 'var(--bg-color)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                            Total Budget: <strong style={{ color: 'var(--text-primary)' }}>
                                ${(budgets?.filter(b => b.period === budgetMonth).reduce((sum, b) => sum + b.amount, 0) || 0).toFixed(2)}
                            </strong>
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem' }}>({budgetMonth})</span>
                        </p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                            Enable "Show on Dashboard" to edit budgets
                        </p>
                    </div>
                )}
            </div>

            <div className="card" style={{ padding: '1.5rem', background: 'var(--card-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <HardDrive size={20} color="var(--text-secondary)" />
                    <h3 style={{ margin: 0 }}>Data Management</h3>
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <Button onClick={handleExport} variant="secondary">
                        <Download size={16} style={{ marginRight: '0.5rem' }} />
                        Export CSV
                    </Button>
                    <Button onClick={handleSeedData} variant="secondary">
                        <HardDrive size={16} style={{ marginRight: '0.5rem' }} />
                        Seed AI Test Data
                    </Button>
                    <Button onClick={handleClearReset} variant="danger">
                        <Trash2 size={16} style={{ marginRight: '0.5rem' }} />
                        Clear All Data
                    </Button>
                </div>
            </div>
        </div>
    );

    if (inlineMode) {
        return content;
    }

    return (
        <AnimatePresence mode="wait">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="modal-overlay"
                style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 2000, padding: '1rem'
                }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="glass-panel"
                    onClick={e => e.stopPropagation()}
                    style={{
                        background: 'var(--bg-color)',
                        padding: '2rem',
                        width: '100%',
                        maxWidth: '600px',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0 }}>Settings</h2>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X /></button>
                    </div>
                    {content}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

function BudgetInput({ categoryId, period, initialAmount }: { categoryId: number, period: string, initialAmount: number }) {
    const [amount, setAmount] = useState<string>(initialAmount.toString());

    const handleBlur = async () => {
        const val = parseFloat(amount) || 0;
        try {
            const existing = await db.budgets
                .where('[categoryId+period]')
                .equals([categoryId, period])
                .first();

            if (existing) {
                if (existing.amount !== val) {
                    await db.budgets.update(existing.id!, { amount: val });
                }
            } else if (val > 0) {
                await db.budgets.add({
                    categoryId,
                    amount: val,
                    period
                });
            }
        } catch (error) {
            console.error('Failed to save budget:', error);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>$</span>
            <input
                type="number"
                min="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                onBlur={handleBlur}
                placeholder="0.00"
                style={{
                    width: '80px',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.25rem 0.5rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    textAlign: 'right'
                }}
            />
        </div>
    );
}
