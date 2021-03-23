import { Meteor } from 'meteor/meteor';
import { assert } from 'chai';
import { Accounts } from 'meteor/accounts-base';
import { MeteorAsync, AccountsAsync } from '/imports/utils/promisify';
import UserSearchPrefix from '/imports/utils/user-search-prefix';


const createDummy = function () {
	return `test${Date.now()}${Math.random(1000000)}`;
};

if (Meteor.isClient) {
	describe('Profile', function () {
		this.timeout(30000);

		it('accepts login', async () => {
			await MeteorAsync.loginWithPasswordAsync('Seee', 'greg');
		});

		describe('User creation', () => {
			it('updates the acceptsMessage flag', () => new Promise((resolve) => {
				const dummy = createDummy();
				Accounts.createUser({
					username: dummy,
					email: `${dummy}@openki.example`,
					profile: { name: dummy },
					password: 'hunter2',
				}, (error) => {
					assert.isNotOk(error, 'not expecting creation errors');

					// Rely on the test runner to declare the test failed when it
					// never resolves. There is no assert(). Improvements welcome.
					Meteor.users.find({ username: dummy, acceptsPrivateMessages: true }).observe({
						added: resolve,
					});
				});
			}));
		});

		describe('User modification', function () {
			this.timeout(30000);
			const oldDummy = createDummy();
			const newDummy = createDummy();
			it('changes the username', async () => {
				await AccountsAsync.createUserAsync({
					username: oldDummy,
					email: `${oldDummy}@openki.example`,
					profile: { name: oldDummy },
					password: 'hunter2',
				});
				MeteorAsync.loginWithPasswordAsync(oldDummy, 'hunter2')
					.then(() => new Promise((resolve) => {
						Meteor.call('user.updateUsername', newDummy, (err) => {
							if (err) {
								assert.isNotOk(err, 'not expecting username-change errors');
							}

							Meteor.users.find({ username: newDummy }).observe({
								added: () => {
									resolve();
								},
							});
						});
					})).then(() => {
						// check if username has changed to the correct string
						const user = Meteor.user();
						assert.strictEqual(newDummy, user.username, 'username was changed successfully');
					});
			});

			it('does not allow setting duplicate email', async () => {
				try {
					await MeteorAsync.callAsync('user.updateEmail', 'greg@openki.example');
				} catch (err) {
					assert.isOk(err);
				}
			});
		});
	});

	describe('User search', () => {
		it('finds none for nonexisting name', async () => {
			// How could I check whether nothing was found
			// for a non-existing user? I'm going to watch the Users
			// collection for additions between the subscription for a
			// non-existing user and the conclusion of this subscription.
			/** @type {boolean} */
			let added;

			// This will track addition of users
			const cursor = Meteor.users.find();
			cursor.observe({ added: () => { added = true; } });

			// Reset the flag before starting the subscription
			added = false;

			const sub = await MeteorAsync.subscribeAsync('userSearch', 'SOMEUSERTHATDOESNOTEXIST');
			sub.stop();
			assert.isFalse(added);
		});

		it('finds some user', async () => {
			const someUser = 'gregen';

			const sub = await MeteorAsync.subscribeAsync('userSearch', someUser);
			sub.stop();

			const cursor = UserSearchPrefix(someUser);
			assert(cursor.count() > 0);
		});

		it('finds Chnöde when searching for "Chn"', async () => {
			const sub = await MeteorAsync.subscribeAsync('userSearch', 'Chn');
			sub.stop();

			const cursor = UserSearchPrefix('Chnöde', {});
			assert(cursor.count() > 0);
		});
	});
}
