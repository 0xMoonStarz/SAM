"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PYTHON_PRESET = void 0;
exports.PYTHON_PRESET = {
    name: "python",
    detect: ["django", "flask", "fastapi", "pytest"],
    paths: {
        "$mg": "./migrations",
        "$mdl": "./models",
        "$vw": "./views",
        "$sr": "./serializers",
        "$url": "./urls",
        "$tst": "./tests",
        "$tmpl": "./templates",
        "$stc": "./static",
    },
    snippets: {
        ".df": "def ",
        ".adf": "async def ",
        ".cls": "class ",
        ".imp": "import ",
        ".fr": "from ",
        ".ret": "return ",
        ".slf": "self.",
        ".init": "__init__",
        ".str": "__str__",
        ".dct": "@decorator",
    },
};
//# sourceMappingURL=python.js.map