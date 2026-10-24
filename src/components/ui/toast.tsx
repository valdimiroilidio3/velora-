"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Alert, type AlertTone } from "./alert";

interface ToastEntry {
  readonly id: number;
  readonly tone: AlertTone;
  readonly message: string;
}

interface ToastApi {
  notify: (message: string, tone?: AlertTone) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
const AUTO_DISMISS_MS = 5_000;

/**
 * Região de feedback não bloqueante (`aria-live="polite"`): confirmações que não
 * interrompem o que o utilizador está a fazer. Erros que exigem decisão usam `Alert`
 * inline, não um toast.
 */
export function ToastProvider({ children }: { readonly children: ReactNode }): ReactNode {
  const [entries, setEntries] = useState<readonly ToastEntry[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    (message: string, tone: AlertTone = "info") => {
      const id = nextId.current;
      nextId.current += 1;
      setEntries((current) => [...current.slice(-2), { id, tone, message }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), AUTO_DISMISS_MS),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) {
        clearTimeout(timer);
      }
      pending.clear();
    };
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="region"
        aria-label="Mensagens da aplicação"
        className="pointer-events-none fixed inset-x-3 bottom-3 z-50 grid gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-80"
      >
        <div aria-live="polite" aria-atomic="false" className="grid gap-2">
          {entries.map((entry) => (
            <div key={entry.id} className="pointer-events-auto rise-in">
              <Alert tone={entry.tone} onDismiss={() => dismiss(entry.id)} className="shadow-e2">
                {entry.message}
              </Alert>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (context === null) {
    throw new Error("useToast só pode ser usado dentro de <ToastProvider>.");
  }
  return context;
}
