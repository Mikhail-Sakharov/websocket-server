import tseslint from 'typescript-eslint';

export default [
  {
    files: ["src/**/*.ts"],
    rules: {
        "quotes": ["error", "single"],
        "indent": ["error", 2],
        "no-console": "warn",
        "semi": "error",
        "comma-dangle": "error",
        "no-trailing-spaces": "error"
    }
  },
  ...tseslint.config(
    ...tseslint.configs.recommended
  )
];
