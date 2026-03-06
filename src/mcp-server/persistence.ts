import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, rmSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface PersistedMacroStep {
  type: string;
  cmd?: string;
  path?: string;
  label?: string;
}

export interface PersistedDictionary {
  version: string;
  files: Record<string, string>;
  custom: Record<string, string>;
  presets: string[];
  macros?: Record<string, { description?: string; steps: PersistedMacroStep[] }>;
}

const CURRENT_VERSION = "0.2";
const SAM_DIR = join(homedir(), ".sam");
const LEGACY_DIR = join(homedir(), ".samlang");
const DICT_FILE = join(SAM_DIR, "dictionary.json");

function ensureDir(): void {
  if (!existsSync(SAM_DIR)) {
    mkdirSync(SAM_DIR, { recursive: true });
  }
}

function migrateFromLegacy(): void {
  const legacyDict = join(LEGACY_DIR, "dictionary.json");
  if (existsSync(LEGACY_DIR) && existsSync(legacyDict) && !existsSync(DICT_FILE)) {
    ensureDir();
    try {
      cpSync(legacyDict, DICT_FILE);
      rmSync(LEGACY_DIR, { recursive: true, force: true });
    } catch { /* migration is best-effort */ }
  }
}

const DEFAULT_DICT: PersistedDictionary = { version: CURRENT_VERSION, files: {}, custom: {}, presets: [] };

export function loadPersisted(): PersistedDictionary {
  migrateFromLegacy();
  ensureDir();
  if (!existsSync(DICT_FILE)) {
    return { ...DEFAULT_DICT };
  }
  try {
    const data = JSON.parse(readFileSync(DICT_FILE, "utf-8"));
    // Version migration: ensure all expected fields exist
    return {
      version: data.version || CURRENT_VERSION,
      files: data.files || {},
      custom: data.custom || {},
      presets: data.presets || [],
      macros: data.macros || {},
    };
  } catch {
    return { ...DEFAULT_DICT };
  }
}

export function savePersisted(dict: PersistedDictionary): void {
  ensureDir();
  writeFileSync(DICT_FILE, JSON.stringify(dict, null, 2));
}

export function validateFiles(files: Record<string, string>): Record<string, string> {
  const valid: Record<string, string> = {};
  for (const [alias, path] of Object.entries(files)) {
    if (existsSync(path)) {
      valid[alias] = path;
    }
  }
  return valid;
}

export function getDictPath(): string {
  return DICT_FILE;
}
