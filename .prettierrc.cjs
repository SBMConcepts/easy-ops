/** @type {import("prettier").Config} */
const config = {
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 100,

  sql: {
    keywordCase: 'upper',
    tabWidth: 2,
    trailingComma: 'none',
    printWidth: 100,
    singleQuote: true,
    semi: false,
  },
}

module.exports = config
