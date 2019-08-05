import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';

import Analytics from '/imports/ui/lib/analytics';
import Shariff from '/imports/ui/lib/shariff';

import './sharing.html';

// eslint-disable-next-line func-names
Template.sharing.onRendered(function () {
	this.autorun(() => {
		this.shariff = new Shariff(this.find('.shariff'), {
			lang: Session.get('locale'),
			mailUrl: 'mailto:',
			services: [
				'twitter',
				'facebook',
				'whatsapp',
				'mail',
			],
		});

		this.$('.fa').addClass('fa-fw');
	});
});

Template.sharing.events({

	'click .shariff a'(event) {
		// this reads out which social button it is, e.g. facebook, twitter
		const source = $(event.currentTarget).parent().attr('class').replace('shariff-button', '')
			.trim();

		Analytics.trytrack((tracker) => {
			tracker.trackEvent('social', `${source} clicked`);
		});
	},

});
