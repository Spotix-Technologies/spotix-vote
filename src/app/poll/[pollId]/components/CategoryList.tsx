"use client"

import { useState } from "react"

/**
 * src/app/poll/[pollId]/components/CategoryList.tsx
 *
 * Booker's CategoryBlock.tsx lets an organiser nest categories as deep
 * as they want (top-level, then sub-categories, then sub-sub-categories,
 * and so on) — this renders that whole tree, at whatever depth it
 * actually is, as two layouts sharing the same state:
 *
 *  - Desktop (md+): the sidebar-next-to-the-contestant-grid layout —
 *    everything expanded, its own independently-scrolling column, sticky
 *    under the header. Same shape as before, just genuinely showing the
 *    hierarchy now (top-level categories with their nested children
 *    indented underneath) instead of a flattened list of every leaf.
 *  - Mobile: an accordion with ONE toggle per TOP-LEVEL category —
 *    collapsed by default, so there's a short list to scan instead of a
 *    long one to scroll past before ever reaching the contestant grid
 *    below. Expanding a top-level section reveals everything nested
 *    under it in full, however many levels deep that goes — the ask was
 *    "the categories list per top level category" toggles open and
 *    shut, not that every single nested level gets its own toggle too.
 *    Whichever section contains the currently-selected leaf (e.g. from
 *    a deep link or a search result) starts open automatically.
 *
 * Selecting a leaf category calls onSelectLeaf(categoryId) — PollClient
 * owns which leaf is "active" and which contestants that drives.
 */

export interface CategoryTreeNode {
  categoryId: string
  name: string
  /** Empty = this is a leaf (selectable, has contestants). Non-empty = a grouping node. */
  children: CategoryTreeNode[]
}

export interface CategoryListProps {
  nodes: CategoryTreeNode[]
  activeCategoryId?: string
  onSelectLeaf: (categoryId: string) => void
  className?: string
}

export function CategoryList({ nodes, activeCategoryId, onSelectLeaf, className = "" }: CategoryListProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <div
        className={`hidden md:sticky md:top-20 md:block md:max-h-[70vh] md:overflow-y-auto md:rounded-2xl md:border md:border-line md:bg-ink-2 md:p-2 ${className}`}
      >
        <CategoryTree nodes={nodes} activeCategoryId={activeCategoryId} onSelectLeaf={onSelectLeaf} collapsible={false} />
      </div>

      {/* Mobile accordion */}
      <div className={`mb-6 rounded-2xl border border-line bg-ink-2 p-2 md:hidden ${className}`}>
        <CategoryTree nodes={nodes} activeCategoryId={activeCategoryId} onSelectLeaf={onSelectLeaf} collapsible />
      </div>
    </>
  )
}

function CategoryTree({
  nodes,
  activeCategoryId,
  onSelectLeaf,
  depth = 0,
  collapsible,
}: {
  nodes: CategoryTreeNode[]
  activeCategoryId?: string
  onSelectLeaf: (categoryId: string) => void
  depth?: number
  collapsible: boolean
}) {
  return (
    <ul className={depth === 0 ? "space-y-1" : "mt-1 space-y-1 border-l border-line pl-3"}>
      {nodes.map((node) => (
        <CategoryTreeItem
          key={node.categoryId}
          node={node}
          depth={depth}
          activeCategoryId={activeCategoryId}
          onSelectLeaf={onSelectLeaf}
          collapsible={collapsible}
        />
      ))}
    </ul>
  )
}

function CategoryTreeItem({
  node,
  depth,
  activeCategoryId,
  onSelectLeaf,
  collapsible,
}: {
  node: CategoryTreeNode
  depth: number
  activeCategoryId?: string
  onSelectLeaf: (categoryId: string) => void
  collapsible: boolean
}) {
  const isLeaf = node.children.length === 0
  // Only TOP-LEVEL groups get a toggle on mobile — once one's open,
  // everything nested inside just shows, however deep. Desktop never
  // collapses anything (collapsible is always false there).
  const isToggle = collapsible && depth === 0 && !isLeaf
  const [open, setOpen] = useState(() => !isToggle || subtreeContainsId(node, activeCategoryId))

  if (isLeaf) {
    const active = node.categoryId === activeCategoryId
    return (
      <li>
        <button
          type="button"
          onClick={() => onSelectLeaf(node.categoryId)}
          aria-current={active ? "true" : undefined}
          className={`block w-full rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors ${
            active ? "bg-brass/10 font-medium text-brass-soft" : "text-muted hover:bg-ink-3 hover:text-paper"
          }`}
        >
          {node.name}
        </button>
      </li>
    )
  }

  return (
    <li>
      {isToggle ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-paper transition-colors hover:bg-ink-3"
        >
          {node.name}
          <ChevronIcon open={open} />
        </button>
      ) : (
        <p className="px-3.5 py-2 text-xs font-semibold uppercase tracking-wide text-muted">{node.name}</p>
      )}
      {(open || !isToggle) && (
        <CategoryTree
          nodes={node.children}
          activeCategoryId={activeCategoryId}
          onSelectLeaf={onSelectLeaf}
          depth={depth + 1}
          collapsible={collapsible}
        />
      )}
    </li>
  )
}

function subtreeContainsId(node: CategoryTreeNode, id?: string): boolean {
  if (!id) return false
  return node.children.some((c) => c.categoryId === id || subtreeContainsId(c, id))
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
