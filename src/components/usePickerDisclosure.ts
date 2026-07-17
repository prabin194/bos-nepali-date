import { useCallback, useRef } from 'react';
import type React from 'react';
import type { PickerUIAction } from './pickerReducer';

type UsePickerDisclosureOptions = {
  controlledOpen?: boolean;
  internalOpen: boolean;
  dispatch: React.Dispatch<PickerUIAction>;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
};

export function usePickerDisclosure({
  controlledOpen,
  internalOpen,
  dispatch,
  onOpenChange,
  onClose,
}: UsePickerDisclosureOptions) {
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const callbackRef = useRef(onOpenChange);
  const onCloseRef = useRef(onClose);
  callbackRef.current = onOpenChange;
  onCloseRef.current = onClose;

  const open = useCallback(() => {
    callbackRef.current?.(true);
    if (!isControlled) dispatch({ type: 'OPEN' });
  }, [dispatch, isControlled]);

  const close = useCallback(() => {
    onCloseRef.current?.();
    callbackRef.current?.(false);
    if (!isControlled) dispatch({ type: 'CLOSE' });
  }, [dispatch, isControlled]);

  const toggle = useCallback(() => {
    callbackRef.current?.(!isOpen);
    if (!isControlled) dispatch({ type: 'TOGGLE_OPEN' });
  }, [dispatch, isControlled, isOpen]);

  return { isOpen, open, close, toggle };
}
