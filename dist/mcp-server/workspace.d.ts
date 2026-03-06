/**
 * SAM v1.0 - Workspace: In-memory file cache
 * Avoids re-reading files, detects staleness via mtime
 */
export interface CachedFile {
    path: string;
    alias: string;
    content: string;
    summary: string;
    lines: number;
    mtime: number;
    cachedAt: number;
}
export declare class Workspace {
    private cache;
    private totalBytes;
    add(path: string, alias: string, content: string, summary: string): boolean;
    get(path: string): CachedFile | null;
    getByAlias(alias: string): CachedFile | null;
    remove(path: string): boolean;
    list(): CachedFile[];
    isStale(path: string): boolean;
    refresh(path: string, summarizer?: (content: string, fileName: string) => string): string | null;
    refreshAll(): number;
    clear(): void;
    size(): number;
    totalSize(): number;
    private evictOldest;
}
