import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/lib/theme";
import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Expenses from "@/pages/Expenses";
import AddExpense from "@/pages/AddExpense";
import Settings from "@/pages/Settings";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ReloadPrompt } from "@/components/ReloadPrompt";

// Request persistent storage
async function requestPersistence() {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    console.log(`Persisted storage granted: ${isPersisted}`);
  }
}

function App() {
  useEffect(() => {
    requestPersistence();
  }, []);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="app-theme">
      <ErrorBoundary>
        <Router>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/add" element={<AddExpense />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
          <ReloadPrompt />
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
