module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: "./tsconfig.json",
    },
    plugins: ["@typescript-eslint", "import"],
    extends: [
        "eslint:recommended",
        "plugin:import/errors",
        "plugin:import/warnings",
        "plugin:import/typescript",
        "plugin:@typescript-eslint/recommended",
        "plugin:@figma/figma-plugins/recommended",
        "plugin:react/recommended",
        "prettier",
    ],
    rules: {
        "import/no-unresolved": 0,
        "react/react-in-jsx-scope": 0,
        "react/no-unknown-property": 0,
        "max-len": ["error", { code: 120 }],
        "@typescript-eslint/no-explicit-any": "off",
    },
    settings: {
        react: {
            version: "detect",
        },
    },
};
