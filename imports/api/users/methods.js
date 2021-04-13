import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { Match, check } from 'meteor/check';
import { _ } from 'meteor/underscore';

import Log from '/imports/api/log/log';
import { Groups } from '/imports/api/groups/groups';
import { Users } from '/imports/api/users/users';
import { Courses } from '/imports/api/courses/courses';

import UserPrivilegeUtils from '/imports/utils/user-privilege-utils';
import Profile from '/imports/utils/profile';
import { ApiError } from '/imports/api/ApiError';
import { isEmail } from '/imports/utils/email-tools';
import { StringTools } from '/imports/utils/string-tools';
import { AsyncTools } from '/imports/utils/async-tools';
/** @typedef {import('/imports/api/courses/courses').Course} Course */
import Events from '../events/events';
/** @typedef {import('./users').UserModel} UserModel */

/**
 * @param {string} email
 * @param {UserModel} user
 */
const updateEmail = function (email, user) {
	const newEmail = email.trim() || false;
	const oldEmail = user.emailAddress();

	// for users with email not yet set, we dont want to force them
	// to enter a email when they change other profile settings.
	if (newEmail === oldEmail) {
		return false;
	}

	if (!newEmail) {
		return ApiError('noEmail', 'Please enter a email.');
	}

	if (!isEmail(newEmail)) {
		return ApiError('emailNotValid', 'email invalid');
	}

	// Don't allow using an address somebody else uses
	const existingUser = Accounts.findUserByEmail(newEmail);
	if (existingUser) {
		return ApiError('emailExists', 'Email already exists.');
	}

	Profile.Email.change(user._id, newEmail, 'profile change');
	return true;
};

Meteor.methods({
	/**
	 * Set user region
	 * @param {string} newRegion
	 */
	'user.regionChange'(newRegion) {
		Profile.Region.change(Meteor.userId(), newRegion, 'client call');
	},

	/**
	 * Update user avatar color
	 * @param {number} [newColor] hsl hue number, otherwise a random color is generated
	 */
	'user.updateAvatarColor'(newColor) {
		check(newColor, Match.Optional(Number));

		const color = newColor ?? _.random(360);
		Profile.AvatarColor.change(Meteor.userId(), color);
	},

	/**
	 * Update user description
	 * @param {string} description
	 */
	'user.updateDescription'(description) {
		check(description, String);

		/** @type {UserModel} */
		const user = Meteor.user();
		if (!user) {
			return ApiError('plzLogin', 'Not logged-in');
		}

		const sane = StringTools.saneTitle(description).trim().substring(0, 200);

		const result = Profile.Description.change(user._id, sane);
		if (!result) {
			return ApiError('nameError', 'Failed to update username');
		}

		return true;
	},

	/**
	 * Update username
	 * @param {string} description
	 */
	'user.updateUsername'(username) {
		check(username, String);

		/** @type {UserModel} */
		const user = Meteor.user();
		if (!user) {
			return ApiError('plzLogin', 'Not logged-in');
		}

		const saneUsername = StringTools.saneTitle(username).trim().substring(0, 200);

		const result = Profile.Username.change(user._id, saneUsername);
		if (!result) {
			return ApiError('nameError', 'Failed to update username');
		}

		return true;
	},

	/**
	 * Update automated notification flag
	 * @param {boolean} allow
	 */
	'user.updateAutomatedNotification'(allow) {
		check(allow, Boolean);

		/** @type {UserModel} */
		const user = Meteor.user();
		if (!user) {
			return ApiError('plzLogin', 'Not logged-in');
		}

		if (user.notifications !== allow) {
			Profile.Notifications.change(user._id, allow, undefined, 'profile change');
		}

		return true;
	},

	/**
	 * Update private messages flag
	 * @param {boolean} allow
	 */
	'user.updatePrivateMessages'(allow) {
		check(allow, Boolean);

		/** @type {UserModel} */
		const user = Meteor.user();
		if (!user) {
			return ApiError('plzLogin', 'Not logged-in');
		}

		if (user.allowPrivateMessages !== allow) {
			Profile.PrivateMessages.change(user._id, allow, undefined, 'profile change');
		}

		return true;
	},

	/**
	 * Update email
	 * @param {string} email
	 */
	'user.updateEmail'(email) {
		check(email, String);

		const user = Meteor.user();
		if (!user) {
			return ApiError('plzLogin', 'Not logged-in');
		}
		return updateEmail(email, user);
	},

	'user.self.remove'() {
		const user = Meteor.user();
		if (user) {
			Users.remove({ _id: user._id });
		}
	},

	/**
	 * @param {string} userId
	 * @param {string} reason
	 * @param {object} [options]
	 * @param {boolean} [options.courses] On true the courses (and events) created by the user
	 * will also be deleted
	 */
	'user.admin.remove'(userId, reason, options) {
		check(userId, String);
		check(reason, String);
		check(options, Match.Optional({
			courses: Match.Optional(Boolean),
		}));

		if (!UserPrivilegeUtils.privilegedTo('admin')) return;

		/** @type {Course[]} */
		const deletedCourses = [];
		let numberOfDeletedEvents = 0;
		if (options?.courses) {
			// Remove courses created by this user
			Courses.find({ createdby: userId }).fetch()
				.forEach((course) => {
					deletedCourses.push(course);
					numberOfDeletedEvents += Events.remove({ courseId: course._id });
				});

			Courses.remove({ createdby: userId });
		}

		// Updated courses and events he is involted
		const courses = Courses.find({ 'members.user': userId }).fetch();
		courses.forEach((course) => {
			Events.update(
				{ courseId: course._id },
				{ $pull: { editors: userId } },
				{ multi: true },
			);
			Events.update(
				{ courseId: course._id },
				{ $pull: { participants: userId } },
				{ multi: true },
			);

			Courses.update(
				{ _id: course._id },
				{ $pull: { members: { user: userId } } },
			);
			Courses.update(
				{ _id: course._id },
				{ $pull: { editors: userId } },
			);

			// Update member related calculated fields
			Courses.updateInterested(course._id);
			Courses.updateGroups(course._id);
		});

		const operatorId = Meteor.userId();
		const user = Users.findOne(userId);
		delete user.services;

		Users.remove({ _id: userId });

		Log.record('user.admin.remove', [operatorId, userId],
			{
				operatorId,
				reason,
				user,
				deletedCourses,
				numberOfDeletedEvents,
			});
	},

	/**
	 * @param {string} userId
	 * @param {string} privilege
	 */
	'user.addPrivilege'(userId, privilege) {
		// At the moment, only admins may hand out privileges, so this is easy
		if (UserPrivilegeUtils.privilegedTo('admin')) {
			const user = Users.findOne({ _id: userId });
			if (!user) {
				throw new Meteor.Error(404, 'User not found');
			}
			Users.update(
				{ _id: user._id },
				{ $addToSet: { privileges: privilege } },
				AsyncTools.checkUpdateOne,
			);
		}
	},

	/**
	 * @param {string} userId
	 * @param {string} privilege
	 */
	'user.removePrivilege'(userId, privilege) {
		const user = Users.findOne({ _id: userId });
		if (!user) {
			throw new Meteor.Error(404, 'User not found');
		}

		const operator = Meteor.user();

		if (UserPrivilegeUtils.privileged(operator, 'admin') || operator._id === user._id) {
			Users.update(
				{ _id: user._id },
				{ $pull: { privileges: privilege } },
				AsyncTools.checkUpdateOne,
			);
		}
	},

	/**
	 * Recalculate the groups and badges field
	 */
	'user.updateBadges'(selector) {
		Users.find(selector).forEach((originalUser) => {
			const userId = originalUser._id;

			AsyncTools.untilClean((resolve, reject) => {
				const user = Users.findOne(userId);

				if (!user) {
					resolve(true);
					return;
				}

				const groups = [];
				Groups.find({ members: user._id }).forEach((group) => {
					groups.push(group._id);
				});

				const badges = groups.slice();
				badges.push(user._id);

				const update = {
					$set: {
						groups,
						badges,
					},
				};

				Users.rawCollection().update({ _id: user._id },
					update,
					(err, result) => {
						if (err) {
							reject(err);
						} else {
							resolve(result.result.nModified === 0);
						}
					});
			});
		});
	},

	'user.hidePricePolicy'(user) {
		Users.update(
			{ _id: user._id },
			{ $set: { hidePricePolicy: true } },
		);
	},

	/**
	 * @param {string} userId
	 */
	'user.name'(userId) {
		this.unblock();
		const user = Users.findOne(userId, { fields: { username: 1 } });
		if (!user) {
			return false;
		}
		return user.username;
	},

	/**
	 * @param {string} locale
	 */
	'user.updateLocale'(locale) {
		Users.update(Meteor.userId(), {
			$set: { locale },
		});
	},
});
