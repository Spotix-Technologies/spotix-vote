"use client"

/**
 * src/app/poll/[pollId]/components/CategoryList.tsx
 *
 * A group poll can have up to 150 leaf categories (see spotix-booker's
 * poll-config.ts limits) — a flat wrapped row of pill buttons stops
 * being usable well before that. This renders them as a vertical,
 * independently-scrollable list instead, capped to a fixed height so it
 * sits as a sidebar next to the contestant grid rather than pushing it
 * down the page. Imported straight into PollClient.tsx.
 */

export interface CategoryListItem {
  categoryId: string
  name: string
}

export interface CategoryListProps {
  categories: CategoryListItem[]
  activeCategoryId?: string
  onSelect: (categoryId: string) => void
  className?: string
}

export function CategoryList({ categories, activeCategoryId, onSelect, className = "" }: CategoryListProps) {
  return (
    <div
      className={`flex max-h-[60vh] flex-col gap-1 overflow-y-auto rounded-2xl border border-line bg-ink-2 p-2 md:max-h-[70vh] ${className}`}
    >
      {categories.map((c) => {
        const active = c.categoryId === activeCategoryId
        return (
          <button
            key={c.categoryId}
            type="button"
            onClick={() => onSelect(c.categoryId)}
            aria-current={active ? "true" : undefined}
            className={`shrink-0 rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors ${
              active
                ? "bg-brass/10 font-medium text-brass-soft"
                : "text-muted hover:bg-ink-3 hover:text-paper"
            }`}
          >
            {c.name}
          </button>
        )
      })}
    </div>
  )
}
