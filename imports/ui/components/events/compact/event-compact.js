import { Template } from 'meteor/templating';

import '/imports/ui/components/groups/list/group-list.js';
import '/imports/ui/components/venues/link/venue-link.js';

import './event-compact.html';

Template.eventCompact.onCreated(function() {
	this.withDate = this.parentInstance().data.withDate;
});

Template.eventCompact.helpers({
	eventCompactClasses() {
		var eventCompactClasses = [];
		if (Template.instance().withDate) {
			eventCompactClasses.push('has-date');
		}
		if (moment().isAfter(this.end)) {
			eventCompactClasses.push('is-past');
		}

		return eventCompactClasses.join(' ');
	},

	withDate() {
		return Template.instance().withDate;
	}
});

Template.eventCompact.events({
	'mouseover .js-venue-link, mouseout .js-venue-link'(e, instance){
		instance.$('.event-compact').toggleClass('elevate-child');
	}
});

Template.eventCompact.rendered = function() {
	this.$('.event-compact').dotdotdot();
};
