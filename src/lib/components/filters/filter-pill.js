import { TOUCH_PILL } from '$lib/components/ui/touch-controls.js';

/**
 * The filter pill's look, shared by the pill button (`FilterPill`) and the
 * phone's native select (`NativeSelect`) so the two read as one control.
 *
 * @param {{ compact?: boolean, active?: boolean, open?: boolean, touch?: boolean }} options
 *   `touch` adds the phone sizes (`touch-controls.js`).
 */
export function filterPillClass({ compact = false, active = false, open = false, touch = false }) {
	return [
		'flex items-center rounded-lg border whitespace-nowrap font-medium transition-colors',
		compact ? 'gap-1.5 pl-4 pr-3 py-2.5 text-xs' : 'gap-2 pl-5 pr-4 py-2.5 text-sm',
		active
			? 'bg-dark-grey border-dark-grey text-white hover:bg-black'
			: 'bg-white border-warm-grey text-dark-grey hover:border-dark-grey',
		open && !active ? 'border-dark-grey' : '',
		touch ? TOUCH_PILL : ''
	]
		.filter(Boolean)
		.join(' ');
}
