import React from 'react'

// ── Types ───────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant
    size?: ButtonSize
    loading?: boolean
    icon?: React.ReactNode
}

// ── Styles ──────────────────────────────────────────────────
const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: 'var(--mera-font)',
    fontWeight: 500,
    borderRadius: 'var(--mera-radius-md)',
    border: 'none',
    cursor: 'pointer',
    transition: 'all var(--mera-duration) var(--mera-ease)',
    whiteSpace: 'nowrap' as const,
    userSelect: 'none' as const,
}

const variants: Record<ButtonVariant, React.CSSProperties> = {
    // primary: maroon background, white text
    primary: {
        background: 'var(--mera-accent)',
        color: '#FFFFFF',
        border: 'none',
    },
    // secondary: surface raised background, white text
    secondary: {
        background: 'var(--mera-surface-raised)',
        color: 'var(--mera-text-primary)',
        border: '1px solid var(--mera-border)',
    },
    // ghost: transparent background, primary text
    ghost: {
        background: 'transparent',
        color: 'var(--mera-text-primary)',
        border: 'none',
    },
    // danger: error color
    danger: {
        background: 'var(--mera-error)',
        color: '#FFFFFF',
        border: 'none',
    },
}

const sizes: Record<ButtonSize, React.CSSProperties> = {
    sm: { padding: '6px 12px', fontSize: '13px', height: '32px' },
    md: { padding: '9px 18px', fontSize: '15px', height: '40px' },
    lg: { padding: '12px 24px', fontSize: '17px', height: '48px' },
}

export function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    children,
    style,
    disabled,
    ...props
}: ButtonProps) {
    const isDisabled = disabled || loading

    return (
        <button
            {...props}
            disabled={isDisabled}
            style={{
                ...base,
                ...variants[variant],
                ...sizes[size],
                opacity: isDisabled ? 0.5 : 1,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                ...style,
            }}
        >
            {loading ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
                    </path>
                </svg>
            ) : icon}
            {children}
        </button>
    )
}
