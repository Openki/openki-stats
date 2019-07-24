/* jshint -W024 */
/* jshint expr:true */

import { assert } from 'chai';
import HtmlTools from '/imports/utils/html-tools';
import sanitizeHtml from 'sanitize-html';

describe('Converting Text to HTML', () => {
	it('turns linebreak into break-tag', () => {
		assert.include(HtmlTools.plainToHtml('a\nb'), '<br');
	});
	it('escapes angle brackets', () => {
		assert.notInclude(HtmlTools.plainToHtml('<><'), '<');
	});
	it('hyperlinks links', () => {
		const url = 'http://openki.net';
		const html = HtmlTools.plainToHtml(url);
		assert.include(html, 'href');
		assert.include(html, url);
	});
	it('hyperlinks valid', () => {
		const html = HtmlTools.plainToHtml('http://openki.net');
		const options = {
			allowedTags: ['a'],
			allowedAttributes: {
				a: ['href'],
			},
		};
		const sanehtml = sanitizeHtml(html, options);
		assert.include(sanehtml, 'href');
	});
	it('hyperlinks ampersand url', () => {
		const url = 'http://openki.net/?&';
		const html = HtmlTools.plainToHtml(url);
		assert.include(html, '&amp;');
	});
});
