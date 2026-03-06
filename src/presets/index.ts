import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { REACT_PRESET } from "./react.js";
import { NODE_PRESET } from "./node.js";
import { PYTHON_PRESET } from "./python.js";

export interface Preset {
  name: string;
  detect: string[];
  paths: Record<string, string>;
  snippets: Record<string, string>;
}

export const ALL_PRESETS: Preset[] = [REACT_PRESET, NODE_PRESET, PYTHON_PRESET];

export function detectPresets(projectDir: string): Preset[] {
  const detected: Preset[] = [];

  // Check package.json
  const pkgPath = join(projectDir, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };
      for (const preset of ALL_PRESETS) {
        if (preset.detect.some((dep) => dep in allDeps)) {
          detected.push(preset);
        }
      }
    } catch {}
  }

  // Check requirements.txt / pyproject.toml
  const reqPath = join(projectDir, "requirements.txt");
  const pyprojectPath = join(projectDir, "pyproject.toml");
  if (existsSync(reqPath) || existsSync(pyprojectPath)) {
    try {
      const content = existsSync(reqPath)
        ? readFileSync(reqPath, "utf-8")
        : readFileSync(pyprojectPath, "utf-8");
      const lower = content.toLowerCase();
      if (PYTHON_PRESET.detect.some((d) => lower.includes(d))) {
        if (!detected.includes(PYTHON_PRESET)) detected.push(PYTHON_PRESET);
      }
    } catch {}
  }

  return detected;
}

export function getPresetByName(name: string): Preset | undefined {
  return ALL_PRESETS.find((p) => p.name === name);
}
