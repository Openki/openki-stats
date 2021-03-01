import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Template } from 'meteor/templating';

import Alert from '/imports/api/alerts/alert';

import './avatar.html';

Template.avatar.helpers({
	color() {
		const data = Template.currentData();

		// the form sets the color directly
		if (data.color) return data.color;

		// otherwise get the color from a user
		const user = Meteor.users.findOne(data.userId || Meteor.userId());
		const color = user?.avatar?.color;

		if (color === undefined) {
			return false;
		}

		return color;
	},

	class() {
		return Template.currentData().class || '';
	},

	alt() {
		return Meteor.settings.public.avatarLogo.alt;
	},

	avatarLogo() {
		return Meteor.settings.public.avatarLogo.src;
	},
});

Template.avatarForm.onCreated(function () {
	this.tempColor = new ReactiveVar(Meteor.user().avatar?.color || 0);
});

Template.avatarForm.onRendered(() => {
	$('#avatarColorRange').val(Template.instance().tempColor.get());
});

Template.avatarForm.helpers({
	color() {
		return Template.instance().tempColor.get();
	},
});

Template.avatarForm.events({
	'input .js-change-avatar-color'(event, instance) {
		instance.tempColor.set(event.target.value);
	},

	'change .js-change-avatar-color'(event, instance) {
		const newColor = Number(instance.tempColor.get());

		// only update the color if it has changed
		if (Meteor.user().avatar?.color === newColor) {
			return;
		}

		Meteor.call('user.updateAvatarColor', newColor, (err) => {
			if (!err) {
				Alert.success(mf('profile.updated', 'Updated profile'));
			}
		});
	},
});
