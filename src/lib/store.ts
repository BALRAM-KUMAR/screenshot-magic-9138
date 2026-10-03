import { useSyncExternalStore } from "react";
import { demoAnalyses, type Analysis, type AudioMeta } from "./analysis";

const KEY = "audiosense.analyses.v1";

export interface Draft {
  audio: AudioMeta;
  url: string;
  modelIds: string[];
}

let analyses: Analysis[] = [];
let loaded = false;
let draft: Draft | null = null;
const audioUrls = new Map<string, string>();
const listeners = new Set<() => void>();
const EMPTY: Analysis[] = [];

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    analyses = raw ? JSON.parse(raw) : demoAnalyses();
  } catch {
    analyses = demoAnalyses();
  }
  persist();
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(analyses));
  } catch {
    /* ignore */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export const store = {
  getAll() {
    load();
    return analyses;
  },
  get(id: string) {
    load();
    return analyses.find((a) => a.id === id);
  },
  add(a: Analysis, url?: string) {
    load();
    analyses = [a, ...analyses];
    if (url) audioUrls.set(a.id, url);
    persist();
    emit();
  },
  update(id: string, patch: Partial<Analysis>) {
    analyses = analyses.map((a) => (a.id === id ? { ...a, ...patch } : a));
    persist();
    emit();
  },
  remove(id: string) {
    analyses = analyses.filter((a) => a.id !== id);
    persist();
    emit();
  },
  audioUrl(id: string) {
    return audioUrls.get(id);
  },
  getDraft: () => draft,
  setDraft(d: Draft | null) {
    draft = d;
    emit();
  },
};

export function useAnalyses() {
  return useSyncExternalStore(subscribe, store.getAll, () => EMPTY);
}

export function useAnalysis(id: string) {
  const all = useAnalyses();
  return all.find((a) => a.id === id);
}

export function useDraft() {
  return useSyncExternalStore(subscribe, store.getDraft, () => null);
}
