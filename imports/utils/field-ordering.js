// FieldOrdering interface
//
//
// ordering() returns a compare function(a, b) that returns
//     - zero if a and b cannot be ranked ("they're equal")
//     - a negative number if a comes before b ("a is less")
//     - a positive number if a comes after b ("a is more")
//
// sorted(list) returns a new list with the items sorted according to spec
//
// When object fields are undefined, the behaviour is undefined.
//
// Constructors:
// FieldOrdering(spec) creates an ordering from a SortSpec

import { check } from 'meteor/check';
/**
 * A general comparison function that uses localeCompare() when comparing
 * strings. In an ideal world we would ask the objects for comparable values
 * from the fields we want to compare. And we would know their type so we needn't
 * guess the appropriate comparison function.
 * @param {string} a
 * @param {string} b
 */
function genComp(a, b) {
	if (typeof a === 'string' && typeof b === 'string') {
		// At the moment we don't provide a way to choose the locale :-(
		// So it will be sorted under whatever locale the server is running.
		return a.localeCompare(b, { sensitivity: 'accent' });
	}
	if (a < b) {
		return -1;
	}
	if (a > b) {
		return 1;
	}
	return 0;
}

const FieldComp =
	(/** @type {string} */ field) =>
	(/** @type {{ [x: string]: string; }} */ a, /** @type {{ [x: string]: string; }} */ b) => {
		check(a, Object);
		check(b, Object);
		return genComp(a[field], b[field]);
	};

// This is the base case when we run out of fields to compare
const equal = () => 0;

// Invert the order of arguments of a comparison function
// For our purposes it turns 'ascending' into 'descending'.
const swap = (f) => (a, b) => f(b, a);

const FieldOrdering = function (sortSpec) {
	// Build chain of compare functions that refer to the next field
	// if the current field values are equal.
	const ordering = () =>
		sortSpec.spec().reduceRight((chain, [field, order]) => {
			const fieldComp = FieldComp(field);
			const directedComp = order === 'asc' ? fieldComp : swap(fieldComp);
			return (a, b) => directedComp(a, b) || chain(a, b);
		}, equal);
	const copy = (list) => Array.prototype.slice.call(list);

	return {
		ordering,
		sorted: (list) => copy(list).sort(ordering()),
	};
};

export default FieldOrdering;
