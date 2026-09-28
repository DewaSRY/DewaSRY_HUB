import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/*
 * Import rules I1–I7 from ADR-008 §5.2, enforced with `no-restricted-imports`.
 *
 * ESLint replaces (does not merge) a rule's options when several config
 * blocks match one file, so every block below lists the full set of
 * restrictions for its files.
 */

const FEATURE_ANY = {
  group: ["@/feature", "@/feature/**"],
  message: "I1/I3: this layer must not import feature/ code.",
};
const COMPONENTS_ANY = {
  group: ["@/components", "@/components/**"],
  message: "I1: lib/ must not import components/.",
};
// I2 / I5: only a feature's barrel (`@/feature/<name>` or
// `@/feature/admin/<name>`) may be imported from outside the feature.
const FEATURE_DEEP = {
  group: ["@/feature/*/*", "!@/feature/admin/*", "@/feature/admin/*/*"],
  message:
    "I2: import another feature through its index.ts barrel (@/feature/<name>), never a deep path.",
};
// Pages may additionally import `server.ts` by path (I5).
const FEATURE_DEEP_EXCEPT_SERVER = {
  group: [
    "@/feature/*/*",
    "!@/feature/admin/*",
    "!@/feature/*/server",
    "@/feature/admin/*/*",
  ],
  message:
    "I2/I5: import a feature through its barrel; only `server.ts` may be imported by path from app/.",
};
const ADMIN_ANY = {
  group: ["@/feature/admin", "@/feature/admin/**"],
  message: "I4: feature/admin/** is imported only by app/[locale]/(admin)/**.",
};
const ADS_ANY = {
  group: ["@/components/ads", "@/components/ads/**"],
  message: "I6: components/ads is imported only by (site) layouts and pages.",
};
const SHELL_ONLY = {
  group: ["@/components/layout", "@/components/layout/**", "@/components/landing/**"],
  message: "Features must not import app shells or landing sections.",
};

function restrict(...patterns) {
  return { "no-restricted-imports": ["error", { patterns }] };
}

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  // I1: lib/ never imports feature/ or components/.
  { files: ["lib/**/*.{ts,tsx}"], rules: restrict(FEATURE_ANY, COMPONENTS_ANY) },

  // I3: ui, form, common (and the other shared component folders) never import feature/.
  {
    files: [
      "components/ui/**/*.{ts,tsx}",
      "components/form/**/*.{ts,tsx}",
      "components/common/**/*.{ts,tsx}",
      "components/landing/**/*.{ts,tsx}",
      "components/ads/**/*.{ts,tsx}",
      "hooks/**/*.{ts,tsx}",
      "i18n/**/*.{ts,tsx}",
    ],
    rules: restrict(FEATURE_ANY),
  },

  // I3: components/layout may compose shells from feature barrels only (never admin).
  {
    files: ["components/layout/**/*.{ts,tsx}"],
    rules: restrict(FEATURE_DEEP, ADMIN_ANY, ADS_ANY),
  },

  // providers/ wire features into the tree, through barrels only.
  {
    files: ["providers/**/*.{ts,tsx}"],
    rules: restrict(FEATURE_DEEP, ADMIN_ANY, ADS_ANY),
  },

  // Features: other features via barrels (I2), no admin outside admin (I4), no ads (I6).
  {
    files: ["feature/**/*.{ts,tsx}"],
    ignores: ["feature/admin/**"],
    rules: restrict(FEATURE_DEEP, ADMIN_ANY, ADS_ANY, SHELL_ONLY),
  },
  {
    files: ["feature/admin/**/*.{ts,tsx}"],
    rules: restrict(FEATURE_DEEP, ADS_ANY, SHELL_ONLY),
  },

  // app/: barrels or server.ts only; admin code only under (admin); ads only under (site).
  {
    files: ["app/**/*.{ts,tsx}"],
    ignores: ["app/\\[locale\\]/\\(admin\\)/**", "app/\\[locale\\]/\\(site\\)/**"],
    rules: restrict(FEATURE_DEEP_EXCEPT_SERVER, ADMIN_ANY, ADS_ANY),
  },
  {
    files: ["app/\\[locale\\]/\\(site\\)/**/*.{ts,tsx}"],
    rules: restrict(FEATURE_DEEP_EXCEPT_SERVER, ADMIN_ANY),
  },
  {
    files: ["app/\\[locale\\]/\\(admin\\)/**/*.{ts,tsx}"],
    rules: restrict(FEATURE_DEEP_EXCEPT_SERVER, ADS_ANY),
  },

  // Tests may reach into internals of the module under test.
  {
    files: ["**/*.test.{ts,tsx}", "test/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": "off" },
  },

  globalIgnores([
    ".next/**",
    ".open-next/**",
    ".wrangler/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "cloudflare-env.d.ts",
  ]),
]);

export default eslintConfig;
