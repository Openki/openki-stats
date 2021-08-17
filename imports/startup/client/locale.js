import { Meteor } from 'meteor/meteor';
import moment from 'moment';

import { Accounts } from 'meteor/accounts-base';
import { mfPkg, msgfmt } from 'meteor/msgfmt:core';
import { _ } from 'meteor/underscore';
import { Session } from 'meteor/session';
import { Tracker } from 'meteor/tracker';
import $ from 'jquery';
import 'bootstrap-datepicker';

import { Languages } from '/imports/api/languages/languages';

import * as UrlTools from '/imports/utils/url-tools';

// Always load english translation
// For dynamically constructed translation strings there is no default
// translation and meteor would show the translation key if there is no
// translation in the current locale
mfPkg.loadLangs('en');

// Try to guess a sensible language
Meteor.startup(() => {
	const useLocale = function (/** @type {string | undefined | null} */ lang) {
		if (!lang) {
			return false;
		}

		/** @type {false | string} */
		let locale = false;
		if (Languages[lang]) {
			locale = lang;
		}
		if (!locale && lang.length > 2) {
			const short = lang.substring(0, 2);
			if (Languages[short]) {
				locale = short;
			}
		}
		if (locale) {
			try {
				localStorage.setItem('locale', locale);
			} catch {
				// ignore See: https://developer.mozilla.org/en-US/docs/Web/API/Storage/setItem#exceptions
			}
			Session.set('locale', locale);
			return true;
		}
		return false;
	};

	// Check query parameter and cookies
	if (useLocale(UrlTools.queryParam('lg'))) {
		return;
	}
	if (useLocale(localStorage?.getItem('locale'))) {
		return;
	}

	// Try to access the preferred languages. For the legacy browsers that don't
	// expose it we could ask the server for the Accept-Language headers but I'm
	// too lazy to implement this. It would become obsolete anyway.
	if (navigator.languages) {
		for (let i = 0; i < navigator.languages.length; i += 1) {
			if (useLocale(navigator.languages[i])) return;
		}
	}

	// Here we ask for the browser UI language which may not be what the visitor
	// wanted. Oh well.
	if (useLocale(navigator.language)) {
		return;
	}

	// Give up. Here's to Cultural Homogenization.
	useLocale('en');
});

Meteor.startup(() => {
	Tracker.autorun(() => {
		const desiredLocale = Session.get('locale');

		if (!desiredLocale) {
			// if nothing set we wait for a change
			return;
		}

		// messageformat set the locale value in the db user
		mfPkg.setLocale(desiredLocale);

		// Logic taken from mfpkg:core to get text directionality
		const lang = desiredLocale.substr(0, 2);
		const textDirectionality = msgfmt.dirFromLang(lang);
		Session.set('textDirectionality', textDirectionality);

		// Msgfmt already sets the dir attribute, but we want a class too.
		const isRTL = textDirectionality === 'rtl';
		$('body').toggleClass('rtl', isRTL);

		// Tell moment to switch the locale
		// Also change timeLocale which will invalidate the parts that depend on it
		const setLocale = moment.locale(desiredLocale);
		Session.set('timeLocale', setLocale);
		if (desiredLocale !== setLocale) {
			/* eslint-disable-next-line no-console */
			console.log(`Date formatting set to ${setLocale} because ${desiredLocale} not available`);
		}

		// HACK replace the datepicker locale settings
		// I do not understand why setting language: moment.locale() does not
		// work for the datepicker. But we want to use the momentjs settings
		// anyway, so we might as well clobber the 'en' locale.
		const locale = moment().localeData();

		const monthsShort = function () {
			if (typeof locale.monthsShort === 'function') {
				return _.range(12).map((month) => locale.monthsShort(moment().month(month), ''));
			}
			return locale._monthsShort;
		};

		$.fn.datepicker.dates.en = _.extend({}, $.fn.datepicker.dates.en, {
			days: locale._weekdays,
			daysShort: locale._weekdaysShort,
			daysMin: locale._weekdaysMin,
			months: locale._months || locale._monthsNominativeEl,
			monthsShort: monthsShort(),
			weekStart: locale._week.dow,
		});
	});
});

Accounts.onLogin(() => {
	const user = Meteor.user();

	if (user) {
		const locale = user.locale;
		if (locale) {
			try {
				localStorage.setItem('locale', locale);
			} catch {
				// ignore See: https://developer.mozilla.org/en-US/docs/Web/API/Storage/setItem#exceptions
			}
			Session.set('locale', locale);
		}
	}
});
