import { Meteor } from 'meteor/meteor';

import fs from 'fs';
import path from 'path';

// Hack fix: The line https://github.com/gadicc/meteor-messageformat/blob/v2/packages/extract/extract.js#L244
// breaks because the missing ()=>{} I prevent that this code is ever running.

const EXTRACTS_FILE = 'server/extracts.msgfmt~';

/**
 * @param {string} extractsFile
 */
function createExtractsFile(extractsFile) {
	const dir = path.dirname(extractsFile);
	fs.exists(dir, (dirExists) => {
		if (dirExists) {
			const triggerFile = extractsFile.replace(/~$/, '');
			fs.exists(triggerFile, (fileExists) => {
				if (!fileExists) {
					// eslint-disable-next-line @typescript-eslint/no-empty-function
					fs.writeFile(triggerFile, `# Used by ${EXTRACTS_FILE}, do not delete.\n`, () => {});
				}
			});
		} else {
			fs.mkdir(dir, (err) => {
				if (err) throw err;
			});
		}
	});
}

if (Meteor.isServer && Meteor.isDevelopment) {
	const relUp = path.join('..', '..', '..', '..', '..');
	const extractsFile = path.join.apply(null, [relUp].concat(EXTRACTS_FILE.split('/')));

	if (Meteor.isAppTest) {
		Meteor.startup(() => {
			createExtractsFile(extractsFile);
		});
	} else {
		createExtractsFile(extractsFile);
	}
}