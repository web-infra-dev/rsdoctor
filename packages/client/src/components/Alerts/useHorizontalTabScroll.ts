import { useRef } from 'react';
import type { HTMLAttributes } from 'react';

const TAB_BAR_SELECTOR = '.ant-tabs-nav-wrap';
const DRAG_THRESHOLD = 4;

interface ScrollMetrics {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
  deltaX: number;
  deltaY: number;
  deltaMode: number;
}

interface DragState {
  element: HTMLElement;
  pointerId: number;
  startX: number;
  startScrollLeft: number;
  moved: boolean;
}

function getTabBar(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) {
    return null;
  }

  const tabBar = target.closest(TAB_BAR_SELECTOR);
  return tabBar instanceof HTMLElement ? tabBar : null;
}

export function getNextHorizontalScrollLeft({
  scrollLeft,
  scrollWidth,
  clientWidth,
  deltaX,
  deltaY,
  deltaMode,
}: ScrollMetrics): number {
  const dominantDelta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
  const multiplier = deltaMode === 1 ? 16 : deltaMode === 2 ? clientWidth : 1;
  const maxScrollLeft = Math.max(0, scrollWidth - clientWidth);

  return Math.min(
    maxScrollLeft,
    Math.max(0, scrollLeft + dominantDelta * multiplier),
  );
}

export function useHorizontalTabScroll(): HTMLAttributes<HTMLDivElement> {
  const dragStateRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);

  const finishDragging = (pointerId: number, suppressClick: boolean) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== pointerId) {
      return;
    }

    delete dragState.element.dataset.dragging;
    if (dragState.element.hasPointerCapture(pointerId)) {
      dragState.element.releasePointerCapture(pointerId);
    }
    dragStateRef.current = null;

    if (suppressClick && dragState.moved) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      });
    }
  };

  return {
    onWheel(event) {
      const tabBar = getTabBar(event.target);
      if (!tabBar) {
        return;
      }

      const nextScrollLeft = getNextHorizontalScrollLeft({
        scrollLeft: tabBar.scrollLeft,
        scrollWidth: tabBar.scrollWidth,
        clientWidth: tabBar.clientWidth,
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        deltaMode: event.deltaMode,
      });

      if (nextScrollLeft !== tabBar.scrollLeft) {
        tabBar.scrollLeft = nextScrollLeft;
        event.preventDefault();
      }
    },
    onPointerDown(event) {
      if (event.pointerType !== 'mouse' || event.button !== 0) {
        return;
      }

      const tabBar = getTabBar(event.target);
      if (!tabBar || tabBar.scrollWidth <= tabBar.clientWidth) {
        return;
      }

      dragStateRef.current = {
        element: tabBar,
        pointerId: event.pointerId,
        startX: event.clientX,
        startScrollLeft: tabBar.scrollLeft,
        moved: false,
      };
      tabBar.dataset.dragging = 'true';
      tabBar.setPointerCapture(event.pointerId);
    },
    onPointerMove(event) {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      const distance = event.clientX - dragState.startX;
      if (Math.abs(distance) >= DRAG_THRESHOLD) {
        dragState.moved = true;
      }

      if (dragState.moved) {
        dragState.element.scrollLeft = dragState.startScrollLeft - distance;
        event.preventDefault();
      }
    },
    onPointerUp(event) {
      finishDragging(event.pointerId, true);
    },
    onPointerCancel(event) {
      finishDragging(event.pointerId, false);
    },
    onClickCapture(event) {
      if (suppressClickRef.current && getTabBar(event.target)) {
        suppressClickRef.current = false;
        event.preventDefault();
        event.stopPropagation();
      }
    },
  };
}
