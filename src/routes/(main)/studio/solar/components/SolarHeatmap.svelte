<script>
	import chroma from 'chroma-js';

	let {
		data,
		days,
		year,
		maxValue = 60,
		showAxes = false,
		showTooltip = false,
		onhover = () => {},
		onhoverend = () => {},
		onclick = () => {}
	} = $props();

	let colorScale = $derived(
		chroma
			.scale(['#FFFDE4', '#FED500', '#F08030', '#C62828', '#6A1B1B'])
			.domain([0, maxValue])
	);

	let canvas = $state(null);
	let container = $state(null);
	let containerWidth = $state(0);
	let containerHeight = $state(0);

	const slots = 48;

	let cellWidth = $derived(containerWidth / slots);
	let cellHeight = $derived(containerHeight / (days?.length || 365));

	const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

	$effect(() => {
		if (!canvas || !data || !containerWidth || !containerHeight) return;

		const ctx = canvas.getContext('2d');
		canvas.width = containerWidth * dpr;
		canvas.height = containerHeight * dpr;
		ctx.scale(dpr, dpr);
		ctx.clearRect(0, 0, containerWidth, containerHeight);

		const numDays = data.length;
		const cw = containerWidth / slots;
		const ch = containerHeight / numDays;

		for (let d = 0; d < numDays; d++) {
			const row = data[d];
			for (let s = 0; s < slots; s++) {
				const val = row[s];
				if (val > 0) {
					ctx.fillStyle = colorScale(Math.min(val, maxValue)).hex();
					ctx.fillRect(s * cw, d * ch, cw + 0.5, ch + 0.5);
				}
			}
		}
	});

	function handleMouseMove(e) {
		if (!showTooltip || !data || !days) return;
		const rect = e.currentTarget.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const slot = Math.floor(x / cellWidth);
		const dayIndex = Math.floor(y / cellHeight);

		if (dayIndex >= 0 && dayIndex < days.length && slot >= 0 && slot < slots) {
			const value = data[dayIndex][slot];
			const date = new Date(days[dayIndex] + 'T00:00:00');
			const hours = Math.floor(slot / 2);
			const mins = (slot % 2) * 30;
			const endMins = mins + 30;
			const endHours = endMins >= 60 ? hours + 1 : hours;
			const timeSlot = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')} – ${String(endHours).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;
			const dateFormatted = date.toLocaleDateString('en-AU', {
				day: 'numeric',
				month: 'short',
				year: 'numeric'
			});

			onhover({ dayIndex, slot, value, date, dateFormatted, timeSlot, x, y });
		}
	}

	function handleMouseLeave() {
		onhoverend();
	}

	function handleClick() {
		onclick(year);
	}

	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const timeLabels = ['00:00', '06:00', '12:00', '18:00', '00:00'];

	let monthPositions = $derived.by(() => {
		if (!days || !days.length) return [];
		const positions = [];
		for (let m = 0; m < 12; m++) {
			const target = `${year}-${String(m + 1).padStart(2, '0')}-01`;
			const idx = days.indexOf(target);
			if (idx >= 0) {
				positions.push({ label: months[m], y: idx * cellHeight });
			}
		}
		return positions;
	});

	function resizeObserve(node) {
		const ro = new ResizeObserver((entries) => {
			const entry = entries[0];
			containerWidth = entry.contentRect.width;
			containerHeight = entry.contentRect.height;
		});
		ro.observe(node);
		return {
			destroy() {
				ro.disconnect();
			}
		};
	}
</script>

{#if showAxes}
	<div class="relative">
		<!-- X axis labels (top) -->
		<div class="ml-10 mr-0 flex justify-between mb-1">
			{#each timeLabels as label, i (i)}
				<span class="text-xs text-mid-warm-grey">{label}</span>
			{/each}
		</div>

		<div class="flex">
			<!-- Y axis labels (left) -->
			<div class="relative w-10 shrink-0" style="height: 500px;">
				{#each monthPositions as mp (mp.label)}
					<span
						class="absolute left-0 text-xs text-mid-warm-grey"
						style="top: {mp.y}px; transform: translateY(-50%);"
					>
						{mp.label}
					</span>
				{/each}
			</div>

			<!-- Canvas container -->
			<div class="relative flex-1" style="height: 500px;" bind:this={container} use:resizeObserve>
				<canvas
					bind:this={canvas}
					class="absolute inset-0 w-full h-full"
					style="image-rendering: pixelated;"
				></canvas>
				{#if showTooltip}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="absolute inset-0 cursor-crosshair"
						onmousemove={handleMouseMove}
						onmouseleave={handleMouseLeave}
					></div>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<!-- Thumbnail mode -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="relative w-full cursor-pointer"
		style="aspect-ratio: 48 / 28;"
		bind:this={container}
		use:resizeObserve
		onclick={handleClick}
	>
		<canvas
			bind:this={canvas}
			class="absolute inset-0 w-full h-full rounded"
			style="image-rendering: pixelated;"
		></canvas>
	</div>
{/if}
