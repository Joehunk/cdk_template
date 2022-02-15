module.exports = {
  "env": {
    "browser": true,
    "es2021": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "project": "tsconfig.json",
    "sourceType": "module"
  },
  "plugins": [
    "@typescript-eslint",
    "sort-imports-es6-autofix"
  ],
  "rules": {
    "block-spacing": [
      "error"
    ],
    "brace-style": "off",
    "@typescript-eslint/brace-style": ["error"],
    "indent": "off",
    "@typescript-eslint/indent": [
      "error",
      2
    ],
    "linebreak-style": [
      "error",
      "unix"
    ],
    "@typescript-eslint/no-floating-promises": ["error"],
    "quotes": [
      "error",
      "double"
    ],
    "semi": [
      "error",
      "always"
    ],
    "sort-imports": "off",
    "sort-imports-es6-autofix/sort-imports-es6": "error",
    "no-duplicate-imports": [ "error" ],
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { "varsIgnorePattern": "[Ii]gnored", "argsIgnorePattern": "^_" }
    ]
  }
};
