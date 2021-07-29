import { Accounts } from 'meteor/accounts-base';
import { Session } from 'meteor/session';
import { Meteor } from 'meteor/meteor';

import { Regions } from '/imports/api/regions/regions';

import * as UserLocation from '/imports/utils/user-location';
import * as UrlTools from '/imports/utils/url-tools';

const RegionSelection = {};

/**
 * List of routes that show different results when the region changes.
 */
RegionSelection.regionDependentRoutes = ['home', 'find', 'calendar', 'venueMap', 'groupDetails'];

/**
 * Subscribe to list of regions and configure the regions
 * This checks client storage for a region setting. When there is no previously
 * selected region, we ask the server to do geolocation. If that fails too,
 * we just set the region to 'all regions'.
 */
RegionSelection.init = function () {
	// We assume the initial onLogin() callback comes before the regions' ready.
	// We have no guarantee for this however!
	Accounts.onLogin(() => {
		const user = Meteor.user();
		if (user) {
			const { regionId } = user.profile;
			if (regionId) {
				try {
					localStorage.setItem('region', regionId);
				} catch {
					// ignore See: https://developer.mozilla.org/en-US/docs/Web/API/Storage/setItem#exceptions
				}
				Session.set('region', regionId);
			}
		}
	});

	RegionSelection.subscribe();
};

RegionSelection.subscribe = function () {
	Meteor.subscribe('Regions', async () => {
		const selectors = [
			Session.get('region'),
			UrlTools.queryParam('region'),
			localStorage?.getItem('region'),
		].filter(Boolean);

		const useAsRegion = function (/** @type {string} */ regionId) {
			if (!regionId) {
				return false;
			}

			// Special case 'all'
			if (regionId === 'all') {
				try {
					localStorage.setItem('region', regionId);
				} catch {
					// ignore See: https://developer.mozilla.org/en-US/docs/Web/API/Storage/setItem#exceptions
				}
				Session.set('region', regionId);
				return true;
			}

			// Normal case region ID
			if (Regions.findOne({ _id: regionId })) {
				try {
					localStorage.setItem('region', regionId);
				} catch {
					// ignore See: https://developer.mozilla.org/en-US/docs/Web/API/Storage/setItem#exceptions
				}
				Session.set('region', regionId);
				return true;
			}

			// Special case by name so you can do ?region=Spilistan
			const region = Regions.findOne({ name: regionId });
			if (region) {
				try {
					localStorage.setItem('region', region._id);
				} catch {
					// ignore See: https://developer.mozilla.org/en-US/docs/Web/API/Storage/setItem#exceptions
				}
				Session.set('region', region._id);
				return true;
			}

			// Ignore invalid region ID
			return false;
		};

		// If any of these regions are usable we stop here
		if (selectors.some(useAsRegion)) {
			return;
		}

		// If no region has been selected previously, we show the splash-screen.

		try {
			// Ask geolocation server to place us so the splash-screen has our best
			// guess selected.
			const region = await UserLocation.detect();

			if (region) {
				useAsRegion(region._id);
			} else {
				// Give up
				useAsRegion('all');
			}

			Session.set('showRegionSplash', selectors.length < 1);
		} catch (err) {
			// eslint-disable-next-line no-console
			console.log(`Region autodetection error: ${err}`);
		}
	});
};

export default RegionSelection;
