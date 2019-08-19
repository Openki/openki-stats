import { Router } from 'meteor/iron:router';
import { Session } from 'meteor/session';

import Alert from '/imports/api/alerts/alert';

const Introduction = {
	init() {
		Session.set('ShowIntro', localStorage.getItem('intro') !== 'done');
		Session.set('OpenedIntro', undefined);
	},

	showIntro() {
		Session.set('ShowIntro', true);
	},

	shownIntro: () => Session.get('ShowIntro'),

	openedIntro() {
		const opened = Session.get('OpenedIntro');
		if (opened !== undefined) {
			return opened;
		}

		const { route } = Router.current();
		const routeName = route && route.getName();
		return routeName === 'home' || routeName === 'find';
	},

	openIntro() {
		Session.set('OpenedIntro', true);
	},

	closeIntro() {
		Session.set('OpenedIntro', false);
	},

	doneIntro() {
		Session.set('ShowIntro', false);
		try {
			localStorage.setItem('intro', 'done');
		} catch (e) {
			Alert.serverError(e, '');
		}
	},
};

export default Introduction;
