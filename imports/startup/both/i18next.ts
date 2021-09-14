import i18next from 'i18next';
import ICU from 'i18next-icu';
import ChainedBackend from 'i18next-chained-backend';
import resourcesToBackend from 'i18next-resources-to-backend';
import LocalStorageBackend from 'i18next-localstorage-backend';

// eslint-disable-next-line no-constant-condition
if (false) {
	// whitelist, this is needed for meteor's dynamic-import module, to allow dynamic loading of modules
	// on the client: https://docs.meteor.com/packages/dynamic-import.html#Using-import-with-dynamic-expressions
	import(`/imports/startup/both/i18n/en.json`);

	import(`/imports/startup/both/i18n/af.json`);
	import(`/imports/startup/both/i18n/am.json`);
	import(`/imports/startup/both/i18n/ar.json`);
	import(`/imports/startup/both/i18n/da.json`);
	import(`/imports/startup/both/i18n/de-ZH.json`);
	import(`/imports/startup/both/i18n/de.json`);
	import(`/imports/startup/both/i18n/el.json`);
	import(`/imports/startup/both/i18n/es.json`);
	import(`/imports/startup/both/i18n/fa.json`);
	import(`/imports/startup/both/i18n/fl.json`);
	import(`/imports/startup/both/i18n/fr.json`);
	import(`/imports/startup/both/i18n/hu.json`);
	import(`/imports/startup/both/i18n/it.json`);
	import(`/imports/startup/both/i18n/ja.json`);
	import(`/imports/startup/both/i18n/ko.json`);
	import(`/imports/startup/both/i18n/nl.json`);
	import(`/imports/startup/both/i18n/pt.json`);
	import(`/imports/startup/both/i18n/rm.json`);
	import(`/imports/startup/both/i18n/ru.json`);
	import(`/imports/startup/both/i18n/sv.json`);
	import(`/imports/startup/both/i18n/tr.json`);
	import(`/imports/startup/both/i18n/zh-CN.json`);
	import(`/imports/startup/both/i18n/zh-TW.json`);
}

i18next
	.use(ICU)
	.use(ChainedBackend)
	.init({
		fallbackLng: 'en',
		backend: {
			backends: [
				LocalStorageBackend,
				resourcesToBackend((language, _namespace, callback) => {
					import(`/imports/startup/both/i18n/${language}.json`)
						.then((resources) => {
							callback(null, resources);
						})
						.catch((error) => {
							callback(error, null);
						});
				}),
			],
			backendOptions: [
				{
					expirationTime: 7 * 24 * 60 * 60 * 1000, // 7 days
				},
			],
		},
	});

Template.registerHelper(
	'i18n',
	function (
		key: string,
		defaultValueOrData: string | { hash?: Record<string, unknown> } = {},
		data?: { hash: Record<string, unknown> },
	) {
		// defaultValue is optional
		if (typeof defaultValueOrData === 'string') {
			// function (key, defaultValue, data)
			return i18next.t(key, defaultValueOrData, data?.hash);
		}

		// function (key, data)
		return i18next.t(key, defaultValueOrData.hash);
	},
);
