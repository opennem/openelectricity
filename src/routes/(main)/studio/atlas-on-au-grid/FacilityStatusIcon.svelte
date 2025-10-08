<script>
	// committed, operating, retired
	let { status } = $props();

	$inspect('status', status);
</script>

<div class="status-progress" title={status}>
	<span
		class:committed={status === 'committed'}
		class:operating={status === 'operating'}
		class:retired={status === 'retired'}
	></span>
</div>

<style>
	.status-progress {
		display: flex;
	}
	.status-progress span {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}
	.committed {
		background-color: #eab308;
	}
	.operating {
		background-color: #16a34a;
	}
	.retired {
		background-color: #9ca3af;
	}
</style>
