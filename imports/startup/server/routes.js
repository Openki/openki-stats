import { Router } from 'meteor/iron:router';

import { Groups } from '/imports/api/groups/groups';
import * as GroupsMethods from '/imports/api/groups/methods';

import * as FileStorage from '/imports/utils/FileStorage';
import Profile from '/imports/utils/profile';

// Server only routes

Router.route('profileNotificationsUnsubscribe', {
	path: '/profile/notifications/unsubscribe/:token',
	action() {
		const unsubToken = this.params.token;

		const accepted = Profile.Notifications.unsubscribe(unsubToken);

		const query = {};
		if (accepted) {
			query.unsubscribed = 'notifications';
		} else {
			query['unsubscribe-error'] = '';
		}

		this.response.writeHead(302, {
			Location: Router.url('profile', {}, { query }),
		});

		this.response.end();
	},
	where: 'server',
});

Router.route('profilePrivateMessagesUnsubscribe', {
	path: '/profile/privatemessages/unsubscribe/:token',
	action() {
		const unsubToken = this.params.token;

		const accepted = Profile.PrivateMessages.unsubscribe(unsubToken);

		const query = {};
		if (accepted) {
			query.unsubscribed = 'privatemessages';
		} else {
			query['unsubscribe-error'] = '';
		}

		this.response.writeHead(302, {
			Location: Router.url('profile', {}, { query }),
		});

		this.response.end();
	},
	where: 'server',
});
