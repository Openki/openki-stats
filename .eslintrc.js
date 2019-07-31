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
      'no-underscore-dangle': [
          'error',
          {
              allow: [
                  '_alert',
                  '_allSubscriptionsReady',
                  '_debug',
                  '_ensureIndex',
                  '_escape',
                  '_id',
                  '_months',
                  '_monthsNominativeEl',
                  '_monthsShort',
                  '_transform',
                  '_week',
                  '_weekdays',
                  '_weekdaysMin',
                  '_weekdaysShort',
              ]
          }
      ],
      'object-shorthand': ['error', 'always'],
      'prefer-destructuring': ['error', {'object': false, 'array': false}],
      'consistent-return': [0],
      'func-names': [0],
	  'import/no-extraneous-dependencies': ['error', {'devDependencies': true}],
      'indent': ['error', 'tab'],
      'no-param-reassign': [0],
      'no-prototype-builtins': [0],
      'no-restricted-syntax': [0],
  },
  settings: {
    'import/resolver': 'meteor',
  },
};
