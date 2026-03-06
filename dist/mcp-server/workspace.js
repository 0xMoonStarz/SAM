"use strict";
/**
 * SAM v1.0 - Workspace: In-memory file cache
 * Avoids re-reading files, detects staleness via mtime
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Workspace = void 0;
const fs_1 = require("fs");
const MAX_FILES = 20;
const MAX_BYTES = 10 * 1024 * 1024; // 10MB total
class Workspace {
    cache = new Map(); // keyed by path
    totalBytes = 0;
    add(path, alias, content, summary) {
        if (!(0, fs_1.existsSync)(path))
            return false;
        const contentBytes = Buffer.byteLength(content, "utf-8");
        // Evict if at capacity
        if (this.cache.size >= MAX_FILES && !this.cache.has(path)) {
            this.evictOldest();
        }
        if (this.totalBytes + contentBytes > MAX_BYTES && !this.cache.has(path)) {
            this.evictOldest();
        }
        // Remove old entry bytes if updating
        const existing = this.cache.get(path);
        if (existing) {
            this.totalBytes -= Buffer.byteLength(existing.content, "utf-8");
        }
        let mtime = 0;
        try {
            mtime = (0, fs_1.statSync)(path).mtimeMs;
        }
        catch { /* ok */ }
        this.cache.set(path, {
            path,
            alias,
            content,
            summary,
            lines: content.split("\n").length,
            mtime,
            cachedAt: Date.now(),
        });
        this.totalBytes += contentBytes;
        return true;
    }
    get(path) {
        return this.cache.get(path) || null;
    }
    getByAlias(alias) {
        for (const f of this.cache.values()) {
            if (f.alias === alias)
                return f;
        }
        return null;
    }
    remove(path) {
        const entry = this.cache.get(path);
        if (!entry)
            return false;
        this.totalBytes -= Buffer.byteLength(entry.content, "utf-8");
        return this.cache.delete(path);
    }
    list() {
        return [...this.cache.values()];
    }
    isStale(path) {
        const entry = this.cache.get(path);
        if (!entry)
            return true;
        try {
            const current = (0, fs_1.statSync)(path).mtimeMs;
            return current > entry.mtime;
        }
        catch {
            return true;
        }
    }
    refresh(path, summarizer) {
        const entry = this.cache.get(path);
        if (!entry)
            return null;
        if (!(0, fs_1.existsSync)(path)) {
            this.remove(path);
            return null;
        }
        try {
            const content = (0, fs_1.readFileSync)(path, "utf-8");
            const oldBytes = Buffer.byteLength(entry.content, "utf-8");
            const newBytes = Buffer.byteLength(content, "utf-8");
            this.totalBytes += newBytes - oldBytes;
            entry.content = content;
            entry.lines = content.split("\n").length;
            if (summarizer) {
                entry.summary = summarizer(content, path.split("/").pop() || path);
            }
            entry.mtime = (0, fs_1.statSync)(path).mtimeMs;
            entry.cachedAt = Date.now();
            return content;
        }
        catch {
            return null;
        }
    }
    refreshAll() {
        let refreshed = 0;
        for (const path of this.cache.keys()) {
            if (this.isStale(path)) {
                if (this.refresh(path) !== null)
                    refreshed++;
            }
        }
        return refreshed;
    }
    clear() {
        this.cache.clear();
        this.totalBytes = 0;
    }
    size() {
        return this.cache.size;
    }
    totalSize() {
        return this.totalBytes;
    }
    evictOldest() {
        let oldest = null;
        let oldestTime = Infinity;
        for (const [path, file] of this.cache) {
            if (file.cachedAt < oldestTime) {
                oldestTime = file.cachedAt;
                oldest = path;
            }
        }
        if (oldest)
            this.remove(oldest);
    }
}
exports.Workspace = Workspace;
//# sourceMappingURL=workspace.js.map