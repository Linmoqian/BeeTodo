module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  extends: ["airbnb", "airbnb/hooks", "plugin:@typescript-eslint/recommended", "prettier"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  settings: {
    react: {
      version: "detect",
    },
    "import/resolver": {
      node: {
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      },
    },
  },
  rules: {
    "consistent-return": "off",
    "default-param-last": "off",
    "import/extensions": ["error", "ignorePackages", { ts: "never", tsx: "never" }],
    "import/prefer-default-export": "off",
    "jsx-a11y/label-has-associated-control": ["error", { assert: "either" }],
    "jsx-a11y/no-autofocus": "off",
    "jsx-a11y/no-static-element-interactions": "off",
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "no-nested-ternary": "off",
    "no-use-before-define": "off",
    "no-void": "off",
    "react/jsx-filename-extension": ["error", { extensions: [".jsx", ".tsx"] }],
    "react/jsx-props-no-spreading": "off",
    "react/react-in-jsx-scope": "off",
    "react/require-default-props": "off",
  },
  overrides: [
    {
      files: ["**/*.test.ts", "**/*.test.tsx"],
      rules: {
        "import/no-extraneous-dependencies": "off",
      },
    },
  ],
};
