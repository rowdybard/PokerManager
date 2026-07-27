import { useEffect, useId, useRef, type RefObject, type ReactNode } from 'react'
import { X } from '@phosphor-icons/react'
import { cn } from '../../lib/utils'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  initialFocusRef?: RefObject<HTMLElement | null>
  dismissible?: boolean
  className?: string
}

export function Modal({
  open,
  onClose,
  title,
  children,
  initialFocusRef,
  dismissible = true,
  className,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.showModal()
      document.documentElement.classList.add('modal-open')

      requestAnimationFrame(() => {
        const requested = initialFocusRef?.current
        const fallback = dialog.querySelector<HTMLElement>(
          '[data-modal-initial-focus], [autofocus], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
        )
        ;(requested ?? fallback ?? dialog).focus()
      })
    } else if (!open && dialog.open) {
      dialog.close()
    }

    return () => {
      document.documentElement.classList.remove('modal-open')
      if (dialog.open) dialog.close()
    }
  }, [initialFocusRef, open])

  useEffect(() => {
    if (open) return
    document.documentElement.classList.remove('modal-open')
    returnFocusRef.current?.focus()
    returnFocusRef.current = null
  }, [open])

  const requestClose = () => {
    if (dismissible) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-modal="true"
      className={cn(
        'm-0 max-h-[92dvh] w-full max-w-none self-end overflow-y-auto rounded-t border border-rule-strong bg-ivory p-0 text-ink shadow-none backdrop:bg-felt-deep/80 sm:m-auto sm:max-w-lg sm:self-auto sm:rounded',
        className,
      )}
      onCancel={(event) => {
        event.preventDefault()
        requestClose()
      }}
      onClose={() => {
        document.documentElement.classList.remove('modal-open')
        if (open) onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose()
      }}
    >
      <div
        className="bg-ivory p-5 sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4 border-b border-rule pb-3">
          <h2 id={titleId} className="font-serif text-xl font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={requestClose}
            disabled={!dismissible}
            className="grid size-11 shrink-0 place-items-center rounded-sm border border-transparent text-muted hover:border-rule hover:text-ink"
            aria-label={`Close ${title}`}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
