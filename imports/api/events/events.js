import { Mongo } from 'meteor/mongo';

import Courses from '/imports/api/courses/courses';

import AsyncTools from '/imports/utils/async-tools';
import Filtering from '/imports/utils/filtering';
import LocalTime from '/imports/utils/local-time';
import Predicates from '/imports/utils/predicates';
import StringTools from '/imports/utils/string-tools';
import UserPrivilegeUtils from '/imports/utils/user-privilege-utils';

// ======== DB-Model: ========
// _id             -> ID
// region          -> ID_region
// title           -> String
// description     -> String
// startLocal      -> String of local date when event starts
// endLocal        -> String of local date when event ends
//
// venue {
//       _id:          Optional reference to a document in the Venues collection
//                         If this is set, the fields name, loc, and address are synchronized
//       name:         Descriptive name for the venue
//       loc:          Event location in GeoJSON format
//       address:      Address string where the event will take place
// }
// room            -> String    (Where inside the building the event will take place)
// createdBy       -> userId
// time_created    -> Date
// time_lastedit   -> Date
// courseId        -> course._id of parent course, optional
// internal        -> Boolean    (Events are only displayed when group or venue-filter is active)

// groups          -> list of group._id that promote this event
// groupOrganizers -> list of group._id that are allowed to edit the course

// replicaOf       -> ID of the replication parent, only cloned events have this

// maxParticipants -> maximum participants of event


/** Calculated fields
  *
  * courseGroups: list of group._id inherited from course (if courseId is set)
  * allGroups: all groups that promote this course, both inherited from course and set on the event
  *            itself
  * editors: list of user and group _id that are allowed to edit the event
  * start: date object calculated from startLocal field. Use this for ordering
  *           between events.
  * end: date object calculated from endLocal field.
  */

// ===========================

// Event is a built-in, so we use a different name for this class
export const OEvent = function () {
	this.editors = [];
};

OEvent.prototype.editableBy = function (user) {
	if (!user) {
		return false;
	}
	if (UserPrivilegeUtils.privileged(user, 'admin')) {
		return true;
	}
	return _.intersection(user.badges, this.editors).length > 0;
};

OEvent.prototype.sameTime = function (event) {
	return ['startLocal', 'endLocal'].every((time) => {
		const timeA = LocalTime.fromString(this[time]);
		const timeB = LocalTime.fromString(event[time]);

		return timeA.hour() === timeB.hour() && timeA.minute() === timeB.minute();
	});
};

const Events = new Mongo.Collection('Events', {
	transform(event) {
		return _.extend(new OEvent(), event);
	},
});

Events.Filtering = () => Filtering(
	{
		course: Predicates.id,
		region: Predicates.id,
		search: Predicates.string,
		categories: Predicates.ids,
		group: Predicates.id,
		groups: Predicates.ids,
		venue: Predicates.string,
		room: Predicates.string,
		start: Predicates.date,
		before: Predicates.date,
		after: Predicates.date,
		end: Predicates.date,
		internal: Predicates.flag,
	},
);

/**
 * Recalculate the group-related fields of an event
 * @param {string} eventId the event to update
 */
Events.updateGroups = function (eventId) {
	AsyncTools.untilClean((resolve, reject) => {
		const event = Events.findOne(eventId);

		if (!event) {
			// Nothing was successfully updated, we're done.
			resolve(true);
			return;
		}

		// Any groups listed as organizers are allowed to edit.
		let editors = event.groupOrganizers.slice(); // Clone

		// If an event has a parent course, it inherits all groups and all editors from it.
		let courseGroups = [];
		if (event.courseId) {
			const course = Courses.findOne(event.courseId);
			if (!course) {
				throw new Error(`Missing course ${event.courseId} for event ${event._id}`);
			}

			courseGroups = course.groups;
			editors = _.union(editors, course.editors);
		} else {
			editors.push(event.createdBy);
		}

		const update = {
			editors,
		};

		// The course groups are only inherited if the event lies in the future
		// Past events keep their list of groups even if it changes for the course
		const historical = event.start < new Date();
		if (historical) {
			update.allGroups = _.union(event.groups, event.courseGroups);
		} else {
			update.courseGroups = courseGroups;
			update.allGroups = _.union(event.groups, courseGroups);
		}

		Events.rawCollection().update({ _id: event._id },
			{ $set: update },
			(err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve(result.result.nModified === 0);
				}
			});
	});
};

/**
 * Find events for given filters
 * @param {object} filter dictionary with filter options
 * @param {string} [filter.search] string of words to search for
 * @param {[Date,Date]} [filter.period] include only events that overlap the given
 * period (list of start and end date)
 * @param {Date} [filter.start] only events that end after this date
 * @param {Date} [filter.before] only events that ended before this date
 * @param {Date} [filter.ongoing] only events that are ongoing during this date
 * @param {Date} [filter.end] only events that started before this date
 * @param {Date} [filter.after] only events starting after this date
 * @param {string} [filter.venue] only events at this venue (ID)
 * @param {string} [filter.room] only events in this room (string match)
 * @param {boolean} [filter.standalone] only events that are not attached to a course
 * @param {string} [filter.region] restrict to given region
 * @param {string[]} [filter.categories] list of category ID the event must be in
 * @param {string} [filter.group] the event must be in that group (ID)
 * @param {string[]} [filter.groups] the event must be in one of the group ID
 * @param {string} [filter.course] only events for this course (ID)
 * @param {boolean} [filter.internal] only events that are internal (if true) or public (if false)
 * @param {number} [limit] how many to find
 * @param {number} [skip] skip this many before returning results
 * @param {any[]} [sort] list of fields to sort by
 *
 * The events are sorted by start date (ascending, before-filter causes descending order)
 *
 */
Events.findFilter = function (filter, limit, skip, sort) {
	const find = {};
	const and = [];

	const options = {};
	options.sort = Array.isArray(sort) ? sort : [];


	let startSortOrder = 'asc';

	if (limit > 0) {
		options.limit = limit;
	}

	options.skip = skip;

	if (filter.period) {
		find.start = { $lt: filter.period[1] }; // Start date before end of period
		find.end = { $gte: filter.period[0] }; // End date after start of period
	}

	if (filter.start) {
		and.push({ end: { $gte: filter.start } });
	}

	if (filter.end) {
		and.push({ start: { $lte: filter.end } });
	}

	if (filter.after) {
		find.start = { $gt: filter.after };
	}

	if (filter.ongoing) {
		find.start = { $lte: filter.ongoing };
		find.end = { $gte: filter.ongoing };
	}

	if (filter.before) {
		find.end = { $lt: filter.before };
		if (!filter.after) {
			startSortOrder = 'desc';
		}
	}

	if (filter.venue) {
		find['venue._id'] = filter.venue;
	}

	if (filter.room) {
		find.room = filter.room;
	}

	if (filter.standalone) {
		find.courseId = { $exists: false };
	}

	if (filter.region) {
		find.region = filter.region;
	}

	if (filter.categories) {
		find.categories = { $all: filter.categories };
	}

	let inGroups = [];
	if (filter.group) {
		inGroups.push(filter.group);
	}

	if (filter.groups) {
		inGroups = inGroups.concat(filter.groups);
	}

	if (inGroups.length > 0) {
		find.allGroups = { $in: inGroups };
	}

	if (filter.course) {
		find.courseId = filter.course;
	}

	if (filter.internal !== undefined) {
		find.internal = Boolean(filter.internal);
	}

	if (filter.search) {
		const searchTerms = filter.search.split(/\s+/);
		searchTerms.forEach((searchTerm) => {
			and.push({
				$or: [
					{ title: { $regex: StringTools.escapeRegex(searchTerm), $options: 'i' } },
					{ description: { $regex: StringTools.escapeRegex(searchTerm), $options: 'i' } },
				],
			});
		});
	}

	if (and.length > 0) {
		find.$and = and;
	}

	options.sort.push(['start', startSortOrder]);

	return Events.find(find, options);
};

export default Events;
