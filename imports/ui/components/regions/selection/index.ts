import { Session } from 'meteor/session';
import { ReactiveDict } from 'meteor/reactive-dict';
import { Router } from 'meteor/iron:router';
import { Template as TemplateAny, TemplateStaticTyped } from 'meteor/templating';
import { Meteor } from 'meteor/meteor';

import { RegionEntity, RegionModel, Regions } from '/imports/api/regions/regions';

import { FilterPreview } from '/imports/ui/lib/filter-preview';

import * as RegionSelection from '/imports/utils/region-selection';
import * as StringTools from '/imports/utils/string-tools';
import { PublicSettings } from '/imports/utils/PublicSettings';
import { getLocalizedValue } from '/imports/utils/getLocalizedValue';

import './template.html';
import './styles.scss';

{
	const Template = TemplateAny as TemplateStaticTyped<
		'regionSelectionWrap',
		Record<string, unknown>,
		{ state: ReactiveDict<{ searchingRegions: boolean }> }
	>;

	const template = Template.regionSelectionWrap;

	template.onCreated(function () {
		this.subscribe('Regions');
		this.state = new ReactiveDict();
		this.state.setDefault('searchingRegions', false);
	});

	template.helpers({
		show() {
			return Regions.findFilter({}, 2).count() > 1;
		},
	});
}

{
	const Template = TemplateAny as TemplateStaticTyped<'regionSelectionDisplay'>;

	const template = Template.regionSelectionDisplay;

	template.helpers({
		inNavbarClasses() {
			if (this.inNavbar) {
				return 'col-6-sm-auto px-0';
			}
			return '';
		},
	});

	template.events({
		'click .js-region-selection-display'(_event, instance) {
			(instance.parentInstance() as any).state.set('searchingRegions', true);
		},
	});
}

{
	const Template = TemplateAny as TemplateStaticTyped<
		'regionSelection',
		{ isSplash: boolean },
		{
			minNumberOfRegionInSelection: number;
			searchHasFocus: boolean;
			state: ReactiveDict<{
				showAllRegions: boolean;
				search: string;
			}>;
			/**
			 * Query some regions
			 */
			regions: (options?: {
				active?: boolean;
				limit?: number;
			}) => Mongo.Cursor<RegionEntity, RegionModel>;
			changeRegion: (regionId: string) => void;
			close: () => void;
		}
	>;

	const template = Template.regionSelection;

	template.onCreated(function () {
		this.state = new ReactiveDict();
		this.state.setDefault({
			showAllRegions: false,
			search: '',
		});

		this.autorun(() => {
			const search = this.state.get('search');
			this.state.set('showAllRegions', search !== '');
		});

		this.minNumberOfRegionInSelection = PublicSettings.regionSelection.minNumber;

		this.regions = (options = {}) => {
			const query: Mongo.Selector<RegionEntity> = {};

			if (typeof options.active === 'boolean') {
				query.futureEventCount = options.active ? { $gt: 0 } : { $eq: 0 };
			}

			const search = this.state.get('search');
			if (search && search !== '') {
				query.name = new RegExp(search, 'i');
			}

			return Regions.find(query, {
				sort: { futureEventCount: -1, courseCount: -1, name: 1 },
				limit: options.limit,
			});
		};

		this.changeRegion = (regionId) => {
			const changed = !Session.equals('region', regionId);

			RegionSelection.change(regionId);

			// When the region changes, we want the content of the page to update
			// Many pages do not change when the region changed, so we go to
			// the homepage for those
			if (changed) {
				const routeName = Router.current().route?.getName();
				if (!RegionSelection.regionDependentRoutes.includes(routeName)) {
					Router.go('/');
				}
			}
			this.close();
		};

		// create a function to toggle displaying the regionSelection
		// only if it is placed inside a wrap
		this.close = () => {
			const parentState = (this.parentInstance() as any).state;
			if (parentState?.get('searchingRegions')) {
				parentState.set('searchingRegions', false);
			}
		};
	});

	template.onRendered(function () {
		Meteor.defer(() => {
			if (!this.data || !this.data.isSplash) {
				this.$('.js-region-search').trigger('select');
			}
		});
	});

	template.helpers({
		inNavbarClasses() {
			if (this.inNavbar) {
				return 'col-6-sm-auto px-0';
			}
			return '';
		},
		allCourses() {
			return Regions.find()
				.fetch()
				.reduce((acc, region) => acc + region.courseCount, 0);
		},

		allUpcomingEvents() {
			return Regions.find()
				.fetch()
				.reduce((acc, region) => acc + region.futureEventCount, 0);
		},

		mostActiveRegions() {
			const minNumber = Template.instance().minNumberOfRegionInSelection;

			const allActiveRegions = Template.instance().regions({ active: true });

			if (allActiveRegions.count() >= minNumber) return allActiveRegions;

			// Query more to have a min Number of regions
			const someInactiveRegions = Template.instance().regions({
				active: false,
				limit: minNumber - allActiveRegions.count(),
			});

			return [...allActiveRegions.fetch(), ...someInactiveRegions.fetch()];
		},

		hasMoreRegions() {
			const minNumber = Template.instance().minNumberOfRegionInSelection;

			const numberOfRegions = Template.instance().regions().count();

			return (
				numberOfRegions > minNumber &&
				numberOfRegions > Template.instance().regions({ active: true }).count()
			);
		},

		allRegions() {
			return Template.instance().regions();
		},

		aboutLink() {
			return getLocalizedValue(PublicSettings.regionSelection.aboutLink);
		},
	});

	template.events({
		'click .js-region-link'(event, instance) {
			event.preventDefault();
			const regionId = this._id || 'all';
			instance.changeRegion(regionId.toString());

			instance.$('.dropdown-toggle').dropdown('hide');
			return false;
		},

		'mouseover/mouseout/focusin/focusout .js-region-link'(this: RegionModel, event) {
			const id = this._id;
			if (id && Session.equals('region', 'all')) {
				FilterPreview({
					property: 'region',
					id,
					activate: event.type === 'mouseover' || event.type === 'focusin',
				});
			}
		},

		'keyup .js-region-search'(_event, instance) {
			const search = String(instance.$('.js-region-search').val()).trim();
			if (!instance.state.equals('search', search)) {
				instance.state.set({ search });
				// eslint-disable-next-line no-param-reassign
				instance.searchHasFocus = true;
				instance.$('.dropdown-toggle').dropdown('show');
			}
		},

		'submit .js-region-search-form'(event, instance) {
			event.preventDefault();
			// eslint-disable-next-line no-param-reassign
			instance.searchHasFocus = false;
			instance.$('.js-region-search').trigger('focusout');
			instance.$('.dropdown-toggle').dropdown('hide');
			if (!instance.state.equals('search', '')) {
				const selectedRegion = instance.regions().fetch()[0];
				if (selectedRegion) {
					instance.changeRegion(selectedRegion._id);
				} else {
					instance.changeRegion('all');
				}
			}
		},

		'focus .js-region-search'(_event, instance) {
			instance.$('.dropdown-toggle').dropdown('show');
		},

		'focusin/focusout .js-region-search'(event, instance) {
			// eslint-disable-next-line no-param-reassign
			instance.searchHasFocus = event.type === 'focusin';
		},

		'click .js-show-all-regions'(_event, instance) {
			instance.state.set('showAllRegions', true);
			instance.$('.js-region-search').trigger('select');
		},

		'show.bs.dropdown'(_event, instance) {
			if (!instance.searchHasFocus) {
				Meteor.defer(() => {
					instance.$('.js-region-search').trigger('select');
				});
			}
		},

		'hide.bs.dropdown'(_event, instance) {
			if (!instance.searchHasFocus) {
				instance.close();
				return true;
			}

			return false;
		},
	});
}

{
	const Template = TemplateAny as TemplateStaticTyped<'regionSelectionItem'>;

	const template = Template.regionSelectionItem;

	template.helpers({
		regionNameMarked(this: RegionModel) {
			const search = (Template.instance().parentInstance() as any).state.get('search');
			return StringTools.markedName(search, this.name);
		},
		private() {
			return this.isPrivate() ? 'region-link-private' : '';
		},
	});
}
