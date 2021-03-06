import { ReactiveVar } from 'meteor/reactive-var';
import { Router } from 'meteor/iron:router';
import { Template as TemplateAny, TemplateStaticTyped } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import moment from 'moment';

import { LogCollection, LogEntity } from '/imports/api/log/factory';
import { Log } from '/imports/api/log/log';

import * as TemplateMixins from '/imports/ui/lib/template-mixins';
import RouterAutoscroll from '/imports/ui/lib/router-autoscroll';
import * as UserPrivilegeUtils from '/imports/utils/user-privilege-utils';
import * as UrlTools from '/imports/utils/url-tools';

import './template.html';
import './styles.scss';

{
	const Template = TemplateAny as TemplateStaticTyped<
		'logPage',
		// LogCollection.Filtering Params are allowed as data input
		Parameters<ReturnType<LogCollection['Filtering']>['read']>[0],
		{
			filter: ReturnType<LogCollection['Filtering']>;
			ready: ReactiveVar<boolean>;
			limit: ReactiveVar<number>;
			updateUrl: () => boolean;
		}
	>;

	const template = Template.logPage;

	template.onCreated(function () {
		const instance = this;
		const batchLoad = 100;
		instance.updateUrl = () => {
			const filterParams = instance.filter.toParams();
			const queryString = UrlTools.paramsToQueryString(filterParams);

			const options: { query?: string } = {};

			if (queryString.length) {
				options.query = queryString;
			}

			RouterAutoscroll.cancelNext();

			const router = Router.current();
			Router.go(router.route.getName(), {}, options);

			return true;
		};

		instance.ready = new ReactiveVar(false);
		instance.limit = new ReactiveVar(batchLoad);

		const filter = Log.Filtering();
		instance.filter = filter;

		// Read URL state
		instance.autorun(() => {
			const query = Template.currentData();
			filter.clear().read(query).done();
		});

		// Update whenever filter changes
		instance.autorun(() => {
			const filterQuery = filter.toQuery();
			instance.ready.set(false);

			// Have some extra log entries ready so that they are shown immediately
			// when more are demanded
			const overLimit = instance.limit.get() + batchLoad + 1;
			instance.subscribe('log', filterQuery, overLimit, () => {
				instance.ready.set(true);
			});
		});
	});

	template.helpers({
		privileged() {
			return UserPrivilegeUtils.privilegedTo('admin');
		},

		date() {
			const start = Template.instance().filter.get('start');
			return start?.toISOString() || '';
		},

		relFilter() {
			const { rel } = Template.instance().filter.toParams();
			return rel || '';
		},

		trFilter() {
			const { tr } = Template.instance().filter.toParams();
			return tr || '';
		},

		hasMore() {
			const instance = Template.instance();

			const filterQuery = instance.filter.toQuery();
			const limit = instance.limit.get();
			const results = Log.findFilter(filterQuery, limit + 1);

			return results.count() > limit;
		},

		results() {
			const instance = Template.instance();
			const filterQuery = instance.filter.toQuery();
			const entries = Log.findFilter(filterQuery, instance.limit.get()).fetch();
			let last: moment.Moment | false = false;
			const inter: (LogEntity | { interval: string })[] = [];
			entries.forEach((entry) => {
				const ts = moment(entry.ts);
				if (last) {
					const interval = moment.duration(last.diff(ts));
					if (interval.asMinutes() > 1) {
						inter.push({ interval: interval.humanize() });
					}
				}
				inter.push(entry);
				last = ts;
			});
			return inter;
		},

		loading() {
			return !Template.instance().ready.get();
		},
	});

	template.events({
		// Update the URI when the search-field was changed an loses focus
		'change .js-update-url'(_event, instance) {
			instance.updateUrl();
		},

		'keyup .js-tr-input': _.debounce((_event, instance) => {
			const { filter } = instance;
			filter.disable('tr');

			const trStr = ($('.js-tr-input').val() as string).trim();
			if (trStr) {
				filter.add('tr', trStr);
			}

			filter.done();
		}, 200),

		'keyup .js-date-input': _.debounce((_event, instance) => {
			const { filter } = instance;
			const dateStr = ($('.js-date-input').val() as string).trim();
			if (dateStr === '') {
				filter.disable('start').done();
			} else {
				filter.add('start', dateStr).done();
			}
		}, 200),

		'keyup .js-rel-input': _.debounce((_event, instance) => {
			const { filter } = instance;
			filter.disable('rel');

			const relStr = ($('.js-rel-input').val() as string).trim();
			if (relStr) {
				filter.add('rel', relStr);
			}

			filter.done();
		}, 200),

		'click .js-tr'(event, instance) {
			instance.filter.add('tr', `${this}`);
			if (!(event as any).shiftKey) {
				instance.filter.done();
				instance.updateUrl();
				window.scrollTo(0, 0);
			}
		},

		'click .js-date'(event, instance) {
			const start = moment(this).toISOString();
			instance.filter.add('start', start);
			if (!(event as any).shiftKey) {
				instance.filter.done();
				instance.updateUrl();
				window.scrollTo(0, 0);
			}
		},

		'click .js-rel-id'(event, instance) {
			instance.filter.add('rel', `${this}`);
			if (!(event as any).shiftKey) {
				instance.filter.done();
				instance.updateUrl();
				window.scrollTo(0, 0);
			}
		},

		'click .js-more'(_event, instance) {
			const { limit } = instance;
			limit.set(limit.get() + 100);
		},
	});
}

{
	const Template = TemplateAny as TemplateStaticTyped<'logEntry'>;

	const template = TemplateMixins.MultiExpandible(Template, 'logEntry');

	template.helpers({
		shortId(id: string) {
			return id.substring(0, 8);
		},
		isodate(date: moment.Moment) {
			return moment(date).toISOString();
		},
		jsonBody() {
			return JSON.stringify(this.body, null, '   ');
		},
		jsonFull() {
			return JSON.stringify(this, null, '   ');
		},
	});
}
