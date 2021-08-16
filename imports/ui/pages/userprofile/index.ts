import { Tooltips } from 'meteor/lookback:tooltips';
import { Router } from 'meteor/iron:router';
import { Meteor } from 'meteor/meteor';
import { mf } from 'meteor/msgfmt:core';
import { ReactiveDict } from 'meteor/reactive-dict';
import { Template as TemplateAny, TemplateStaticTyped } from 'meteor/templating';

import * as Alert from '/imports/api/alerts/alert';
import { CourseModel, Courses } from '/imports/api/courses/courses';
import { GroupEntity } from '/imports/api/groups/groups';
import * as GroupsMethods from '/imports/api/groups/methods';
import { UserModel } from '/imports/api/users/users';
import * as usersMethods from '/imports/api/users/methods';

import { PleaseLogin } from '/imports/ui/lib/please-login';

import * as UserPrivilegeUtils from '/imports/utils/user-privilege-utils';
import { PublicSettings } from '/imports/utils/PublicSettings';
import { checkContribution } from '/imports/utils/checkContribution';

import '/imports/ui/components/profiles/course-list/profile-course-list';
import '/imports/ui/components/profiles/verify-email';
import '/imports/ui/components/avatar/avatar';
import '/imports/ui/components/send-message/send-message';

import './template.html';

interface UserProfilePageData {
	user: UserModel;
	alterPrivileges: boolean;
	privileges: string[];
	inviteGroups: Mongo.Cursor<GroupEntity>;
	showPrivileges: boolean;
}

const Template = TemplateAny as TemplateStaticTyped<
	UserProfilePageData,
	'userprofilePage',
	{ state: ReactiveDict<{ verifyUserDelete: boolean }>; coursesCreatedBy(): CourseModel[] }
>;

const template = Template.userprofilePage;

template.onCreated(function () {
	this.busy(false);
	const userId = Template.instance().data.user._id;

	this.state = new ReactiveDict(undefined, { verifyUserDelete: false });

	this.subscribe('Courses.findFilter', { createdby: userId });
	this.coursesCreatedBy = () => {
		return Courses.find({ createdby: userId }).fetch();
	};
});

template.helpers({
	/**
	 * whether userprofile is for the logged-in user
	 */
	ownuser() {
		return Template.currentData().user._id === Meteor.userId();
	},

	hasContributed() {
		return checkContribution(Template.currentData().user.contribution);
	},

	contributedIcon() {
		return PublicSettings.contribution?.icon;
	},

	acceptsPrivateMessages() {
		return (
			Template.currentData().user.acceptsPrivateMessages || UserPrivilegeUtils.privilegedTo('admin')
		);
	},

	groupMember(group: GroupEntity, user: UserModel) {
		return !!(user && group?.members?.includes(user._id));
	},

	showInviteGroups() {
		const data = Template.currentData();
		return data.inviteGroups?.count && data.inviteGroups.count() > 0;
	},

	showSettings() {
		const data = Template.currentData();
		return data.showPrivileges || (data.inviteGroups?.count && data.inviteGroups.count() > 0);
	},
	numberOfCoursesAffectedByDelete() {
		return Template.instance().coursesCreatedBy().length;
	},
	numberOfInterestedAffectedByDelete() {
		return Template.instance()
			.coursesCreatedBy()
			.reduce((accumulator, currentValue) => accumulator + currentValue.interested, 0);
	},
	numberOfFutureEventsAffectedByDelete() {
		return Template.instance()
			.coursesCreatedBy()
			.reduce((accumulator, currentValue) => accumulator + currentValue.futureEvents, 0);
	},
});

template.events({
	async 'click .js-has-contributed'() {
		try {
			await usersMethods.setHasContributed(Template.currentData().user._id);

			Alert.success(mf('profile.setHasContributed.alert', 'User has contributed'));
		} catch (err) {
			Alert.serverError(
				err,
				mf('profile.setHasContributed.error', 'Unable to set user has contributed.'),
			);
		}
	},

	async 'click .js-unset-has-contributed'() {
		try {
			await usersMethods.unsetHasContributed(Template.currentData().user._id);

			Alert.success(mf('profile.unsetHasContributed.alert', 'Unset user has contributed'));
		} catch (err) {
			Alert.serverError(
				err,
				mf('profile.unsetHasContributed.error', 'Unable to unset user has contributed.'),
			);
		}
	},

	async 'click .js-give-admin'() {
		try {
			await usersMethods.addPrivilege(Template.currentData().user._id, 'admin');

			Alert.success(mf('privilege.addedAdmin', 'Granted admin privilege'));
		} catch (err) {
			Alert.serverError(err, mf('privilege.addedAdmin.error', 'Unable to add privilege'));
		}
	},

	async 'click .js-remove-privilege-btn'(event, instance) {
		const priv = instance.$(event.target as any).data('priv');
		try {
			await usersMethods.removePrivilege(Template.currentData().user._id, priv);

			Alert.success(mf('privilege.removed', 'Removed privilege'));
		} catch (err) {
			Alert.serverError(err, mf('privilege.removed.error', 'Unable to remove privilege'));
		}
	},

	async 'click .js-draft-into-group'(this: GroupEntity) {
		const groupId = this._id;
		const { name } = this;
		const userId = Template.parentData().user._id;

		try {
			await GroupsMethods.updateMembership(userId, groupId, true);

			Alert.success(mf('profile.group.drafted', { NAME: name }, 'Added to group {NAME}'));
		} catch (err) {
			Alert.serverError(err, mf('profile.group.drafted.error', 'Unable to draft user into group'));
		}
	},

	async 'click .js-group-expel-btn'(this: GroupEntity) {
		Tooltips.hide();
		const groupId = this._id;
		const { name } = this;
		const userId = Template.parentData().user._id;

		try {
			await GroupsMethods.updateMembership(userId, groupId, false);

			Alert.success(mf('profile.group.expelled', { NAME: name }, 'Expelled from group {NAME}'));
		} catch (err) {
			Alert.serverError(err, mf('profile.group.expelled.error', 'Unable to expel user from group'));
		}
	},

	'click .js-verify-user-delete-collapse'() {
		const instance = Template.instance();
		instance.state.set('verifyUserDelete', !instance.state.get('verifyUserDelete'));
	},

	'click .js-verify-user-delete-confirm'(_event, instance) {
		if (PleaseLogin()) {
			return;
		}

		instance.busy('deleting');

		const reason = instance.$('.js-reason').val() as string;

		if (reason.length < 4) {
			Alert.error(mf('profile.admin.remove.reason.longertext', 'longer text please'));
			instance.busy(false);
			return;
		}

		const userId = Template.parentData().user._id;

		try {
			Alert.success(mf('profile.account.deleted', 'The account has been deleted'));
			Router.go('users');
		} finally {
			instance.busy(false);
		}
		usersMethods.adminRemove(userId, reason, { courses: true });
	},
});
