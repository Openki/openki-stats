import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { Courses } from '/imports/api/courses/courses';
import { CourseDiscussions } from '/imports/api/course-discussions/course-discussions';
import { Events } from '/imports/api/events/events';
import ensure from './ensureFixture';
import Prng from './Prng';
import { Groups } from '/imports/api/groups/groups';
import { Regions } from '/imports/api/regions/regions';
import { Venues } from '/imports/api/venues/venues';
import { Users } from '/imports/api/users/users';
import { InfoPages } from '/imports/api/infoPages/infoPages';
import { infoPages } from './data/infoPages/infoPages';

import * as HtmlTools from '/imports/utils/html-tools';
import LocalTime from '/imports/utils/local-time';
import * as StringTools from '/imports/utils/string-tools';
import { PrivateSettings } from '/imports/utils/PrivateSettings';

import { courses } from './data/course.fixtures';
import { events } from './data/event.fixtures';
import { groups } from './data/group.fixtures';
import { regions } from './data/region.fixtures';
import { venues } from './data/venue.fixtures';

/**
 * Make a number that looks like a human chose it, favouring 2 and 5
 * @param {Prng} prng
 * @returns {number}
 */
const humandistrib = function (prng) {
	const factors = [0, 0, 1, 2, 2, 3, 5, 5];
	return (
		factors[Math.floor(Math.random() * factors.length)] * (prng() > 0.7 ? humandistrib(prng) : 1) +
		(prng() > 0.5 ? humandistrib(prng) : 0)
	);
};

/**
 * Select a date that is after the given date
 * For past dates a date between the original date and the present is chosen,
 * dates closer to the original date preferred.
 * For future dates, a date between the original date and double the time between now and then
 * is chosen.
 * @param {Date} date
 */
const sometimesAfter = function (date) {
	const prng = Prng('sometimesAfter');

	// Seconds between then and now
	const spread = new Date(Math.abs(new Date().getTime() - date.getTime())).getTime();

	// Quadratic dropoff: Place new date closer to the original date statistically
	const placement = prng();
	const squaredPlacement = placement * placement;

	return new Date(date.getTime() + spread * squaredPlacement);
};

// Unfortunately we can't make this a debugOnly package because the integration
// tests use the data too, and they run with the --production flag.
// This guard is here until we find a better solution.
if (Meteor.isServer && PrivateSettings.testdata) {
	const regionsCreate = function () {
		const userKopf = ensure.user('Kopf', undefined, true)._id;

		const prng = Prng('createRegions');
		regions.forEach((r) => {
			const region = {
				...r,
				tenant: prng() > 0.3 ? ensure.tenant('Hmmm') : ensure.tenant('Kopf', userKopf),
			}; // clone
			if (region.loc) {
				const coordinates = region.loc.reverse(); // GeoJSON takes latitude first
				region.loc = { type: 'Point', coordinates };
			}
			Regions.insert(region);
		});

		return `Inserted ${regions.length} region fixtures.`;
	};

	const usersCreate = function () {
		ensure.user('greg', undefined, true);
		ensure.user('Seee', undefined, true);
		ensure.user('1u', undefined, true);
		ensure.user('validated_mail', undefined, true);
		return 'Inserted user fixtures.';
	};

	const infoPagesCreate = function () {
		infoPages.forEach((p) => {
			InfoPages.insert(p);
		});
		return 'Inserted info pages fixtures.';
	};

	const groupsCreate = function () {
		groups.forEach((g) => {
			const group = { ...g };
			group.createdby = 'ServerScript_loadingTestgroups';

			// Always use same id for same group to avoid broken urls while testing
			group._id = ensure.fixedId([group.name, group.description]);
			group.members = group.members?.map((name) => ensure.user(name, undefined)._id) || [];
			Groups.insert(group);
		});

		return `Inserted ${groups.length} group fixtures.`;
	};

	const eventsCreate = function () {
		// These events are most useful if they show up in the calendar for the
		// current week, so we move them from their original day into this
		// week but keep the weekday.
		let dateOffset = 0;

		events
			// Don't create events that exist already
			.filter((e) => !Events.findOne({ _id: e._id }))
			.forEach((e) => {
				const event = { ...e };
				event.createdBy = ensure.user(event.createdby, event.region)._id;
				event.groups = event.groups?.map(ensure.group) || [];
				event.groupOrganizers = [];

				// We place the first event in the series on the monday of this week
				// and all later events relative to it.
				if (dateOffset === 0) {
					const weekstart = new Date();
					weekstart.setHours(0);
					weekstart.setMinutes(0);
					weekstart.setSeconds(0);
					weekstart.setDate(weekstart.getDate() - weekstart.getDay() + 1);

					const dayOfFirstEvent = new Date(event.start.$date);
					dayOfFirstEvent.setHours(0);
					dayOfFirstEvent.setMinutes(0);
					dayOfFirstEvent.setSeconds(0);
					dateOffset = weekstart.getTime() - dayOfFirstEvent.getTime();
				}

				event.venue = ensure.venue(event.venue, event.region);
				event.internal = Boolean(event.internal);

				const regionZone = LocalTime.zone(event.region);

				event.startLocal = LocalTime.toString(new Date(event.start.$date + dateOffset));
				event.start = regionZone.fromString(event.startLocal).toDate();
				event.endLocal = new Date(event.end.$date + dateOffset);
				event.end = regionZone.fromString(event.endLocal).toDate();
				event.time_created = new Date(event.time_created.$date);
				event.time_lastedit = new Date(event.time_lastedit.$date);
				Events.insert(event);
			});

		return `Inserted ${events.length} event fixtures.`;
	};

	const venuesCreate = function () {
		const prng = Prng('loadLocations');

		const testRegions = [
			Regions.findOne('9JyFCoKWkxnf8LWPh'),
			Regions.findOne('EZqQLGL4PtFCxCNrp'),
		];

		venues.forEach((v) => {
			const venueData = { ...v };
			venueData.region = prng() > 0.85 ? testRegions[0] : testRegions[1];

			const venue = ensure.venue(venueData.name, venueData.region._id);

			_.extend(venue, venueData);

			venue.createdby = ensure.user(venue.createdby, venueData.region._id)._id;

			Venues.update(venue._id, venue);
		});

		return `Inserted ${venues.length} venue fixtures.`;
	};

	const coursesCreate = function () {
		const prng = Prng('createCourses');

		courses.forEach((c) => {
			const course = { ...c };

			course.slug = StringTools.slug(course.name);
			course.internal = Boolean(course.internal);

			course._id = ensure.fixedId([course.name, course.description]);

			course.date =
				prng() > 0.5 ? new Date(new Date().getTime() + (prng() - 0.25) * 8000000000) : false;
			const age = Math.floor(prng() * 80000000000);
			course.time_created = new Date(new Date().getTime() - age);
			course.time_lastedit = new Date(new Date().getTime() - age * 0.25);

			if (course.region) {
				course.region = ensure.region(course.region);
			} else {
				/* place in random test region, Spilistan or Testistan */
				course.region = prng() > 0.85 ? '9JyFCoKWkxnf8LWPh' : 'EZqQLGL4PtFCxCNrp';
			}

			course.members.forEach((member) => {
				// eslint-disable-next-line no-param-reassign
				member.user = ensure.user(member.user, course.region)._id;
			});

			course.createdby = ensure.user(course.createdby, course.region)._id;

			if (!course.groups) {
				course.groups = [];
			}
			course.groups = course.groups.map(ensure.group);
			course.groupOrganizers = [];

			course.interested = course.members.length;

			Courses.insert(course);
		});

		return `Inserted ${courses.length} course fixtures.`;
	};

	/**
	 * Generate events for each course
	 *
	 * For each course, zero or more events are generated. Some will be in
	 * the past, some in the future.
	 */
	const eventsGenerate = function () {
		const prng = Prng('eventsGenerate');
		let count = 0;

		const testVenues = [
			'Haus am See',
			'Kongresszentrum',
			'Volkshaus',
			'SQ131',
			'Caffee Z??hringer',
			'Restaurant Krone',
			'Hischengraben 3',
			'SQ125',
			'Hub',
			'ASZ',
			'ASZ',
		];

		const rooms = [
			'Grosser Saal',
			'Vortragsraum',
			'Erkerzimmer',
			'Mirror-room',
			'Garden',
			'5',
			'Moscow',
			'Moscow',
		];

		Courses.find().forEach((course) => {
			const eventCount = Math.floor((prng() * 1.6) ** 10);
			for (let n = 0; n < eventCount; n += 1) {
				const event = {};
				let { description } = course;
				if (!description) description = 'No description'; // :-(
				const words = _.shuffle(description.split(' '));
				event.tenant = course.tenant;
				event.region = course.region;
				event.groups = course.groups;
				event.groupOrganizers = [];

				const venue = testVenues[Math.floor(prng() * testVenues.length)];
				event.venue = ensure.venue(venue, event.region);

				if (prng() > 0.6) {
					event.room = rooms[Math.floor(prng() * rooms.length)];
				}

				event.internal = prng() < 0.07;

				event.courseId = course._id;
				event._id = ensure.fixedId([course._id, `${n}`]);
				event.title = `${course.name} ${_.sample(words)}`;
				event.description = HtmlTools.saneHtml(
					words.slice(0, 10 + Math.floor(prng() * 30)).join(' '),
				);
				event.groups = course.groups;

				let relativeDate = prng() - 0.7; // put 70% in the past, linear distribution
				// exponential decrease for events in the future
				if (relativeDate > 0) {
					relativeDate = (relativeDate * 5) ** 2;
				}

				const spread = 1000 * 60 * 60 * 24 * 365 * 1.24; // 1.2 years in ms
				const timeOffset = Math.floor(relativeDate * spread);
				const date = new Date(new Date().getTime() + timeOffset);
				const hour = date.getHours();

				// Events outside daylight 8-21 should be unlikely
				if (prng() > 0.2 && (hour < 8 || hour > 21)) {
					date.setHours(hour + 12);
				}

				// Quarter hours should be most common
				if (prng() > 0.05) {
					date.setMinutes(Math.floor(date.getMinutes() / 15) * 15);
				}

				const regionZone = LocalTime.zone(event.region);

				event.startLocal = LocalTime.toString(date);
				event.start = regionZone.fromString(event.startLocal).toDate();
				event.endLocal = LocalTime.toString(
					new Date(date.getTime() + humandistrib(prng) * 1000 * 60 * 4),
				);
				event.end = regionZone.fromString(event.endLocal).toDate();

				const { members } = course;
				const randomMember = members[Math.floor(Math.random() * members.length)];
				event.createdby = ensure.user(randomMember?.user || 'Serverscript', event.region)._id;
				const age = Math.floor(prng() * 10000000000);
				event.time_created = new Date(new Date().getTime() - age);
				event.time_lastedit = new Date(new Date().getTime() - age * 0.25);
				Events.insert(event);
			}

			count += eventCount;
		});

		return `Generated ${count} course events.`;
	};

	const commentsGenerate = function () {
		const prng = Prng('createComments');
		let count = 0;

		const userCount = Users.find().count();
		Courses.find().forEach((course) => {
			const createCount = Math.floor((prng() * 2) ** 4);
			const courseMembers = course.members.length;
			let { description } = course;
			if (!description) description = 'No description'; // :-(
			const words = description.split(' ');

			for (let n = 0; n < createCount; n += 1) {
				const comment = {};
				comment.courseId = course._id;
				comment.title = _.sample(words, 1 + Math.floor(prng() * 3)).join(' ');
				comment.text = HtmlTools.saneHtml(
					_.sample(words, 5).join(' ') + _.sample(words, Math.floor(prng() * 30)).join(' '),
				);

				comment.time_created = sometimesAfter(course.time_created);
				comment.time_updated =
					prng() < 0.9 ? comment.time_created : sometimesAfter(comment.time_created);

				let commenter;
				if (!courseMembers || prng() < 0.2) {
					// Leave some anonymous comments
					if (prng() < 0.7) {
						commenter = Users.findOne({}, { skip: Math.floor(prng() * userCount) })._id;
						comment.userId = commenter.user;
					}
				} else {
					commenter = course.members[Math.floor(prng() * courseMembers)];
					comment.userId = commenter.user;
				}

				CourseDiscussions.insert(comment);
			}

			count += createCount;
		});

		return `Generated ${count} course comments.`;
	};

	Meteor.methods({
		'fixtures.clean'() {
			Groups.remove({});
			Events.remove({});
			Venues.remove({});
			Courses.remove({});
		},

		'fixtures.create'() {
			infoPagesCreate();
			if (Regions.find().count() === 0) {
				regionsCreate();
			}
			usersCreate();
			groupsCreate();
			venuesCreate();
			coursesCreate();
			eventsGenerate();
		},
		'fixtures.infoPages.create': infoPagesCreate,
		'fixtures.users.create': usersCreate,
		'fixtures.regions.create': regionsCreate,
		'fixtures.groups.create': groupsCreate,
		'fixtures.events.create': eventsCreate,
		'fixtures.venues.create': venuesCreate,
		'fixtures.courses.create': coursesCreate,
		'fixtures.events.generate': eventsGenerate,
		'fixtures.comments.generate': commentsGenerate,
	});
}
