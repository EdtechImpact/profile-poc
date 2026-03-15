"use client";

import { useState, useEffect, useCallback } from "react";
import { AdvisorPanel } from "./advisor-panel";
import { AdvisorButton } from "./advisor-button";

export function AdvisorWrapper() {
  const [isOpen, setIsOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState<string | null>(null);

  const handleOpen = useCallback((query?: string | null) => {
    setInitialQuery(query ?? null);
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setInitialQuery(null);
  }, []);

  // Listen for custom event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const query = detail?.query ?? null;
      handleOpen(query);
    };
    window.addEventListener("open-advisor", handler);
    return () => window.removeEventListener("open-advisor", handler);
  }, [handleOpen]);

  return (
    <>
      <AdvisorPanel isOpen={isOpen} onClose={handleClose} initialQuery={initialQuery} />
      <AdvisorButton isOpen={isOpen} onClick={() => handleOpen()} />
    </>
  );
}
