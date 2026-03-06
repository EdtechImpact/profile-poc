"use client";

import { useState, useEffect } from "react";
import { useAWSCredentials } from "./aws-credentials-provider";

export default function AWSSettingsModal() {
  const { credentials, setCredentials, clearCredentials, isConfigured, showSettings, setShowSettings } = useAWSCredentials();

  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [region, setRegion] = useState("eu-west-1");
  const [modelId, setModelId] = useState("anthropic.claude-3-haiku-20240307-v1:0");
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (credentials) {
      setAccessKeyId(credentials.accessKeyId);
      setSecretAccessKey(credentials.secretAccessKey);
      setRegion(credentials.region || "eu-west-1");
      setModelId(credentials.modelId || "anthropic.claude-3-haiku-20240307-v1:0");
    }
  }, [credentials]);

  if (!showSettings) return null;

  const handleSave = () => {
    setCredentials({ accessKeyId, secretAccessKey, region, modelId });
    setShowSettings(false);
  };

  const handleClear = () => {
    clearCredentials();
    setAccessKeyId("");
    setSecretAccessKey("");
    setRegion("eu-west-1");
    setModelId("anthropic.claude-3-haiku-20240307-v1:0");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-fade-in-up">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">AWS Bedrock Credentials</h2>
              <p className="text-xs text-slate-400">Required for AI features (analysis, match explanations)</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Access Key ID</label>
              <input
                type="text"
                value={accessKeyId}
                onChange={(e) => setAccessKeyId(e.target.value)}
                placeholder="AKIA..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Secret Access Key</label>
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  value={secretAccessKey}
                  onChange={(e) => setSecretAccessKey(e.target.value)}
                  placeholder="wJalr..."
                  className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {showSecret ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    ) : (
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Region</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  <option value="us-east-1">us-east-1</option>
                  <option value="us-west-2">us-west-2</option>
                  <option value="eu-west-1">eu-west-1</option>
                  <option value="eu-west-2">eu-west-2</option>
                  <option value="eu-central-1">eu-central-1</option>
                  <option value="ap-northeast-1">ap-northeast-1</option>
                  <option value="ap-southeast-1">ap-southeast-1</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Model ID</label>
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  <option value="anthropic.claude-3-haiku-20240307-v1:0">Claude 3 Haiku</option>
                  <option value="anthropic.claude-3-sonnet-20240229-v1:0">Claude 3 Sonnet</option>
                  <option value="anthropic.claude-3-5-sonnet-20241022-v2:0">Claude 3.5 Sonnet v2</option>
                  <option value="anthropic.claude-3-5-haiku-20241022-v1:0">Claude 3.5 Haiku</option>
                  <option value="eu.anthropic.claude-3-5-haiku-20241022-v1:0">Claude 3.5 Haiku (EU)</option>
                </select>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Credentials are stored in your browser&apos;s localStorage and sent via headers to the API. They are never persisted server-side. For production, use proper authentication.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={!accessKeyId || !secretAccessKey}
              className="flex-1 px-4 py-2.5 gradient-bg text-white rounded-xl text-sm font-semibold hover:shadow-glow-brand disabled:opacity-50 transition-all"
            >
              Save Credentials
            </button>
            {isConfigured && (
              <button
                onClick={handleClear}
                className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 border border-red-200 transition-all"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setShowSettings(false)}
              className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
