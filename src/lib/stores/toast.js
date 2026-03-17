import { writable } from 'svelte/store';

export const toastMessage = writable('');

/** @param {string} message */
export function showToast(message) {
	toastMessage.set(message);
	setTimeout(() => toastMessage.set(''), 5000);
}
