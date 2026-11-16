"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Button } from "./button";
import { Modal } from "./modal";

type Options = { title: string; message?: string; confirmLabel?: string; danger?: boolean };
const ConfirmContext = createContext<(o: Options) => Promise<boolean>>(async () => false);

/** const confirm = useConfirm(); if (await confirm({ title: "Delete?" })) { ... } */
export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<Options | null>(null);
  const resolver = useRef<(v: boolean) => void>(() => {});

  const confirm = useCallback((o: Options) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => (resolver.current = resolve));
  }, []);

  const close = (v: boolean) => {
    resolver.current(v);
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!opts}
        onClose={() => close(false)}
        title={opts?.title ?? ""}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button variant={opts?.danger ? "danger" : "primary"} onClick={() => close(true)}>
              {opts?.confirmLabel ?? "Confirm"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{opts?.message ?? "Are you sure?"}</p>
      </Modal>
    </ConfirmContext.Provider>
  );
}
