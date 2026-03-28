import React from 'react'

interface ModalProps {
    open: boolean
    onClose: () => void
    title?: string
    children: React.ReactNode
    width?: number | string
    footer?: React.ReactNode
}

export function Modal({ open, onClose, title, children, width = 480, footer }: ModalProps) {
    // Close on Escape key
    React.useEffect(() => {
        if (!open) return
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [open, onClose])

    // Lock body scroll
    React.useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [open])

    if (!open) return null

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0, 0, 0, 0.70)', /* Darker, more cinematic overlay */
                backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 9999,
                animation: 'mera-fade-in 150ms ease',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'var(--mera-surface)',
                    borderRadius: 'var(--mera-radius-xl)',
                    boxShadow: 'var(--mera-shadow-xl)',
                    width: typeof width === 'number' ? `${width}px` : width,
                    maxWidth: 'calc(100vw - 32px)',
                    maxHeight: 'calc(100vh - 64px)',
                    overflow: 'hidden',
                    display: 'flex', flexDirection: 'column',
                    animation: 'mera-slide-up 200ms var(--mera-ease)',
                }}
            >
                {/* Header */}
                {title && (
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '20px 24px 0',
                    }}>
                        <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--mera-text-primary)' }}>
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            style={{
                                width: 28, height: 28, borderRadius: '50%',
                                border: 'none', background: 'var(--mera-surface-raised)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: 'var(--mera-text-secondary)',
                                fontSize: '16px', lineHeight: 1,
                            }}
                            aria-label="Close modal"
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* Body */}
                <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div style={{
                        padding: '12px 24px 20px',
                        borderTop: '1px solid var(--mera-border)',
                        display: 'flex', gap: '8px', justifyContent: 'flex-end',
                    }}>
                        {footer}
                    </div>
                )}
            </div>

            <style>{`
        @keyframes mera-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes mera-slide-up { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
        </div>
    )
}
