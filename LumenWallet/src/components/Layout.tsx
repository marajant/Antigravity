import { Outlet, NavLink } from "react-router-dom";
import { LayoutDashboard, Receipt, Settings, PlusCircle } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { pageTransition } from "@/lib/animations";
import { InstallPrompt } from "./InstallPrompt";

export function Layout() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-64 flex-col border-r border-border bg-background/50 p-4 glass-panel m-4 rounded-xl h-[calc(100vh-2rem)] sticky top-4">
                <div className="flex items-center justify-between mb-8 px-2">
                    <h1 className="text-2xl font-bold text-gradient">Lumen Wallet</h1>
                    <ThemeToggle />
                </div>
                <nav className="flex-1 space-y-2">
                    <NavParams to="/" icon={<LayoutDashboard />} label="Dashboard" />
                    <NavParams to="/expenses" icon={<Receipt />} label="Expenses" />
                    <NavParams to="/add" icon={<PlusCircle />} label="Add New" />
                    <NavParams to="/settings" icon={<Settings />} label="Settings" />
                </nav>
            </aside>

            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-50">
                <h1 className="text-xl font-bold text-gradient">Lumen Wallet</h1>
                <ThemeToggle />
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
                <motion.div
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={pageTransition}
                    className="max-w-4xl mx-auto"
                >
                    <Outlet />
                </motion.div>
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background/80 backdrop-blur-lg flex justify-around p-2 z-50 pb-safe">
                <MobileNavParams to="/" icon={<LayoutDashboard />} label="Home" />
                <MobileNavParams to="/expenses" icon={<Receipt />} label="Expenses" />
                <MobileNavParams to="/add" icon={<PlusCircle />} label="Add" />
                <MobileNavParams to="/settings" icon={<Settings />} label="Settings" />
            </nav>
            <InstallPrompt />
        </div>
    );
}

function NavParams({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                    isActive
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                        : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                )
            }
        >
            {icon}
            <span>{label}</span>
        </NavLink>
    );
}

function MobileNavParams({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                cn(
                    "flex flex-col items-center justify-center p-2 rounded-lg transition-all",
                    isActive ? "text-primary" : "text-muted-foreground"
                )
            }
        >
            {icon}
            <span className="text-xs mt-1">{label}</span>
        </NavLink>
    );
}
