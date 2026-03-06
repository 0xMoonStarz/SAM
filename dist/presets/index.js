"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_PRESETS = void 0;
exports.detectPresets = detectPresets;
exports.getPresetByName = getPresetByName;
const fs_1 = require("fs");
const path_1 = require("path");
const react_js_1 = require("./react.js");
const node_js_1 = require("./node.js");
const python_js_1 = require("./python.js");
exports.ALL_PRESETS = [react_js_1.REACT_PRESET, node_js_1.NODE_PRESET, python_js_1.PYTHON_PRESET];
function detectPresets(projectDir) {
    const detected = [];
    // Check package.json
    const pkgPath = (0, path_1.join)(projectDir, "package.json");
    if ((0, fs_1.existsSync)(pkgPath)) {
        try {
            const pkg = JSON.parse((0, fs_1.readFileSync)(pkgPath, "utf-8"));
            const allDeps = {
                ...pkg.dependencies,
                ...pkg.devDependencies,
            };
            for (const preset of exports.ALL_PRESETS) {
                if (preset.detect.some((dep) => dep in allDeps)) {
                    detected.push(preset);
                }
            }
        }
        catch { }
    }
    // Check requirements.txt / pyproject.toml
    const reqPath = (0, path_1.join)(projectDir, "requirements.txt");
    const pyprojectPath = (0, path_1.join)(projectDir, "pyproject.toml");
    if ((0, fs_1.existsSync)(reqPath) || (0, fs_1.existsSync)(pyprojectPath)) {
        try {
            const content = (0, fs_1.existsSync)(reqPath)
                ? (0, fs_1.readFileSync)(reqPath, "utf-8")
                : (0, fs_1.readFileSync)(pyprojectPath, "utf-8");
            const lower = content.toLowerCase();
            if (python_js_1.PYTHON_PRESET.detect.some((d) => lower.includes(d))) {
                if (!detected.includes(python_js_1.PYTHON_PRESET))
                    detected.push(python_js_1.PYTHON_PRESET);
            }
        }
        catch { }
    }
    return detected;
}
function getPresetByName(name) {
    return exports.ALL_PRESETS.find((p) => p.name === name);
}
//# sourceMappingURL=index.js.map