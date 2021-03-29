import { Match, check } from 'meteor/check';
import { Router } from 'meteor/iron:router';
import { Meteor } from 'meteor/meteor';
import { mf } from 'meteor/msgfmt:core';

import Courses from '/imports/api/courses/courses';
import Log from '/imports/api/log/log';
import { Users } from '/imports/api/users/users';
import Regions from '/imports/api/regions/regions';

import { HtmlTools } from '/imports/utils/html-tools';
import { StringTools } from '/imports/utils/string-tools';
import UserPrivilegeUtils from '../utils/user-privilege-utils';

/** @typedef {import('../api/users/users').UserModel} UserModel */

const notificationPrivateMessage = {};

/**
 * Record the intent to send a private message
 * @param {string} senderId id of the user that sends the message
 * @param {string} recipientId id of the intended recipient
 * @param {string} message the message to transmit
 * @param {boolean} revealSenderAddress include email-address of sender in message
 * @param {boolean} sendCopyToSender send a copy of the message to the author
 * @param {{course?: boolean, event?: boolean}} context dictionary with
 * context ID (course, venue, &c.)
 */
notificationPrivateMessage.record = function (
	senderId,
	recipientId,
	message,
	revealSenderAddress,
	sendCopyToSender,
	context,
) {
	check(senderId, String);
	check(recipientId, String);
	check(message, String);
	check(revealSenderAddress, Boolean);
	check(sendCopyToSender, Boolean);

	const optionalId = Match.Optional(String);
	check(context, {
		course: optionalId,
		event: optionalId,
	});

	const recipients = [recipientId];
	if (sendCopyToSender) {
		const sender = Users.findOne(senderId);
		if (!sender) {
			throw new Meteor.Error(404, 'Sender not found');
		}

		if (sender.hasEmail()) {
			recipients.push(senderId);
		} else {
			throw new Meteor.Error(404, 'Sender has no email address');
		}
	}

	const contextRel = Object.values(context);

	const rel = [senderId, recipientId, ...contextRel];

	const body = {
		message,
		sender: senderId,
		recipients,
		targetRecipient: recipientId,
		revealSenderAddress,
		model: 'PrivateMessage',
		context,
	};

	Log.record('Notification.Send', rel, body);
};

notificationPrivateMessage.Model = function (entry) {
	const { body } = entry;
	const sender = Users.findOne(body.sender);
	const targetRecipient = Users.findOne(body.targetRecipient);

	return {
		/**
		 * @param {UserModel} actualRecipient
		 */
		accepted(actualRecipient) {
			if (!actualRecipient.allowPrivateMessages && !UserPrivilegeUtils.privileged(sender, 'admin')) {
				throw new Error('User wishes to not receive private messages from users');
			}

			if (!actualRecipient.hasEmail()) {
				throw new Error('Recipient has no email address registered');
			}
		},

		/**
		 * @param {string} userLocale
		 * @param {UserModel} actualRecipient
		 * @param {string} unsubToken
		 */
		vars(userLocale, actualRecipient, unsubToken) {
			if (!sender) {
				throw new Error('Sender does not exist (0.o)');
			}
			if (!targetRecipient) {
				throw new Error('targetRecipient does not exist (0.o)');
			}

			const subjectvars = { SENDER: StringTools.truncate(sender.username, 10) };
			const subject = mf('notification.privateMessage.mail.subject', subjectvars, 'Private message from {SENDER}', userLocale);
			const htmlizedMessage = HtmlTools.plainToHtml(entry.body.message);

			// Find out whether this is the copy sent to the sender.
			const senderCopy = sender._id === actualRecipient._id;

			let siteName;
			let mailLogo;
			if (actualRecipient.profile?.regionId) {
				const region = Regions.findOne(actualRecipient.profile?.regionId);
				siteName = region?.custom?.siteName;
				mailLogo = region?.custom?.mailLogo;
			}
			siteName = siteName || Meteor.settings.public.siteName;

			const vars = {
				unsubLink: Router.url('profile.privatemessages.unsubscribe', { token: unsubToken }),
				sender,
				senderLink: Router.url('userprofile', sender, { query: 'campaign=privateMessage' }),
				subject,
				message: htmlizedMessage,
				senderCopy,
				recipientName: targetRecipient.username,
				customSiteUrl: `${Meteor.absoluteUrl()}?campaign=privateMessage`,
				customSiteName: siteName,
				customMailLogo: mailLogo,
			};

			if (!senderCopy && body.revealSenderAddress) {
				const senderAddress = sender.verifiedEmailAddress();
				if (senderAddress) {
					vars.fromAddress = senderAddress;
				} else {
					throw new Meteor.Error(400, 'no verified email address');
				}
			}

			const courseContextId = body.context.course;
			if (courseContextId) {
				const course = Courses.findOne(courseContextId);
				if (!course) {
					throw new Meteor.Error(404, 'course not found');
				}
				vars.courseName = course.name;
				vars.courseLink = Router.url('showCourse', course);
			}

			return vars;
		},
		template: 'notificationPrivateMessageMail',
	};
};

export default notificationPrivateMessage;
