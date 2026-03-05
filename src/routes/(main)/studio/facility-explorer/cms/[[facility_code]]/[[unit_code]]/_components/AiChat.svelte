<script>
	/**
	 * AI Chat Drawer — cloud API chat interface for facility data exploration.
	 *
	 * Uses a two-pass query system:
	 *   Pass 1 (non-streaming): Generate a structured JSON query from the question
	 *   Execute: Run the query client-side against the facilities array
	 *   Pass 2 (streaming): Stream an answer using the query results as context
	 *
	 * Falls back to the legacy single-pass approach if Pass 1 fails, returns
	 * invalid JSON, or returns { passthrough: true }.
	 *
	 * Supports OpenAI, Anthropic (Claude), and Google (Gemini) providers.
	 * Users bring their own API key, stored only in localStorage. All requests
	 * go through a server-side proxy to avoid CORS issues.
	 */

	import { onMount } from 'svelte';
	import { MessageSquare, X, Trash2, ChevronDown, KeyRound, Eye, EyeOff } from '@lucide/svelte';
	import { buildChatContext } from '$lib/utils/ai-context';
	import { buildQuerySystemPrompt, buildAnswerSystemPrompt } from '$lib/utils/ai-prompts';
	import { parseQueryResponse, executeQuery } from '$lib/utils/ai-query-engine';
	import { renderMarkdown } from '$lib/utils/render-markdown';
	import { createDragHandler } from '../_utils/drag-resize.svelte.js';

	/** @type {{ facilities: any[], selectedFacility: any }} */
	let { facilities, selectedFacility } = $props();

	/**
	 * @typedef {{ id: string, label: string, description: string }} Model
	 * @typedef {{ id: string, label: string, models: Model[] }} Provider
	 */

	/** @type {Provider[]} */
	const PROVIDERS = [
		{
			id: 'openai',
			label: 'OpenAI',
			models: [
				{ id: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', description: 'Fastest, cheapest' },
				{ id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', description: 'Fast, affordable' },
				{ id: 'gpt-4o', label: 'GPT-4o', description: 'Most capable' }
			]
		},
		{
			id: 'google',
			label: 'Google',
			models: [
				{
					id: 'gemini-2.5-flash',
					label: 'Gemini 2.5 Flash',
					description: 'Fast, free tier (10 RPM)'
				},
				{
					id: 'gemini-2.5-flash-lite',
					label: 'Gemini 2.5 Flash-Lite',
					description: 'Fastest, free tier (15 RPM)'
				},
				{
					id: 'gemini-2.5-pro',
					label: 'Gemini 2.5 Pro',
					description: 'Most capable, free tier (5 RPM)'
				}
			]
		},
		{
			id: 'anthropic',
			label: 'Claude',
			models: [
				{
					id: 'claude-sonnet-4-20250514',
					label: 'Claude Sonnet 4',
					description: 'Fast, balanced'
				},
				{
					id: 'claude-haiku-4-20250414',
					label: 'Claude Haiku 4',
					description: 'Fastest, cheapest'
				}
			]
		}
	];

	const MAX_HISTORY = 4;
	const PROVIDER_STORAGE_KEY = 'cms-explorer-chat-provider';
	const MODEL_STORAGE_KEY = 'cms-explorer-chat-model';

	const heightDrag = createDragHandler({
		axis: 'y',
		min: 200,
		max: 600,
		initial: 320,
		storageKey: 'cms-explorer-chat-height',
		invert: true
	});

	const SYSTEM_PROMPT = `You are an expert analyst for Australia's electricity grid. Answer questions about power generation facilities using ONLY the provided dataset context. Be concise and technical. Use tables or lists when comparing items. If the data doesn't contain the answer, say so.`;

	/**
	 * Cheapest model per provider for Pass 1 (query generation).
	 * Query generation is a simple structured-output task — no need to burn
	 * quota on the user's selected model.
	 * @type {Record<string, string>}
	 */
	const QUERY_MODEL = {
		google: 'gemini-2.5-flash-lite',
		openai: 'gpt-4.1-nano',
		anthropic: 'claude-haiku-4-20250414'
	};

	/** @typedef {{ role: 'user' | 'assistant' | 'system', content: string }} Message */

	/** @type {Message[]} */
	let messages = $state([]);
	let input = $state('');
	let isLoading = $state(false);
	/** @type {'idle' | 'analysing' | 'streaming'} */
	let chatPhase = $state('idle');
	let isExpanded = $state(false);
	let showModelPicker = $state(false);
	let showApiKeyInput = $state(false);
	let showKeyValue = $state(false);
	let keyInputValue = $state('');

	let selectedProviderId = $state(PROVIDERS[0].id);
	let selectedModelId = $state(PROVIDERS[0].models[0].id);

	/** @type {Record<string, string>} */
	let apiKeys = $state({});

	let selectedProvider = $derived(
		PROVIDERS.find((p) => p.id === selectedProviderId) ?? PROVIDERS[0]
	);
	let selectedModel = $derived(
		selectedProvider.models.find((m) => m.id === selectedModelId) ??
			selectedProvider.models[0]
	);
	let hasApiKey = $derived(!!apiKeys[selectedProviderId]);

	/** @type {HTMLElement | null} */
	let messagesContainer = $state(null);
	/** @type {HTMLInputElement | null} */
	let inputEl = $state(null);
	/** @type {AbortController | null} */
	let abortController = null;

	/**
	 * Get the localStorage key for a provider's API key.
	 * @param {string} providerId
	 */
	function apiKeyStorageKey(providerId) {
		return `cms-explorer-${providerId}-key`;
	}

	onMount(() => {
		// Restore provider
		const savedProvider = localStorage.getItem(PROVIDER_STORAGE_KEY);
		if (savedProvider && PROVIDERS.some((p) => p.id === savedProvider)) {
			selectedProviderId = savedProvider;
		}

		// Restore model
		const savedModel = localStorage.getItem(MODEL_STORAGE_KEY);
		const provider = PROVIDERS.find((p) => p.id === selectedProviderId) ?? PROVIDERS[0];
		if (savedModel && provider.models.some((m) => m.id === savedModel)) {
			selectedModelId = savedModel;
		} else {
			selectedModelId = provider.models[0].id;
		}

		// Restore API keys
		for (const p of PROVIDERS) {
			const key = localStorage.getItem(apiKeyStorageKey(p.id));
			if (key) apiKeys[p.id] = key;
		}
	});

	/** Scroll message list to bottom — throttled to avoid layout thrashing */
	let scrollPending = false;
	function scrollToBottom() {
		if (scrollPending) return;
		scrollPending = true;
		requestAnimationFrame(() => {
			scrollPending = false;
			if (messagesContainer) {
				messagesContainer.scrollTop = messagesContainer.scrollHeight;
			}
		});
	}

	/**
	 * Select a provider + model. Persists to localStorage.
	 * @param {string} providerId
	 * @param {string} modelId
	 */
	function selectModel(providerId, modelId) {
		selectedProviderId = providerId;
		selectedModelId = modelId;
		localStorage.setItem(PROVIDER_STORAGE_KEY, providerId);
		localStorage.setItem(MODEL_STORAGE_KEY, modelId);
		showModelPicker = false;
	}

	/** Save an API key for the current provider */
	function saveApiKey() {
		const key = keyInputValue.trim();
		if (!key) return;
		apiKeys[selectedProviderId] = key;
		localStorage.setItem(apiKeyStorageKey(selectedProviderId), key);
		keyInputValue = '';
		showApiKeyInput = false;
		showKeyValue = false;
	}

	/** Remove the API key for the current provider */
	function removeApiKey() {
		delete apiKeys[selectedProviderId];
		// Trigger reactivity by reassigning
		apiKeys = { ...apiKeys };
		localStorage.removeItem(apiKeyStorageKey(selectedProviderId));
		showApiKeyInput = false;
		keyInputValue = '';
	}

	/** Handle Enter key in API key input */
	function handleKeyInputKeydown(/** @type {KeyboardEvent} */ e) {
		if (e.key === 'Enter') {
			e.preventDefault();
			saveApiKey();
		} else if (e.key === 'Escape') {
			showApiKeyInput = false;
			keyInputValue = '';
		}
	}

	/**
	 * Stream a response from the AI API and update the assistant message.
	 * @param {Message[]} chatMessages
	 * @param {number} assistantIdx
	 * @param {AbortSignal} signal
	 */
	async function streamResponse(chatMessages, assistantIdx, signal) {
		const res = await fetch('/api/ai/chat', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				provider: selectedProviderId,
				model: selectedModelId,
				apiKey: apiKeys[selectedProviderId],
				messages: chatMessages
			}),
			signal
		});

		if (!res.ok) {
			const errorText = await res.text();
			let errorMsg = `API error (${res.status})`;
			try {
				const errJson = JSON.parse(errorText);
				errorMsg = errJson.error?.message || errJson.message || errJson.error || errorMsg;
			} catch {
				if (errorText.length < 200) errorMsg = errorText;
			}
			messages[assistantIdx] = { ...messages[assistantIdx], content: `Error: ${errorMsg}` };
			return;
		}

		const reader = /** @type {ReadableStream<Uint8Array>} */ (res.body).getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		let rawContent = '';
		let flushQueued = false;

		function flushContent() {
			flushQueued = false;
			messages[assistantIdx] = { ...messages[assistantIdx], content: rawContent };
			scrollToBottom();
		}

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() || '';

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed || !trimmed.startsWith('data: ')) continue;

				const payload = trimmed.slice(6);
				if (payload === '[DONE]') continue;

				try {
					const json = JSON.parse(payload);
					if (json.error) {
						rawContent += `\n\nError: ${json.error}`;
					} else if (json.content) {
						rawContent += json.content;
					}
				} catch {
					// Skip malformed lines
				}
			}

			if (!flushQueued) {
				flushQueued = true;
				requestAnimationFrame(flushContent);
			}
		}

		flushContent();
	}

	/** Send a message using the two-pass query system */
	async function sendMessage() {
		const text = input.trim();
		if (!text || isLoading) return;

		if (!hasApiKey) {
			showApiKeyInput = true;
			return;
		}

		input = '';
		messages.push({ role: 'user', content: text });
		scrollToBottom();

		isLoading = true;
		chatPhase = 'analysing';
		messages.push({ role: 'assistant', content: '' });
		const assistantIdx = messages.length - 1;

		abortController = new AbortController();

		try {
			// Build recent conversation context (excluding the empty assistant message)
			const recentMessages = messages.slice(-MAX_HISTORY - 1, -1);

			// --- Pass 1: Query generation (non-streaming) ---
			const querySystemPrompt = buildQuerySystemPrompt(facilities, selectedFacility);

			/** @type {Message[]} */
			const pass1Messages = [
				{ role: 'system', content: querySystemPrompt },
				...recentMessages
			];

			const pass1Res = await fetch('/api/ai/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					provider: selectedProviderId,
					model: QUERY_MODEL[selectedProviderId] || selectedModelId,
					apiKey: apiKeys[selectedProviderId],
					messages: pass1Messages,
					stream: false
				}),
				signal: abortController.signal
			});

			if (!pass1Res.ok) {
				// Pass 1 HTTP error -> fallback
				await sendMessageFallback(text, recentMessages, assistantIdx);
				return;
			}

			const pass1Json = await pass1Res.json();
			const query = parseQueryResponse(pass1Json.content);

			if (!query || query.passthrough) {
				// Invalid JSON or passthrough -> fallback
				await sendMessageFallback(text, recentMessages, assistantIdx);
				return;
			}

			// --- Execute query client-side ---
			let results;
			try {
				results = executeQuery(facilities, query);
			} catch {
				// Query execution error -> fallback
				await sendMessageFallback(text, recentMessages, assistantIdx);
				return;
			}

			if (results.type === 'passthrough') {
				await sendMessageFallback(text, recentMessages, assistantIdx);
				return;
			}

			// --- Pass 2: Answer generation (streaming) ---
			chatPhase = 'streaming';
			const answerSystemPrompt = buildAnswerSystemPrompt(results, selectedFacility);

			/** @type {Message[]} */
			const pass2Messages = [
				{ role: 'system', content: answerSystemPrompt },
				...recentMessages
			];

			await streamResponse(pass2Messages, assistantIdx, abortController.signal);
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') {
				// User cancelled — keep partial content
			} else {
				const errorMsg = err instanceof Error ? err.message : 'An error occurred';
				if (messages[assistantIdx].content === '') {
					messages[assistantIdx] = {
						...messages[assistantIdx],
						content: `Error: ${errorMsg}`
					};
				}
			}
		} finally {
			isLoading = false;
			chatPhase = 'idle';
			abortController = null;
			scrollToBottom();
			requestAnimationFrame(() => inputEl?.focus());
		}
	}

	/**
	 * Fallback to the legacy single-pass approach.
	 * @param {string} text - The user's question
	 * @param {Message[]} recentMessages - Recent conversation history
	 * @param {number} assistantIdx - Index of the assistant message to update
	 */
	async function sendMessageFallback(text, recentMessages, assistantIdx) {
		chatPhase = 'streaming';
		const context = buildChatContext(facilities, selectedFacility);

		/** @type {Message[]} */
		const chatMessages = [
			{ role: 'system', content: `${SYSTEM_PROMPT}\n\n${context}` },
			...recentMessages
		];

		await streamResponse(chatMessages, assistantIdx, /** @type {AbortController} */ (abortController).signal);
	}

	/** Handle Enter key in input */
	function handleKeydown(/** @type {KeyboardEvent} */ e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}

	/** Clear message history */
	function clearHistory() {
		messages = [];
	}

	/** Cancel in-flight request */
	function cancelRequest() {
		abortController?.abort();
	}

</script>

{#if !isExpanded}
	<!-- Collapsed bar -->
	<button
		onclick={() => (isExpanded = true)}
		class="flex items-center gap-2 px-4 h-9 border-t border-warm-grey bg-light-warm-grey/50 hover:bg-warm-grey/50 transition-colors cursor-pointer w-full text-left flex-shrink-0"
	>
		<MessageSquare size={12} class="text-mid-grey" />
		<span class="text-[11px] text-mid-grey font-mono">Ask about facilities...</span>
		{#if hasApiKey}
			<span class="ml-auto text-[9px] text-green-600 font-mono">{selectedProvider.label}</span>
		{/if}
	</button>
{:else}
	<!-- Expanded drawer -->
	<div
		class="flex flex-col border-t border-warm-grey bg-white flex-shrink-0"
		style="height: {heightDrag.value}px;"
	>
		<!-- Resize handle -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="h-3 cursor-row-resize flex items-center justify-center group bg-light-warm-grey hover:bg-warm-grey active:bg-mid-warm-grey transition-colors {heightDrag.isDragging
				? 'bg-mid-warm-grey'
				: ''}"
			onmousedown={heightDrag.start}
		>
			<div class="flex gap-1">
				{#each [1, 2, 3, 4, 5] as dot (dot)}
					<span
						class="block w-1 h-1 rounded-full bg-mid-grey group-hover:bg-dark-grey transition-colors"
					></span>
				{/each}
			</div>
		</div>

		<!-- Header -->
		<div
			class="flex items-center gap-2 px-3 py-1.5 border-b border-warm-grey/60 flex-shrink-0"
		>
			<MessageSquare size={12} class="text-mid-grey" />

			<!-- Model selector -->
			<div class="relative">
				<button
					onclick={() => (showModelPicker = !showModelPicker)}
					class="flex items-center gap-1 text-[10px] font-mono text-mid-grey hover:text-dark-grey transition-colors"
				>
					<span>{selectedModel.label}</span>
					<ChevronDown size={10} />
				</button>

				{#if showModelPicker}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="absolute top-full left-0 mt-1 z-30 bg-white border border-warm-grey rounded shadow-lg min-w-[260px]"
						onmouseleave={() => (showModelPicker = false)}
					>
						{#each PROVIDERS as provider (provider.id)}
							<div class="border-b border-warm-grey/40 last:border-b-0">
								<div
									class="px-3 py-1.5 text-[9px] font-mono text-mid-grey/70 uppercase tracking-wider bg-light-warm-grey/50"
								>
									{provider.label}
									{#if apiKeys[provider.id]}
										<span class="text-green-600 ml-1 normal-case">&#10003; key set</span>
									{:else}
										<span class="text-amber-500 ml-1 normal-case">no key</span>
									{/if}
								</div>
								{#each provider.models as model (model.id)}
									<button
										onclick={() => selectModel(provider.id, model.id)}
										class="w-full text-left px-3 py-2 hover:bg-warm-grey/50 transition-colors flex items-start gap-2 {model.id ===
											selectedModelId && provider.id === selectedProviderId
											? 'bg-warm-grey/30'
											: ''}"
									>
										<div class="flex-1 min-w-0">
											<div class="text-[11px] font-mono text-dark-grey">
												{model.label}
											</div>
											<div class="text-[9px] text-mid-grey mt-0.5">
												{model.description}
											</div>
										</div>
										{#if model.id === selectedModelId && provider.id === selectedProviderId}
											<span class="text-[9px] text-green-600 mt-0.5">&#10003;</span>
										{/if}
									</button>
								{/each}
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- API key status -->
			<button
				onclick={() => {
					showApiKeyInput = !showApiKeyInput;
					keyInputValue = '';
					showKeyValue = false;
				}}
				class="flex items-center gap-0.5 text-[9px] font-mono ml-1 transition-colors {hasApiKey
					? 'text-green-600 hover:text-green-700'
					: 'text-amber-500 hover:text-amber-600'}"
				title={hasApiKey ? 'API key set — click to manage' : 'Click to set API key'}
			>
				<KeyRound size={9} />
				<span>{hasApiKey ? 'key set' : 'no key'}</span>
			</button>

			<div class="ml-auto flex items-center gap-1">
				{#if isLoading}
					<button
						onclick={cancelRequest}
						class="px-1.5 py-0.5 text-[9px] font-mono text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
					>
						stop
					</button>
				{/if}
				{#if messages.length > 0}
					<button
						onclick={clearHistory}
						class="p-1 hover:bg-warm-grey rounded transition-colors"
						title="Clear history"
					>
						<Trash2 size={10} class="text-mid-grey" />
					</button>
				{/if}
				<button
					onclick={() => (isExpanded = false)}
					class="p-1 hover:bg-warm-grey rounded transition-colors"
					title="Close"
				>
					<X size={12} class="text-mid-grey" />
				</button>
			</div>
		</div>

		<!-- API Key input bar -->
		{#if showApiKeyInput}
			<div class="px-3 py-2 border-b border-warm-grey/60 bg-light-warm-grey/30 flex-shrink-0">
				<div class="flex items-center gap-2 mb-1">
					<span class="text-[10px] font-mono text-mid-grey">
						{selectedProvider.label} API key
					</span>
					{#if hasApiKey}
						<button
							onclick={removeApiKey}
							class="text-[9px] font-mono text-red-500 hover:text-red-600 ml-auto"
						>
							remove key
						</button>
					{/if}
				</div>
				{#if !hasApiKey}
					<div class="flex gap-1.5">
						<div class="relative flex-1">
							<input
								type={showKeyValue ? 'text' : 'password'}
								bind:value={keyInputValue}
								onkeydown={handleKeyInputKeydown}
								placeholder={selectedProviderId === 'openai'
									? 'sk-...'
									: selectedProviderId === 'anthropic'
										? 'sk-ant-...'
										: 'AIza...'}
								class="w-full pl-2 pr-7 py-1 text-[11px] font-mono border border-warm-grey rounded bg-white focus:border-dark-grey focus:outline-none"
							/>
							<button
								onclick={() => (showKeyValue = !showKeyValue)}
								class="absolute right-1.5 top-1/2 -translate-y-1/2 text-mid-grey hover:text-dark-grey"
							>
								{#if showKeyValue}
									<EyeOff size={10} />
								{:else}
									<Eye size={10} />
								{/if}
							</button>
						</div>
						<button
							onclick={saveApiKey}
							disabled={!keyInputValue.trim()}
							class="px-2 py-1 text-[10px] font-mono bg-dark-grey text-white rounded hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
						>
							save
						</button>
					</div>
					<p class="text-[9px] text-mid-grey/70 mt-1">
						Stored in your browser only. Sent to our server proxy per request (not logged).
					</p>
				{:else}
					<p class="text-[10px] font-mono text-mid-grey">
						Key is saved. It's stored in your browser's localStorage.
					</p>
				{/if}
			</div>
		{/if}

		<!-- Messages -->
		<div class="flex-1 overflow-y-auto px-3 py-2 min-h-0" bind:this={messagesContainer}>
			{#if messages.length === 0}
				<div class="text-[11px] text-mid-grey/60 font-mono py-4 px-2">
					<p class="text-center mb-4">
						Ask a question about the facility dataset.
						{#if selectedFacility}
							<br />Currently viewing: {selectedFacility.name}
						{/if}
					</p>

					<div
						class="text-left text-[10px] leading-relaxed border-t border-warm-grey/40 pt-3"
					>
						<p class="text-mid-grey font-medium mb-1.5">How this works</p>
						<p class="mb-1.5">
							This chat uses <span class="text-mid-grey">{selectedProvider.label}</span>'s
							API to answer questions about the facility dataset. Your API key is stored
							only in your browser — all requests go through a server proxy.
						</p>
						<p>
							The model has access to a summary of all {facilities.length} facilities and
							can answer questions about regions, fuel technologies, capacity, owners, and
							individual facilities.
						</p>
					</div>
				</div>
			{:else}
				{#each messages as msg, i (i)}
					{#if msg.role === 'user'}
						<div class="mb-2">
							<span class="text-[11px] text-dark-grey font-mono whitespace-pre-wrap"
								><span class="text-mid-grey select-none">&gt; </span>{msg.content}</span
							>
						</div>
					{:else if msg.role === 'assistant'}
						<div class="mb-3">
							{#if msg.content === '' && isLoading}
								<span class="text-[11px] text-mid-grey font-mono animate-pulse"
									>{chatPhase === 'analysing' ? 'Analysing question...' : '...'}</span
								>
							{:else}
								<div class="text-[11px] text-mid-grey font-mono whitespace-pre-wrap chat-markdown">
									{@html renderMarkdown(msg.content)}
								</div>
							{/if}
						</div>
					{/if}
				{/each}
			{/if}
		</div>

		<!-- Input -->
		<div class="px-3 py-2 border-t border-warm-grey/60 flex-shrink-0">
			<div class="relative">
				<input
					type="text"
					bind:this={inputEl}
					bind:value={input}
					onkeydown={handleKeydown}
					placeholder={!hasApiKey
						? 'Set API key to start...'
						: isLoading
							? chatPhase === 'analysing'
								? 'Analysing...'
								: 'Generating...'
							: 'Ask a question...'}
					disabled={isLoading}
					class="w-full px-3 py-1.5 text-[11px] font-mono border border-warm-grey rounded bg-white hover:border-dark-grey focus:border-dark-grey focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
				/>
			</div>
		</div>
	</div>
{/if}

<style>
	.chat-markdown :global(strong) {
		font-weight: 600;
	}
	.chat-markdown :global(pre) {
		white-space: pre-wrap;
		word-break: break-word;
	}
	.chat-markdown :global(table) {
		font-size: inherit;
	}
</style>
