import { useEffect, useMemo, useState } from 'react';

import type { AppToastState, AppToastTone } from '../components/AppToast';

type ShowToastInput =
  | string
  | {
      durationMs?: number;
      message: string;
      tone?: AppToastTone;
    };

export function useToast() {
  const [toast, setToast] = useState<AppToastState | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = setTimeout(() => {
      setToast((current) => (current?.id === toast.id ? null : current));
    }, 3200);

    return () => clearTimeout(timeout);
  }, [toast]);

  const api = useMemo(
    () => ({
      hideToast: () => setToast(null),
      showToast: (input: ShowToastInput) => {
        const nextInput =
          typeof input === 'string'
            ? { message: input, tone: 'info' as AppToastTone, durationMs: 3200 }
            : {
                durationMs: input.durationMs ?? 3200,
                message: input.message,
                tone: input.tone ?? 'info',
              };

        const nextToast: AppToastState = {
          id: Date.now(),
          message: nextInput.message,
          tone: nextInput.tone,
        };

        setToast(nextToast);

        if (nextInput.durationMs !== 3200) {
          setTimeout(() => {
            setToast((current) => (current?.id === nextToast.id ? null : current));
          }, nextInput.durationMs);
        }
      },
      toast,
    }),
    [toast],
  );

  return api;
}
