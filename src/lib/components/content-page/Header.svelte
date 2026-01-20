<script>
	/**
	 * @typedef {Object} Props
	 * @property {string} [title]
	 * @property {string} [returnLinkURL]
	 * @property {string} [returnLinkTitle]
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
