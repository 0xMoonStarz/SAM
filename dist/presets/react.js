"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REACT_PRESET = void 0;
exports.REACT_PRESET = {
    name: "react",
    detect: ["react", "react-dom", "next"],
    paths: {
        "$pg": "./src/pages",
        "$cm": "./src/components",
        "$hk": "./src/hooks",
        "$ctx": "./src/context",
        "$st": "./src/store",
        "$ut": "./src/utils",
        "$sty": "./src/styles",
        "$pub": "./public",
    },
    snippets: {
        ".uf": "useState",
        ".ef": "useEffect",
        ".ur": "useRef",
        ".um": "useMemo",
        ".uc": "useCallback",
        ".ux": "useContext",
        ".rd": "useReducer",
        ".nv": "useNavigate",
        ".cp": "React.FC<Props>",
        ".jsx": "JSX.Element",
        ".frg": "React.Fragment",
    },
};
//# sourceMappingURL=react.js.map