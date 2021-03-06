import { Match, check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { Regions } from '/imports/api/regions/regions';
import { VenueEntity, Venues } from '/imports/api/venues/venues';
/** @typedef {import('./venues').VenueEntity} VenueEntity */

import { AsyncTools } from '/imports/utils/async-tools';
import * as HtmlTools from '/imports/utils/html-tools';
import { ServerMethod } from '/imports/utils/ServerMethod';
import * as StringTools from '/imports/utils/string-tools';

export interface SaveFields {
	name?: string;
	description?: string;
	region?: string;
	loc?: { type: 'Point'; coordinates: [number, number] };
	address?: string;
	route?: string;
	short?: string;
	maxPeople?: number;
	maxWorkplaces?: number;
	facilities?: string[];
	otherFacilities?: string;
}

export const save = ServerMethod('venue.save', (venueId: string, changes: SaveFields) => {
	check(venueId, String);
	check(changes, {
		name: Match.Optional(String),
		description: Match.Optional(String),
		region: Match.Optional(String),
		loc: Match.Optional(Match.OneOf(null, { type: String, coordinates: [Number] })),
		address: Match.Optional(String),
		route: Match.Optional(String),
		short: Match.Optional(String),
		maxPeople: Match.Optional(Number),
		maxWorkplaces: Match.Optional(Number),
		facilities: Match.Optional([String]),
		otherFacilities: Match.Optional(String),
	});

	const user = Meteor.user();
	if (!user) {
		throw new Meteor.Error(401, 'please log in');
	}

	let venue;
	const isNew = venueId.length === 0;
	if (!isNew) {
		venue = Venues.findOne(venueId);
		if (!venue) {
			throw new Meteor.Error(404, 'Venue not found');
		}

		if (!venue.editableBy(Meteor.user())) {
			throw new Meteor.Error(401, 'Please log in');
		}
	}

	/* Changes we want to perform */
	const set = { updated: new Date() } as VenueEntity;

	if (changes.description) {
		set.description = HtmlTools.saneHtml(changes.description.trim().substring(0, 640 * 1024));
	}
	if (changes.name) {
		set.name = changes.name.trim().substring(0, 1000);
		set.slug = StringTools.slug(set.name);
	}

	if (changes.address !== undefined) {
		set.address = changes.address.trim().substring(0, 40 * 1024);
	}
	if (changes.route !== undefined) {
		set.route = changes.route.trim().substring(0, 40 * 1024);
	}
	if (changes.short !== undefined) {
		set.short = changes.short.trim().substring(0, 40);
	}
	if (changes.loc !== undefined) {
		set.loc = changes.loc;
		set.loc.type = 'Point';
	}

	if (changes.maxPeople !== undefined) {
		set.maxPeople = Math.min(1e10, Math.max(0, changes.maxPeople));
	}
	if (changes.maxWorkplaces !== undefined) {
		set.maxWorkplaces = Math.min(1e10, Math.max(0, changes.maxWorkplaces));
	}
	if (changes.facilities !== undefined) {
		set.facilities = _.reduce(
			changes.facilities,
			(originalFs: any, f) => {
				const fs = { ...originalFs };
				if (Venues.facilityOptions.includes(f)) {
					fs[f] = true;
				}
				return fs;
			},
			{},
		);
	}

	if (changes.otherFacilities) {
		set.otherFacilities = changes.otherFacilities.substring(0, 40 * 1024);
	}

	if (isNew) {
		/* region cannot be changed */
		const region = Regions.findOne(changes.region);
		if (!region) {
			throw new Meteor.Error(404, 'region missing');
		}

		set.region = region._id;

		/* eslint-disable-next-line no-param-reassign */
		venueId = Venues.insert({
			editor: user._id,
			createdby: user._id,
			created: new Date(),
		} as VenueEntity);
	}

	Venues.update({ _id: venueId }, { $set: set }, undefined, AsyncTools.checkUpdateOne);

	return venueId;
});

export const remove = ServerMethod('venue.remove', (venueId: string) => {
	check(venueId, String);

	const venue = Venues.findOne(venueId);
	if (!venue) {
		throw new Meteor.Error(404, 'No such venue');
	}

	if (!venue.editableBy(Meteor.user())) {
		throw new Meteor.Error(401, 'Please log in');
	}

	return Venues.remove(venueId);
});
