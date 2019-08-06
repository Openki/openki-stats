import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';

import Alert from '/imports/api/alerts/alert';
import Groups from '/imports/api/groups/groups';
import Regions from '/imports/api/regions/regions';

import './feature-group.html';

Template.featureGroup.onCreated(function featureGroupOnCreated() {
	this.subscribe('groupsFind', {});
	this.busy(false);
});

Template.featureGroup.helpers({
	groups: () => Groups.find({}, { sort: { name: 1 } }),
	regionName: () => Regions.findOne(Session.get('region')).name,
	featuredGroup() {
		const groupId = Regions.findOne(Session.get('region')).featuredGroup;
		return Groups.findOne(groupId);
	},
});

Template.featureGroup.events({
	'submit #featureGroup'(event, instance) {
		event.preventDefault();

		const regionId = Session.get('region');
		const groupId = instance.$('#groupToBeFeatured').val();

		instance.busy('saving');
		Meteor.call('region.featureGroup', regionId, groupId, (err) => {
			if (err) {
				Alert.error(
					new Error(err),
					'',
				);
			} else {
				instance.busy(false);
			}
		});
	},

	'click .js-unset-featured-group'(event, instance) {
		instance.busy('deleting');
		Meteor.call('region.unsetFeaturedGroup', Session.get('region'), (err) => {
			if (err) {
				Alert.error(
					new Error(err),
					'',
				);
			} else {
				instance.busy(false);
			}
		});
	},
});
