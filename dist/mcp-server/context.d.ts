/**
 * SAM v1.0 - Context Manager: External memory that survives compaction
 * Super Access Memory - journal, snapshots, working set tracking
 */
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
    project: string;
    files: Record<string, string>;
    custom: Record<string, string>;
    urls: Record<string, string>;
    presets: string[];
    summary: string;
    key_context: string[];
    journal: ContextEntry[];
    working_set: WorkingSetFile[];
    metrics: {
        tokensSaved: number;
        ratio: string;
        minutes: number;
    };
}
export declare class ContextManager {
    private journal;
    private readFiles;
    constructor();
    addEntry(text: string, type?: ContextEntryType): ContextEntry;
    getJournal(): ContextEntry[];
    clearJournal(): void;
    private loadJournal;
    saveJournal(): void;
    appendEntry(entry: ContextEntry): void;
    formatJournal(limit?: number): string;
    markFileRead(path: string): void;
    getReadFiles(): string[];
    generateWorkingSet(fileAliases: Record<string, string>, summarizeFn: (content: string, name: string) => string): WorkingSetFile[];
    createSnapshot(dictState: {
        files: Record<string, string>;
        custom: Record<string, string>;
        urls: Record<string, string>;
        presets: string[];
    }, metricsData: {
        tokensSaved: number;
        ratio: string;
        minutes: number;
    }, summary: string, keyContext: string[], label?: string, workingSet?: WorkingSetFile[], project?: string): string;
    loadSnapshot(label?: string): Snapshot | null;
    listSnapshots(project?: string): Array<{
        label: string;
        timestamp: number;
        summary: string;
        project: string;
        file: string;
    }>;
    loadSnapshotForProject(project: string): Snapshot | null;
    getLatestForCurrentProject(): Snapshot | null;
    checkFileChanges(workingSet: WorkingSetFile[]): Array<{
        alias: string;
        path: string;
        changed: boolean;
    }>;
    private getSnapshotFiles;
    private pruneSnapshots;
}
