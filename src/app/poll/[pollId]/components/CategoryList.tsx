"use client"

import { useState } from "react"



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

/** Top-level node ids whose subtree contains `activeCategoryId` — the
 *  accordion sections that should start open (e.g. after a deep link or
 *  a search-result pick lands on a nested leaf). */
function defaultOpenIds(nodes: CategoryTreeNode[], activeCategoryId?: string): Set<string> {
  const ids = new Set<string>()
  if (!activeCategoryId) return ids
  for (const node of nodes) {
    if (node.categoryId === activeCategoryId || subtreeContainsId(node, activeCategoryId)) {
      ids.add(node.categoryId)
    }
  }
  return ids
}

export function CategoryList({ nodes, activeCategoryId, onSelectLeaf, className = "" }: CategoryListProps) {
  // Only the mobile accordion needs open/closed state — the desktop tree
  // always renders everything expanded (see CategoryTreeItem's isToggle).
  const [mobileOpenIds, setMobileOpenIds] = useState<Set<string>>(() => defaultOpenIds(nodes, activeCategoryId))

  function handleMobileSelectLeaf(categoryId: string) {
    onSelectLeaf(categoryId)
    // Collapse everything once a pick is made — the category name shown
    // above the contestant grid is the confirmation now, not a section
    // left open on screen.
    setMobileOpenIds(new Set())
  }

  function handleMobileToggle(categoryId: string) {
    setMobileOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

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
        <CategoryTree
          nodes={nodes}
          activeCategoryId={activeCategoryId}
          onSelectLeaf={handleMobileSelectLeaf}
          collapsible
          openIds={mobileOpenIds}
          onToggle={handleMobileToggle}
        />
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
  openIds,
  onToggle,
}: {
  nodes: CategoryTreeNode[]
  activeCategoryId?: string
  onSelectLeaf: (categoryId: string) => void
  depth?: number
  collapsible: boolean
  openIds?: Set<string>
  onToggle?: (categoryId: string) => void
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
          openIds={openIds}
          onToggle={onToggle}
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
  openIds,
  onToggle,
}: {
  node: CategoryTreeNode
  depth: number
  activeCategoryId?: string
  onSelectLeaf: (categoryId: string) => void
  collapsible: boolean
  openIds?: Set<string>
  onToggle?: (categoryId: string) => void
}) {
  const isLeaf = node.children.length === 0
  // Only TOP-LEVEL groups get a toggle on mobile — once one's open,
  // everything nested inside just shows, however deep. Desktop never
  // collapses anything (collapsible is always false there).
  const isToggle = collapsible && depth === 0 && !isLeaf
  const open = isToggle ? (openIds?.has(node.categoryId) ?? false) : true

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
          onClick={() => onToggle?.(node.categoryId)}
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
          openIds={openIds}
          onToggle={onToggle}
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
