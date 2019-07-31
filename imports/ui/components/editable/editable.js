import { Template } from 'meteor/templating';

import '/imports/ui/components/buttons/buttons';

import './editable.html';

[Template.editable, Template.editableTextarea].forEach((template) => {
	// eslint-disable-next-line func-names
	template.onCreated(function () {
		// This reeks
		const data = Template.currentData();
		if (!data) throw new Error('Editable got empty data');
		this.state = data.connect(this);
	});

	// eslint-disable-next-line func-names
	template.onRendered(function () {
		const instance = this;
		const editable = this.$('.js-editable');
		let initialized = false;
		let changedByUser = false;

		// eslint-disable-next-line func-names
		instance.getEdited = function () {
			if (!instance.state || !instance.state.changed.get()) return false;
			return instance.state.simple ? editable.text().trim() : editable.html().trim();
		};

		// eslint-disable-next-line func-names
		instance.reset = function () {
			const text = instance.state.text();

			if (instance.state.simple) {
				editable.text(text);
			} else {
				editable.html(text);
			}

			// HACK remove placeholder when there is content
			// We should be using setContent() anyway, but it's not defined?!
			if (text && text.length > 0) editable.removeClass('medium-editor-placeholder');
		};

		// Automatically replace contents when text changes
		// When the user has already made changes, we don't update the field. This
		// protects the user's changes but at the same time it allows overwriting
		// other people's changes.
		instance.autorun(() => {
			if (!changedByUser || !initialized) {
				instance.reset();
				initialized = true;
			}
		});

		// eslint-disable-next-line func-names
		instance.store = function () {
			instance.state.store(instance.getEdited());
			instance.state.changed.set(false);
			changedByUser = false;
		};

		const options = {
			placeholder: {
				hideOnClick: false,
				text: instance.state.placeholderText,
			},
			anchor: {
				linkValidation: true,
				placeholderText: mf('editable.link.placeholder', 'Paste link here...'),
			},
			autoLink: true,
			buttonLabels: 'fontawesome',
		};
		if (instance.state.simple) {
			options.disableReturn = true;
			options.toolbar = false;
		}

		// Initialize the editor interface
		instance.editor = new MediumEditor(editable, options);

		// Register when the field is being edited
		editable.on('input', () => {
			changedByUser = true;
			instance.state.changed.set(true);
		});
	});

	template.helpers({
		showControls() {
			const instance = Template.instance();
			return instance.state.showControls && instance.state.changed.get();
		},

		wrapAttrs() {
			const instance = Template.instance();
			return instance.state.simple ? 'editable-wrap-simple' : 'editable-wrap-rich';
		},

		editableAttrs() {
			const instance = Template.instance();
			return instance.state.changed.get() ? 'editable-changed' : '';
		},
	});

	template.events({
		'click .js-editable-save'(event, instance) {
			event.preventDefault();
			instance.store();
		},

		'click .js-editable-cancel'(event, instance) {
			event.preventDefault();
			instance.reset();
			instance.state.changed.set(false);
		},

		'click .js-editable-edit'(event, instance) {
			instance.$('.js-editable').focus();

			// Moving the cursor to the end of the editable element?
			// http://stackoverflow.com/questions/1125292/how-to-move-cursor-to-end-of-contenteditable-entity
			const selectEnd = function (el) {
				const range = document.createRange();
				range.selectNodeContents(el);
				range.collapse(false);
				const selection = window.getSelection();
				selection.removeAllRanges();
				selection.addRange(range);
			};
			selectEnd(instance.$('.js-editable')[0]);
		},
	});
});
