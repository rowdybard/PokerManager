import type { ReactNode } from 'react'
import { SectionHeader } from '../ui/SectionHeader'

interface ProPageProps {
  title: string
  description: string
  actions?: ReactNode
  children: ReactNode
}

export function ProPage({ title, description, actions, children }: ProPageProps) {
  return (
    <div className="space-y-5 [&_.rounded-xl]:rounded-sm [&_.rounded-2xl]:rounded-sm [&_.shadow-sm]:shadow-none">
      <SectionHeader
        headingLevel={1}
        title={title}
        description={description}
        className="items-stretch pb-4 sm:items-end [&>div:last-child]:w-full sm:[&>div:last-child]:w-auto"
        action={
          actions ? (
            <div className="flex w-full flex-col gap-2 min-[420px]:flex-row sm:w-auto [&>*]:w-full min-[420px]:[&>*]:w-auto [&_button]:min-h-11 [&_button]:w-full [&_button]:gap-2 [&_button]:px-4 [&_button]:text-sm min-[420px]:[&_button]:w-auto [&_select]:min-h-11">
              {actions}
            </div>
          ) : undefined
        }
      />
      {children}
    </div>
  )
}
