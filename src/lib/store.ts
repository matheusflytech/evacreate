import { create } from "zustand";

export type CreativeType = "gancho" | "corpo" | "cta";

export interface SourceVideo {
  id: string;
  name: string;
  size: number;
  duration: number;
  thumbnail: string;
  file: File;
  uploadedAt: number;
  projectId: string;
}

export interface CutPoint {
  id: string;
  time: number; // seconds
}

export interface Segment {
  id: string;
  name: string;
  type: CreativeType;
  start: number;
  end: number;
  targetDuration?: number;
  sourceId: string;
}

export interface Creative {
  id: string;
  name: string;
  type: CreativeType;
  duration: number;
  size: number;
  blobUrl: string;
  thumbnail: string;
  sourceName: string;
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  videoIds: string[];
  creativeIds: string[];
  status: "rascunho" | "processando" | "concluido";
  createdAt: number;
}

interface State {
  projects: Project[];
  videos: SourceVideo[];
  creatives: Creative[];
  privacySeen: boolean;
  setPrivacySeen: () => void;
  addProject: (name: string) => string;
  addVideo: (v: SourceVideo) => void;
  removeVideo: (id: string) => void;
  addCreatives: (c: Creative[]) => void;
  removeCreative: (id: string) => void;
  renameCreative: (id: string, name: string) => void;
  attachCreativesToProject: (projectId: string, ids: string[]) => void;
}

export const useStore = create<State>((set) => ({
  projects: [],
  videos: [],
  creatives: [],
  privacySeen: false,
  setPrivacySeen: () => set({ privacySeen: true }),
  addProject: (name) => {
    const id = crypto.randomUUID();
    set((s) => ({
      projects: [
        { id, name, videoIds: [], creativeIds: [], status: "rascunho", createdAt: Date.now() },
        ...s.projects,
      ],
    }));
    return id;
  },
  addVideo: (v) => set((s) => ({
    videos: [v, ...s.videos],
    projects: s.projects.map((p) => p.id === v.projectId ? { ...p, videoIds: [...p.videoIds, v.id] } : p),
  })),
  removeVideo: (id) => set((s) => ({ videos: s.videos.filter((v) => v.id !== id) })),
  addCreatives: (c) => set((s) => ({ creatives: [...c, ...s.creatives] })),
  removeCreative: (id) => set((s) => ({ creatives: s.creatives.filter((c) => c.id !== id) })),
  renameCreative: (id, name) => set((s) => ({
    creatives: s.creatives.map((c) => c.id === id ? { ...c, name } : c),
  })),
  attachCreativesToProject: (projectId, ids) => set((s) => ({
    projects: s.projects.map((p) => p.id === projectId
      ? { ...p, creativeIds: [...p.creativeIds, ...ids], status: "concluido" }
      : p),
  })),
}));

export const fmtDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = (s - m * 60).toFixed(1);
  return `${String(m).padStart(2, "0")}:${sec.padStart(4, "0")}`;
};

export const fmtSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

export const typeLabel: Record<CreativeType, string> = {
  gancho: "Gancho",
  corpo: "Corpo",
  cta: "CTA",
};
