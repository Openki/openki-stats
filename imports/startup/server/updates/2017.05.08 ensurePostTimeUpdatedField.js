// Legacy: This file is no longer relevant, it is only used for documentation purposes.

/*
import { CourseDiscussions } from '/imports/api/course-discussions/course-discussions';

const UpdatesAvailable = [];

UpdatesAvailable['2017.05.08 ensurePostTimeUpdatedField'] = function () {
	let count = 0;

	// Until now it is not possible to reference a document field during an
	// update. Therefore we have to fetch the results and iterate over them.
	// https://stackoverflow.com/questions/3788256#3792958
	CourseDiscussions.find({ time_updated: null }).forEach((post) => {
		count += 1;
		CourseDiscussions.update(
			{ _id: post._id },
			{ $set: { time_updated: post.time_created } },
		);
	});

	return count;
};
*/
