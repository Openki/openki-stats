import { Blaze } from 'meteor/blaze';
import { Session } from 'meteor/session';
import { ReactiveVar } from 'meteor/reactive-var';
import { Random } from 'meteor/random';
import { Mongo } from 'meteor/mongo';
import { TemplateStaticTyped } from 'meteor/templating';

import * as Alert from '/imports/api/alerts/alert';
import { Spacebars } from 'meteor/spacebars';

/** Setup expand/collaps logic for a template
 *
 * This mixin extends the given template with an `expanded` helper and
 * two click handlers `js-expand` and `js-close`. Only one expandible template
 * can be open at a time, so don't nest them.
 *
 * @example
 * <template name="pushIt">
 *   <div>
 *     {{#if expanded}}
 *       All this content hiding here.
 *       Now close it again!
 *       <button type="button" class="js-collapse">CLOSE IT!</button>
 *     {{else}}
 *       Press the button!
 *       <button type="button" class="js-expand">OPEN IT!</button>
 *     {{/if}}
 *   </div>
 * </template>
 */
export function Expandible<N extends string, D, T extends Record<string, unknown>>(
	TemplateBase: TemplateStaticTyped<N, D, T>,
	templateName: N,
) {
	const Template = TemplateBase as TemplateStaticTyped<
		N,
		D,
		T & { _expander: string; collapse: () => void }
	>;

	const template = Template[templateName];

	template.onCreated(function () {
		const instance = this;
		const expander = Random.id(); // Token to keep track of which Expandible is open
		instance._expander = expander; // Read by event handlers
		instance.collapse = () => {
			if (Session.equals('verify', expander)) {
				Session.set('verify', false);
			}
		};
	});
	template.helpers({
		expanded() {
			const instance = Template.instance();
			return Session.equals('verify', instance._expander);
		},
	});
	template.events({
		'click .js-expand'(event, instance) {
			event.stopPropagation();
			Session.set('verify', instance._expander);
		},
		'click .js-collapse'() {
			Session.set('verify', false);
		},
	});

	return Template;
}

export interface MultiExpandibleTemplateProps {
	expanded: ReactiveVar<boolean>;
}

/** Like Expandible but multiple expandibles can be open at the same time. */
export function MultiExpandible<N extends string, D, T extends Record<string, unknown>>(
	TemplateBase: TemplateStaticTyped<N, D, T>,
	templateName: N,
) {
	const Template = TemplateBase as TemplateStaticTyped<
		N,
		D,
		T & { expanded: ReactiveVar<boolean> }
	>;

	const template = Template[templateName];

	let dx = -1000;
	let dy = -1000;
	const nomove = function (e: any) {
		return Math.abs(dx - e.screenX) < 5 && Math.abs(dy - e.screenY) < 5;
	};

	template.onCreated(function () {
		const instance = this as unknown as MultiExpandibleTemplateProps;
		instance.expanded = new ReactiveVar(false);
	});
	template.helpers({
		expanded() {
			const instance = Template.instance() as unknown as MultiExpandibleTemplateProps;
			return instance.expanded.get();
		},
	});
	template.events({
		mousedown(event: any) {
			dx = event.screenX;
			dy = event.screenY;
		},
		'mouseup .js-expand'(event: any, instance: MultiExpandibleTemplateProps) {
			if (nomove(event)) {
				instance.expanded.set(true);
			}
		},
		'mouseup .js-collapse'(event: any, instance: MultiExpandibleTemplateProps) {
			if (nomove(event)) {
				instance.expanded.set(false);
			}
		},
	});

	return template;
}

export interface FormfieldErrorsMapping {
	[name: string]: { text: () => string; field: string };
}

/** Manage errors for a form template
 *
 * This mixin keeps a list of errors. It requires you to pass in
 * a mapping of error-key to error message text and affected field. Example:
 *```
 *   const mapping = {
 *     'wrongPassword': {
 *     text: () => "Your password is bad and you should feel bad.",
 *     field: "password" },
 *     'badUsername': {
 *        text: () => "We don't like your username around here.",
 *        field: "username" }
 *   };
 *   TemplateMixins.FormfieldErrors(Template, 'malcontentLogin', mapping);
 *```
 * Note how `text` is a function so that you can pass in an i18n() call
 * that will only be evaluated once needed. (Not for performance but
 * because the visitor could change language.)
 *
 * You can then add errors to be displayed with errors.add(key) and reset
 * the list of errors with errors.reset(). For example:
 *```
 *    instance.errors.reset();
 *     if (password != "hunter2") {
 *         instance.errors.add("wrongPassword")
 *    }
 *```
 * Use the template helpers `{{errorClass}}` and `{{errorMessage}}` to show the
 * collected errors. You have to provide the helpers with the field name
 * you-re interested in. Like so:
 *```
 *    <label class="{{errorClass 'password'}}">
 *       <input type='password'>
 *       {{errorMessage 'password'}}
 *    </label>
 *```
 * `{{errorClass}}` just outputs the string `"has-error"` if that field has an
 * error whereas `{{errorMessage}}` will output a `<span>` with the error message.
 *
 * @param template The template to extend
 * @param mapping The mapping of error-keys to message objects
 */
export function FormfieldErrors<N extends string, D, T extends Record<string, unknown>>(
	TemplateBase: TemplateStaticTyped<N, D, T>,
	templateName: N,
	mapping?: FormfieldErrorsMapping,
) {
	const Template = TemplateBase as TemplateStaticTyped<
		N,
		D,
		T & {
			errorMapping: FormfieldErrorsMapping;
			errors: {
				messages: Mongo.Collection<{ key: string; field: string }>;
				present(): boolean;
				add(key: string): void;
				reset(): void;
			};
		}
	>;

	const template = Template[templateName];

	template.onCreated(function () {
		const instance = this;
		const messages = new Mongo.Collection<{ key: string; field: string }>(null); // Local collection for in-memory storage
		instance.errors = {
			messages,
			present() {
				return Boolean(messages.findOne({}));
			},
			add(key) {
				const message = (instance.errorMapping || mapping)[key];
				if (!message) {
					Alert.error('Unmapped error');
					return;
				}

				this.messages.insert({ key, field: message.field });
			},
			reset() {
				this.messages.remove({});
			},
		};
	});

	template.helpers({
		errorClass(field: string) {
			if (Template.instance().errors.messages.findOne({ field })) {
				return 'has-error';
			}
			return false;
		},
		errorMessage(field: string) {
			const instance = Template.instance();
			const message = instance.errors.messages.findOne({ field });
			if (!message) {
				return false;
			}

			const text = (instance.errorMapping || mapping)[message.key].text();
			return Spacebars.SafeString(`<span class="form-text">${Blaze._escape(text)}</span>`);
		},
	});

	return Template;
}
