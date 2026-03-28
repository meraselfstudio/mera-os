import React from 'react'

interface CardProps {
    children: React.ReactNode
    style?: React.CSSProperties
    className?: string
    onClick?: () => void
    hover?: boolean
    padding?: string | number
}

export function Card({ children, style, className, onClick, hover = false, padding }: CardProps) {
    const [isHovered, setIsHovered] = React.useState(false)

    return (
        <div
            role={onClick ? 'button' : undefined}
            onClick={onClick}
            onMouseEnter={() => hover && setIsHovered(true)}
            onMouseLeave={() => hover && setIsHovered(false)}
            className={className}
            style={{
                background: 'var(--mera-surface)',
                borderRadius: 'var(--mera-radius-lg)',
                boxShadow: isHovered ? 'var(--mera-shadow-md)' : 'var(--mera-shadow-sm)',
                border: '1px solid var(--mera-border)',
                padding: padding ?? 'var(--mera-space-6)',
                transition: 'box-shadow var(--mera-duration) var(--mera-ease), transform var(--mera-duration) var(--mera-ease)',
                transform: isHovered && onClick ? 'translateY(-1px)' : 'none',
                cursor: onClick ? 'pointer' : 'default',
                ...style,
            }}
        >
            {children}
        </div>
    )
}
