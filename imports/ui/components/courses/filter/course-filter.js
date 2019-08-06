import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';

import Roles from '/imports/api/roles/roles';

import FilterPreview from '/imports/ui/lib/filter-preview';
import ScssVars from '/imports/ui/lib/scss-vars';
import StringTools from '/imports/utils/string-tools';

import '/imports/ui/components/courses/categories/course-categories';

import './course-filter.html';

// eslint-disable-next-line func-names
Template.filter.onCreated(function () {
	this.stateFilters = [
		{
			name: 'proposal',
			cssClass: 'is-proposal',
			label: mf('filterCaptions.is-proposal', 'Proposal'),
			title: mf('filterCaptions.showProposal', 'Show all proposed courses'),
		},
		{
			name: 'upcomingEvent',
			cssClass: 'has-upcoming-events',
			label: mf('filterCaptions.upcoming.label', 'Upcoming'),
			title: mf('filterCaptions.upcoming.title', 'Show all courses with upcoming events'),
		},
		{
			name: 'resting',
			cssClass: 'has-past-events',
			label: mf('filterCaptions.resting.label', 'Resting'),
			title: mf('filterCaptions.resting.title', 'Courses with passed but without upcoming events'),
		},
	];

	this.visibleFilters = ['state', 'needsRole', 'categories'];
});

Template.filter.helpers({
	filterClasses() {
		const classes = [];
		const instance = Template.instance();
		const parentInstance = instance.parentInstance();

		// check if one of the filters indicated as filters is active
		let activeVisibleFilter = false;
		instance.visibleFilters.forEach((filter) => {
			if (parentInstance.filter.get(filter)) activeVisibleFilter = true;
		});

		if (activeVisibleFilter) classes.push('active');

		if (parentInstance.showingFilters.get()) classes.push('open');

		return classes.join(' ');
	},

	stateFilters() {
		return Template.instance().stateFilters;
	},

	stateFilterClasses(stateFilter) {
		const classes = [];
		const parentInstance = Template.instance().parentInstance();

		classes.push(stateFilter.cssClass);

		if (parentInstance.filter.get('state') === stateFilter.name) {
			classes.push('active');
		}

		return classes.join(' ');
	},

	showingFilters() {
		return Template.instance().parentInstance().showingFilters.get();
	},
});

Template.filter.events({
	'click #toggleFilters'(event, instance) {
		const parentInstance = instance.parentInstance();
		const { showingFilters } = parentInstance;

		if (showingFilters.get()) {
			instance.visibleFilters.forEach((filter) => {
				parentInstance.filter.disable(filter);
			});

			parentInstance.filter.done();
			parentInstance.updateUrl();
			showingFilters.set(false);
		} else {
			showingFilters.set(true);
		}
	},

	'click .js-filter-caption'(event, instance) {
		const parentInstance = instance.parentInstance();
		const filterName = instance.$(event.currentTarget).data('filter-name');

		parentInstance.filter
			.toggle('state', filterName)
			.done();

		parentInstance.updateUrl();
	},

	'mouseover .js-filter-caption, mouseout .js-filter-caption'(event, instance) {
		const name = instance.$(event.currentTarget).data('filter-name');
		const state = _.findWhere(instance.stateFilters, { name });

		if (!instance.parentInstance().filter.get('state')) {
			FilterPreview({
				property: 'state',
				id: state.cssClass,
				activate: event.type === 'mouseover',
			});
		}
	},
});

// eslint-disable-next-line func-names
Template.additionalFilters.onCreated(function () {
	this.findInstance = this.parentInstance(2);

	this.roles = [
		{
			name: 'team',
			label: mf('find.needsOrganizer', 'Looking for an organizer'),
		},
		{
			name: 'mentor',
			label: mf('find.needsMentor', 'Looking for a mentor'),
		},
		{
			name: 'host',
			label: mf('find.needsHost', 'Looking for a host'),
		},
	].map((role) => {
		// add icon from Roles collection to role object
		/* eslint-disable-next-line no-param-reassign */
		role.icon = _.findWhere(Roles, { type: role.name }).icon;

		return role;
	});
});

// eslint-disable-next-line func-names
Template.additionalFilters.onRendered(function () {
	const instance = this;
	const catSelect = instance.$('.filter-categories-select');

	catSelect.on('show.bs.dropdown hide.bs.dropdown', () => {
		instance.$('.dropdown-toggle').fadeToggle(200);
	});

	catSelect.on('shown.bs.dropdown', () => {
		instance.$('.js-search-categories').select();
	});
});

Template.additionalFilters.helpers({
	roles() {
		return Template.instance().roles;
	},

	roleClasses(role) {
		const classes = [];
		const { findInstance } = Template.instance();
		const needsRoleFilter = findInstance.filter.get('needsRole');

		if (needsRoleFilter && needsRoleFilter.indexOf(role.name) >= 0) {
			classes.push('active');
		}

		return classes.join(' ');
	},

	categories() {
		const { findInstance } = Template.instance();
		return findInstance.filter.get('categories');
	},

	availableCategories() {
		const { findInstance } = Template.instance();
		return Object.keys(findInstance.categorySearchResults.get());
	},

	availableSubcategories(mainCategory) {
		const { findInstance } = Template.instance();
		return findInstance.categorySearchResults.get()[mainCategory];
	},

	categoryNameMarked() {
		Session.get('locale'); // Reactive dependency
		const search = Template.instance().findInstance.categorySearch.get();

		return StringTools.markedName(search, mf(`category.${this}`));
	},

	isMobile() {
		return Session.get('viewportWidth') <= ScssVars.screenXS;
	},
});

Template.additionalFilters.events({
	'click .js-filter-course-role'(e, instance) {
		const { findInstance } = instance;
		const filterName = instance.$(e.currentTarget).data('filter-name');

		findInstance.filter
			.toggle('needsRole', filterName)
			.done();

		findInstance.updateUrl();
	},

	'mouseover .js-filter-course-role, mouseout .js-filter-course-role'(event, instance) {
		FilterPreview({
			property: 'role',
			id: instance.$(event.currentTarget).data('filter-name'),
			activate: event.type === 'mouseover',
		});
	},

	'mouseout .js-category-selection-label, mouseover .js-category-selection-label'(event) {
		FilterPreview({
			property: 'category',
			id: this,
			activate: event.type === 'mouseover',
		});
	},

	'keyup .js-search-categories'(e, instance) {
		const query = instance.$('.js-search-categories').val();

		instance.findInstance.updateCategorySearchDebounced(query);
	},

	'click .js-search-categories'(e, instance) {
		instance.$('.dropdown-toggle').dropdown('toggle');
	},

	'click .js-toggle-subcategories'(event, instance) {
		event.stopPropagation();
		instance.$(`.js-sub-category.${this}`).toggle();
		instance.$(`.js-toggle-subcategories.${this} span`)
			.toggleClass('fa-angle-down fa-angle-up');
	},

	'click .js-category-selection-label'(e, instance) {
		e.preventDefault();
		const { findInstance } = instance;

		// Add to filter
		findInstance.filter.add('categories', `${this}`).done();

		// Clear search field
		instance.$('.js-search-categories').val('');

		findInstance.updateCategorySearch('');
		findInstance.updateUrl();

		window.scrollTo(0, 0);
	},

	'click .js-remove-category-btn'(e, instance) {
		const { findInstance } = instance;

		findInstance.filter.remove('categories', `${this}`).done();
		findInstance.updateUrl();
	},
});
