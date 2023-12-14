/* globals module */
module.exports = {
    env: {
        browser: true,
        es2021: true,
    },
    extends: "eslint:recommended",
    plugins: [
        "@stylistic/js",
        "eslint-plugin-html",
    ],
    globals: {
        "L": true,
    },
    rules: {
        // Stylistic rules
        "@stylistic/js/indent": ["error", 4],
        "@stylistic/js/quotes": ["error", "double"],
        "@stylistic/js/semi": ["error", "never"],
        "@stylistic/js/space-before-function-paren": ["error", "never"],
        "@stylistic/js/space-in-parens": ["error", "never"],
        "@stylistic/js/comma-dangle": ["error", "always-multiline"],
        
        // ESLint rules
        "no-console": "warn",
    },
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
    },
}