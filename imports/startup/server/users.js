import { Meteor } from 'meteor/meteor';

Meteor.startup(function() {
	Meteor.users.find({}, { fields: { notifications: 1, emails: 1 } }).observe({
		added: Profile.updateAcceptsMessages,
		updated: Profile.updateAcceptsMessages
	});
});