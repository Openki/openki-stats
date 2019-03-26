import { Template } from 'meteor/templating';

import './timetable.html';

Template.timetable.helpers({
	position() {
		return "left: "+this.relStart*100+"%; right: "+this.relEnd*100+"%;";
	},
	showDay(moment) {
		return moment.format('dddd, LL');
	},
	showHour(moment) {
		return moment.format('H');
	}
});
