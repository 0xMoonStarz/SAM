/**
 * SAM v1.0 - Context Manager: External memory that survives compaction
 * Super Access Memory - journal, snapshots, working set tracking
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const SAM_DIR = join(homedir(), ".sam");
const SNAPSHOTS_DIR = join(SAM_DIR, "snapshots");
const JOURNAL_FILE = join(SAM_DIR, "context-journal.json");
const MAX_SNAPSHOTS = 20;
const MAX_JOURNAL_ENTRIES = 100;

export type ContextEntryType = "discovery" | "decision" | "architecture" | "bug" | "progress" | "note";

export interface ContextEntry {
  timestamp: number;
  type: ContextEntryType;
  text: string;
}

export interface WorkingSetFile {
  alias: string;
  path: string;
  hash: string;
  summary: string;
  lines: number;
}

export interface Snapshot {
  version: string;
  label: string;
  timestamp: number;
  project: string; // cwd at time of snapshot
  files: Record<string, string>;
  custom: Record<string, string>;
  urls: Record<string, string>;
  presets: string[];
  summary: string;
  key_context: string[];
  journal: ContextEntry[];
  working_set: WorkingSetFile[];
  metrics: { tokensSaved: number; ratio: string; minutes: number };
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function sanitizeLabel(label: string): string {
  return label.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 50);
}

function cheapHash(content: string, lineCount: number): string {
  const head = content.slice(0, 200);
  const tail = content.slice(-200);
  const input = `${lineCount}:${head}:${tail}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

export class ContextManager {
  private journal: ContextEntry[] = [];
  private readFiles: Set<string> = new Set();

  constructor() {
    this.loadJournal();
  }

  // --- Journal ---

  addEntry(text: string, type: ContextEntryType = "note"): ContextEntry {
    const entry: ContextEntry = { timestamp: Date.now(), type, text };
    this.journal.push(entry);
    // Append to log file (cheap, no full rewrite)
    this.appendEntry(entry);
    if (this.journal.length > MAX_JOURNAL_ENTRIES) {
      this.journal = this.journal.slice(-MAX_JOURNAL_ENTRIES);
      this.saveJournal(); // Full rewrite only when pruning
    }
    return entry;
  }

  getJournal(): ContextEntry[] {
    return [...this.journal];
  }

  clearJournal(): void {
    this.journal = [];
    this.saveJournal();
  }

  private loadJournal(): void {
    ensureDir(SAM_DIR);
    if (!existsSync(JOURNAL_FILE)) return;
    try {
      const data = JSON.parse(readFileSync(JOURNAL_FILE, "utf-8"));
      if (Array.isArray(data)) this.journal = data;
    } catch { /* start fresh */ }
  }

  saveJournal(): void {
    ensureDir(SAM_DIR);
    // Append-only: write only new entries to avoid rewriting the whole file
    // Full rewrite only when pruning or clearing
    writeFileSync(JOURNAL_FILE, JSON.stringify(this.journal, null, 2));
  }

  appendEntry(entry: ContextEntry): void {
    // Append a single line to a separate log file (cheap, no full rewrite)
    const logFile = join(SAM_DIR, "context-log.jsonl");
    const line = JSON.stringify(entry) + "\n";
    try {
      const { appendFileSync } = require("fs");
      appendFileSync(logFile, line);
    } catch { /* ok */ }
  }

  formatJournal(limit?: number): string {
    const entries = limit ? this.journal.slice(-limit) : this.journal;
    if (entries.length === 0) return "(empty journal)";
    return entries.map(e => {
      const time = new Date(e.timestamp).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false });
      return `[${time}] ${e.type}: ${e.text}`;
    }).join("\n");
  }

  // --- Read Files Tracking ---

  markFileRead(path: string): void {
    this.readFiles.add(path);
    // Keep only last 20
    if (this.readFiles.size > 20) {
      const arr = [...this.readFiles];
      this.readFiles = new Set(arr.slice(-20));
    }
  }

  getReadFiles(): string[] {
    return [...this.readFiles];
  }

  // --- Working Set ---

  generateWorkingSet(
    fileAliases: Record<string, string>,
    summarizeFn: (content: string, name: string) => string
  ): WorkingSetFile[] {
    const workingSet: WorkingSetFile[] = [];
    const aliasToPath = new Map(Object.entries(fileAliases).map(([a, p]) => [p, a]));

    for (const path of this.readFiles) {
      if (!existsSync(path)) continue;
      try {
        const content = readFileSync(path, "utf-8");
        const lines = content.split("\n").length;
        const alias = aliasToPath.get(path) || "?";
        workingSet.push({
          alias,
          path,
          hash: cheapHash(content, lines),
          summary: summarizeFn(content, path).slice(0, 500),
          lines,
        });
      } catch { /* skip unreadable */ }
      if (workingSet.length >= 20) break;
    }
    return workingSet;
  }

  // --- Snapshots ---

  createSnapshot(
    dictState: { files: Record<string, string>; custom: Record<string, string>; urls: Record<string, string>; presets: string[] },
    metricsData: { tokensSaved: number; ratio: string; minutes: number },
    summary: string,
    keyContext: string[],
    label?: string,
    workingSet?: WorkingSetFile[],
    project?: string
  ): string {
    ensureDir(SNAPSHOTS_DIR);

    const snap: Snapshot = {
      version: "1.0",
      label: label || `snap-${Date.now()}`,
      timestamp: Date.now(),
      project: project || process.cwd(),
      files: dictState.files,
      custom: dictState.custom,
      urls: dictState.urls,
      presets: dictState.presets,
      summary,
      key_context: keyContext,
      journal: [...this.journal],
      working_set: workingSet || [],
      metrics: metricsData,
    };

    const filename = `${snap.timestamp}-${sanitizeLabel(snap.label)}.json`;
    const filepath = join(SNAPSHOTS_DIR, filename);
    writeFileSync(filepath, JSON.stringify(snap, null, 2));
    this.pruneSnapshots();
    return filepath;
  }

  loadSnapshot(label?: string): Snapshot | null {
    ensureDir(SNAPSHOTS_DIR);
    const files = this.getSnapshotFiles();
    if (files.length === 0) return null;

    if (label) {
      const match = files.find(f => f.includes(sanitizeLabel(label)));
      if (!match) return null;
      try {
        return JSON.parse(readFileSync(join(SNAPSHOTS_DIR, match), "utf-8"));
      } catch { return null; }
    }

    // Most recent
    const latest = files[files.length - 1];
    try {
      return JSON.parse(readFileSync(join(SNAPSHOTS_DIR, latest), "utf-8"));
    } catch { return null; }
  }

  listSnapshots(project?: string): Array<{ label: string; timestamp: number; summary: string; project: string; file: string }> {
    ensureDir(SNAPSHOTS_DIR);
    const files = this.getSnapshotFiles();
    const all = files.map(f => {
      try {
        const data = JSON.parse(readFileSync(join(SNAPSHOTS_DIR, f), "utf-8"));
        return { label: data.label, timestamp: data.timestamp, summary: data.summary, project: data.project || "?", file: f };
      } catch {
        return { label: "?", timestamp: 0, summary: "?", project: "?", file: f };
      }
    });
    if (project) {
      return all.filter(s => s.project === project || s.project.includes(project));
    }
    return all;
  }

  loadSnapshotForProject(project: string): Snapshot | null {
    const snapshots = this.listSnapshots(project);
    if (snapshots.length === 0) return null;
    const latest = snapshots[snapshots.length - 1];
    try {
      return JSON.parse(readFileSync(join(SNAPSHOTS_DIR, latest.file), "utf-8"));
    } catch { return null; }
  }

  getLatestForCurrentProject(): Snapshot | null {
    return this.loadSnapshotForProject(process.cwd());
  }

  checkFileChanges(workingSet: WorkingSetFile[]): Array<{ alias: string; path: string; changed: boolean }> {
    return workingSet.map(ws => {
      if (!existsSync(ws.path)) return { alias: ws.alias, path: ws.path, changed: true };
      try {
        const content = readFileSync(ws.path, "utf-8");
        const lines = content.split("\n").length;
        const currentHash = cheapHash(content, lines);
        return { alias: ws.alias, path: ws.path, changed: currentHash !== ws.hash };
      } catch {
        return { alias: ws.alias, path: ws.path, changed: true };
      }
    });
  }

  private getSnapshotFiles(): string[] {
    try {
      return readdirSync(SNAPSHOTS_DIR)
        .filter(f => f.endsWith(".json"))
        .sort();
    } catch { return []; }
  }

  private pruneSnapshots(): void {
    const files = this.getSnapshotFiles();
    if (files.length <= MAX_SNAPSHOTS) return;
    const toRemove = files.slice(0, files.length - MAX_SNAPSHOTS);
    for (const f of toRemove) {
      try { unlinkSync(join(SNAPSHOTS_DIR, f)); } catch { /* ok */ }
    }
  }
}
