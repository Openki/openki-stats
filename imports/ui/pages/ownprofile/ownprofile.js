import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Router } from 'meteor/iron:router';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';

import Roles from '/imports/api/roles/roles.js';

import TemplateMixins from '/imports/ui/lib/template-mixins.js';
import { FormfieldErrors } from '/imports/ui/lib/formfield-errors.js';
import Alert from '/imports/api/alerts/alert.js';
import { HasRoleUser } from '/imports/utils/course-role-utils.js';

import '/imports/ui/components/buttons/buttons.js';
import '/imports/ui/components/groups/list/group-list.js';
import '/imports/ui/components/profiles/course-list/profile-course-list.js';
import '/imports/ui/components/profiles/verify-email/verify-email.js';
import '/imports/ui/components/venues/link/venue-link.js';

import './ownprofile.html';

TemplateMixins.Expandible(Template.profile);
Template.profile.onCreated(function() {
	this.busy(false);
	this.editing = new ReactiveVar(false);
	this.changingPass = new ReactiveVar(false);
	this.verifyDelete = new ReactiveVar(false);
	FormfieldErrors(this, {
		'noUserName': {
			text: mf('ownprofile.warning.noUserName', 'Please enter a name for your user.'),
			selectors: ['#editform_username']
		},
		'userExists': {
			text: mf('ownprofile.warning.userExists', 'This username already exists. Please choose another one.'),
			selectors: ['#editform_username']
		},
		'noEmail': {
			text: mf('ownprofile.warning.noEmailProvided', 'Please enter a email.'),
			selectors: ['#editform_email']
		},
		'emailNotValid': {
			text: mf('ownprofile.warning.emailNotValid', 'Your email seems to have an error.'),
			selectors: ['#editform_email']
		},
		'emailExists': {
			text: mf('ownprofile.warning.emailExists', 'This email is already taken.'),
			selectors: ['#editform_email']
		}
	});
});

Template.profile.helpers({
	editing: function() {
		return Template.instance().editing.get();
	},
	changingPass: function() {
		return Template.instance().changingPass.get();
	},

	sending: function() {
		return Template.instance().sending.get();
	},

	verifyDelete: function() {
		return Template.instance().verifyDelete.get();
	},

	groupCount: function() {
		return this.user.groups.count();
	},

	notificationsChecked: function() {
		if (this.user.notifications) return 'checked';
	},

	privacyChecked: function() {
		if (this.user.privacy) return 'checked';
	},

	isVenueEditor: function() {
		return this.user.venues.count() > 0;
	},
	roles: function() {
		return _.clone(Roles).reverse();
	},
	coursesByRole: function(role) {
		var templateData = Template.instance().data;
		var involvedIn = templateData.involvedIn;
		var userID = templateData.user._id;
		var coursesForRole = [];

		involvedIn.forEach(function(course) {
			if(!!HasRoleUser(course.members, role, userID)) {
				coursesForRole.push(course);
			}
		});
		return coursesForRole;
	},
	roleMyList: function() {
		return 'roles.'+this.type+'.myList';
	},
	unsubscribeSuccess: function() {
		return Router.current().params.query.unsubscribed === '';
	},
	unsubscribeError: function() {
		return Router.current().params.query['unsubscribe-error'] === '';
	}
});

Template.profile.events({
	'click .js-profile-info-edit': function(event, instance) {
		Tooltips.hide();
		instance.editing.set(true);
		instance.collapse();
	},

	'click .js-profile-info-cancel': function(event, instance) {
		instance.editing.set(false);
		return false;
	},

	'click .js-change-pwd-btn': function(event, instance) {
		instance.changingPass.set(true);
		instance.collapse();
	},

	'click .js-change-pwd-cancel': function(event, instance) {
		instance.changingPass.set(false);
	},

	'click .js-expand': function(event, instance) {
		instance.changingPass.set(false);
	},

	'click .js-profile-delete-confirm-btn': function(event, instance) {
		instance.busy('deleting');
		Meteor.call('user.remove', function() {
			instance.busy(false);
			Alert.success(mf('profile.deleted', 'Your account has been deleted'));
		});
		instance.collapse(); // Wait for server to log us out.
	},

	'submit .profile-info-edit': function(event, instance) {
		event.preventDefault();
		Meteor.call('user.updateData',
			document.getElementById('editform_username').value,
			document.getElementById('editform_email').value,
			instance.$('.js-notifications').prop("checked"),
			function(err) {
				if (err) {
					instance.setError(err.error);
				} else {
					Alert.success(mf('profile.updated', 'Updated profile'));
					instance.editing.set(false);
				}
			}
		);
	},

	'submit #changePwd': function(event, instance) {
		event.preventDefault();
		var old = document.getElementById('oldpassword').value;
		var pass = document.getElementById('newpassword').value;
		if (pass !== "") {
			if (pass !== document.getElementById('newpassword_confirm').value) {
				Alert.warning(mf('profile.passwordMismatch', "Sorry, Your new passwords don't match"));
				return;
			} else {
				var minLength = 5; // We've got _some_ standards
				if (pass.length < minLength) {
					Alert.warning(mf('profile.passwordShort', 'Your desired password is too short, sorry.'));
					return;
				}
				Accounts.changePassword(old, pass, function(err) {
					if (err) {
						Alert.error(err, 'Failed to change your password');
					} else {
						Alert.success(mf('profile.passwordChangedSuccess', 'You have changed your password successfully.'));
						instance.changingPass.set(false);
					}
				});
			}
		}
	},
});
