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
		L: 'readonly',
		Log: 'writable',
		MediumEditor: 'readonly',
		mf: 'writable',
		mfPkg: 'readonly',
		minuteTime: 'writable',
		moment: 'readonly',
		msgfmt: 'readonly',
		Prng: 'readonly',
		robots: 'writable',
		RouterAutoscroll: 'writable',
		SharedArrayBuffer: 'readonly',
		sitemaps: 'readonly',
		SSR: 'writable',
		Tooltips: 'writable',
		Users: 'writable',
		Venue: 'writable',
		VERSION: 'writable',
	},
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: 'module',
	},
	rules: {
		'import/no-absolute-path': ['error', { esmodule: false }],
		'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
		indent: ['error', 'tab'],
		'no-tabs': ['error', { allowIndentationTabs: true }],
		'object-shorthand': ['error', 'always'],
		'prefer-destructuring': ['error', { object: false, array: false }],
		'no-multiple-empty-lines': ['error', { max: 2 }],
		'no-extra-parens': ['error'],

		// disabled rules
		'func-names': [0],
		'no-underscore-dangle': [0],
		'import/no-named-as-default': [0],
		'import/no-named-as-default-member': [0],
		'max-classes-per-file': [0],
	},
	settings: {
		'import/resolver': 'meteor',
	},
};
