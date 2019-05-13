import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Template } from 'meteor/templating';

import Alert from '/imports/api/alerts/alert.js';
import UserPrivilegeUtils from '/imports/utils/user-privilege-utils.js';

import '/imports/ui/components/participant/contact/participant-contact.js';
import '/imports/ui/components/profile-link/profile-link.js';

import './event-participants.html';

Template.eventParticipants.onCreated(function() {
	this.increaseBy = 10;
	this.participantsDisplayLimit = new ReactiveVar(this.increaseBy);
});

Template.eventParticipants.helpers({
	howManyEnrolled() {
		return (this.participants && this.participants.length) || 0;
	},

	sortedParticipants() {
		const participants = this.participants;
		const userId = Meteor.userId();
		if (userId && participants.includes(userId)) {
			const userArrayPosition = participants.indexOf(userId);
			//remove current user form array and readd him at index 0
			participants.splice(userArrayPosition, 1); //remove
			participants.splice(0, 0, userId); //readd
		}
		return participants.slice(0, Template.instance().participantsDisplayLimit.get());
	},

	limited() {
		const participantsDisplayLimit = Template.instance().participantsDisplayLimit.get();
		return participantsDisplayLimit && this.participants.length > participantsDisplayLimit;
	}

});

Template.eventParticipants.events({
	'click .js-show-more-participants': function(event, instance) {
		const participantsDisplayLimit = instance.participantsDisplayLimit;
		participantsDisplayLimit.set(participantsDisplayLimit.get() + instance.increaseBy);
	}
});

Template.eventParticipant.onCreated(function() {
	const instance = this;
	const eventId = this.data.event._id;
});

Template.eventParticipant.helpers({
	ownUserParticipantClass() {
		if (this.participant === Meteor.userId()) return 'is-own-user';
	},
});
