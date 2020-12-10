import Events from '/imports/api/events/events';

const UpdatesAvailable = [];

// The location field becomes an object
UpdatesAvailable.renameLocationName = function () {
	Events.find({}).fetch().forEach((originalEvent) => {
		const event = { ...originalEvent };
		if (typeof event.location === 'string') {
			event.location = { name: event.location };

			Events.update(event._id, event);
		}
	});
};
