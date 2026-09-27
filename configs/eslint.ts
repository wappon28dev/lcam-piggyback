// ref: https://roboin.io/article/2024/08/13/eslint-now-supports-typescript-based-config-files/

import type antfu from "@antfu/eslint-config";

type ConfigAntfu = Parameters<typeof antfu>[0];

export const configTsTsx = {
  stylistic: {
    quotes: "double",
    semi: true,
    overrides: {
      "comma-dangle": ["error", "always-multiline"],
      "jsonc/comma-dangle": ["error", "always-multiline"],
      "perfectionist/sort-jsx-props": "warn",
      "arrow-body-style": ["error", "as-needed"],
      "no-restricted-imports": ["error", { patterns: ["../*"] }],
      "unused-imports/no-unused-imports": "warn",
      "style/arrow-parens": ["error", "always"],
      "style/brace-style": ["error", "1tbs"],
    },
  },
  typescript: {
    parserOptions: {
      project: ["./tsconfig.json"],
    },
    overrides: {
      "ts/consistent-type-definitions": ["error", "type"],
      "ts/explicit-function-return-type": [
        "error",
        { allowExpressions: true, allowHigherOrderFunctions: true },
      ],
      "ts/explicit-member-accessibility": ["error"],
      "ts/naming-convention": [
        "error",
        {
          selector: "variable",
          format: ["camelCase", "UPPER_CASE", "PascalCase"],
          leadingUnderscore: "allowSingleOrDouble",
        },
      ],
      "ts/no-floating-promises": ["error"],
      "ts/no-misused-promises": ["error"],
      "ts/no-confusing-void-expression": ["error"],
      "ts/strict-boolean-expressions": ["error"],
      "ts/switch-exhaustiveness-check": ["error"],
      "ts/array-type": ["error", { default: "array-simple" }],
      "ts/no-unsafe-argument": "error",

      // https://typescript-eslint.io/rules/dot-notation/
      "dot-notation": "off",
      "ts/dot-notation": "error",

      "ts/no-redeclare": "off",
      "ts/no-unnecessary-condition": "error",
    },
  },
  test: {
    overrides: {
      "test/prefer-lowercase-title": "off",
    },
  },
  rules: {
    "antfu/no-top-level-await": "off",
  },
  formatters: true,
  isInEditor: false,
} satisfies ConfigAntfu;
