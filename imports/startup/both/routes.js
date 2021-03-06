import { Router } from 'meteor/iron:router';
import { Meteor } from 'meteor/meteor';

import { i18n } from '/imports/startup/both/i18next';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';
import moment from 'moment';
import momentTz from 'moment-timezone';

import { Courses } from '/imports/api/courses/courses';
import { Events, OEvent } from '/imports/api/events/events';
import { Group, Groups } from '/imports/api/groups/groups';
import { Region, Regions } from '/imports/api/regions/regions';
/** @typedef {import('/imports/api/regions/regions').RegionModel} RegionModel */
/** @typedef {import('/imports/api/tenants/tenants').TenantModel} TenantModel */
import { InfoPages } from '/imports/api/infoPages/infoPages';
import { Tenant, Tenants } from '/imports/api/tenants/tenants';
import { Roles } from '/imports/api/roles/roles';
import { Venues, Venue } from '/imports/api/venues/venues';
import { Users } from '/imports/api/users/users';
/** @typedef {import('/imports/api/venues/venues').VenueModel} VenueModel */
/** @typedef {import('/imports/api/courses/courses').CourseModel} CourseModel */
/** @typedef {import('/imports/api/courses/courses').CourseMemberEntity} CourseMemberEntity */
/** @typedef {import('/imports/api/users/users').UserModel} UserModel */

import { Analytics } from '/imports/ui/lib/analytics';
import CleanedRegion from '/imports/ui/lib/cleaned-region';
import CourseTemplate from '/imports/ui/lib/course-template';
import { CssFromQuery } from '/imports/ui/lib/css-from-query';

import { Filtering } from '/imports/utils/filtering';
import LocalTime from '/imports/utils/local-time';
import { reactiveNow } from '/imports/utils/reactive-now';
import * as Metatags from '/imports/utils/metatags';
import * as Predicates from '/imports/utils/predicates';
import * as UserPrivilegeUtils from '/imports/utils/user-privilege-utils';
import { Invitations } from '/imports/api/invitations/invitations';

function finderRoute(path) {
	return {
		path,
		template: 'findWrap',
		yieldRegions: {
			featuredGroup: { to: 'aboveContent' },
		},
		data() {
			const { query } = this.params;

			// Add filter options for the homepage
			return _.extend(query, {
				internal: false,
				region: Session.get('region'),
			});
		},
		onAfterAction() {
			const { search } = this.params.query;
			if (search) {
				Metatags.setCommonTags(i18n('find.windowtitle', 'Find "{SEARCH}"', { SEARCH: search }));
			} else {
				Metatags.setCommonTags(i18n('find.WhatLearn?'));
			}
		},
	};
}

const makeFilterQuery = function (params) {
	const filter = Events.Filtering().read(params).done();

	const query = filter.toQuery();

	/** @type {moment.Moment | undefined} */
	let start;
	if (params.start) {
		start = moment(params.start);
	}
	if (!start || !start.isValid()) {
		start = moment(reactiveNow.get()).startOf('day');
	}

	/** @type {moment.Moment | undefined} */
	let end;
	if (params.end) {
		end = moment(params.end);
	}
	if (!end || !end.isValid()) {
		end = moment(start).add(1, 'day');
	}

	query.period = [start.toDate(), end.toDate()];

	return query;
};

/**
 * @param {CourseModel} course
 * @param {CourseMemberEntity} member
 */
function loadRoles(course, member) {
	return Roles.filter((r) => course.roles?.includes(r.type)).map((r) => ({
		role: r,
		subscribed: course.userHasRole(Meteor.userId(), r.type),
		comment: member.comment,
		course,
	}));
}

if (Meteor.isClient) {
	Analytics.installRouterActions(Router);
}

Router.route('adminPanel', {
	path: 'admin',
	template: 'adminPanelPage',
	async action() {
		await import('/imports/ui/pages/admin/panel');
		this.render();
	},
});

Router.route('calendar', {
	path: 'calendar',
	data() {
		return this.params;
	},
	onAfterAction() {
		Metatags.setCommonTags(i18n('calendar.windowtitle', 'Calendar'));
	},
});

Router.route('featureGroup', {
	path: 'admin/feature-group',
	template: 'adminFeatureGroupPage',
	async action() {
		await import('/imports/ui/pages/admin/feature-group');
		this.render();
	},
});

Router.route('tenants', {
	path: 'admin/tenants',
	template: 'adminTenantsPage',
	waitOn() {
		return Meteor.subscribe('Tenants.findFilter');
	},
	async action() {
		await import('/imports/ui/pages/admin/tenants');
		this.render();
	},
	onAfterAction() {
		Metatags.setCommonTags(i18n('tenants.windowtitle', 'Organizations'));
	},
});

Router.route('find', finderRoute('/find'));

Router.route('users', {
	path: 'admin/users',
	template: 'adminUsersPage',
	async action() {
		await import('/imports/ui/pages/admin/users');
		this.render();
	},
	onAfterAction() {
		Metatags.setCommonTags(i18n('admin.users.windowtitle', 'Users'));
	},
});

Router.route('frameCalendar', {
	path: '/frame/calendar',
	template: 'frameCalendarPage',
	layoutTemplate: 'frameLayout',
	data() {
		const cssRules = new CssFromQuery(this.params.query, [
			['itembg', 'background-color', '.frame-list-item'],
			['itemcolor', 'color', '.frame-list-item'],
			['linkcolor', 'color', '.frame-list-item a'],
			['regionbg', 'background-color', '.frame-list-item-region'],
			['regioncolor', 'color', '.frame-list-item-region'],
		]).getCssRules();
		return { cssRules };
	},
	async action() {
		await import('/imports/ui/pages/frames/calendar');
		this.render();
	},
	onAfterAction() {
		Metatags.setCommonTags(i18n('calendar.windowtitle', 'Calendar'));
	},
});

Router.route('frameCourselist', {
	path: '/frame/courselist',
	template: 'frameCourselistPage',
	layoutTemplate: 'frameLayout',
	data() {
		const cssRules = new CssFromQuery(this.params.query, [
			['itembg', 'background-color', '.frame-list-item'],
			['itemcolor', 'color', '.frame-list-item'],
			['linkcolor', 'color', '.frame-list-item a'],
			['regionbg', 'background-color', '.frame-list-item-region'],
			['regioncolor', 'color', '.frame-list-item-region'],
		]).getCssRules();
		const hideInterested = parseInt(this.params.query.hideInterested, 10) || 0;
		return { cssRules, hideInterested };
	},
	async action() {
		await import('/imports/ui/pages/frames/courselist');
		this.render();
	},
});

Router.route('frameEvents', {
	path: '/frame/events',
	template: 'frameEventsPage',
	layoutTemplate: 'frameLayout',
	waitOn() {
		this.filter = Events.Filtering().read(this.params.query).done();

		const filterParams = this.filter.toParams();
		filterParams.after = reactiveNow.get();

		const limit = parseInt(this.params.query.count, 10) || 6;

		return Meteor.subscribe('Events.findFilter', filterParams, limit * 2);
	},

	data() {
		const filterParams = this.filter.toParams();
		filterParams.after = reactiveNow.get();

		const limit = parseInt(this.params.query.count, 10) || 6;

		return Events.findFilter(filterParams, limit);
	},

	onAfterAction() {
		Metatags.setCommonTags(i18n('event.list.windowtitle', 'Events'));
	},
});

Router.route('framePropose', {
	path: '/frame/propose',
	template: 'frameProposePage',
	layoutTemplate: 'frameLayout',
	waitOn: () => Meteor.subscribe('Regions'),
	data() {
		const predicates = {
			region: Predicates.id,
			addTeamGroups: Predicates.ids,
			neededRoles: Predicates.ids,
			setCreatorsRoles: Predicates.ids,
			internal: Predicates.flag,
			hidePricePolicy: Predicates.flag,
			hideCategories: Predicates.flag,
		};
		const params = new Filtering(predicates).read(this.params.query).done().toQuery();

		if (params.addTeamGroups) {
			// For security reasons only 5 groups are allowed
			params.teamGroups = params.addTeamGroups.slice(0, 5);
		}
		delete params.addTeamGroups;

		if (!params.neededRoles) {
			params.neededRoles = ['mentor'];
		}
		if (params.setCreatorsRoles) {
			params.hideRoleSelection = true;
		} else {
			params.setCreatorsRoles = [];
		}
		params.roles = ['mentor', 'host'].filter(
			(role) => params.neededRoles.includes(role) || params.setCreatorsRoles.includes(role),
		);
		delete params.neededRoles;

		params.creatorsRoles = ['mentor', 'host'].filter((role) =>
			params.setCreatorsRoles.includes(role),
		);
		delete params.setCreatorsRoles;

		params.isFrame = true;

		return params;
	},
	async action() {
		await import('/imports/ui/pages/frames/propose');
		this.render();
	},
	onAfterAction() {
		Metatags.setCommonTags(i18n('course.propose.windowtitle', 'Propose new course'));
	},
});

Router.route('frameSchedule', {
	path: '/frame/schedule',
	template: 'frameSchedulePage',
	layoutTemplate: 'frameLayout',
	async action() {
		await import('/imports/ui/pages/frames/schedule');
		this.render();
	},
});

Router.route('frameWeek', {
	path: '/frame/week',
	template: 'frameWeekPage',
	layoutTemplate: 'frameLayout',
	async action() {
		await import('/imports/ui/pages/frames/week');
		this.render();
	},
	onAfterAction() {
		Metatags.setCommonTags(i18n('calendar.windowtitle', 'Calendar'));
	},
});

Router.route('groupDetails', {
	path: 'group/:_id/:short?',
	template: 'groupDetailsPage',
	waitOn() {
		return [Meteor.subscribe('group', this.params._id)];
	},
	data() {
		let group;
		const isNew = this.params._id === 'create';
		if (isNew) {
			group = new Group();
		} else {
			group = Groups.findOne(this.params._id);
		}

		if (!group) {
			return false;
		}

		const courseQuery = Object.assign(this.params.query, {
			group: group._id,
			region: Session.get('region'),
		});

		return {
			courseQuery,
			group,
			showCourses: !isNew,
		};
	},
	async action() {
		await import('/imports/ui/pages/group-details');
		this.render();
	},
	onAfterAction() {
		const group = Groups.findOne({ _id: this.params._id });
		if (group) {
			Metatags.setCommonTags(group.name);
		}
	},
});

Router.route('home', finderRoute('/'));

Router.route('kioskEvents', {
	path: '/kiosk/events',
	template: 'kioskEventsPage',
	layoutTemplate: 'kioskLayout',
	waitOn() {
		const now = reactiveNow.get(); // Time dependency so this will be reactively updated

		this.filter = Events.Filtering().read(this.params.query).done();
		Session.set('kioskFilter', this.filter.toParams());

		const queryFuture = this.filter.toParams();
		queryFuture.after = now;

		const queryOngoing = this.filter.toParams();
		queryOngoing.ongoing = now;

		return [
			Meteor.subscribe('Events.findFilter', queryFuture, 20),
			Meteor.subscribe('Events.findFilter', queryOngoing),
		];
	},

	data() {
		const now = reactiveNow.get();
		const tomorrow = new Date(now);
		tomorrow.setHours(tomorrow.getHours() + 24);
		tomorrow.setHours(0);

		const queryFuture = this.filter.toParams();
		queryFuture.after = tomorrow;

		const queryToday = this.filter.toParams();
		queryToday.after = now;
		queryToday.before = tomorrow;

		const queryNow = this.filter.toParams();
		queryNow.ongoing = now;

		const filterParams = this.filter.toParams();
		return {
			today: Events.findFilter(queryToday, 20),
			future: Events.findFilter(queryFuture, 10),
			ongoing: Events.findFilter(queryNow),
			filter: filterParams,
		};
	},
	async action() {
		await import('/imports/ui/pages/kiosk/events');
		this.render();
	},
	onAfterAction() {
		this.timer = Meteor.setInterval(() => {
			Session.set('seconds', new Date());
		}, 1000);

		Metatags.setCommonTags(i18n('event.list.windowtitle', 'Events'));
	},
	unload() {
		Meteor.clearInterval(this.timer);
	},
});

Router.route('log', {
	path: '/log',
	template: 'logPage',
	data() {
		return this.params.query;
	},
	async action() {
		await import('/imports/ui/pages/log');
		this.render();
	},
	onAfterAction() {
		Metatags.setCommonTags(i18n('log.list.windowtitle', 'Log'));
	},
});

Router.route('pages', {
	// /////// static /////////
	path: 'page/:page_name',
	action() {
		this.render(this.params.page_name);
	},
	onAfterAction() {
		Metatags.setCommonTags(this.params.page_name);
	},
});

Router.route('info', {
	path: 'info/:page_slug',
	template: 'infoPage',
	waitOn() {
		return [Meteor.subscribe('infoPage', this.params.page_slug, Session.get('locale'))];
	},
	data() {
		const page = InfoPages.findOne({ slug: this.params.page_slug });
		if (!page) {
			return false;
		}

		return { page };
	},
	onAfterAction() {
		const page = InfoPages.findOne({ slug: this.params.page_slug });
		if (page) {
			Metatags.setCommonTags(page.title);
		}
	},
});

Router.route('profile', {
	path: 'profile',
	template: 'profilePage',
	waitOn() {
		return [
			Meteor.subscribe('Tenants.findFilter', { adminOf: true }),
			Meteor.subscribe('Groups.findFilter', { own: true }),
			Meteor.subscribe('Venues.findFilter', { editor: Meteor.userId() }),
		];
	},
	data() {
		/** @type {import('/imports/ui/pages/profile').ProfilePageData} */
		const data = {};
		/** @type {UserModel | null} */
		const user = Meteor.user();
		if (user) {
			const userdata = {
				_id: user._id,
				name: user.username,
				notifications: user.notifications,
				allowPrivateMessages: user.allowPrivateMessages,
				tenants: Tenants.findFilter({ adminOf: true }),
				groups: Groups.findFilter({ own: true }),
				venues: Venues.findFilter({ editor: user._id }),
				email: user.emails?.[0]?.address,
				verified: user.emails?.[0]?.verified || false,
			};
			data.user = userdata;
		}
		return data;
	},
	async action() {
		await import('/imports/ui/pages/profile');
		this.render();
	},
	onAfterAction() {
		const user = Meteor.user();
		if (!user) {
			return;
		}

		const title = i18n('profile.settings.windowtitle', 'My Profile Settings - {USER}', {
			USER: user.username,
		});
		Metatags.setCommonTags(title);
	},
});

Router.route('proposeCourse', {
	path: 'courses/propose',
	template: 'courseProposePage',
	async action() {
		await import('/imports/ui/pages/course-create');
		this.render();
	},
	onAfterAction() {
		Metatags.setCommonTags(i18n('course.propose.windowtitle', 'Propose new course'));
	},
	data: CourseTemplate,
});

Router.route('resetPassword', {
	path: 'reset-password/:token',
	template: 'resetPasswordPage',
	async action() {
		await import('/imports/ui/pages/reset-password');
		this.render();
	},
	data() {
		return { token: this.params.token };
	},
	onAfterAction() {
		document.title = i18n('resetPassword.siteTitle', 'Reset password');
	},
});

Router.route('showCourse', {
	path: 'course/:_id/:slug?',
	template: 'courseDetailsPage',
	waitOn() {
		return Meteor.subscribe('courseDetails', this.params._id);
	},
	data() {
		const course = Courses.findOne({ _id: this.params._id });

		if (!course) {
			return false;
		}

		function getMember(members, user) {
			if (!members) {
				return false;
			}
			let member = false;
			members.every((memberCandidate) => {
				if (memberCandidate.user === user) {
					member = memberCandidate;
					return false; // break
				}
				return true;
			});
			return member;
		}

		const userId = Meteor.userId();
		const member = getMember(course.members, userId);
		const data = {
			edit: !!this.params.query.edit,
			rolesDetails: loadRoles(course, member),
			course,
			member,
			select: this.params.query.select,
		};
		return data;
	},
	async action() {
		await import('/imports/ui/pages/course-details');
		this.render();
	},
	onAfterAction() {
		const data = this.data();
		if (!data) {
			return;
		}

		const { course } = data;
		Metatags.setCommonTags(i18n('course.windowtitle', 'Course: {COURSE}', { COURSE: course.name }));
	},
});

Router.route('showCourseHistory', {
	path: 'course/:_id/:slug/History',
	// template: 'coursehistory',
	waitOn() {
		return [Meteor.subscribe('courseDetails', this.params._id)];
	},
	data() {
		const course = Courses.findOne({ _id: this.params._id });
		return {
			course,
		};
	},
});

Router.route('showEvent', {
	path: 'event/:_id/:slug?',
	template: 'eventPage',
	notFoundTemplate: 'eventNotFound',
	waitOn() {
		const subs = [Meteor.subscribe('event', this.params._id)];
		const { courseId } = this.params.query;
		if (courseId) {
			subs.push(Meteor.subscribe('courseDetails', courseId));
		}
		return subs;
	},
	data() {
		let event;
		const create = this.params._id === 'create';
		if (create) {
			const propose = LocalTime.now().startOf('hour');
			event = _.extend(new OEvent(), {
				new: true,
				startLocal: LocalTime.toString(propose),
				endLocal: LocalTime.toString(moment(propose).add(2, 'hour')),
			});
			const course = Courses.findOne(this.params.query.courseId);
			if (course) {
				event.title = course.name;
				event.courseId = course._id;
				event.region = course.region;
				event.description = course.description;
				event.internal = course.internal;
			}
		} else {
			event = Events.findOne({ _id: this.params._id });
			if (!event) {
				return false;
			}
		}

		return event;
	},
});

Router.route('stats', {
	path: 'stats',
	template: 'statsPage',
	async action() {
		await import('/imports/ui/pages/stats');
		this.render();
	},
});

Router.route('tenantCreate', {
	path: 'tenant/create',
	template: 'tenantCreatePage',
	data() {
		/** @type TenantModel */
		const tenant = new Tenant();
		/** @type RegionModel */
		const region = new Region();
		region.tz = momentTz.tz.guess();
		return {
			tenant,
			region,
		};
	},
	async action() {
		await import('/imports/ui/pages/tenant-create');
		this.render();
	},
	onAfterAction() {
		const title = i18n('tenant.edit.siteTitle.create', 'Create private region');
		Metatags.setCommonTags(title);
	},
});

Router.route('tenantDetails', {
	path: 'tenant/:_id/:short?',
	template: 'tenantDetailsPage',
	/**
	 * @this {{params: {_id: string; slug?: string;}}}
	 */
	waitOn() {
		return [Meteor.subscribe('tenant', this.params._id)];
	},
	/**
	 * @this {{params: {_id: string; slug?: string;}}}
	 */
	data() {
		const tenant = Tenants.findOne({ _id: this.params._id });

		if (!tenant) {
			return false;
		}

		return { tenant };
	},
	async action() {
		await import('/imports/ui/pages/tenant-details');
		this.render();
	},
	/**
	 * @this {{params: {_id: string; slug?: string;}}}
	 */
	onAfterAction() {
		const tenant = Tenants.findOne({ _id: this.params._id });
		if (tenant) {
			Metatags.setCommonTags(tenant.name);
		}
	},
});

Router.route('invitation', {
	path: 'invitation/:token',
	template: 'invitationPage',
	/**
	 * @this {{params: {token: string; query: { tenant: string; }}}}
	 */
	waitOn() {
		return [Meteor.subscribe('invitation', this.params?.query?.tenant, this.params?.token)];
	},
	/**
	 * @this {{params: {token: string; query: { tenant: string; }}}}
	 */
	data() {
		const tenant = Tenants.findOne({ _id: this.params?.query?.tenant });
		if (!tenant) {
			return false;
		}

		const invitation = Invitations.findOne({
			tenant: this.params?.query?.tenant,
			token: this.params?.token,
		});
		if (!invitation) {
			return false;
		}

		return { tenant, invitation };
	},
	async action() {
		await import('/imports/ui/pages/invitation');
		this.render();
	},
	/**
	 * @this {{params: {token: string; query: { tenant: string; }}}}
	 */
	onAfterAction() {
		const tenant = Tenants.findOne({ _id: this.params.query.tenant });
		if (tenant) {
			const title = i18n('invitation.show.siteTitle', 'Join {TENANT}', {
				TENANT: tenant.name,
			});
			Metatags.setCommonTags(title);
		}
	},
});

Router.route('timetable', {
	path: '/kiosk/timetable',
	template: 'kioskTimetablePage',
	layoutTemplate: 'kioskLayout',
	waitOn() {
		return Meteor.subscribe('Events.findFilter', makeFilterQuery(this.params?.query), 200);
	},
	data() {
		const query = makeFilterQuery(this.params.query);

		/**
		 * @type {moment.MomentInput}
		 */
		let start;
		/**
		 * @type {moment.MomentInput}
		 */
		let end;

		const events = Events.findFilter(query, 200).fetch();

		// collect time when first event starts and last event ends
		events.forEach((event) => {
			if (!start || event.start < start) {
				start = event.start;
			}
			if (!end || end < event.end) {
				end = event.end;
			}
		});

		if (!start || !end) {
			return [];
		}

		start = moment(start).startOf('hour');
		end = moment(end).startOf('hour');

		const timestampStart = start.toDate().getTime();
		const timestampEnd = end.toDate().getTime();

		const span = timestampEnd - timestampStart;
		/**
		 * @type {{ [day: string]: {moment: moment.Moment, relStart:number, relEnd:number}; } }
		 */
		const days = {};
		/**
		 * @type {{ [hour: string]: {moment: moment.Moment, relStart:number, relEnd:number}; } }
		 */
		const hours = {};
		const cursor = moment(start);
		do {
			const month = cursor.month();
			const day = cursor.day();
			days[`${month}${day}`] = {
				moment: moment(cursor).startOf('day'),
				relStart: Math.max(
					-0.1,
					(moment(cursor).startOf('day').toDate().getTime() - timestampStart) / span,
				),
				relEnd: Math.max(
					-0.1,
					(timestampEnd - moment(cursor).startOf('day').add(1, 'day').toDate().getTime()) / span,
				),
			};
			const hour = cursor.hour();
			hours[`${month}${day}${hour}`] = {
				moment: moment(cursor).startOf('hour'),
				relStart: Math.max(
					-0.1,
					(moment(cursor).startOf('hour').toDate().getTime() - timestampStart) / span,
				),
				relEnd: Math.max(
					-0.1,
					(timestampEnd - moment(cursor).startOf('hour').add(1, 'hour').toDate().getTime()) / span,
				),
			};
			cursor.add(1, 'hour');
		} while (cursor.isBefore(end));

		/**
		 * @type {{[venue:string]: {venue: VenueModel, perRoom: {[room:string]:{room:string,venue:VenueModel,rows:(import('/imports/api/events/events').EventEntity & {relStart: number, relEnd: number})[]}}}}}
		 */
		const perVenue = {};
		const useVenue = function (venue, room) {
			const id = venue._id || `#${venue.name}`;
			if (!perVenue[id]) {
				perVenue[id] = {
					venue,
					perRoom: {
						[room]: {
							room,
							venue,
							rows: [],
						},
					},
				};
			} else if (!perVenue[id].perRoom[room]) {
				perVenue[id].perRoom[room] = {
					room,
					venue,
					rows: [],
				};
			}
			return perVenue[id].perRoom[room].rows;
		};

		events.forEach((originalEvent) => {
			const event = { ...originalEvent };
			event.relStart = (event.start.getTime() - timestampStart) / span;
			event.relEnd = (timestampEnd - event.end.getTime()) / span;
			let placed = false;

			const room = event.room || null;
			const roomRows = useVenue(event.venue, room);
			roomRows.forEach((roomRow) => {
				let last;
				roomRow.forEach((placedEvent) => {
					if (!last || placedEvent.end > last) {
						last = placedEvent.end;
					}
				});
				if (last <= event.start) {
					roomRow.push(event);
					placed = true;
					return false;
				}
				return true;
			});
			if (!placed) {
				roomRows.push([event]);
			}
		});

		// Transform the "rows" objects to arrays and sort the room rows by
		// the room name, so "null" (meaning no room) comes first.
		const grouped = Object.values(perVenue).map((venueData) => {
			const perRoom = Object.values(venueData.perRoom).sort();
			return { ...venueData, perRoom };
		});

		return {
			days: Object.values(days),
			hours: Object.values(hours),
			grouped,
		};
	},
	async action() {
		await import('/imports/ui/pages/kiosk/timetable');
		this.render();
	},
});

Router.route('userprofile', {
	path: 'user/:_id/:username?',
	template: 'userprofilePage',
	waitOn() {
		return [
			Meteor.subscribe('user', this.params._id),
			Meteor.subscribe('Groups.findFilter', { own: true }),
		];
	},
	data() {
		const user = Users.findOne({ _id: this.params._id });
		if (!user) {
			return false; // not loaded?
		}

		// What privileges the user has
		const privileges = _.reduce(
			['admin'],
			(originalPs, p) => {
				const ps = { ...originalPs };
				ps[p] = UserPrivilegeUtils.privileged(user, p);
				return ps;
			},
			{},
		);

		const alterPrivileges = UserPrivilegeUtils.privilegedTo('admin');
		const showPrivileges = alterPrivileges || user.privileges?.length;

		return {
			user,
			alterPrivileges,
			privileges,
			inviteGroups: Groups.findFilter({ own: true }),
			showPrivileges,
		};
	},
	async action() {
		await import('/imports/ui/pages/userprofile');
		this.render();
	},
	onAfterAction() {
		const user = Users.findOne({ _id: this.params._id });
		if (!user) return;

		const title = i18n('profile.windowtitle', 'Profile of {USER}', { USER: user.username });
		Metatags.setCommonTags(title);
	},
});

Router.route('regionCreate', {
	path: 'region/create',
	template: 'regionDetailsPage',
	data() {
		/** @type RegionModel */
		const region = new Region();
		region.tenant = this.params.query.tenant;
		region.tz = momentTz.tz.guess();
		return {
			isNew: true,
			region,
		};
	},
	async action() {
		await import('/imports/ui/pages/region-details');
		this.render();
	},
	onAfterAction() {
		const title = i18n('region.edit.siteTitle.create', 'Create region');
		Metatags.setCommonTags(title);
	},
});

Router.route('regionDetails', {
	path: 'region/:_id/:slug?',
	template: 'regionDetailsPage',
	/**
	 * @this {{params: {_id: string; slug?: string;}}}
	 */
	waitOn() {
		return [Meteor.subscribe('regionDetails', this.params._id)];
	},
	/**
	 * @this {{params: {_id: string; slug?: string;}}}
	 */
	data() {
		const region = Regions.findOne(this.params._id);

		if (!region) {
			return false; // Not found
		}

		return { region };
	},
	async action() {
		await import('/imports/ui/pages/region-details');
		this.render();
	},
	/**
	 * @this {{params: {_id: string; slug?: string;}}}
	 */
	onAfterAction() {
		const region = this.data()?.region;

		if (!region) {
			return;
		}

		Metatags.setCommonTags(region.name);
	},
});

Router.route('venueDetails', {
	path: 'venue/:_id/:slug?',
	template: 'venueDetailsPage',
	/**
	 * @this {{params: {_id: string; slug?:string;}}}
	 */
	waitOn() {
		return [Meteor.subscribe('venueDetails', this.params._id)];
	},
	data() {
		const id = this.params._id;

		/** @type {VenueModel} */
		let venue;
		const data = {};
		if (id === 'create') {
			const userId = Meteor.userId();
			venue = new Venue();
			venue.region = CleanedRegion(Session.get('region'));
			venue.editor = userId;
		} else {
			venue = Venues.findOne({ _id: this.params._id });
			if (!venue) {
				return false; // Not found
			}
		}

		data.venue = venue;

		return data;
	},
	async action() {
		await import('/imports/ui/pages/venue-details');
		this.render();
	},
	onAfterAction() {
		const data = this.data();
		if (!data) {
			return;
		}

		const { venue } = data;
		let title;
		if (venue._id) {
			title = venue.name;
		} else {
			title = i18n('venue.edit.siteTitle.create', 'Create Venue');
		}
		Metatags.setCommonTags(title);
	},
});

Router.route('venuesMap', {
	path: 'venues',
	template: 'venuesMapPage',
	waitOn() {
		return Meteor.subscribe('venues', CleanedRegion(Session.get('region')));
	},
	async action() {
		await import('/imports/ui/pages/venues-map');
		this.render();
	},
	onAfterAction() {
		Metatags.setCommonTags(i18n('venue.map.windowtitle', 'Venues map'));
	},
});
