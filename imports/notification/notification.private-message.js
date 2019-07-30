import { Match } from 'meteor/check';
import { Router } from 'meteor/iron:router';

import Courses from '/imports/api/courses/courses';
import Users from '/imports/api/users/users';
import Log from '/imports/api/log/log';

import StringTools from '/imports/utils/string-tools';
import HtmlTools from '/imports/utils/html-tools';

const notificationPrivateMessage = {};

/** Record the intent to send a private message
  *
  * @param      {ID} senderId - id of the user that sends the message
  * @param      {ID} recipientId - id of the intended recipient
  * @param  {String} message - the message to transmit
  * @param    {Bool} revealSenderAddress - include email-address of sender in message
  * @param    {Bool} sendCopyToSender - send a copy of the message to the author
  * @param    {Bool} context - dictionary with context ID (course, venue, &c.)
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
		if (!sender) throw new Meteor.Error(404, 'Sender not found');

		const senderAddress = sender.emailAddress();
		if (senderAddress) {
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
	const sender = Meteor.users.findOne(body.sender);
	const targetRecipient = Meteor.users.findOne(body.targetRecipient);

	return {
		vars(userLocale, actualRecipient) {
			if (!sender) throw new Error('Sender does not exist (0.o)');
			if (!targetRecipient) throw new Error('targetRecipient does not exist (0.o)');

			const subjectvars = { SENDER: StringTools.truncate(sender.username, 10) };
			const subject = mf('notification.privateMessage.mail.subject', subjectvars, 'Private message from {SENDER}', userLocale);
			const htmlizedMessage = HtmlTools.plainToHtml(entry.body.message);

			// Find out whether this is the copy sent to the sender.
			const senderCopy = sender._id === actualRecipient._id;

			const vars = {
				sender,
				senderLink: Router.url('userprofile', sender),
				subject,
				message: htmlizedMessage,
				senderCopy,
				recipientName: targetRecipient.username,
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
