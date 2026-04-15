import { useEffect, useMemo, useState } from 'react';

import type { AppToastState, AppToastTone } from '../components/AppToast';

type ShowToastInput =
  | string
  | {
      durationMs?: number;
      message: string;
      tone?: AppToastTone;
    };

type ToastState = AppToastState & {
  durationMs: number;
};

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = setTimeout(() => {
      setToast((current) => (current?.id === toast.id ? null : current));
    }, toast.durationMs);

    return () => clearTimeout(timeout);
  }, [toast]);

  const api = useMemo(
    () => ({
      hideToast: () => setToast(null),
      showToast: (input: ShowToastInput) => {
        const durationMs =
          typeof input === 'string' ? 3200 : (input.durationMs ?? 3200);
        const tone =
          typeof input === 'string' ? ('info' as AppToastTone) : (input.tone ?? 'info');
        const message = typeof input === 'string' ? input : input.message;

        setToast({
          id: Date.now(),
          message,
          tone,
          durationMs,
        });
      },
      toast,
    }),
    [toast],
  );

  return api;
}
