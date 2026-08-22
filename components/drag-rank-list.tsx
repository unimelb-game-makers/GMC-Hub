"use client";

import { useRef, useState } from "react";

interface Item {
  id: string;
  label: string;
}

const ROW_HEIGHT = 52;
const SLOT_HEIGHT = 60;

interface DragState {
  index: number;
  startY: number;
  deltaY: number;
  hoverIndex: number;
}

// Pointer Events (not the HTML5 drag-and-drop API, which has poor touch
// support) drive reordering, so the exact same code path handles mouse and
// touch. A dedicated grip handle initiates the drag, generously sized for a
// thumb, so touch-scrolling the rest of the page still works normally
// everywhere else in the list. Arrow keys on a focused row are a
// keyboard/screen-reader-accessible equivalent to dragging.
//
// Drag position is tracked in BOTH a ref and state, deliberately: a real
// drag's rapid pointermove events and the pointerup that releases it can
// land in the same React batch, so reading the *state* at drop time can see
// a stale hover position from before the last move committed, silently
// snapping the item back to where it started instead of applying the move.
// dragRef is always synchronously current the instant it's written, so
// endDrag reads the drop target from there; `drag` state exists purely to
// drive rendering (reading a ref during render isn't allowed, and isn't
// what's needed there anyway, the visuals lag a frame behind at most).
export function DragRankList({
  items,
  onReorder,
  disabled = false,
}: {
  items: Item[];
  onReorder: (newOrderIds: string[]) => void;
  disabled?: boolean;
}) {
  const dragRef = useRef<DragState | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  const announce = (text: string) => {
    if (liveRegionRef.current) liveRegionRef.current.textContent = text;
  };

  const reorderBy = (index: number, targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= items.length || targetIndex === index) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    onReorder(next.map((i) => i.id));
    announce(`${moved.label} moved to position ${targetIndex + 1} of ${items.length}`);
  };

  const startDrag = (index: number, clientY: number, pointerId: number, el: HTMLElement) => {
    if (disabled) return;
    el.setPointerCapture(pointerId);
    const next = { index, startY: clientY, deltaY: 0, hoverIndex: index };
    dragRef.current = next;
    setDrag(next);
  };

  const moveDrag = (clientY: number) => {
    const prev = dragRef.current;
    if (!prev) return;
    const deltaY = clientY - prev.startY;
    const hoverIndex = Math.min(
      items.length - 1,
      Math.max(0, prev.index + Math.round(deltaY / SLOT_HEIGHT))
    );
    const next = { ...prev, deltaY, hoverIndex };
    dragRef.current = next;
    setDrag(next);
  };

  const endDrag = () => {
    const prev = dragRef.current;
    dragRef.current = null;
    if (prev && prev.hoverIndex !== prev.index) reorderBy(prev.index, prev.hoverIndex);
    setDrag(null);
  };

  return (
    <ol className="relative flex flex-col" style={{ height: items.length * SLOT_HEIGHT }}>
      <div ref={liveRegionRef} aria-live="polite" className="sr-only" />
      {items.map((item, i) => {
        const isDragging = drag?.index === i;
        let shift = 0;
        if (drag && !isDragging) {
          const { index: from, hoverIndex: to } = drag;
          if (from < to && i > from && i <= to) shift = -SLOT_HEIGHT;
          else if (from > to && i >= to && i < from) shift = SLOT_HEIGHT;
        }
        const y = i * SLOT_HEIGHT + (isDragging ? drag.deltaY : shift);

        return (
          <li
            key={item.id}
            tabIndex={disabled ? -1 : 0}
            aria-label={`${item.label}, rank ${i + 1} of ${items.length}. Use arrow keys to reorder.`}
            onKeyDown={(e) => {
              if (disabled) return;
              if (e.key === "ArrowUp") {
                e.preventDefault();
                reorderBy(i, i - 1);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                reorderBy(i, i + 1);
              }
            }}
            className={`absolute inset-x-0 flex items-center gap-2 rounded-md border bg-bg px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isDragging
                ? "border-accent shadow-lg shadow-black/30"
                : "border-line"
            }`}
            style={{
              height: ROW_HEIGHT,
              transform: `translateY(${y}px)`,
              transition: isDragging ? "none" : "transform 180ms ease",
              zIndex: isDragging ? 10 : 1,
              touchAction: "none",
            }}
          >
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-ink">
              {i + 1}
            </span>
            <span className="flex-1 truncate">{item.label}</span>
            {!disabled && (
              <span
                role="presentation"
                aria-hidden
                onPointerDown={(e) => {
                  e.preventDefault();
                  startDrag(i, e.clientY, e.pointerId, e.currentTarget);
                }}
                onPointerMove={(e) => dragRef.current?.index === i && moveDrag(e.clientY)}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className="flex h-11 w-11 flex-none cursor-grab touch-none items-center justify-center text-ink-soft active:cursor-grabbing"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden>
                  <circle cx="6" cy="5" r="1.5" />
                  <circle cx="14" cy="5" r="1.5" />
                  <circle cx="6" cy="10" r="1.5" />
                  <circle cx="14" cy="10" r="1.5" />
                  <circle cx="6" cy="15" r="1.5" />
                  <circle cx="14" cy="15" r="1.5" />
                </svg>
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
