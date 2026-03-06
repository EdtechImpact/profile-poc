"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  modelId: string;
}

interface AWSCredentialsContextType {
  credentials: AWSCredentials | null;
  setCredentials: (creds: AWSCredentials) => void;
  clearCredentials: () => void;
  isConfigured: boolean;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  getHeaders: () => Record<string, string>;
}

const AWSCredentialsContext = createContext<AWSCredentialsContextType | null>(null);

const STORAGE_KEY = "aws_bedrock_credentials";

export function AWSCredentialsProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredentialsState] = useState<AWSCredentials | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCredentialsState(JSON.parse(stored));
      }
    } catch {}
    setLoaded(true);
  }, []);

  const setCredentials = useCallback((creds: AWSCredentials) => {
    setCredentialsState(creds);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
  }, []);

  const clearCredentials = useCallback(() => {
    setCredentialsState(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const isConfigured = !!(credentials?.accessKeyId && credentials?.secretAccessKey);

  const getHeaders = useCallback((): Record<string, string> => {
    if (!credentials) return {};
    return {
      "x-aws-access-key-id": credentials.accessKeyId,
      "x-aws-secret-access-key": credentials.secretAccessKey,
      "x-aws-region": credentials.region || "eu-west-1",
      "x-bedrock-model-id": credentials.modelId || "",
    };
  }, [credentials]);

  if (!loaded) return null;

  return (
    <AWSCredentialsContext.Provider
      value={{ credentials, setCredentials, clearCredentials, isConfigured, showSettings, setShowSettings, getHeaders }}
    >
      {children}
    </AWSCredentialsContext.Provider>
  );
}

export function useAWSCredentials() {
  const ctx = useContext(AWSCredentialsContext);
  if (!ctx) throw new Error("useAWSCredentials must be used within AWSCredentialsProvider");
  return ctx;
}
