import { Meteor } from 'meteor/meteor';
import { Router } from 'meteor/iron:router';
import { assert } from 'chai';
import { jQuery } from 'meteor/jquery';

import { subscriptionsReady, waitFor } from '/imports/ClientUtils.app-test';

if (Meteor.isClient) {
	describe('Create course in group', function () {
		this.timeout(30000);
		const randomTitle = `TEST${1000 + Math.floor(Math.random() * 9000)}`;
		it('saves course for group', () => {
			Router.go('/group/fd3a8d98d4');
			const haveEditfield = () => {
				assert(
					jQuery('#editform_name').length > 0,
					'New course edit field present',
				);
			};
			const findExpectedFormTitle = () => {
				// assert group name is mentioned in course creation form title
				const expectedTitle = /Kommunikationsguerilla/;
				const actualTitle = jQuery('form h2').text();
				assert.match(
					actualTitle, expectedTitle,
					'Form title must mention group',
				);
			};
			return subscriptionsReady()
				.then(waitFor(haveEditfield))
				.then(waitFor(findExpectedFormTitle))
				.then(() => new Promise((done, reject) => {
					Meteor.loginWithPassword('Seee', 'greg', (err) => {
						if (err) {
							reject(err);
						} else {
							done();
						}
					});
				}))
				.then(() => {
				// Create the course
					jQuery('#editform_name').val(randomTitle);
					jQuery('.region_select').val('9JyFCoKWkxnf8LWPh'); // Testistan
					jQuery('.js-course-edit-save').click();

				// We should be redirected to the created course
				})
				.then(waitFor(() => {
					assert(
						jQuery('.course-details').length > 0,
						'Details of the new course are shown',
					);
				}))
				.then(waitFor(() => {
					assert.match(
						jQuery('.js-group-label').text(), /SKG/,
						'The course is in the group it was created in',
					);
				}));
		});
	});
}
