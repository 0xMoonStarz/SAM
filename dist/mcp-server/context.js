"use strict";
/**
 * SAM v1.0 - Context Manager: External memory that survives compaction
 * Super Access Memory - journal, snapshots, working set tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextManager = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const os_1 = require("os");
const SAM_DIR = (0, path_1.join)((0, os_1.homedir)(), ".sam");
const SNAPSHOTS_DIR = (0, path_1.join)(SAM_DIR, "snapshots");
const JOURNAL_FILE = (0, path_1.join)(SAM_DIR, "context-journal.json");
const MAX_SNAPSHOTS = 20;
const MAX_JOURNAL_ENTRIES = 100;
function ensureDir(dir) {
    if (!(0, fs_1.existsSync)(dir))
        (0, fs_1.mkdirSync)(dir, { recursive: true });
}
function sanitizeLabel(label) {
    return label.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 50);
}
function cheapHash(content, lineCount) {
    const head = content.slice(0, 200);
    const tail = content.slice(-200);
    const input = `${lineCount}:${head}:${tail}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
    }
    return (hash >>> 0).toString(36);
}
class ContextManager {
    journal = [];
    readFiles = new Set();
    constructor() {
        this.loadJournal();
    }
    // --- Journal ---
    addEntry(text, type = "note") {
        const entry = { timestamp: Date.now(), type, text };
        this.journal.push(entry);
        // Append to log file (cheap, no full rewrite)
        this.appendEntry(entry);
        if (this.journal.length > MAX_JOURNAL_ENTRIES) {
            this.journal = this.journal.slice(-MAX_JOURNAL_ENTRIES);
            this.saveJournal(); // Full rewrite only when pruning
        }
        return entry;
    }
    getJournal() {
        return [...this.journal];
    }
    clearJournal() {
        this.journal = [];
        this.saveJournal();
    }
    loadJournal() {
        ensureDir(SAM_DIR);
        if (!(0, fs_1.existsSync)(JOURNAL_FILE))
            return;
        try {
            const data = JSON.parse((0, fs_1.readFileSync)(JOURNAL_FILE, "utf-8"));
            if (Array.isArray(data))
                this.journal = data;
        }
        catch { /* start fresh */ }
    }
    saveJournal() {
        ensureDir(SAM_DIR);
        // Append-only: write only new entries to avoid rewriting the whole file
        // Full rewrite only when pruning or clearing
        (0, fs_1.writeFileSync)(JOURNAL_FILE, JSON.stringify(this.journal, null, 2));
    }
    appendEntry(entry) {
        // Append a single line to a separate log file (cheap, no full rewrite)
        const logFile = (0, path_1.join)(SAM_DIR, "context-log.jsonl");
        const line = JSON.stringify(entry) + "\n";
        try {
            const { appendFileSync } = require("fs");
            appendFileSync(logFile, line);
        }
        catch { /* ok */ }
    }
    formatJournal(limit) {
        const entries = limit ? this.journal.slice(-limit) : this.journal;
        if (entries.length === 0)
            return "(empty journal)";
        return entries.map(e => {
            const time = new Date(e.timestamp).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false });
            return `[${time}] ${e.type}: ${e.text}`;
        }).join("\n");
    }
    // --- Read Files Tracking ---
    markFileRead(path) {
        this.readFiles.add(path);
        // Keep only last 20
        if (this.readFiles.size > 20) {
            const arr = [...this.readFiles];
            this.readFiles = new Set(arr.slice(-20));
        }
    }
    getReadFiles() {
        return [...this.readFiles];
    }
    // --- Working Set ---
    generateWorkingSet(fileAliases, summarizeFn) {
        const workingSet = [];
        const aliasToPath = new Map(Object.entries(fileAliases).map(([a, p]) => [p, a]));
        for (const path of this.readFiles) {
            if (!(0, fs_1.existsSync)(path))
                continue;
            try {
                const content = (0, fs_1.readFileSync)(path, "utf-8");
                const lines = content.split("\n").length;
                const alias = aliasToPath.get(path) || "?";
                workingSet.push({
                    alias,
                    path,
                    hash: cheapHash(content, lines),
                    summary: summarizeFn(content, path).slice(0, 500),
                    lines,
                });
            }
            catch { /* skip unreadable */ }
            if (workingSet.length >= 20)
                break;
        }
        return workingSet;
    }
    // --- Snapshots ---
    createSnapshot(dictState, metricsData, summary, keyContext, label, workingSet, project) {
        ensureDir(SNAPSHOTS_DIR);
        const snap = {
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
        const filepath = (0, path_1.join)(SNAPSHOTS_DIR, filename);
        (0, fs_1.writeFileSync)(filepath, JSON.stringify(snap, null, 2));
        this.pruneSnapshots();
        return filepath;
    }
    loadSnapshot(label) {
        ensureDir(SNAPSHOTS_DIR);
        const files = this.getSnapshotFiles();
        if (files.length === 0)
            return null;
        if (label) {
            const match = files.find(f => f.includes(sanitizeLabel(label)));
            if (!match)
                return null;
            try {
                return JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(SNAPSHOTS_DIR, match), "utf-8"));
            }
            catch {
                return null;
            }
        }
        // Most recent
        const latest = files[files.length - 1];
        try {
            return JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(SNAPSHOTS_DIR, latest), "utf-8"));
        }
        catch {
            return null;
        }
    }
    listSnapshots(project) {
        ensureDir(SNAPSHOTS_DIR);
        const files = this.getSnapshotFiles();
        const all = files.map(f => {
            try {
                const data = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(SNAPSHOTS_DIR, f), "utf-8"));
                return { label: data.label, timestamp: data.timestamp, summary: data.summary, project: data.project || "?", file: f };
            }
            catch {
                return { label: "?", timestamp: 0, summary: "?", project: "?", file: f };
            }
        });
        if (project) {
            return all.filter(s => s.project === project || s.project.includes(project));
        }
        return all;
    }
    loadSnapshotForProject(project) {
        const snapshots = this.listSnapshots(project);
        if (snapshots.length === 0)
            return null;
        const latest = snapshots[snapshots.length - 1];
        try {
            return JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(SNAPSHOTS_DIR, latest.file), "utf-8"));
        }
        catch {
            return null;
        }
    }
    getLatestForCurrentProject() {
        return this.loadSnapshotForProject(process.cwd());
    }
    checkFileChanges(workingSet) {
        return workingSet.map(ws => {
            if (!(0, fs_1.existsSync)(ws.path))
                return { alias: ws.alias, path: ws.path, changed: true };
            try {
                const content = (0, fs_1.readFileSync)(ws.path, "utf-8");
                const lines = content.split("\n").length;
                const currentHash = cheapHash(content, lines);
                return { alias: ws.alias, path: ws.path, changed: currentHash !== ws.hash };
            }
            catch {
                return { alias: ws.alias, path: ws.path, changed: true };
            }
        });
    }
    getSnapshotFiles() {
        try {
            return (0, fs_1.readdirSync)(SNAPSHOTS_DIR)
                .filter(f => f.endsWith(".json"))
                .sort();
        }
        catch {
            return [];
        }
    }
    pruneSnapshots() {
        const files = this.getSnapshotFiles();
        if (files.length <= MAX_SNAPSHOTS)
            return;
        const toRemove = files.slice(0, files.length - MAX_SNAPSHOTS);
        for (const f of toRemove) {
            try {
                (0, fs_1.unlinkSync)((0, path_1.join)(SNAPSHOTS_DIR, f));
            }
            catch { /* ok */ }
        }
    }
}
exports.ContextManager = ContextManager;
//# sourceMappingURL=context.js.map