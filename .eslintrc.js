module.exports = {
  'env': {
    'browser': true,
    'es2021': true,
    'node': true,
  },
  'extends': [
    'google',
  ],
  'parser': '@typescript-eslint/parser',
  'parserOptions': {
    'ecmaVersion': 12,
    'sourceType': 'module',
  },
  'plugins': [
    '@typescript-eslint',
  ],
  'rules': {
    'max-len': 0,
    'require-jsdoc': 0,
    'valid-jsdoc': 0,
    // TODO figure out why argsIngnorePattern isn't working and set back to error
    'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
  },
};
