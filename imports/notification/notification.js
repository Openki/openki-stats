import Log from '/imports/api/log/log';

import { Email } from 'meteor/email';
import { Random } from 'meteor/random';

import notificationEvent from '/imports/notification/notification.event';
import notificationComment from '/imports/notification/notification.comment';
import notificationJoin from '/imports/notification/notification.join';
import notificationPrivateMessage from '/imports/notification/notification.private-message';

import { logo } from '/imports/utils/email-tools';

const Notification = {};

Notification.Event = notificationEvent;
Notification.Comment = notificationComment;
Notification.Join = notificationJoin;
Notification.PrivateMessage = notificationPrivateMessage;

/** Handle event notification
  *
  * @param entry Notification.Event log entry to process
  */
Notification.send = function (entry) {
	// Find out for which recipients sending has already been attempted.
	const concluded = {};

	Log.find(
		{
			tr: 'Notification.SendResult',
			rel: entry._id,
		},
	).forEach((result) => {
		concluded[result.body.recipient] = true;
	});

	const model = Notification[entry.body.model].Model(entry);

	_.each(entry.body.recipients, (recipientId) => {
		if (!concluded[recipientId]) {
			let mail = null;
			let unsubToken = null;

			try {
				const user = Meteor.users.findOne(recipientId);

				if (!user) {
					throw new Error(`User not found for ID '${recipientId}'`);
				}

				if (user.notifications === false) {
					throw new Error('User wishes to not receive notifications');
				}

				if (!user.emails || !user.emails[0] || !user.emails[0].address) {
					throw new Error('Recipient has no email address registered');
				}

				const email = user.emails[0];
				const { address } = email;

				const { username } = user;
				const userLocale = (user.profile && user.profile.locale) || 'en';

				const { siteName } = Accounts.emailTemplates;
				const subjectPrefix = `[${siteName}] `;

				unsubToken = Random.secret();

				const vars = model.vars(userLocale, user);

				const fromAddress = vars.fromAddress
								|| Accounts.emailTemplates.from;

				vars.unsubLink = Router.url('profile.unsubscribe', { token: unsubToken });
				vars.siteName = siteName;
				vars.locale = userLocale;
				vars.username = username;
				vars.logo = logo(Meteor.settings.public.mailLogo);

				let message = SSR.render(model.template, vars);

				// Template can't handle DOCTYPE header, so we add the thing here.
				const DOCTYPE = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">';
				message = DOCTYPE + message;

				mail = {
					from: fromAddress,
					sender: Accounts.emailTemplates.from,
					to: address,
					subject: subjectPrefix + vars.subject,
					html: message,
					attachments: [vars.logo.attachement],
				};

				Email.send(mail);

				Notification.SendResult.record(entry, unsubToken, true, recipientId, mail, 'success');
			} catch (e) {
				let reason = e;
				if (typeof e === 'object' && 'toJSON' in e) {
					reason = e.toJSON();
				}
				Notification.SendResult.record(entry, unsubToken, false, recipientId, mail, reason);
			}
		}
	});
};


Notification.SendResult = {};

/** Record the result of a notification delivery attempt
  * @param  {object} note      - notification log-entry
  * @param      {ID} unsubToken - token that can be used to unsubscribe from
  *                               further notices
  * @param {Boolean} sent      - whether the notification was sent
  * @param      {ID} recipient - recipient user ID
  * @param  {String} message   - generated message (or null if we didn't get
  *                              that far)
  * @param  {String} reason    - why this log entry was recorded
  */
Notification.SendResult.record = function (note, unsubToken, sent, recipient, message, reason) {
	check(sent, Boolean);
	check(unsubToken, Match.Maybe(String));
	check(recipient, String);
	check(message, Match.Maybe(Object));
	const entry = {
		sent,
		recipient,
		message,
		reason,
		unsubToken,
	};

	const rel = [note._id, recipient];
	if (unsubToken) {
		rel.push(unsubToken);
	}

	Log.record('Notification.SendResult', rel, entry);
};

export default Notification;
