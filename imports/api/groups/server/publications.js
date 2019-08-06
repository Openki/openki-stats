import { Meteor } from 'meteor/meteor';

import Groups from '../groups';

// eslint-disable-next-line func-names
Meteor.publish('groupsFind', function (originalFilter) {
	const filter = {};
	Object.assign(filter, originalFilter);
	// Filter function on the server doesn't have access to current user ID
	if (filter.own) {
		delete filter.own;
		filter.user = this.userId;
	}
	return Groups.findFilter(filter);
});

Meteor.publish('group', groupId => Groups.find(groupId));
