import { motion } from 'framer-motion';

interface ToggleSwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
}

export function ToggleSwitch({ checked, onChange, label, disabled = false }: ToggleSwitchProps) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1
        }}
            onClick={() => !disabled && onChange(!checked)}
        >
            <div
                style={{
                    width: '44px',
                    height: '24px',
                    borderRadius: '12px',
                    background: checked ? 'var(--primary)' : 'var(--border-color)',
                    padding: '2px',
                    transition: 'background 0.2s ease',
                    position: 'relative' // Ensure relative positioning for spring
                }}
            >
                <motion.div
                    animate={{ x: checked ? 20 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'white',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}
                />
            </div>
            {label && (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    {label}
                </span>
            )}
        </div>
    );
}
