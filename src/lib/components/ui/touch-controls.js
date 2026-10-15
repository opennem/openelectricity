import { getContext, setContext } from 'svelte';

/**
 * Touch-sized controls: a page opts its subtree in (`setTouchControls()`), and
 * below 768px the shared controls in it take native-app proportions — 40px
 * tall, 14px type, rounder corners — instead of the dense desktop pills.
 * Pick-one lists (`FilterSelect`) also open as the phone's own picker there.
 * From 768px up nothing changes, so the switch is CSS only and the server
 * render (which can't know the width) is already right.
 *
 * The class lists below are phone-only (`max-tablet:`) additions to each
 * control's own classes.
 */

const KEY = Symbol('touch-controls');

/** Opt this component's subtree into touch-sized controls on phones. */
export function setTouchControls() {
	setContext(KEY, true);
}

/** Whether the calling control sits in a touch-sized subtree. */
export function hasTouchControls() {
	return getContext(KEY) === true;
}

/** A pill (filter, select or date trigger). */
export const TOUCH_PILL =
	'max-tablet:h-[40px] max-tablet:gap-2 max-tablet:rounded-[10px] max-tablet:pl-5 max-tablet:pr-4 max-tablet:py-0 max-tablet:text-sm';

/** A pill's chevron or icon. */
export const TOUCH_PILL_ICON = 'max-tablet:size-4';

/** A segmented switch's track, and its thumb and options inside it. */
export const TOUCH_SWITCH_TRACK =
	'max-tablet:h-[40px] max-tablet:rounded-[10px] max-tablet:text-sm';
export const TOUCH_SWITCH_OPTION = 'max-tablet:rounded-[7.5px] max-tablet:px-4 max-tablet:py-0';

/** A square icon button (Feedback, the options menu), framed like a pill. */
export const TOUCH_ICON_BUTTON =
	'max-tablet:flex max-tablet:size-[40px] max-tablet:items-center max-tablet:justify-center max-tablet:rounded-[10px] max-tablet:border max-tablet:border-warm-grey max-tablet:bg-white max-tablet:p-0';

/** The icon inside a touch icon button. */
export const TOUCH_ICON = 'max-tablet:size-[18px]';
