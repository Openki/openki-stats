import { Regions } from '/imports/api/regions/regions';
import moment from 'moment-timezone';

/**
 * Serialize local time for mongo
 *
 * References to future local time are stored as ISO 8601 date strings
 * with no seconds and no timezone offset.
 *
 * Example string as stored in the DB:
 *
 * `"2016-06-07T09:30"`
 *
 * This means some points in time (e.g. when DST ends) will be impossible
 * to express unambiguously. This is acceptable as we don't have the UI to
 * handle these either.
 *
 * Rationale for the use of this format:
 * Mongo has no concept of localized dates. All date objects are stored in UTC.
 * This poses a problem when we try to pin an event to a future local time in a
 * timezone.
 *
 * Due to frequent changes in timezones, if we store the date as UTC it might
 * acquire an offset at some point in the future when local time changes
 * relative to UTC. We would have to correct the time in concert with
 * everybody else (our libraries and the timezone info of the browsers of our
 * users). This is infeasible. Thus future dates must be stored as local time.
 */

export const LocalTime = {
	zone(regionId: string) {
		const region = Regions.findOne(regionId);
		if (!region) {
			throw new Error(`Unable to load region ${regionId}`);
		}

		const { tz } = region;

		return {
			fromString(date: string) {
				return moment.tz(date, tz);
			},
			toString(date: Date | moment.Moment) {
				return moment.tz(date, tz).format('YYYY-MM-DD[T]HH:mm');
			},
			at(date: Date) {
				return moment.tz(date, tz);
			},
		};
	},

	/**
	 * Turn a moment object into a local date string without time offset
	 */
	toString(date: Date | moment.Moment) {
		return moment(date).format('YYYY-MM-DD[T]HH:mm');
	},

	/**
	 * Read local date from string
	 *
	 * Note that the returned date will be faux UTC.
	 */
	fromString(dateStr: string, timeStr?: string) {
		if (timeStr) {
			return moment.utc(`${dateStr} ${timeStr}`, 'L LT');
		}

		return moment.utc(dateStr);
	},

	now() {
		return moment.utc().add(moment().utcOffset(), 'minutes');
	},
};
export default LocalTime;
