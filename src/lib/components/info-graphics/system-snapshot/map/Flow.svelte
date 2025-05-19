<script>
	/**
	 * @typedef {Object} Props
	 * @property {number | string} [flow]
	 * @property {number} [x]
	 * @property {number} [y]
	 * @property {string} [direction]
	 * @property {string} [colour]
	 */

	/** @type {Props} */
	let { flow = 0, x = 0, y = 0, direction = 'left', colour = 'black' } = $props();

	const dur = '1.5s';
	const values = '0.5;1;0';

	let showAnimation = $state(false);

	setInterval(() => {
		showAnimation = !showAnimation;
	}, 6000);
</script>

<svg
	x={x - 28.5}
	y={y - 25}
	width="57"
	height="50"
	viewBox="0 0 57 50"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
>
	{#if direction === 'right'}
		<g>
			<path
				d="M9 13C9 11.8954 9.89543 11 11 11H45.6518C46.365 11 47.0243 11.3798 47.382 11.9969L55.5 26L47.382 40.0031C47.0243 40.6201 46.365 41 45.6518 41H11C9.89543 41 9 40.1045 9 39V13Z"
				fill="white"
				stroke="black"
				stroke-width="1.5"
			/>
			<path d="M46.5 36L52.5 26L46.5 16V36Z" fill={colour}>
				{#if showAnimation}
					<animateTransform
						attributeName="transform"
						attributeType="XML"
						type="translate"
						from="-3 0"
						to="3 0"
						{dur}
						repeatCount="indefinite"
					/>
					<animate attributeName="opacity" {values} {dur} repeatCount="indefinite" />
				{/if}
			</path>
		</g>
	{/if}
	{#if direction === 'left'}
		<g>
			<path
				d="M47.5 39C47.5 40.1046 46.6046 41 45.5 41L10.8482 41C10.135 41 9.47573 40.6202 9.11803 40.0031L1.00003 26L9.11803 11.9969C9.47573 11.3799 10.135 11 10.8482 11L45.5 11C46.6046 11 47.5 11.8955 47.5 13L47.5 39Z"
				fill="white"
				stroke="black"
				stroke-width="1.5"
			/>
			<path d="M10 16L4 26L10 36L10 16Z" fill={colour}>
				{#if showAnimation}
					<animateTransform
						attributeName="transform"
						attributeType="XML"
						type="translate"
						from="3 0"
						to="-3 0"
						{dur}
						repeatCount="indefinite"
					/>
					<animate attributeName="opacity" {values} {dur} repeatCount="indefinite" />
				{/if}
			</path>
		</g>
	{/if}
	{#if direction === 'up'}
		<g>
			<path
				d="M9 37C7.895 37 7 36.105 7 35L7 13.761C7 13.041 7.38798 12.375 8.01498 12.021L27.5 1L46.984 12.021C47.612 12.375 48 13.041 48 13.761L48 35C48 36.105 47.104 37 46 37L9 37Z"
				fill="white"
				stroke="black"
				stroke-width="1.5"
			/>
			<path d="M40.377 13L27.5049 5L14.633 13L40.377 13Z" fill={colour}>
				{#if showAnimation}
					<animateTransform
						attributeName="transform"
						attributeType="XML"
						type="translate"
						from="0 3"
						to="0 -3"
						{dur}
						repeatCount="indefinite"
					/>
					<animate attributeName="opacity" {values} {dur} repeatCount="indefinite" />
				{/if}
			</path>
		</g>
	{/if}
	{#if direction === 'down'}
		<g>
			<path
				d="M46 13C47.105 13 48 13.895 48 15L48 36.239C48 36.959 47.612 37.625 46.985 37.979L27.5 49L8.01603 37.979C7.38803 37.625 7 36.959 7 36.239L7 15C7 13.895 7.896 13 9 13L46 13Z"
				fill="white"
				stroke="black"
				stroke-width="1.5"
			/>
			<path d="M14.623 37L27.4951 45L40.367 37L14.623 37Z" fill={colour}>
				{#if showAnimation}
					<animateTransform
						attributeName="transform"
						attributeType="XML"
						type="translate"
						from="0 -3"
						to="0 3"
						{dur}
						repeatCount="indefinite"
					/>
					<animate attributeName="opacity" {values} {dur} repeatCount="indefinite" />
				{/if}
			</path>
		</g>
	{/if}
	<text text-anchor="middle" fill="#000000" x="27" y="30" class="font-space text-base md:text-sm">
		{flow}
	</text>
</svg>
