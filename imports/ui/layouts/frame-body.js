import '/imports/ui/components/alerts/alerts';

import './frame-body.html';

/* Workaround to prevent iron-router from messing with server-side downloads
 *
 * Class 'js-download' must be added to those links.
 */
Template.frameLayout.events({
	'click .js-download': function (event) {
		event.stopPropagation();
	},
});
