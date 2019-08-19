import { Meteor } from 'meteor/meteor';
import UserSearchPrefix from '/imports/utils/user-search-prefix';
import UserPrivilegeUtils from '/imports/utils/user-privilege-utils';

Meteor.publish('user', function (userId) {
	const fields = {
		username: 1,
		acceptsMessages: 1,
	};

	// Admins may see other's privileges
	if (UserPrivilegeUtils.privileged(Meteor.users.findOne(this.userId), 'admin')) {
		fields.privileges = 1;
	}

	return Meteor.users.find(
		{ _id: userId },
		{ fields },
	);
});


// Always publish their own data for logged-in users
// https://github.com/meteor/guide/issues/651
Meteor.publish(null, function () {
	return Meteor.users.find(this.userId);
});

Meteor.publish('userSearch', (search) => {
	check(search, String);
	return UserSearchPrefix(search, { fields: { username: 1 }, limit: 10 });
});
