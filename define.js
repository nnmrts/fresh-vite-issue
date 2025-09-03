import { createDefine } from "fresh";

/**
 * @import { Define } from "fresh";
 */

/**
 * @typedef {{
 * user: {
 * 	id: number;
 * },
 * title: string,
 * subtitle: string,
 * }} State
 */

/**
 * @type {Define<State>}
 */
const define = createDefine();

export default define;
