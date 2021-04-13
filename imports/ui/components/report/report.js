import { Meteor } from 'meteor/meteor';
import { mf } from 'meteor/msgfmt:core';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import * as Alert from '/imports/api/alerts/alert';

import '/imports/ui/components/buttons/buttons';

import './report.html';

Template.report.onCreated(function reportOnCreated() {
	this.state = new ReactiveVar('');
});
Template.report.helpers({

	reporting: () => Template.instance().state.get() === 'reporting',
	sending: () => Template.instance().state.get() === 'sending',
});

Template.report.events({
	'click .js-report'(event, instance) {
		event.preventDefault();
		instance.state.set('reporting');
	},

	'click .js-report-cancel'(event, instance) {
		event.preventDefault();
		instance.state.set('');
	},

	'click .js-report-send'(event, instance) {
		event.preventDefault();
		Meteor.call(
			'report',
			document.title,
			window.location.href,
			navigator.userAgent,
			instance.$('.js-report-message').val(),
			(err) => {
				if (err) {
					Alert.serverError(
						err,
						mf('report.notSent', 'Your report could not be sent'),
					);
				} else {
					Alert.success(mf('report.confirm', 'Your report was sent. A human will try to find an appropriate solution.'));
				}
				instance.state.set('');
			},
		);
		instance.state.set('sending');
	},
});
