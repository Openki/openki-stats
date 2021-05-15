import { DocHead } from 'meteor/kadira:dochead';
import { Meteor } from 'meteor/meteor';

function getSiteTitlePrefix() {
	return `${Meteor.settings.public.siteName}  - `;
}

function getSiteDefaultImage() {
	return Meteor.absoluteUrl(`logo/${Meteor.settings.public.ogLogo?.src || 'openki_logo_2018.png'}`);
}

export function removeAll() {
	DocHead.removeDocHeadAddedTags();
}

/**
 * @param {string} title
 */
export function setCommonTags(title, description = '') {
	document.title = getSiteTitlePrefix() + title;

	DocHead.addMeta({ property: 'og:type', content: 'website' });
	DocHead.addMeta({ property: 'og:title', content: document.title });
	DocHead.addMeta({ property: 'og:image', content: getSiteDefaultImage() });

	DocHead.addMeta({ name: 'twitter:card', content: 'summary' });
	DocHead.addMeta({ name: 'twitter:title', content: document.title });
	DocHead.addMeta({ name: 'twitter:image', content: getSiteDefaultImage() });

	if (description) {
		DocHead.addMeta({ property: 'og:description', content: description });
		DocHead.addMeta({ name: 'twitter:description', content: description });
	}
}
