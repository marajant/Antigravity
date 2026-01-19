import { motion, type HTMLMotionProps } from 'framer-motion';
import { type ReactNode } from 'react';

interface ButtonProps extends HTMLMotionProps<"button"> {
    children: ReactNode;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    isLoading?: boolean;
}

export function Button({ children, variant = 'primary', isLoading, style, ...props }: ButtonProps) {
    const baseStyle = {
        padding: '0.75rem 1.5rem',
        borderRadius: 'var(--radius-md)',
        fontWeight: 600,
        fontSize: '0.95rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        transition: 'all 0.2s',
        border: 'none', // Reset default border
    };

    const variants = {
        primary: {
            background: 'var(--primary)',
            color: 'white',
            boxShadow: '0 4px 12px var(--primary-glow)',
        },
        secondary: {
            background: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
        },
        danger: {
            background: 'hsl(var(--danger-hue), 80%, 60%)',
            color: 'white',
            boxShadow: '0 4px 12px hsla(var(--danger-hue), 80%, 60%, 0.3)',
        },
        ghost: {
            background: 'transparent',
            color: 'var(--text-secondary)',
        }
    };

    const mergedStyle = { ...baseStyle, ...variants[variant], ...style };

    return (
        <motion.button
            whileHover={{ scale: 1.02, filter: 'brightness(1.1)' }}
            whileTap={{ scale: 0.98 }}
            style={mergedStyle}
            disabled={isLoading}
            {...props}
        >
            {isLoading ? (
                <span style={{
                    width: '16px', height: '16px',
                    border: '2px solid currentColor',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 1s linear infinite' // Add keyframes global or inline? Inline style for spin is tricky without global CSS.
                }} />
            ) : null}
            {children}
        </motion.button>
    );
}
