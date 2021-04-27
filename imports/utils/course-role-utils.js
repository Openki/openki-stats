/** @typedef {import("../api/courses/courses").CourseMemberEntity} CourseMemberEntity */

/**
 * Determine whether there is a member with the given role
 * @param {CourseMemberEntity[] | undefined} members list of members
 * @param {string|undefined} role role key
 * @return true if there is a member with the given role, and false otherwise.
 */
export function hasRole(members, role) {
	if (!members) {
		return false;
	}
	return members.some((member) => member.roles.includes(role));
}

/**
 * Determine whether a given user has a given role in a members list
 * @param {CourseMemberEntity[]} members list of members
 * @param {string} role role key
 * @param {string|undefined|null} userId user ID to check
 * @return whether the user has this role
 */
export function hasRoleUser(members, role, userId) {
	if (!userId) {
		return false;
	}
	return members.some((member) => member.user === userId
		&& member.roles.includes(role));
}
