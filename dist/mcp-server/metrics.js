"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsTracker = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const os_1 = require("os");
// Claude API input pricing per million tokens (USD)
const MODEL_PRICING = {
    "opus": { input: 15, output: 75, label: "Claude Opus 4" },
    "sonnet": { input: 3, output: 15, label: "Claude Sonnet 4" },
    "haiku": { input: 0.80, output: 4, label: "Claude Haiku 3.5" },
};
const SAM_DIR = (0, path_1.join)((0, os_1.homedir)(), ".sam");
const LIFETIME_FILE = (0, path_1.join)(SAM_DIR, "lifetime-metrics.json");
function ensureSamDir() {
    if (!(0, fs_1.existsSync)(SAM_DIR))
        (0, fs_1.mkdirSync)(SAM_DIR, { recursive: true });
}
function loadLifetime() {
    ensureSamDir();
    const defaults = {
        totalTokensSaved: 0, totalOriginalTokens: 0, totalCompressedTokens: 0,
        totalSessions: 0, totalSlReadCalls: 0, totalSlBashCalls: 0,
        totalCompressionCalls: 0, totalCacheHits: 0,
        totalSlReadTokensSaved: 0, totalSlBashTokensSaved: 0,
        firstSessionAt: new Date().toISOString(), lastSessionAt: new Date().toISOString(),
    };
    if (!(0, fs_1.existsSync)(LIFETIME_FILE))
        return defaults;
    try {
        const data = JSON.parse((0, fs_1.readFileSync)(LIFETIME_FILE, "utf-8"));
        // Backward compat: add new fields if missing
        data.totalSlReadTokensSaved ??= 0;
        data.totalSlBashTokensSaved ??= 0;
        return data;
    }
    catch {
        return defaults;
    }
}
function saveLifetime(lt) {
    ensureSamDir();
    (0, fs_1.writeFileSync)(LIFETIME_FILE, JSON.stringify(lt, null, 2));
}
const EMPTY_METRICS = {
    totalOriginalTokens: 0, totalCompressedTokens: 0,
    compressionCalls: 0, decompressionCalls: 0,
    slReadCalls: 0, slReadTokensSaved: 0,
    slBashCalls: 0, slBashTokensSaved: 0,
    cacheHits: 0, cacheMisses: 0, startTime: 0,
};
class MetricsTracker {
    metrics = { ...EMPTY_METRICS, startTime: Date.now() };
    lastFlushed = { ...EMPTY_METRICS };
    sessionCounted = false;
    recordCompression(originalTokens, compressedTokens) {
        this.metrics.totalOriginalTokens += originalTokens;
        this.metrics.totalCompressedTokens += compressedTokens;
        this.metrics.compressionCalls++;
    }
    recordDecompression() {
        this.metrics.decompressionCalls++;
    }
    recordSlRead(saved) {
        this.metrics.slReadCalls++;
        this.metrics.slReadTokensSaved += saved;
    }
    recordSlBash(saved) {
        this.metrics.slBashCalls++;
        this.metrics.slBashTokensSaved += saved;
    }
    recordCacheHit() {
        this.metrics.cacheHits++;
    }
    recordCacheMiss() {
        this.metrics.cacheMisses++;
    }
    getStats() {
        const saved = this.metrics.totalOriginalTokens - this.metrics.totalCompressedTokens;
        const ratio = this.metrics.totalCompressedTokens > 0
            ? (this.metrics.totalOriginalTokens / this.metrics.totalCompressedTokens).toFixed(1)
            : "0";
        const percentage = this.metrics.totalOriginalTokens > 0
            ? ((saved / this.metrics.totalOriginalTokens) * 100).toFixed(1)
            : "0";
        const sessionMinutes = Math.round((Date.now() - this.metrics.startTime) / 60000);
        return {
            tokensSaved: saved,
            ratio: `${ratio}x`,
            percentage: `${percentage}%`,
            totalCalls: this.metrics.compressionCalls + this.metrics.decompressionCalls,
            sessionMinutes,
            breakdown: {
                slRead: { calls: this.metrics.slReadCalls, tokensSaved: this.metrics.slReadTokensSaved },
                slBash: { calls: this.metrics.slBashCalls, tokensSaved: this.metrics.slBashTokensSaved },
                compress: { calls: this.metrics.compressionCalls },
                cache: { hits: this.metrics.cacheHits, misses: this.metrics.cacheMisses },
            },
        };
    }
    reset() {
        this.flushToLifetime(); // persist before reset
        this.metrics = { ...EMPTY_METRICS, startTime: Date.now() };
        this.lastFlushed = { ...EMPTY_METRICS };
        this.sessionCounted = false;
    }
    getMetricsSnapshot() {
        const saved = this.metrics.totalOriginalTokens - this.metrics.totalCompressedTokens;
        const ratio = this.metrics.totalCompressedTokens > 0
            ? (this.metrics.totalOriginalTokens / this.metrics.totalCompressedTokens).toFixed(1)
            : "0";
        const minutes = Math.round((Date.now() - this.metrics.startTime) / 60000);
        return { tokensSaved: saved, ratio: `${ratio}x`, minutes };
    }
    flushToLifetime() {
        // Delta = current - lastFlushed (safe to call multiple times)
        const dOrig = this.metrics.totalOriginalTokens - this.lastFlushed.totalOriginalTokens;
        const dComp = this.metrics.totalCompressedTokens - this.lastFlushed.totalCompressedTokens;
        const dSaved = dOrig - dComp;
        const dRead = this.metrics.slReadCalls - this.lastFlushed.slReadCalls;
        const dBash = this.metrics.slBashCalls - this.lastFlushed.slBashCalls;
        const dReadSaved = this.metrics.slReadTokensSaved - this.lastFlushed.slReadTokensSaved;
        const dBashSaved = this.metrics.slBashTokensSaved - this.lastFlushed.slBashTokensSaved;
        const dCompress = this.metrics.compressionCalls - this.lastFlushed.compressionCalls;
        const dCache = this.metrics.cacheHits - this.lastFlushed.cacheHits;
        // Nothing new since last flush
        if (dOrig === 0 && dRead === 0 && dBash === 0 && dCompress === 0 && dCache === 0)
            return;
        const lt = loadLifetime();
        lt.totalTokensSaved += dSaved;
        lt.totalOriginalTokens += dOrig;
        lt.totalCompressedTokens += dComp;
        lt.totalSlReadCalls += dRead;
        lt.totalSlBashCalls += dBash;
        lt.totalSlReadTokensSaved += dReadSaved;
        lt.totalSlBashTokensSaved += dBashSaved;
        lt.totalCompressionCalls += dCompress;
        lt.totalCacheHits += dCache;
        if (!this.sessionCounted) {
            lt.totalSessions++;
            this.sessionCounted = true;
        }
        lt.lastSessionAt = new Date().toISOString();
        saveLifetime(lt);
        // Snapshot what we flushed
        this.lastFlushed = { ...this.metrics };
    }
    getLifetimeSavings() {
        // Flush current session first
        this.flushToLifetime();
        const lt = loadLifetime();
        const ratio = lt.totalCompressedTokens > 0
            ? (lt.totalOriginalTokens / lt.totalCompressedTokens).toFixed(1)
            : "0";
        const percentage = lt.totalOriginalTokens > 0
            ? ((lt.totalTokensSaved / lt.totalOriginalTokens) * 100).toFixed(1)
            : "0";
        // Calculate USD saved per model (tokens saved = input tokens not sent to API)
        const usdSaved = {};
        for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
            const saved = (lt.totalTokensSaved / 1_000_000) * pricing.input;
            usdSaved[pricing.label] = `$${saved.toFixed(4)}`;
        }
        // Days since first session
        const firstDate = new Date(lt.firstSessionAt);
        const now = new Date();
        const daysActive = Math.max(1, Math.round((now.getTime() - firstDate.getTime()) / 86400000));
        return {
            lifetime: {
                tokensSaved: lt.totalTokensSaved,
                tokensOriginal: lt.totalOriginalTokens,
                ratio: `${ratio}x`,
                percentage: `${percentage}%`,
                sessions: lt.totalSessions,
                daysActive,
                firstSession: lt.firstSessionAt,
                lastSession: lt.lastSessionAt,
            },
            usdSaved,
            breakdown: {
                slRead: { calls: lt.totalSlReadCalls, tokensSaved: lt.totalSlReadTokensSaved },
                slBash: { calls: lt.totalSlBashCalls, tokensSaved: lt.totalSlBashTokensSaved },
                compressionCalls: lt.totalCompressionCalls,
                cacheHits: lt.totalCacheHits,
            },
            perSession: {
                avgTokensSaved: lt.totalSessions > 0 ? Math.round(lt.totalTokensSaved / lt.totalSessions) : 0,
                avgUsdSaved: lt.totalSessions > 0
                    ? `$${((lt.totalTokensSaved / 1_000_000) * MODEL_PRICING.opus.input / lt.totalSessions).toFixed(4)}`
                    : "$0",
            },
            perDay: {
                avgTokensSaved: Math.round(lt.totalTokensSaved / daysActive),
                avgUsdSaved: `$${((lt.totalTokensSaved / 1_000_000) * MODEL_PRICING.opus.input / daysActive).toFixed(4)}`,
            },
        };
    }
}
exports.MetricsTracker = MetricsTracker;
//# sourceMappingURL=metrics.js.map