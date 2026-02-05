<script>
	/**
	 * @typedef {Object} Props
	 * @property {string} [_title]
	 * @property {string} [_returnLinkURL]
	 * @property {string} [_returnLinkTitle]
	 * @property {any} [author]
	 * @property {string} [teaser]
	 */

	/** @type {Props} */
	let {
		_title = '',
		_returnLinkURL = '',
		_returnLinkTitle = '',
		author = null,
		teaser = ''
	} = $props();
</script>
