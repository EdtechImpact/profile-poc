"use client";

import { createContext } from "react";

// Context for entity click handling (opens detail modal instead of navigating)
export type EntityClickHandler = (entityType: "school" | "product", entityId: string) => void;
export const EntityClickContext = createContext<EntityClickHandler | null>(null);
