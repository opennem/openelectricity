<script>
	/**
	 * FacilityDetail — inspector panel for a single facility.
	 *
	 * Shows all facility fields (header, photos, KV fields, description,
	 * owners, metadata, units list) plus a slide-in unit detail panel.
	 */

	import { PanelHeader, DragHandle, createDragHandler } from '$lib/components/ui/panel';
	import { EXTERNAL_LINKS } from '$lib/constants/external-links';
	import { createUrlFor } from '$lib/sanity';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import { ChevronRight, CircleX, ExternalLink, Minus, Pencil, Plus, X } from '@lucide/svelte';
	import { fade, slide } from 'svelte/transition';
	import FacilityStatusIcon from '$lib/components/facilities/FacilityStatusIcon.svelte';
	import InlineDropdown from './InlineDropdown.svelte';
	import { getClerkState } from '$lib/auth/clerk.svelte.js';

	const clerkState = getClerkState();

	/** @returns {Promise<HeadersInit>} */
	async function authHeaders() {
		const token = await clerkState.instance?.session?.getToken();
		return token ? { Authorization: `Bearer ${token}` } : {};
	}

	/** @type {{ facility: any, dataset: string, selectedUnitCode?: string | null, osmStatus?: 'idle' | 'loading' | 'ok' | 'not-found' | 'error', onclose?: () => void, onselectunit?: (code: string | null) => void, onfetchosm?: () => void, onupdate?: (facility: any) => void, onbusy?: (busy: boolean) => void }} */
	let { facility: _facilityProp, dataset, selectedUnitCode = null, osmStatus = 'idle', onclose, onselectunit, onfetchosm, onupdate, onbusy } = $props();

	let urlFor = $derived(createUrlFor(dataset));

	// Deep-reactive local copy so mutations (during edit) trigger UI updates.
	// Only re-clone when switching to a different facility (preserves local edits).
	let facility = $state(/** @type {any} */ ({}));
	let lastFacilityId = '';
	$effect(() => {
		const id = _facilityProp?._id ?? '';
		if (id !== lastFacilityId) {
			lastFacilityId = id;
			const snap = $state.snapshot(_facilityProp);
			// Ensure photo captions are initialised for bind:value
			if (snap?.photos) {
				for (const p of snap.photos) {
					if (p.caption == null) p.caption = '';
				}
			}
			facility = snap;
		}
	});

	// Resizable unit panel width (right-anchored — drag left to widen)
	const unitPanelDrag = createDragHandler({
		axis: 'x',
		min: 360,
		max: 800,
		initial: 480,
		storageKey: 'cms-explorer-unit-panel-width',
		invert: true
	});


	// Selected unit object (matched by code from URL param)
	let selectedUnit = $derived.by(() => {
		if (!selectedUnitCode || !facility?.units) return null;
		return facility.units.find((/** @type {any} */ u) => u.code === selectedUnitCode) ?? null;
	});

	// Retain last selected unit data so the fly-out transition can still
	// read properties while the panel animates away
	/** @type {any} */
	let displayUnit = $state(null);

	/** Index of the photo shown in the lightbox (-1 = closed) */
	let lightboxIndex = $state(-1);

	let lightboxPhoto = $derived(lightboxIndex >= 0 ? facility.photos?.[lightboxIndex] : null);
	$effect(() => {
		if (selectedUnit) displayUnit = selectedUnit;
	});

	/**
	 * @param {number | null | undefined} val
	 * @returns {string}
	 */
	function fmtCap(val) {
		if (val == null) return '—';
		return val.toLocaleString('en-AU', { maximumFractionDigits: 1 });
	}

	/**
	 * Get fuel tech colour for a code
	 * @param {string | undefined} code
	 * @returns {string}
	 */
	function ftColour(code) {
		if (!code) return '#ccc';
		return (
			fuelTechColourMap[/** @type {keyof typeof fuelTechColourMap} */ (code)] || '#888'
		);
	}

	const SANITY_STUDIO_BASE = 'https://www.sanity.io/@oWUWl4BzU/studio/41a3d18a0c474b3d11a5dc28';

	/**
	 * Build a Sanity Studio intent URL for editing a document.
	 * @param {string} id - Document _id
	 * @param {string} type - Document _type
	 * @returns {string}
	 */
	function sanityEditUrl(id, type) {
		return `${SANITY_STUDIO_BASE}/intent/edit/id=${id};type=${type}/?dataset=${dataset}`;
	}

	// --- Per-section edit mode ---
	let editing = $state(false);
	let descriptionText = $state('');

	/** @type {{ label: string, value: string }[]} */
	let regionOptions = $state([]);
	/** @type {{ label: string, value: string }[]} */
	let ownerOptions = $state([]);
	/** @type {{ label: string, value: string }[]} */
	let networkOptions = $state([]);
	/** @type {{ label: string, value: string }[]} */
	let fuelTechOptions = $state([]);
	/** @type {any[]} */
	let fuelTechRaw = $state([]);
	let optionsLoaded = $state(false);
	let optionsLoading = $state(false);
	let saving = $state(false);
	let busy = $derived(editing || saving);
	$effect(() => { onbusy?.(busy); });

	// Photo management state
	let uploading = $state(false);
	let uploadProgress = $state('');
	let draggingOver = $state(false);

	/** Extract plain text from portable text blocks */
	function descriptionToText(/** @type {any[]} */ blocks) {
		if (!blocks?.length) return '';
		return blocks
			.filter((/** @type {any} */ b) => b._type === 'block')
			.map((/** @type {any} */ b) => b.children?.map((/** @type {any} */ c) => c.text).join('') || '')
			.join('\n\n');
	}

	/** Convert plain text back to portable text blocks */
	function textToDescription(/** @type {string} */ text) {
		if (!text.trim()) return [];
		return text.split('\n\n').filter(Boolean).map((/** @type {string} */ p, /** @type {number} */ i) => ({
			_type: 'block',
			_key: `block-${i}`,
			style: 'normal',
			children: [{ _type: 'span', _key: `span-${i}`, text: p.trim(), marks: [] }],
			markDefs: []
		}));
	}

	function toggleEdit() {
		if (!editing) {
			editing = true;
			loadOptions();
			descriptionText = descriptionToText(facility.description);
		} else {
			editing = false;
			saveDescription();
		}
	}

	async function saveDescription() {
		const blocks = textToDescription(descriptionText);
		facility.description = blocks;
		onupdate?.(facility);
		await patchFacility('description', blocks);
	}

	async function loadOptions() {
		if (optionsLoaded) return;
		optionsLoading = true;
		try {
			const res = await fetch('/api/cms/options', { headers: await authHeaders() });
			const data = await res.json();
			regionOptions = (data.regions ?? []).map((/** @type {any} */ r) => ({
				label: `${r.name} (${r.code})`,
				value: r._id
			}));
			ownerOptions = (data.owners ?? []).map((/** @type {any} */ o) => ({
				label: o.name || o.legal_name,
				value: o._id
			}));
			networkOptions = (data.networks ?? []).map((/** @type {any} */ n) => ({
				label: `${n.name} (${n.code})`,
				value: n._id
			}));
			fuelTechRaw = data.fuelTechnologies ?? [];
			fuelTechOptions = fuelTechRaw.map((/** @type {any} */ ft) => ({
				label: `${ft.name} (${ft.code})`,
				value: ft._id
			}));
			optionsLoaded = true;
		} catch (e) {
			console.error('Failed to load options', e);
		} finally {
			optionsLoading = false;
		}
	}

	/**
	 * @param {string} field
	 * @param {any} value
	 */
	async function patchFacility(field, value) {
		saving = true;
		try {
			const res = await fetch('/api/cms/facilities', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
				body: JSON.stringify({
					facilityId: facility._id,
					patches: { [field]: value }
				})
			});
			if (!res.ok) throw new Error('Patch failed');
		} catch (e) {
			console.error('Failed to save', e);
		} finally {
			saving = false;
		}
	}

	// --- Photo management ---

	/** @param {FileList | File[]} files */
	async function uploadPhotos(files) {
		const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
		if (!imageFiles.length) return;

		uploading = true;
		const hdrs = await authHeaders();

		for (let i = 0; i < imageFiles.length; i++) {
			uploadProgress =
				imageFiles.length > 1
					? `Uploading ${i + 1} of ${imageFiles.length}...`
					: 'Uploading...';

			const form = new FormData();
			form.append('file', imageFiles[i]);

			try {
				const res = await fetch('/api/cms/upload', {
					method: 'POST',
					headers: hdrs,
					body: form
				});
				if (!res.ok) {
					console.error('Upload failed for', imageFiles[i].name);
					continue;
				}
				const { assetId, key } = await res.json();

				const newPhoto = {
					_type: 'image',
					_key: key,
					asset: { _type: 'reference', _ref: assetId },
					alt: '',
					caption: '',
					attribution: ''
				};

				facility.photos = [...(facility.photos ?? []), newPhoto];
			} catch (e) {
				console.error('Upload error', e);
			}
		}

		onupdate?.(facility);
		await patchFacility('photos', facility.photos);

		uploading = false;
		uploadProgress = '';
	}

	/** @param {number} index */
	async function removePhoto(index) {
		facility.photos = (facility.photos ?? []).filter((/** @type {any} */ _, /** @type {number} */ i) => i !== index);
		onupdate?.(facility);
		await patchFacility('photos', facility.photos);
	}

	/**
	 * @param {number} index
	 * @param {string} caption
	 */
	async function savePhotoCaption(index, caption) {
		const trimmed = caption.trim();
		if (trimmed === (facility.photos?.[index]?.caption ?? '')) return;
		facility.photos[index].caption = trimmed;
		onupdate?.(facility);
		await patchFacility('photos', facility.photos);
	}

	/**
	 * Save a text field on blur or Enter.
	 * @param {string} field - Sanity field name
	 * @param {string} value - new value
	 * @param {string} displayPath - dot-path on facility for local update (e.g. 'website')
	 */
	async function saveTextField(field, value, displayPath) {
		const trimmed = value.trim();
		const current = displayPath.split('.').reduce((/** @type {any} */ o, k) => o?.[k], facility);
		if (trimmed === (current ?? '')) return; // no change
		// Update local state immediately
		const parts = displayPath.split('.');
		if (parts.length === 1) {
			facility[parts[0]] = trimmed || null;
		} else {
			let obj = facility;
			for (let i = 0; i < parts.length - 1; i++) {
				if (!obj[parts[i]]) obj[parts[i]] = {};
				obj = obj[parts[i]];
			}
			obj[parts[parts.length - 1]] = trimmed ? Number(trimmed) || trimmed : null;
		}
		onupdate?.(facility);
		await patchFacility(field, trimmed || null);
	}

	/** @param {string} networkId */
	async function handleNetworkChange(networkId) {
		const opt = networkOptions.find((o) => o.value === networkId);
		if (opt) {
			facility.network = { _id: networkId, name: opt.label.replace(/ \(.*\)$/, ''), code: '' };
		}
		onupdate?.(facility);
		const ref = { _type: 'reference', _ref: networkId };
		await patchFacility('network', ref);
	}

	/** @param {string} regionId */
	async function handleRegionChange(regionId) {
		const opt = regionOptions.find((o) => o.value === regionId);
		if (opt) {
			facility.region = { _id: regionId, name: opt.label.replace(/ \(.*\)$/, ''), code: '' };
		}
		onupdate?.(facility);
		const ref = { _type: 'reference', _ref: regionId };
		await patchFacility('region', ref);
	}

	/**
	 * Save lat/lng as a location object.
	 * @param {'lat' | 'lng'} coord
	 * @param {string} value
	 */
	async function saveLocation(coord, value) {
		const num = parseFloat(value);
		if (isNaN(num)) return;
		const current = facility.location?.[coord];
		if (num === current) return;
		const location = {
			_type: 'geopoint',
			lat: coord === 'lat' ? num : (facility.location?.lat ?? 0),
			lng: coord === 'lng' ? num : (facility.location?.lng ?? 0)
		};
		facility.location = location;
		onupdate?.(facility);
		await patchFacility('location', location);
	}

	/** @param {string} ownerId */
	async function handleAddOwner(ownerId) {
		if (facility.owners?.some((/** @type {any} */ o) => o._id === ownerId)) return;
		const opt = ownerOptions.find((o) => o.value === ownerId);
		if (opt) {
			facility.owners = [...(facility.owners ?? []), { _id: ownerId, name: opt.label }];
		}
		onupdate?.(facility);
		const currentRefs = (facility.owners ?? []).map((/** @type {any} */ o) => ({
			_type: 'reference',
			_ref: o._id,
			_key: o._id.slice(-8)
		}));
		await patchFacility('owners', currentRefs);
	}

	/** @param {string} ownerId */
	async function handleRemoveOwner(ownerId) {
		const updatedOwners = (facility.owners ?? []).filter(
			(/** @type {any} */ o) => o._id !== ownerId
		);
		facility.owners = updatedOwners;
		onupdate?.(facility);
		const refs = updatedOwners.map((/** @type {any} */ o) => ({
			_type: 'reference',
			_ref: o._id,
			_key: o._id.slice(-8)
		}));
		await patchFacility('owners', refs);
	}

	// --- Unit editing ---

	/** Status options for unit status field */
	const statusOptions = [
		{ label: 'Operating', value: 'operating' },
		{ label: 'Retired', value: 'retired' },
		{ label: 'Committed', value: 'committed' }
	];

	/** Dispatch type options */
	const dispatchTypeOptions = [
		{ label: 'GENERATOR', value: 'GENERATOR' },
		{ label: 'LOAD', value: 'LOAD' }
	];

	/** Keys handled explicitly in the unit detail template (references, special formatting, internal fields) */
	const KNOWN_UNIT_KEYS = new Set([
		'_id', '_type', '_rev', '_createdAt', '_updatedAt',
		'code', 'fuel_technology', 'dispatch_type', 'status',
		'capacity_registered', 'capacity_maximum', 'storage_capacity',
		'min_generation_capacity', 'grid_forming', 'marginal_loss_factor',
		'emissions_factor_co2', 'emissions_factor_source',
		'data_first_seen', 'data_last_seen',
		'commissioning_confirmed',
		'expected_operation_date', 'expected_operation_date_specificity',
		'expected_closure_date', 'expected_closure_date_specificity',
		'commencement_date', 'commencement_date_specificity',
		'closure_date', 'closure_date_specificity',
		'construction_start_date', 'construction_start_date_source', 'construction_start_date_specificity',
		'construction_cost', 'construction_cost_source',
		'cis_tender_recipient',
		'epbc_id', 'epbc_number',
		'expected_closure_date_source',
		'project_approval_date', 'project_approval_date_source', 'project_approval_lodgement_date',
		'state_approval_date', 'state_approval_source', 'state_lodgement_date',
		'unit_types', 'metadata_array'
	]);

	/** Extra unit keys not explicitly handled — auto-rendered at the end */
	let extraUnitKeys = $derived.by(() => {
		if (!displayUnit) return [];
		return Object.keys(displayUnit).filter((k) => !KNOWN_UNIT_KEYS.has(k));
	});

	/** Primitive extra keys (editable) */
	let extraPrimitiveKeys = $derived(
		extraUnitKeys.filter((k) => {
			const v = displayUnit?.[k];
			return v == null || typeof v !== 'object';
		})
	);

	/** Object/array extra keys (read-only) */
	let extraObjectKeys = $derived(
		extraUnitKeys.filter((k) => {
			const v = displayUnit?.[k];
			return v != null && typeof v === 'object';
		})
	);

	/** Check if a value is a Sanity reference */
	function isRef(/** @type {any} */ val) {
		return val != null && typeof val === 'object' && '_ref' in val;
	}

	/** Resolved reference names, keyed by _ref ID */
	let resolvedRefs = $state(/** @type {Record<string, any>} */ ({}));

	/** Resolve _ref IDs to document names */
	$effect(() => {
		const refIds = extraObjectKeys
			.map((k) => displayUnit?.[k])
			.filter(isRef)
			.map((/** @type {any} */ v) => v._ref)
			.filter((/** @type {string} */ id) => !(id in resolvedRefs));

		if (!refIds.length) return;

		(async () => {
			try {
				const res = await fetch(`/api/cms/resolve-refs?ids=${refIds.join(',')}`, {
					headers: await authHeaders()
				});
				if (res.ok) {
					const data = await res.json();
					/** @type {Record<string, any>} */
					const merged = { ...resolvedRefs };
					for (const id of refIds) {
						merged[id] = data[id] ?? null;
					}
					resolvedRefs = merged;
				}
			} catch (e) {
				console.error('Failed to resolve refs', e);
			}
		})();
	});

	/**
	 * Format a reference value for display.
	 * @param {any} val
	 * @returns {string}
	 */
	function formatRefValue(val) {
		if (!isRef(val)) return JSON.stringify(val);
		const resolved = resolvedRefs[val._ref];
		if (resolved) {
			return resolved.name || resolved.title || resolved.code || val._ref;
		}
		return val._ref;
	}

	/**
	 * Format a value for display — handles objects/arrays as JSON.
	 * @param {any} val
	 * @returns {string}
	 */
	function formatAutoValue(val) {
		if (val == null) return '';
		if (typeof val === 'object') return JSON.stringify(val);
		return String(val);
	}

	/**
	 * Check if a value looks like a URL.
	 * @param {any} val
	 * @returns {boolean}
	 */
	function isUrl(val) {
		return typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'));
	}

	/**
	 * Infer edit field type from a value.
	 * @param {any} val
	 * @returns {'text' | 'number' | 'boolean'}
	 */
	function inferFieldType(val) {
		if (typeof val === 'number') return 'number';
		if (typeof val === 'boolean') return 'boolean';
		return 'text';
	}

	/**
	 * Patch a unit document in Sanity.
	 * @param {string} unitId
	 * @param {string} field
	 * @param {any} value
	 */
	async function patchUnit(unitId, field, value) {
		saving = true;
		try {
			const res = await fetch('/api/cms/facilities', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
				body: JSON.stringify({
					facilityId: unitId,
					patches: { [field]: value }
				})
			});
			if (!res.ok) throw new Error('Unit patch failed');
		} catch (e) {
			console.error('Failed to save unit field', e);
		} finally {
			saving = false;
		}
	}

	/**
	 * Find and return the mutable unit object in facility.units by code.
	 * @param {string} code
	 * @returns {any | null}
	 */
	function getMutableUnit(code) {
		return facility.units?.find((/** @type {any} */ u) => u.code === code) ?? null;
	}

	/**
	 * Save a text/number field on a unit.
	 * @param {string} field - Sanity field name
	 * @param {string} value - new value
	 * @param {string} displayProp - property name on the unit object for local update
	 * @param {'text' | 'number' | 'boolean'} [type] - field type for parsing
	 */
	async function saveUnitField(field, value, displayProp, type = 'text') {
		if (!selectedUnitCode) return;
		const unit = getMutableUnit(selectedUnitCode);
		if (!unit) return;

		const trimmed = value.trim();
		const current = unit[displayProp];

		let parsed;
		if (type === 'number') {
			parsed = trimmed === '' ? null : parseFloat(trimmed);
			if (parsed !== null && isNaN(/** @type {number} */ (parsed))) return;
		} else if (type === 'boolean') {
			parsed = trimmed === '' ? null : trimmed === 'true';
		} else {
			parsed = trimmed || null;
		}

		if (parsed === (current ?? null)) return;

		unit[displayProp] = parsed;
		onupdate?.(facility);
		await patchUnit(unit._id, field, parsed);
	}

	/**
	 * Handle fuel technology change for a unit.
	 * @param {string} fuelTechId
	 */
	async function handleUnitFuelTechChange(fuelTechId) {
		if (!selectedUnitCode) return;
		const unit = getMutableUnit(selectedUnitCode);
		if (!unit) return;

		const ft = fuelTechRaw.find((/** @type {any} */ f) => f._id === fuelTechId);
		if (ft) {
			unit.fuel_technology = { _id: ft._id, code: ft.code, name: ft.name, colour: ft.colour, renewable: ft.renewable, dispatch_type: ft.dispatch_type };
		}
		onupdate?.(facility);
		await patchUnit(unit._id, 'fuel_technology', { _type: 'reference', _ref: fuelTechId });
	}

	/**
	 * Handle unit status change.
	 * @param {string} status
	 */
	async function handleUnitStatusChange(status) {
		if (!selectedUnitCode) return;
		const unit = getMutableUnit(selectedUnitCode);
		if (!unit) return;
		unit.status = status;
		onupdate?.(facility);
		await patchUnit(unit._id, 'status', status);
	}

	/**
	 * Handle unit dispatch type change.
	 * @param {string} dispatchType
	 */
	async function handleUnitDispatchTypeChange(dispatchType) {
		if (!selectedUnitCode) return;
		const unit = getMutableUnit(selectedUnitCode);
		if (!unit) return;
		unit.dispatch_type = dispatchType;
		onupdate?.(facility);
		await patchUnit(unit._id, 'dispatch_type', dispatchType);
	}

	/**
	 * Save a field on a unit_type document.
	 * @param {any} ut - the unit_type object (must have _id)
	 * @param {string} field - Sanity field name
	 * @param {string} value - new value from input
	 * @param {string} displayProp - property name on the ut object
	 * @param {'text' | 'number'} [type]
	 */
	async function saveUnitTypeField(ut, field, value, displayProp, type = 'text') {
		const trimmed = value.trim();
		let parsed;
		if (type === 'number') {
			parsed = trimmed === '' ? null : parseFloat(trimmed);
			if (parsed !== null && isNaN(/** @type {number} */ (parsed))) return;
		} else {
			parsed = trimmed || null;
		}
		if (parsed === (ut[displayProp] ?? null)) return;
		ut[displayProp] = parsed;
		onupdate?.(facility);
		await patchUnit(ut._id, field, parsed);
	}
</script>

{#snippet kv(/** @type {string} */ label, /** @type {any} */ value)}
	<div class="grid grid-cols-3 gap-2 py-[3px] border-b border-warm-grey/60">
		<span class="text-[11px] text-mid-grey font-mono truncate" title={label}>{label}</span>
		{#if isUrl(value)}
			<a href={value} target="_blank" rel="noopener noreferrer" class="text-[12px] text-dark-grey font-mono break-all col-span-2 inline-flex items-center gap-1 underline decoration-dotted decoration-mid-grey underline-offset-2 hover:text-black hover:decoration-solid hover:decoration-dark-grey">{value}<ExternalLink size={10} class="shrink-0" /></a>
		{:else if value != null && value !== ''}
			<span class="text-[12px] text-dark-grey font-mono break-all col-span-2">{value}</span>
		{:else}
			<span class="text-[12px] text-mid-grey/50 font-mono col-span-2">—</span>
		{/if}
	</div>
{/snippet}

{#snippet kvEdit(/** @type {string} */ label, /** @type {any} */ value, /** @type {string} */ field, /** @type {string} */ displayPath)}
	<div class="grid grid-cols-3 gap-2 py-[3px] border-b border-warm-grey/60">
		<span class="text-[11px] text-mid-grey font-mono truncate" title={label}>{label}</span>
		<input
			type="text"
			value={value ?? ''}
			class="col-span-2 text-[12px] text-dark-grey font-mono border border-warm-grey rounded px-1.5 py-0.5 hover:border-dark-grey focus:border-dark-grey focus:outline-none transition-colors bg-transparent"
			disabled={saving}
			onblur={(e) => saveTextField(field, e.currentTarget.value, displayPath)}
			onkeydown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
		/>
	</div>
{/snippet}

{#snippet kvRef(/** @type {string} */ label, /** @type {{ label: string, value: string }[]} */ options, /** @type {string | null} */ selectedId, /** @type {(id: string) => void} */ onselect)}
	<div class="grid grid-cols-3 gap-2 py-[3px] border-b border-warm-grey/60">
		<span class="text-[11px] text-mid-grey font-mono truncate" title={label}>{label}</span>
		<div class="col-span-2">
			{#if optionsLoading}
				<span class="text-[11px] text-mid-grey font-mono">Loading...</span>
			{:else}
				<InlineDropdown
					{options}
					selected={selectedId}
					placeholder="Select {label}"
					{onselect}
					disabled={saving}
				/>
			{/if}
		</div>
	</div>
{/snippet}

{#snippet kvUnitEdit(/** @type {string} */ label, /** @type {any} */ value, /** @type {string} */ field, /** @type {string} */ displayProp, /** @type {'text' | 'number' | 'boolean'} */ type)}
	<div class="grid grid-cols-3 gap-2 py-[3px] border-b border-warm-grey/60">
		<span class="text-[11px] text-mid-grey font-mono truncate" title={label}>{label}</span>
		<input
			type="text"
			value={value ?? ''}
			class="col-span-2 text-[12px] text-dark-grey font-mono border border-warm-grey rounded px-1.5 py-0.5 hover:border-dark-grey focus:border-dark-grey focus:outline-none transition-colors bg-transparent"
			disabled={saving}
			onblur={(e) => saveUnitField(field, e.currentTarget.value, displayProp, type)}
			onkeydown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
		/>
	</div>
{/snippet}

{#snippet kvUtEdit(/** @type {any} */ ut, /** @type {string} */ label, /** @type {any} */ value, /** @type {string} */ field, /** @type {string} */ displayProp, /** @type {'text' | 'number'} */ type)}
	<div class="grid grid-cols-3 gap-2 py-[3px] border-b border-warm-grey/60">
		<span class="text-[11px] text-mid-grey font-mono truncate" title={label}>{label}</span>
		<input
			type="text"
			value={value ?? ''}
			class="col-span-2 text-[12px] text-dark-grey font-mono border border-warm-grey rounded px-1.5 py-0.5 hover:border-dark-grey focus:border-dark-grey focus:outline-none transition-colors bg-transparent"
			disabled={saving}
			onblur={(e) => saveUnitTypeField(ut, field, e.currentTarget.value, displayProp, type)}
			onkeydown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
		/>
	</div>
{/snippet}

{#snippet kvAuto(/** @type {string} */ label, /** @type {any} */ value)}
	<div class="grid grid-cols-3 gap-2 py-[3px] border-b border-warm-grey/60">
		<span class="text-[11px] text-mid-grey font-mono truncate" title={label}>{label}</span>
		{#if isUrl(value)}
			<a href={value} target="_blank" rel="noopener noreferrer" class="text-[9px] text-dark-grey/70 font-mono break-all col-span-2 leading-tight inline-flex items-center gap-1 underline decoration-dotted decoration-mid-grey underline-offset-2 hover:text-black hover:decoration-solid hover:decoration-dark-grey">{value}<ExternalLink size={10} class="shrink-0" /></a>
		{:else if value != null && value !== ''}
			<span class="text-[9px] text-dark-grey/70 font-mono break-all col-span-2 leading-tight">{value}</span>
		{:else}
			<span class="text-[9px] text-mid-grey/50 font-mono col-span-2">—</span>
		{/if}
	</div>
{/snippet}

{#snippet kvAutoEdit(/** @type {string} */ label, /** @type {any} */ value, /** @type {string} */ field, /** @type {string} */ displayProp, /** @type {'text' | 'number' | 'boolean'} */ type)}
	<div class="grid grid-cols-3 gap-2 py-[3px] border-b border-warm-grey/60">
		<span class="text-[11px] text-mid-grey font-mono truncate" title={label}>{label}</span>
		<input
			type="text"
			value={value ?? ''}
			class="col-span-2 text-[9px] text-dark-grey/70 font-mono border border-warm-grey rounded px-1.5 py-0.5 hover:border-dark-grey focus:border-dark-grey focus:outline-none transition-colors bg-transparent leading-tight"
			disabled={saving}
			onblur={(e) => saveUnitField(field, e.currentTarget.value, displayProp, type)}
			onkeydown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
		/>
	</div>
{/snippet}

{#snippet sectionLabel(/** @type {string} */ title)}
	<div class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey">
		{title}
	</div>
{/snippet}

{#snippet kvLink(/** @type {string} */ label, /** @type {any} */ displayText, /** @type {string | null} */ href, /** @type {string} */ description)}
	<div class="grid grid-cols-3 gap-2 py-[3px] border-b border-warm-grey/60">
		<span class="text-[11px] text-mid-grey font-mono truncate" title={label}>{label}</span>
		{#if displayText != null && displayText !== '' && href}
			<a {href} target="_blank" rel="noopener noreferrer" title="Open on {description} (new tab)" class="text-[12px] text-dark-grey font-mono col-span-2 inline-flex items-center gap-1 underline decoration-dotted decoration-mid-grey underline-offset-2 hover:text-black hover:decoration-solid hover:decoration-dark-grey focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark-grey rounded-sm">{displayText}<ExternalLink size={10} class="shrink-0" /></a>
		{:else if displayText != null && displayText !== ''}
			<span class="text-[12px] text-dark-grey font-mono break-all col-span-2">{displayText}</span>
		{:else}
			<span class="text-[12px] text-mid-grey/50 font-mono col-span-2">—</span>
		{/if}
	</div>
{/snippet}

<div class="flex-1 flex flex-col min-h-0 transition-colors" style:background-color={editing ? 'rgb(254 252 232)' : ''}>
	<PanelHeader class={saving ? "saving-hatch" : ""}>
		<span
			class="w-2.5 h-2.5 rounded-full shrink-0"
			style="background: {ftColour(facility.units?.[0]?.fuel_technology?.code)}"
		></span>
		<span class="text-[12px] font-medium text-dark-grey flex-1 truncate">{facility.name || 'Unnamed'}</span>
		<a
			href={sanityEditUrl(facility._id, 'facility')}
			target="_blank"
			rel="noopener noreferrer"
			class="text-[9px] px-1.5 py-0.5 border border-warm-grey rounded transition-colors inline-flex items-center gap-1 shrink-0 text-mid-grey hover:text-dark-grey hover:border-dark-grey no-underline"
		>
			<ExternalLink size={8} />
			Edit in Sanity
		</a>
		<button
			onclick={toggleEdit}
			class="text-[9px] px-1.5 py-0.5 border rounded transition-colors inline-flex items-center gap-1 shrink-0 {editing ? 'border-dark-grey bg-dark-grey text-white' : 'border-warm-grey text-mid-grey hover:text-dark-grey hover:border-dark-grey'}"
		>
			<Pencil size={8} />
			{editing ? 'DONE' : 'EDIT'}
			<kbd class="text-[8px] px-0.5 rounded {editing ? 'bg-white/20' : 'bg-warm-grey'}">{editing ? 'esc' : 'E'}</kbd>
		</button>
		{#if onclose}
			<button
				onclick={onclose}
				class="p-1 hover:bg-warm-grey rounded transition-colors"
				title="Close"
			>
				<X size={12} class="text-mid-grey" />
			</button>
		{/if}
	</PanelHeader>

	<div class="flex-1 flex min-h-0">
	<div class="flex-1 overflow-y-auto min-w-0">
	<div class="p-5">

		<!-- Photos -->
		{#if editing || facility.photos?.length > 0}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="mb-5 rounded-lg border-2 transition-colors p-2 {draggingOver && editing ? 'border-dashed border-blue-400 bg-blue-50/30' : 'border-transparent'}"
				ondragover={(e) => { if (!editing) return; e.preventDefault(); draggingOver = true; }}
				ondragleave={() => { draggingOver = false; }}
				ondrop={(e) => {
					if (!editing) return;
					e.preventDefault();
					draggingOver = false;
					if (e.dataTransfer?.files?.length) uploadPhotos(e.dataTransfer.files);
				}}
			>
				{#if uploading}
					<p class="text-[11px] text-mid-grey font-mono py-1 mb-2">{uploadProgress}</p>
				{/if}

				<div class="flex gap-2 overflow-x-auto pb-1">
					{#each facility.photos ?? [] as photo, i (photo._key || i)}
						<div class="shrink-0 group max-w-[200px]">
							<div class="relative inline-block">
								<img
									src={photo.asset
										? urlFor(photo).width(400).url()
										: photo.url}
									alt={photo.alt ||
										photo.caption ||
										`${facility.name} photo ${i + 1}`}
									class="rounded border border-warm-grey max-h-[120px] max-w-[200px] cursor-zoom-in"
									onclick={() => (lightboxIndex = i)}
								/>
								{#if editing}
									<button
										class="absolute top-0.5 right-0.5 z-10 opacity-70 hover:opacity-100 transition-opacity"
										title="Remove photo"
										onclick={(e) => { e.stopPropagation(); removePhoto(i); }}
										disabled={saving}
									>
										<CircleX size={16} class="fill-black stroke-white" strokeWidth={2} />
									</button>
								{/if}
							</div>

							{#if editing}
								<input
									type="text"
									bind:value={photo.caption}
									placeholder="caption"
									class="w-full text-[9px] text-mid-grey font-mono mt-1 max-w-[200px] border border-warm-grey rounded px-1 py-0.5 hover:border-dark-grey focus:border-dark-grey focus:outline-none transition-colors bg-transparent"
									onblur={(e) => savePhotoCaption(i, e.currentTarget.value)}
									onkeydown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
								/>
							{:else if photo.caption || photo.attribution}
								<p class="text-[9px] text-mid-grey mt-1 truncate max-w-[200px]">
									{photo.caption || ''}{#if photo.attribution}{photo.caption
										? ' — '
										: ''}{photo.attribution}{/if}
								</p>
							{/if}
						</div>
					{/each}

					{#if editing}
						<button
							class="shrink-0 w-[120px] h-[120px] rounded border-2 border-dashed border-warm-grey flex flex-col items-center justify-center gap-1 text-mid-grey hover:border-dark-grey hover:text-dark-grey transition-colors"
							title="Add photo"
							disabled={uploading}
							onclick={() => {
								const input = document.createElement('input');
								input.type = 'file';
								input.accept = 'image/png,image/jpeg,image/gif,image/webp,image/avif';
								input.multiple = true;
								input.onchange = () => { if (input.files?.length) uploadPhotos(input.files); };
								input.click();
							}}
						>
							<Plus size={20} />
							<span class="text-[9px] font-mono">Add photo</span>
						</button>
					{/if}
				</div>

				{#if editing && draggingOver}
					<p class="text-[10px] text-blue-500 font-mono mt-1">Drop images to upload</p>
				{/if}
			</div>
		{/if}

		<!-- Facility section -->
		<div class="mb-5">
			{@render sectionLabel('Facility')}
			{#if editing}
				{@render kvEdit('name', facility.name, 'name', 'name')}
				{@render kvEdit('code', facility.code, 'code', 'code')}
				{@render kvRef('network', networkOptions, facility.network?._id ?? null, handleNetworkChange)}
				{@render kvRef('region', regionOptions, facility.region?._id ?? null, handleRegionChange)}
				<div class="grid grid-cols-3 gap-2 py-[3px] border-b border-warm-grey/60">
					<span class="text-[11px] text-mid-grey font-mono truncate" title="location">location</span>
					<div class="col-span-2 flex gap-1">
						<input
							type="text"
							value={facility.location?.lat?.toFixed(5) ?? ''}
							placeholder="lat"
							class="flex-1 text-[12px] text-dark-grey font-mono border border-warm-grey rounded px-1.5 py-0.5 hover:border-dark-grey focus:border-dark-grey focus:outline-none transition-colors bg-transparent"
							disabled={saving}
							onblur={(e) => saveLocation('lat', e.currentTarget.value)}
							onkeydown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
						/>
						<input
							type="text"
							value={facility.location?.lng?.toFixed(5) ?? ''}
							placeholder="lng"
							class="flex-1 text-[12px] text-dark-grey font-mono border border-warm-grey rounded px-1.5 py-0.5 hover:border-dark-grey focus:border-dark-grey focus:outline-none transition-colors bg-transparent"
							disabled={saving}
							onblur={(e) => saveLocation('lng', e.currentTarget.value)}
							onkeydown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
						/>
					</div>
				</div>
				{@render kvEdit('website', facility.website, 'website', 'website')}
				{@render kvEdit('wikipedia', facility.wikipedia, 'wikipedia', 'wikipedia')}
				{@render kvEdit('wikidata_id', facility.wikidata_id, 'wikidata_id', 'wikidata_id')}
				{@render kvEdit('osm_way_id', facility.osm_way_id, 'osm_way_id', 'osm_way_id')}
				{@render kvEdit('npi_id', facility.npiId, 'npiId', 'npiId')}
			{:else}
				{@render kv('name', facility.name)}
				{@render kv('code', facility.code)}
				{@render kv('network', facility.network?.name)}
				{@render kv('region', facility.region?.name)}
				{@render kv(
					'location',
					facility.location?.lat && facility.location?.lng
						? `${facility.location.lat.toFixed(5)}, ${facility.location.lng.toFixed(5)}`
						: null
				)}
				{@render kvLink('website', facility.website ? 'facility website' : null, facility.website, 'Website')}
				{@render kvLink('wikipedia', facility.wikipedia, facility.wikipedia, EXTERNAL_LINKS.wikipedia.label)}
				{@render kvLink('wikidata_id', facility.wikidata_id, facility.wikidata_id ? `${EXTERNAL_LINKS.wikidata.baseUrl}/${facility.wikidata_id}` : null, EXTERNAL_LINKS.wikidata.label)}
				<!-- osm_way_id with fetch/view button -->
				<div class="grid grid-cols-3 gap-2 py-[3px] border-b border-warm-grey/60">
					<span class="text-[11px] text-mid-grey font-mono truncate" title="osm_way_id">osm_way_id</span>
					{#if facility.osm_way_id}
						<span class="text-[12px] text-dark-grey font-mono col-span-2 inline-flex items-center gap-1.5">
							<a href="{EXTERNAL_LINKS.openStreetMap.baseUrl}/way/{facility.osm_way_id}" target="_blank" rel="noopener noreferrer" title="Open on {EXTERNAL_LINKS.openStreetMap.label} (new tab)" class="inline-flex items-center gap-1 underline decoration-dotted decoration-mid-grey underline-offset-2 hover:text-black hover:decoration-solid hover:decoration-dark-grey">{facility.osm_way_id}<ExternalLink size={10} class="shrink-0" /></a>
							{#if osmStatus === 'loading'}
								<button disabled class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-warm-grey text-mid-grey cursor-not-allowed">
									<span class="w-3 h-3 border-[1.5px] border-mid-grey/60 border-t-dark-grey rounded-full animate-spin"></span>
									Fetching
								</button>
							{:else if osmStatus === 'ok'}
								<button onclick={onfetchosm} class="text-[10px] px-1.5 py-0.5 rounded border border-warm-grey text-dark-grey hover:bg-warm-grey/50 hover:border-dark-grey transition-colors cursor-pointer">View</button>
							{:else if osmStatus === 'not-found'}
								<span class="text-[10px] text-mid-warm-grey" title="No polygon found for this OSM ID">&#9888;</span>
							{:else if osmStatus === 'error'}
								<button onclick={onfetchosm} class="text-[10px] px-1.5 py-0.5 rounded border border-red/30 text-red hover:border-red/50 transition-colors cursor-pointer">Retry</button>
							{:else}
								<button onclick={onfetchosm} class="text-[10px] px-1.5 py-0.5 rounded border border-warm-grey text-dark-grey hover:bg-warm-grey/50 hover:border-dark-grey transition-colors cursor-pointer">Fetch</button>
							{/if}
						</span>
					{:else}
						<span class="text-[12px] text-mid-grey/50 font-mono col-span-2">—</span>
					{/if}
				</div>
				{@render kv('npi_id', facility.npiId)}
			{/if}
		</div>

		<!-- Description -->
		<div class="mb-5">
			{@render sectionLabel('Description')}
			{#if editing}
				<textarea
					bind:value={descriptionText}
					class="w-full text-[12px] text-dark-grey leading-relaxed font-sans border border-warm-grey rounded px-2 py-1.5 hover:border-dark-grey focus:border-dark-grey focus:outline-none transition-colors bg-transparent resize-y min-h-[80px]"
					disabled={saving}
					rows="5"
				></textarea>
			{:else if facility.description?.length > 0}
				<div class="text-[12px] text-dark-grey leading-relaxed font-sans">
					{#each facility.description as block, i (block._key || i)}
						{#if block._type === 'block'}
							<p class="mb-1.5">
								{block.children
									?.map((/** @type {any} */ c) => c.text)
									.join('') || ''}
							</p>
						{/if}
					{/each}
				</div>
			{:else}
				<span class="text-[12px] text-mid-grey/50 font-mono">No description</span>
			{/if}
		</div>

		<!-- Owners -->
		<div class="mb-5">
			{@render sectionLabel('Owners')}
			{#if editing}
				{#if facility.owners?.length > 0}
					{#each facility.owners as owner (owner._id)}
						<div class="flex items-center gap-2 py-[3px] border-b border-warm-grey/60">
							<span class="text-[12px] text-dark-grey font-mono flex-1 truncate">{owner.name || owner.legal_name}</span>
							<button
								onclick={() => handleRemoveOwner(owner._id)}
								class="p-0.5 rounded hover:bg-warm-grey transition-colors shrink-0"
								title="Remove owner"
								disabled={saving}
							>
								<X size={10} class="text-mid-grey" />
							</button>
						</div>
					{/each}
				{/if}
				{#if optionsLoading}
					<span class="text-[11px] text-mid-grey font-mono py-1 block">Loading...</span>
				{:else}
					<div class="mt-1">
						<InlineDropdown
							options={ownerOptions.filter((o) => !facility.owners?.some((/** @type {any} */ ow) => ow._id === o.value))}
							selected={null}
							placeholder="Add owner..."
							onselect={handleAddOwner}
							disabled={saving}
						/>
					</div>
				{/if}
			{:else if facility.owners?.length > 0}
				{#each facility.owners as owner (owner._id)}
					<div class="flex items-center gap-2 py-[3px] border-b border-warm-grey/60">
						{#if owner.website}
							<a
								href={owner.website}
								target="_blank"
								rel="noopener noreferrer"
								title="Open website (new tab)"
								class="text-[12px] text-dark-grey hover:text-black inline-flex items-center gap-1 underline decoration-dotted decoration-mid-grey underline-offset-2 hover:decoration-solid hover:decoration-dark-grey focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark-grey rounded-sm"
							>{owner.name || owner.legal_name}<ExternalLink size={10} class="shrink-0" /></a>
						{:else}
							<span class="text-[12px] text-dark-grey">{owner.name || owner.legal_name}</span>
						{/if}
						{#if owner.contact_email}
							<a
								href="mailto:{owner.contact_email}"
								title="Send email to {owner.contact_email}"
								class="text-[10px] text-mid-grey hover:text-dark-grey underline decoration-dotted decoration-mid-grey underline-offset-2 hover:decoration-solid hover:decoration-dark-grey focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark-grey rounded-sm"
							>{owner.contact_email}</a>
						{/if}
					</div>
				{/each}
			{:else}
				<span class="text-[12px] text-mid-grey/50 font-mono">No owners</span>
			{/if}
		</div>

		<!-- Metadata -->
		{#if facility.metadata_array?.length > 0}
			<div class="mb-5">
				<div
					class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey"
				>
					Metadata
				</div>
				{#each facility.metadata_array as meta, i (i)}
					{@render kv(meta.key, meta.value)}
				{/each}
			</div>
		{/if}

		<!-- Units -->
		{#if facility.units?.length > 0}
			<div>
				<div
					class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey"
				>
					Units ({facility.units.length})
				</div>
				{#each facility.units as unit (unit._id)}
					<button
						onclick={() => onselectunit?.(unit.code)}
						class="w-full text-left grid grid-cols-[16px_8px_1fr_50px_14px] items-center gap-2 py-1.5 px-1 hover:bg-warm-grey/50 rounded transition-colors {selectedUnitCode === unit.code ? 'bg-warm-grey/30' : ''}"
					>
						<FacilityStatusIcon status={unit.status || 'operating'} />
						<span
							class="w-2 h-2 rounded-full"
							style="background: {ftColour(unit.fuel_technology?.code)}"
						></span>
						<span class="text-[11px] text-dark-grey truncate"
							>{unit.code || '—'}</span
						>
						<span class="text-[10px] text-mid-grey tabular-nums text-right"
							>{fmtCap(unit.capacity_registered)}</span
						>
						<ChevronRight
							size={10}
							class="text-mid-grey/50"
						/>
					</button>
				{/each}
			</div>
		{/if}
	</div>
	</div>

	<!-- Unit detail slide-in panel -->
	{#if selectedUnit}
		<div
			class="flex shrink-0"
			style="width: {unitPanelDrag.value}px;"
			transition:slide={{ axis: 'x', duration: 200 }}
		>
			<DragHandle axis="x" onstart={unitPanelDrag.start} active={unitPanelDrag.isDragging} class="border-l border-warm-grey" />
			<div class="flex-1 flex flex-col overflow-hidden">
				<PanelHeader class={saving ? "saving-hatch" : ""}>
					<FacilityStatusIcon status={displayUnit?.status || 'operating'} />
					<span
						class="w-2.5 h-2.5 rounded-full shrink-0"
						style="background: {ftColour(displayUnit?.fuel_technology?.code)}"
					></span>
					<span class="text-[12px] font-medium text-dark-grey flex-1 truncate"
						>{displayUnit?.code}</span
					>
					<a
						href={sanityEditUrl(displayUnit?._id, 'unit')}
						target="_blank"
						rel="noopener noreferrer"
						class="text-[9px] px-1.5 py-0.5 border border-warm-grey rounded transition-colors inline-flex items-center gap-1 shrink-0 text-mid-grey hover:text-dark-grey hover:border-dark-grey no-underline"
					>
						<ExternalLink size={8} />
						Edit in Sanity
					</a>
					<button
						onclick={() => onselectunit?.(null)}
						class="p-1 hover:bg-warm-grey rounded transition-colors"
					>
						<X size={12} class="text-mid-grey" />
					</button>
				</PanelHeader>

				<!-- Scrollable content -->
				<div class="flex-1 overflow-y-auto p-4">
					<!-- Unit fields -->
					{#if editing}
						{@render kvUnitEdit('code', displayUnit?.code, 'code', 'code', 'text')}
						{@render kvRef('fuel_technology', fuelTechOptions, displayUnit?.fuel_technology?._id ?? null, handleUnitFuelTechChange)}
						{@render kv('ft_code', displayUnit?.fuel_technology?.code)}
						{@render kv('renewable', displayUnit?.fuel_technology?.renewable != null ? String(displayUnit.fuel_technology.renewable) : null)}
						{@render kvRef('dispatch_type', dispatchTypeOptions, displayUnit?.dispatch_type ?? null, handleUnitDispatchTypeChange)}
						{@render kv('ft_dispatch_type', displayUnit?.fuel_technology?.dispatch_type)}
						{@render kvRef('status', statusOptions, displayUnit?.status ?? null, handleUnitStatusChange)}
						{@render kvUnitEdit('capacity_registered', displayUnit?.capacity_registered, 'capacity_registered', 'capacity_registered', 'number')}
						{@render kvUnitEdit('capacity_maximum', displayUnit?.capacity_maximum, 'capacity_maximum', 'capacity_maximum', 'number')}
						{@render kvUnitEdit('storage_capacity', displayUnit?.storage_capacity, 'storage_capacity', 'storage_capacity', 'number')}
						{@render kvUnitEdit('min_generation', displayUnit?.min_generation_capacity, 'min_generation_capacity', 'min_generation_capacity', 'number')}
						{@render kvUnitEdit('grid_forming', displayUnit?.grid_forming != null ? String(displayUnit.grid_forming) : '', 'grid_forming', 'grid_forming', 'boolean')}
						{@render kvUnitEdit('marginal_loss_factor', displayUnit?.marginal_loss_factor, 'marginal_loss_factor', 'marginal_loss_factor', 'number')}
						{@render kvUnitEdit('emissions_co2', displayUnit?.emissions_factor_co2, 'emissions_factor_co2', 'emissions_factor_co2', 'number')}
						{@render kvUnitEdit('emissions_source', displayUnit?.emissions_factor_source, 'emissions_factor_source', 'emissions_factor_source', 'text')}
						{@render kvUnitEdit('data_first_seen', displayUnit?.data_first_seen, 'data_first_seen', 'data_first_seen', 'text')}
						{@render kvUnitEdit('data_last_seen', displayUnit?.data_last_seen, 'data_last_seen', 'data_last_seen', 'text')}
						{@render kvUnitEdit('commissioning_confirmed', displayUnit?.commissioning_confirmed != null ? String(displayUnit.commissioning_confirmed) : '', 'commissioning_confirmed', 'commissioning_confirmed', 'boolean')}
						{@render kvUnitEdit('expected_operation', displayUnit?.expected_operation_date, 'expected_operation_date', 'expected_operation_date', 'text')}
						{@render kvUnitEdit('expected_op_specificity', displayUnit?.expected_operation_date_specificity, 'expected_operation_date_specificity', 'expected_operation_date_specificity', 'text')}
						{@render kvUnitEdit('expected_closure', displayUnit?.expected_closure_date, 'expected_closure_date', 'expected_closure_date', 'text')}
						{@render kvUnitEdit('expected_cl_specificity', displayUnit?.expected_closure_date_specificity, 'expected_closure_date_specificity', 'expected_closure_date_specificity', 'text')}
						{@render kvUnitEdit('commencement_date', displayUnit?.commencement_date, 'commencement_date', 'commencement_date', 'text')}
						{@render kvUnitEdit('commencement_specificity', displayUnit?.commencement_date_specificity, 'commencement_date_specificity', 'commencement_date_specificity', 'text')}
						{@render kvUnitEdit('closure_date', displayUnit?.closure_date, 'closure_date', 'closure_date', 'text')}
						{@render kvUnitEdit('closure_specificity', displayUnit?.closure_date_specificity, 'closure_date_specificity', 'closure_date_specificity', 'text')}
						{@render kvUnitEdit('construction_start', displayUnit?.construction_start_date, 'construction_start_date', 'construction_start_date', 'text')}
						{@render kvUnitEdit('construction_start_source', displayUnit?.construction_start_date_source, 'construction_start_date_source', 'construction_start_date_source', 'text')}
						{@render kvUnitEdit('construction_start_specificity', displayUnit?.construction_start_date_specificity, 'construction_start_date_specificity', 'construction_start_date_specificity', 'text')}
						{@render kvUnitEdit('construction_cost', displayUnit?.construction_cost, 'construction_cost', 'construction_cost', 'number')}
						{@render kvUnitEdit('construction_cost_source', displayUnit?.construction_cost_source, 'construction_cost_source', 'construction_cost_source', 'text')}
						{@render kvUnitEdit('cis_tender_recipient', displayUnit?.cis_tender_recipient != null ? String(displayUnit.cis_tender_recipient) : '', 'cis_tender_recipient', 'cis_tender_recipient', 'boolean')}
						{@render kvUnitEdit('epbc_id', displayUnit?.epbc_id, 'epbc_id', 'epbc_id', 'text')}
						{@render kvUnitEdit('epbc_number', displayUnit?.epbc_number, 'epbc_number', 'epbc_number', 'text')}
						{@render kvUnitEdit('expected_closure_source', displayUnit?.expected_closure_date_source, 'expected_closure_date_source', 'expected_closure_date_source', 'text')}
						{@render kvUnitEdit('project_approval_date', displayUnit?.project_approval_date, 'project_approval_date', 'project_approval_date', 'text')}
						{@render kvUnitEdit('project_approval_source', displayUnit?.project_approval_date_source, 'project_approval_date_source', 'project_approval_date_source', 'text')}
						{@render kvUnitEdit('project_approval_lodgement', displayUnit?.project_approval_lodgement_date, 'project_approval_lodgement_date', 'project_approval_lodgement_date', 'text')}
						{@render kvUnitEdit('state_approval_date', displayUnit?.state_approval_date, 'state_approval_date', 'state_approval_date', 'text')}
						{@render kvUnitEdit('state_approval_source', displayUnit?.state_approval_source, 'state_approval_source', 'state_approval_source', 'text')}
						{@render kvUnitEdit('state_lodgement_date', displayUnit?.state_lodgement_date, 'state_lodgement_date', 'state_lodgement_date', 'text')}
						{#if extraPrimitiveKeys.length > 0}
							{#each extraPrimitiveKeys as key (key)}
								{@render kvAutoEdit(key, formatAutoValue(displayUnit?.[key]), key, key, inferFieldType(displayUnit?.[key]))}
							{/each}
						{/if}
						{#if extraObjectKeys.length > 0}
							{#each extraObjectKeys as key (key)}
								{@render kvAuto(key, isRef(displayUnit?.[key]) ? formatRefValue(displayUnit[key]) : JSON.stringify(displayUnit[key]))}
							{/each}
						{/if}
					{:else}
						{@render kv('code', displayUnit?.code)}
						{@render kv('fuel_technology', displayUnit?.fuel_technology?.name)}
						{@render kv('ft_code', displayUnit?.fuel_technology?.code)}
						{@render kv(
							'renewable',
							displayUnit?.fuel_technology?.renewable != null
								? String(displayUnit.fuel_technology.renewable)
								: null
						)}
						{@render kv('dispatch_type', displayUnit?.dispatch_type)}
						{@render kv(
							'ft_dispatch_type',
							displayUnit?.fuel_technology?.dispatch_type
						)}
						{@render kv('status', displayUnit?.status)}
						{@render kv(
							'capacity_registered',
							displayUnit?.capacity_registered != null
								? `${displayUnit.capacity_registered} MW`
								: null
						)}
						{@render kv(
							'capacity_maximum',
							displayUnit?.capacity_maximum != null
								? `${displayUnit.capacity_maximum} MW`
								: null
						)}
						{@render kv(
							'storage_capacity',
							displayUnit?.storage_capacity != null
								? `${displayUnit.storage_capacity} MWh`
								: null
						)}
						{@render kv(
							'min_generation',
							displayUnit?.min_generation_capacity != null
								? `${displayUnit.min_generation_capacity} MW`
								: null
						)}
						{@render kv(
							'grid_forming',
							displayUnit?.grid_forming != null
								? String(displayUnit.grid_forming)
								: null
						)}
						{@render kv('marginal_loss_factor', displayUnit?.marginal_loss_factor)}
						{@render kv('emissions_co2', displayUnit?.emissions_factor_co2)}
						{@render kv('emissions_source', displayUnit?.emissions_factor_source)}
						{@render kv('data_first_seen', displayUnit?.data_first_seen)}
						{@render kv('data_last_seen', displayUnit?.data_last_seen)}
						{@render kv(
							'commissioning_confirmed',
							displayUnit?.commissioning_confirmed != null
								? String(displayUnit.commissioning_confirmed)
								: null
						)}
						{@render kv('expected_operation', displayUnit?.expected_operation_date)}
						{@render kv(
							'expected_op_specificity',
							displayUnit?.expected_operation_date_specificity
						)}
						{@render kv('expected_closure', displayUnit?.expected_closure_date)}
						{@render kv(
							'expected_cl_specificity',
							displayUnit?.expected_closure_date_specificity
						)}
						{@render kv('commencement_date', displayUnit?.commencement_date)}
						{@render kv(
							'commencement_specificity',
							displayUnit?.commencement_date_specificity
						)}
						{@render kv('closure_date', displayUnit?.closure_date)}
						{@render kv(
							'closure_specificity',
							displayUnit?.closure_date_specificity
						)}
						{@render kv('construction_start', displayUnit?.construction_start_date)}
						{@render kv('construction_start_source', displayUnit?.construction_start_date_source)}
						{@render kv('construction_start_specificity', displayUnit?.construction_start_date_specificity)}
						{@render kv('construction_cost', displayUnit?.construction_cost)}
						{@render kv('construction_cost_source', displayUnit?.construction_cost_source)}
						{@render kv(
							'cis_tender_recipient',
							displayUnit?.cis_tender_recipient != null
								? String(displayUnit.cis_tender_recipient)
								: null
						)}
						{@render kv('epbc_id', displayUnit?.epbc_id)}
						{@render kv('epbc_number', displayUnit?.epbc_number)}
						{@render kv('expected_closure_source', displayUnit?.expected_closure_date_source)}
						{@render kv('project_approval_date', displayUnit?.project_approval_date)}
						{@render kv('project_approval_source', displayUnit?.project_approval_date_source)}
						{@render kv('project_approval_lodgement', displayUnit?.project_approval_lodgement_date)}
						{@render kv('state_approval_date', displayUnit?.state_approval_date)}
						{@render kv('state_approval_source', displayUnit?.state_approval_source)}
						{@render kv('state_lodgement_date', displayUnit?.state_lodgement_date)}
						{#if extraPrimitiveKeys.length > 0}
							{#each extraPrimitiveKeys as key (key)}
								{@render kvAuto(key, formatAutoValue(displayUnit?.[key]))}
							{/each}
						{/if}
						{#if extraObjectKeys.length > 0}
							{#each extraObjectKeys as key (key)}
								{@render kvAuto(key, isRef(displayUnit?.[key]) ? formatRefValue(displayUnit[key]) : JSON.stringify(displayUnit[key]))}
							{/each}
						{/if}
					{/if}

					<!-- Unit types -->
					{#if displayUnit?.unit_types?.length > 0}
						<div class="mt-3 pt-3 border-t border-warm-grey/60">
							<div
								class="text-[9px] text-mid-grey uppercase tracking-widest mb-1"
							>
								Unit Types ({displayUnit.unit_types.length})
							</div>
							{#each displayUnit.unit_types as ut, i (ut._id || i)}
								{#if i > 0}
									<div class="border-t border-warm-grey/40 mt-1 pt-1"></div>
								{/if}
								{#if editing}
									{@render kvUtEdit(ut, 'unit_number', ut.unit_number, 'unit_number', 'unit_number', 'number')}
									{@render kvUtEdit(ut, 'unit_size', ut.unit_size, 'unit_size', 'unit_size', 'text')}
									{@render kvUtEdit(ut, 'capacity', ut.capacity, 'capacity', 'capacity', 'number')}
									{@render kvUtEdit(ut, 'brand', ut.unit_brand, 'unit_brand', 'unit_brand', 'text')}
									{@render kvUtEdit(ut, 'model', ut.unit_model, 'unit_model', 'unit_model', 'text')}
									{@render kvUtEdit(ut, 'model_year', ut.unit_model_year, 'unit_model_year', 'unit_model_year', 'text')}
									{@render kvUtEdit(ut, 'model_url', ut.unit_model_url, 'unit_model_url', 'unit_model_url', 'text')}
									{@render kvUtEdit(ut, 'height', ut.unit_height, 'unit_height', 'unit_height', 'number')}
									{@render kvUtEdit(ut, 'weight', ut.unit_weight, 'unit_weight', 'unit_weight', 'number')}
									{@render kvUtEdit(ut, 'mounting_type', ut.mounting_type, 'mounting_type', 'mounting_type', 'text')}
									{@render kvUtEdit(ut, 'efficiency', ut.unit_efficiency, 'unit_efficiency', 'unit_efficiency', 'number')}
								{:else}
									{@render kv('unit_number', ut.unit_number)}
									{@render kv('unit_size', ut.unit_size)}
									{@render kv(
										'capacity',
										ut.capacity != null ? `${ut.capacity} MW` : null
									)}
									{@render kv('brand', ut.unit_brand)}
									{@render kv('model', ut.unit_model)}
									{@render kv('model_year', ut.unit_model_year)}
									{@render kvLink('model_url', ut.unit_model_url ? 'model website' : null, ut.unit_model_url, 'Manufacturer')}
									{@render kv(
										'height',
										ut.unit_height != null ? `${ut.unit_height} m` : null
									)}
									{@render kv(
										'weight',
										ut.unit_weight != null ? `${ut.unit_weight} t` : null
									)}
									{@render kv('mounting_type', ut.mounting_type)}
									{@render kv(
										'efficiency',
										ut.unit_efficiency != null
											? `${ut.unit_efficiency}%`
											: null
									)}
								{/if}
							{/each}
						</div>
					{/if}

					<!-- Unit metadata -->
					{#if displayUnit?.metadata_array?.length > 0}
						<div class="mt-3 pt-3 border-t border-warm-grey/60">
							<div
								class="text-[9px] text-mid-grey uppercase tracking-widest mb-1"
							>
								Metadata
							</div>
							{#each displayUnit.metadata_array as meta, i (i)}
								{@render kv(meta.key, meta.value)}
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
	</div>

	<!-- Photo lightbox -->
	{#if lightboxPhoto}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
			transition:fade={{ duration: 150 }}
			onclick={() => (lightboxIndex = -1)}
		>
			<!-- Close button -->
			<button
				class="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
				onclick={() => (lightboxIndex = -1)}
			>
				<X size={20} />
			</button>

			<!-- Navigation arrows -->
			{#if facility.photos?.length > 1}
				{#if lightboxIndex > 0}
					<button
						class="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-white transition-colors"
						onclick={(e) => { e.stopPropagation(); lightboxIndex--; }}
					>
						<ChevronRight size={24} class="rotate-180" />
					</button>
				{/if}
				{#if lightboxIndex < (facility.photos?.length ?? 1) - 1}
					<button
						class="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-white transition-colors"
						onclick={(e) => { e.stopPropagation(); lightboxIndex++; }}
					>
						<ChevronRight size={24} />
					</button>
				{/if}
			{/if}

			<!-- Image + caption -->
			<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
			<div class="flex flex-col items-center gap-3" onclick={(e) => e.stopPropagation()}>
				<img
					src={lightboxPhoto?.asset
						? urlFor(lightboxPhoto).url()
						: lightboxPhoto?.url}
					alt={lightboxPhoto?.alt ||
						lightboxPhoto?.caption ||
						`${facility.name} photo`}
					class="max-h-[85vh] max-w-[90vw] object-contain rounded"
				/>
				{#if lightboxPhoto?.caption || lightboxPhoto?.attribution}
					<p class="text-xs text-white/70 text-center max-w-[60vw]">
						{lightboxPhoto?.caption || ''}{#if lightboxPhoto?.attribution}{lightboxPhoto?.caption ? ' — ' : ''}{lightboxPhoto?.attribution}{/if}
					</p>
				{/if}
				{#if facility.photos?.length > 1}
					<p class="text-[10px] text-white/40">
						{lightboxIndex + 1} / {facility.photos.length}
					</p>
				{/if}
			</div>
		</div>
	{/if}
</div>

<svelte:window onkeydown={(e) => {
	if (e.key === 'Escape') {
		if (editing) {
			toggleEdit();
			return;
		}
		if (lightboxIndex >= 0) {
			lightboxIndex = -1;
			return;
		}
	}
	if (e.key === 'e' && !editing && lightboxIndex < 0 && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
		toggleEdit();
		return;
	}
	if (lightboxIndex < 0) return;
	else if (e.key === 'ArrowLeft' && lightboxIndex > 0) lightboxIndex--;
	else if (e.key === 'ArrowRight' && lightboxIndex < (facility.photos?.length ?? 1) - 1) lightboxIndex++;
}} />

<style>
	:global(.saving-hatch) {
		position: relative;
		overflow: hidden;
	}
	:global(.saving-hatch)::after {
		content: '';
		position: absolute;
		inset: 0;
		background: repeating-linear-gradient(
			-45deg,
			transparent,
			transparent 6px,
			rgb(106 106 106 / 0.07) 6px,
			rgb(106 106 106 / 0.07) 12px
		);
		background-size: 17px 17px;
		animation: hatch-slide 0.6s linear infinite;
		pointer-events: none;
	}
	@keyframes hatch-slide {
		to {
			background-position: 17px 0;
		}
	}
</style>
