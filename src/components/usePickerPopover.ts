import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type React from 'react';
import type { PickerPlacement } from './pickerTypes';

type UsePickerPopoverOptions = {
  isOpen: boolean;
  placement: PickerPlacement;
  preferredWidth: number;
  minimumWidth: number;
  flipThreshold: number;
  repositionToken: string;
  getPopupContainer?: (trigger: HTMLElement) => HTMLElement;
  onRequestClose: () => void;
};

export function usePickerPopover({
  isOpen,
  placement,
  preferredWidth,
  minimumWidth,
  flipThreshold,
  repositionToken,
  getPopupContainer,
  onRequestClose,
}: UsePickerPopoverOptions) {
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const openSource = useRef<'input' | 'toggle'>('input');
  const closeRef = useRef(onRequestClose);
  closeRef.current = onRequestClose;

  const updatePosition = useCallback(() => {
    if (!wrapperRef.current || typeof window === 'undefined') return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const maxWidth = Math.max(0, Math.min(preferredWidth, viewportWidth - viewportPadding * 2));
    const width = Math.max(0, Math.min(maxWidth, Math.max(rect.width, minimumWidth)));
    const opensUp = placement === 'topLeft' || placement === 'topRight';
    const alignsRight = placement === 'bottomRight' || placement === 'topRight';
    let left = alignsRight ? rect.right - width : rect.left;
    if (left + width > viewportWidth - viewportPadding) {
      left = viewportWidth - width - viewportPadding;
    }
    left = Math.max(viewportPadding, left);
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const effectiveOpenUp = opensUp || (spaceBelow < flipThreshold && spaceAbove > spaceBelow);
    const top = effectiveOpenUp
      ? Math.max(viewportPadding, rect.top - gap)
      : Math.min(viewportHeight - viewportPadding, rect.bottom + gap);

    setPopoverStyle({
      position: 'fixed',
      top,
      left,
      width,
      maxWidth: `calc(100vw - ${viewportPadding * 2}px)`,
      zIndex: 9999,
      transform: effectiveOpenUp ? 'translateY(-100%)' : undefined,
    });
  }, [flipThreshold, minimumWidth, placement, preferredWidth]);

  useEffect(() => {
    if (isOpen && openSource.current === 'toggle') {
      requestAnimationFrame(() => {
        popoverRef.current?.querySelector<HTMLElement>('button:not([disabled]),input:not([disabled])')?.focus();
      });
    }
  }, [isOpen]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (wrapperRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      closeRef.current();
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!isOpen) return;
      if (event.key === 'Escape') {
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab' || !popoverRef.current) return;
      const focusables = Array.from(
        popoverRef.current.querySelectorAll<HTMLElement>('button,input')
      ).filter((element) => !element.hasAttribute('disabled'));
      if (focusables.length === 0) return;
      const currentIndex = focusables.indexOf(document.activeElement as HTMLElement);
      const nextIndex = event.shiftKey
        ? (currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1)
        : (currentIndex === -1 || currentIndex === focusables.length - 1 ? 0 : currentIndex + 1);
      if (nextIndex !== currentIndex) {
        event.preventDefault();
        focusables[nextIndex].focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
    let animationFrame = 0;
    function onReposition() {
      if (animationFrame) return;
      animationFrame = requestAnimationFrame(() => {
        animationFrame = 0;
        updatePosition();
      });
    }
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [isOpen, repositionToken, updatePosition]);

  const popoverContainer = getPopupContainer && wrapperRef.current
    ? getPopupContainer(wrapperRef.current)
    : typeof document !== 'undefined'
      ? document.body
      : null;

  const returnFocus = useCallback(() => {
    requestAnimationFrame(() => wrapperRef.current?.querySelector<HTMLElement>('input')?.focus());
  }, []);

  return { wrapperRef, popoverRef, popoverStyle, popoverContainer, openSource, returnFocus };
}
