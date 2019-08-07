import Events from '/imports/api/events/events';

const UpdatesAvailable = [];

UpdatesAvailable.ensureEventGroupOrganizersField = function () {
	return Events.update(
		{ groupOrganizers: null },
		{ $set: { groupOrganizers: [] } },
		{ multi: true },
	);
};
