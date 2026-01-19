import { useState, Suspense, lazy, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './lib/db';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Settings, Download, X } from 'lucide-react';
import { InstallPrompt } from './components/InstallPrompt';
import { SettingsModal } from './components/SettingsModal';
import { AddExpenseForm } from './components/AddExpenseForm';
import { TransactionExplorer } from './components/TransactionExplorer';
import { InsightsWidget } from './components/InsightsWidget';
import { BudgetOverview } from './components/BudgetOverview';
import {
  calculateSpendingTrend,
  generateInsights,
  generateForecast,
  calculateCategoryBreakdown,
  calculateBudgetProgress,
  getCurrencySymbol
} from './lib/analytics';
import type { Expense } from './lib/db';

// Lazy Charts
const SpendingChart = lazy(() => import('./components/SpendingChart').then(m => ({ default: m.SpendingChart })));
const CategoryPieChart = lazy(() => import('./components/CategoryPieChart').then(m => ({ default: m.CategoryPieChart })));

const ChartLoading = () => (
  <div className="flex-center" style={{ height: '200px', color: 'var(--text-secondary)' }}>
    Loading chart...
  </div>
);

export default function App() {
  // State
  const [showSettings, setShowSettings] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showForecast, setShowForecast] = useState(false);
  const [selectedYears, setSelectedYears] = useState<Set<number>>(new Set([new Date().getFullYear()]));

  // Data Loading
  const allExpenses = useLiveQuery(() => db.expenses.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const budgets = useLiveQuery(() => db.budgets.toArray()) || [];
  const exchangeRates = useLiveQuery(() => db.exchangeRates.toArray()) || [];
  const settings = useLiveQuery(() => db.settings.get('app_settings'));

  // Year Logic
  const availableYears = useMemo(() =>
    Array.from(new Set(allExpenses.map(e => new Date(e.date).getFullYear()))).sort((a, b) => b - a),
    [allExpenses]
  );

  const toggleYear = (year: number) => {
    setSelectedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) {
        if (next.size > 1) next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };

  // Filtered Data
  const filteredExpenses = useMemo(() =>
    allExpenses.filter(e => selectedYears.has(new Date(e.date).getFullYear())),
    [allExpenses, selectedYears]
  );

  // Analytics
  const currencySymbol = getCurrencySymbol(settings?.baseCurrency || 'USD');
  const trendData = useMemo(() => calculateSpendingTrend(filteredExpenses, exchangeRates, settings?.baseCurrency || 'USD'), [filteredExpenses, exchangeRates, settings]);
  const categoryData = useMemo(() => calculateCategoryBreakdown(filteredExpenses, categories, exchangeRates, settings?.baseCurrency || 'USD'), [filteredExpenses, categories, exchangeRates, settings]);

  // Budget Progress for Current Month
  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const budgetProgress = useMemo(() => calculateBudgetProgress(filteredExpenses, budgets, categories, currentMonth, exchangeRates, settings?.baseCurrency || 'USD'), [filteredExpenses, budgets, categories, currentMonth, exchangeRates, settings]);

  const insights = useMemo(() => generateInsights(filteredExpenses, exchangeRates, settings?.baseCurrency || 'USD'), [filteredExpenses, exchangeRates, settings]);

  // Forecast
  const chartData = useMemo(() => {
    if (!showForecast) return trendData;
    const forecast = generateForecast(filteredExpenses, 3, exchangeRates, settings?.baseCurrency || 'USD');
    return [...trendData, ...forecast];
  }, [trendData, filteredExpenses, showForecast, exchangeRates, settings]);

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '6rem' }}>
      <InstallPrompt />

      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>ExpenseFlow</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Overview of your finances</p>
        </div>

        <div className="header-actions">
          {/* Year Filter */}
          <div className="btn-year-group">
            {availableYears.slice(0, 3).map(year => (
              <button
                key={year}
                onClick={() => toggleYear(year)}
                className={`btn-year ${selectedYears.has(year) ? 'active' : 'inactive'}`}
              >
                {year}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowSettings(true)}
            className="glass-panel"
            style={{ padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
          >
            <Settings />
          </button>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Spending Trend */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel"
          style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '400px' }}
        >
          <div className="flex-between mb-6">
            <h2 className="text-xl font-bold">Spending Trends</h2>
            <div className="flex-row-center">
              <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={showForecast} onChange={e => setShowForecast(e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
                Show Forecast
              </label>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Suspense fallback={<ChartLoading />}>
              <SpendingChart data={chartData} currencySymbol={currencySymbol} />
            </Suspense>
          </div>
        </motion.section>

        {/* AI Insights & Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel"
            style={{ padding: '1.5rem' }}
          >
            <h2 className="text-xl font-bold mb-6">AI Insights</h2>
            <InsightsWidget insights={insights} />
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel"
            style={{ padding: '1.5rem', flex: 1 }}
          >
            <h2 className="text-xl font-bold mb-6">Category Breakdown</h2>
            <Suspense fallback={<ChartLoading />}>
              <CategoryPieChart data={categoryData} currencySymbol={currencySymbol} />
            </Suspense>
          </motion.section>
        </div>
      </div>

      {/* Budget Overview */}
      {settings?.showBudgetCard !== false && budgets.some(b => b.amount > 0) && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel"
          style={{ padding: '1.5rem', marginBottom: '2rem' }}
        >
          <div className="flex-row-center mb-6">
            <Download size={20} className="text-[var(--primary)] rotate-180" />
            <h2 className="text-xl font-bold">Monthly Budgets</h2>
          </div>
          <BudgetOverview data={budgetProgress} currencySymbol={currencySymbol} />
        </motion.section>
      )}

      {/* Transaction List */}
      <div style={{ marginTop: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Transactions</h2>
        <TransactionExplorer
          expenses={filteredExpenses}
          categories={categories}
          onEdit={setEditingExpense}
        />
      </div>

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowAddModal(true)}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'var(--primary)',
          color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 30px rgba(var(--primary-rgb), 0.4)',
          border: 'none',
          zIndex: 100,
          cursor: 'pointer'
        }}
      >
        <Plus size={30} />
      </motion.button>

      {/* Modals */}
      <AnimatePresence>
        {(showAddModal || editingExpense) && (
          <div className="modal-overlay" style={{
            position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '1rem'
          }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel"
              style={{ width: '100%', maxWidth: '600px', background: 'var(--surface-color)', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="text-lg font-bold">{editingExpense ? 'Edit Expense' : 'Add New Expense'}</h2>
                <button
                  onClick={() => { setShowAddModal(false); setEditingExpense(null); }}
                  style={{ padding: '0.5rem', borderRadius: '50%', background: 'var(--bg-color)' }}
                >
                  <X size={20} />
                </button>
              </div>
              <div style={{ padding: '1rem' }}>
                <AddExpenseForm
                  initialData={editingExpense}
                  onSuccess={() => { setShowAddModal(false); setEditingExpense(null); }}
                  onClose={() => { setShowAddModal(false); setEditingExpense(null); }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} inlineMode={false} />

    </div>
  );
}
