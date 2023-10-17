<script>
    import { page } from '$app/stores';

	export let data;
	let articles = data.articles;
    let tag = $page.params.tag
</script>

<h1 class="text-3xl font-bold">Articles for tag <em>{tag}</em></h1>
<div>
	{#each articles as { title, slug }}
        <div>
            <h3 class="text-3xl font-bold">{title}</h3>
            <a href="/analysis/{slug.current}">Read more</a>
        </div>
	{/each}
</div>