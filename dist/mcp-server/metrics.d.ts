export interface SessionMetrics {
    totalOriginalTokens: number;
    totalCompressedTokens: number;
    compressionCalls: number;
    decompressionCalls: number;
    slReadCalls: number;
    slReadTokensSaved: number;
    slBashCalls: number;
    slBashTokensSaved: number;
    cacheHits: number;
    cacheMisses: number;
    startTime: number;
}
export interface LifetimeMetrics {
    totalTokensSaved: number;
    totalOriginalTokens: number;
    totalCompressedTokens: number;
    totalSessions: number;
    totalSlReadCalls: number;
    totalSlBashCalls: number;
    totalCompressionCalls: number;
    totalCacheHits: number;
    totalSlReadTokensSaved: number;
    totalSlBashTokensSaved: number;
    firstSessionAt: string;
    lastSessionAt: string;
}
export declare class MetricsTracker {
    private metrics;
    private lastFlushed;
    private sessionCounted;
    recordCompression(originalTokens: number, compressedTokens: number): void;
    recordDecompression(): void;
    recordSlRead(saved: number): void;
    recordSlBash(saved: number): void;
    recordCacheHit(): void;
    recordCacheMiss(): void;
    getStats(): Record<string, unknown>;
    reset(): void;
    getMetricsSnapshot(): {
        tokensSaved: number;
        ratio: string;
        minutes: number;
    };
    flushToLifetime(): void;
    getLifetimeSavings(): Record<string, unknown>;
}
