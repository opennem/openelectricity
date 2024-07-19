import { format } from 'date-fns';

export const formatFyTickX = (/** @type {Date | number} */ d) => {
	return format(d, 'yyyy');
};
