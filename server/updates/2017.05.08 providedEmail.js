const UpdatesAvailable = [];

UpdatesAvailable['2017.05.08 providedEmail'] = function () {
	let count = 0;
	Meteor.users.find({ 'emails.0': null }).forEach((user) => {
		// Read email-address if provided
		let providedEmail = false;
		let verified = true; // Assume verified unless there is a flag that says it's not
		const services = user.services;
		if (services) {
			for (const provider of ['facebook', 'google', 'github']) {
				const provided = services[provider];
				if (provided && provided.email) {
					providedEmail = provided.email;
					if (typeof provided.verified_email === 'boolean') {
						verified = provided.verified_email;
					}
				}
			}
		}

		if (providedEmail) {
			try {
				count += Meteor.users.update(
					user._id,
					{ $set: { emails: [{ address: providedEmail, verified }] } },
				);
			} catch (e) {
				// eslint-disable-next-line no-console
				console.log(e);
			}
		}
	});

	return count;
};
