import { check, Match } from 'meteor/check';

/** allows localised value eg. with `getLocalizedValue(...)` to have a string per language. */
export const LocalizedValue = Match.OneOf(
	String,
	Match.ObjectIncluding<Record<string, string | undefined>>({}),
);

export function StringEnum<T extends readonly string[]>(values: T) {
	return Match.Where(function (str) {
		check(str, String);
		return values.includes(str);
	}) as Match.Matcher<typeof values[number]>;
}
