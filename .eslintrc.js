module.exports = {
  env: {
    browser: true,
    es6: true,
    jquery: true,
    meteor: true,
    mocha: true,
    node: true,
  },
  extends: [
    'airbnb-base',
  ],
  globals: {
    Atomics: 'readonly',
    CourseDiscussions: 'writable',
    FilteringReadError: 'writable',
    L: 'readonly',
    Log: 'writable',
    MediumEditor: 'readonly',
    mf: 'writable',
    mfPkg: 'readonly',
    minuteTime: 'writable',
    moment: 'readonly',
    msgfmt: 'readonly',
    Prng: 'readonly',
    Regions: 'writable',
    robots: 'writable',
    RouterAutoscroll: 'writable',
    SharedArrayBuffer: 'readonly',
    ShowServerError: 'writable',
    sitemaps: 'readonly',
    SortSpec: 'writable',
    SSR: 'writable',
    Tooltips: 'writable',
    Users: 'writable',
    Venue: 'writable',
    VERSION: 'writable',
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  rules: {
      'import/no-absolute-path': [2, { esmodule: false}],
      'no-tabs': ['error', { allowIndentationTabs: true }],
      //'no-underscore-dangle': ['error', { enforceInMethodNames: true, allow: ['_escape', '_id'] }],
      'object-shorthand': ['error', 'always'],
      'prefer-destructuring': ['error', {'object': false, 'array': false}],
      'array-callback-return': [0],
      'consistent-return': [0],
      'func-names': [0],
      'global-require': [0],
      'guard-for-in': [0],
      'import/no-extraneous-dependencies': [0],
      'import/no-named-as-default': [0],
      'indent': ['error', 'tab'],
      'no-alert': [0],
      'no-console': [0],
      'no-constant-condition': [0],
      'no-mixed-operators': [0],
      'no-param-reassign': [0],
      'no-prototype-builtins': [0],
      'no-restricted-syntax': [0],
      'no-shadow': [0],
      'no-underscore-dangle': [0],
  },
  settings: {
    'import/resolver': 'meteor',
  },
};
