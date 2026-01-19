import { useState, Suspense, lazy, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './lib/db';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Settings, Download, X } from 'lucide-react';
import { InstallPrompt } from './components/InstallPrompt';
import { ThemeToggle } from './components/ThemeToggle';
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
  calculateTopVendors,
  getCurrencySymbol
} from './lib/analytics';
import type { Expense } from './lib/db';

// Lazy Charts
const SpendingChart = lazy(() => import('./components/SpendingChart').then(m => ({ default: m.SpendingChart })));
const CategoryPieChart = lazy(() => import('./components/CategoryPieChart').then(m => ({ default: m.CategoryPieChart })));
const TopVendorsChart = lazy(() => import('./components/TopVendorsChart').then(m => ({ default: m.TopVendorsChart })));

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
  const topVendors = useMemo(() => calculateTopVendors(filteredExpenses, 5, exchangeRates, settings?.baseCurrency || 'USD'), [filteredExpenses, exchangeRates, settings]);

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
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-panel"
        style={{
          padding: '1rem 1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h1 className="text-gradient" style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>ExpenseFlow</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Track, Analyze, Optimize.</p>
        </div>

        {/* Years Center */}
        <div className="btn-year-group" style={{ order: 2 }}>
          {availableYears.slice(0, 4).map(year => (
            <button
              key={year}
              onClick={() => toggleYear(year)}
              className={`btn-year ${selectedYears.has(year) ? 'active' : 'inactive'}`}
            >
              {year}
            </button>
          ))}
        </div>

        <div className="header-actions" style={{ order: 3 }}>
          <ThemeToggle />
          <button
            onClick={() => setShowSettings(true)}
            style={{
              padding: '0.5rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%', color: 'var(--text-secondary)',
              transition: 'color 0.2s'
            }}
          >
            <Settings size={20} />
          </button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddModal(true)}
            style={{
              background: 'var(--primary)',
              color: 'white',
              padding: '0.6rem 1.25rem',
              borderRadius: '0.75rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              fontWeight: 600,
              boxShadow: '0 4px 15px rgba(var(--primary-rgb), 0.3)',
              fontSize: '0.9rem'
            }}
          >
            <Plus size={18} />
            Add Expense
          </motion.button>
        </div>
      </motion.header>

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Spending Trend */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel"
          style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '400px', gridColumn: 'span 2' }}
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

        {/* Row 1: Category & Budget */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel"
          style={{ padding: '1.5rem', minHeight: '350px' }}
        >
          <h2 className="text-xl font-bold mb-6">Category Breakdown</h2>
          <div style={{ height: '300px' }}>
            <Suspense fallback={<ChartLoading />}>
              <CategoryPieChart data={categoryData} currencySymbol={currencySymbol} />
            </Suspense>
          </div>
        </motion.section>

        {settings?.showBudgetCard !== false && budgets.some(b => b.amount > 0) ? (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel"
            style={{ padding: '1.5rem', minHeight: '350px', display: 'flex', flexDirection: 'column' }}
          >
            <div className="flex-row-center mb-6">
              <Download size={20} className="text-[var(--primary)] rotate-180" />
              <h2 className="text-xl font-bold">Monthly Budgets</h2>
            </div>
            <BudgetOverview data={budgetProgress} currencySymbol={currencySymbol} />
          </motion.section>
        ) : (
          <div /> /* Spacer if budget is hidden, or grid fills space */
        )}

        {/* Row 2: Top Vendors & Insights */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel"
          style={{ padding: '1.5rem', minHeight: '300px' }}
        >
          <h2 className="text-xl font-bold mb-6">Top Vendors</h2>
          <div style={{ height: '250px' }}>
            <Suspense fallback={<ChartLoading />}>
              <TopVendorsChart data={topVendors} currencySymbol={currencySymbol} />
            </Suspense>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel"
          style={{ padding: '1.5rem', minHeight: '300px' }}
        >
          <h2 className="text-xl font-bold mb-6">AI Insights</h2>
          <InsightsWidget insights={insights} />
        </motion.section>
      </div>

      {/* Transaction List */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel"
        style={{ marginTop: '2rem', padding: '1.5rem' }}
      >
        <h2 className="text-xl font-bold mb-6">Transactions</h2>
        <TransactionExplorer
          expenses={filteredExpenses}
          categories={categories}
          onEdit={setEditingExpense}
        />
      </motion.section>

      {/* Floating Action Button */}


      {/* Modals */}
      <AnimatePresence>
        {(showAddModal || editingExpense) && (
          <div
            className="modal-overlay"
            onClick={() => { setShowAddModal(false); setEditingExpense(null); }}
            style={{
              position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '1rem'
            }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel"
              style={{ width: '100%', maxWidth: '600px', background: 'var(--surface-color)', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="text-lg font-bold">{editingExpense ? 'Edit Expense' : 'Add New Expense'}</h2>
                <button
                  onClick={() => { setShowAddModal(false); setEditingExpense(null); }}
                  className="flex-center hover:bg-[var(--bg-color)] transition-all"
                  style={{ padding: '0.5rem', borderRadius: '50%', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  <X size={24} />
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
