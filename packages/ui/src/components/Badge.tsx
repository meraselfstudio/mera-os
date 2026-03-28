import React from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'pending' | 'ongoing' | 'done' | 'cancelled' | 'confirmed'

interface BadgeProps {
    children: React.ReactNode
    variant?: BadgeVariant
    size?: 'sm' | 'md'
    style?: React.CSSProperties
}

const variants: Record<string, { background: string; color: string; border?: string }> = {
    default: { background: 'var(--mera-surface-raised)', color: 'var(--mera-text-secondary)', border: '1px solid var(--mera-border)' },
    success: { background: 'var(--mera-success-bg)', color: 'var(--mera-success)' },
    warning: { background: 'var(--mera-warning-bg)', color: 'var(--mera-warning)' },
    error: { background: 'var(--mera-error-bg)', color: 'var(--mera-error)' },
    info: { background: 'var(--mera-info-bg)', color: 'var(--mera-info)' },
    pending: { background: 'var(--mera-surface-raised)', color: 'var(--mera-text-secondary)', border: '1px solid var(--mera-border)' },
    confirmed: { background: 'var(--mera-info-bg)', color: 'var(--mera-info)' },
    ongoing: { background: 'var(--mera-warning-bg)', color: 'var(--mera-warning)' },
    done: { background: 'var(--mera-success-bg)', color: 'var(--mera-success)' },
    cancelled: { background: 'var(--mera-error-bg)', color: 'var(--mera-error)' },
}

export function Badge({ children, variant = 'default', size = 'sm', style }: BadgeProps) {
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontFamily: 'var(--mera-font)',
                fontWeight: 500,
                fontSize: size === 'sm' ? '11px' : '13px',
                lineHeight: 1,
                padding: size === 'sm' ? '3px 8px' : '5px 10px',
                borderRadius: 'var(--mera-radius-full)',
                textTransform: 'capitalize',
                letterSpacing: '0.01em',
                ...variants[variant],
                ...style,
            }}
        >
            {children}
        </span>
    )
}

// Helper to get badge variant from registration status
export function statusToBadgeVariant(status: string): BadgeVariant {
    const map: Record<string, BadgeVariant> = {
        pending: 'pending',
        confirmed: 'confirmed',
        ongoing: 'ongoing',
        done: 'done',
        cancelled: 'cancelled',
    }
    return map[status] ?? 'default'
}
