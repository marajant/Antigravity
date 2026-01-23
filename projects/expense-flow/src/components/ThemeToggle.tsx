import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
    const [isDark, setIsDark] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    const toggleTheme = () => {
        setIsDark(prev => !prev);
    };

    return (
        <motion.button
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            style={{
                padding: '0.5rem',
                borderRadius: '50%',
                background: 'var(--surface-color)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            {isDark ? <Sun size={20} color="hsl(var(--warning-hue), 90%, 60%)" /> : <Moon size={20} />}
        </motion.button>
    );
}
