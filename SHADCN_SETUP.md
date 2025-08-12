# shadcn-svelte Setup with JSDoc Types

This project has been configured with shadcn-svelte and JSDoc types for better development experience.

## What's Been Set Up

### 1. Dependencies Installed

- `bits-ui` - Headless UI components
- `clsx` - Conditional className utility
- `tailwind-merge` - Merge Tailwind classes
- `class-variance-authority` - Component variant management
- `@lucide/svelte` - Icon library
- `tailwind-variants` - Type-safe component variants

### 2. Configuration Files

- `components.json` - shadcn-svelte configuration
- Updated `jsconfig.json` - Enhanced JSDoc support
- Updated `src/app.css` - Merged shadcn-svelte styles with existing styles

### 3. Utility Functions

- `src/lib/utils/index.js` - Contains the `cn()` function for merging classes

### 4. Components

- `src/lib/components/ui/button/` - Button component with variants
- `src/lib/components/ui/card/` - Card component
- `src/lib/components/ui/example.svelte` - Example component demonstrating usage

## Usage

### Adding New Components

```bash
npx shadcn-svelte@latest add [component-name]
```

### Using Components

```svelte
<script>
	import { cn } from '$lib/utils';
	import Button from '$lib/components/ui/button/button.svelte';
	import Card from '$lib/components/ui/card/card.svelte';
	import { Plus } from '@lucide/svelte';
</script>

<Card class="max-w-md">
	<h2 class="flex items-center gap-2">
		<Plus class="size-4" />
		Title
	</h2>
	<p>Content</p>
	<Button variant="default" size="sm">Click me</Button>
</Card>
```

### JSDoc Types

All components include JSDoc type annotations for better IntelliSense:

```javascript
/**
 * @param {Object} props
 * @param {string} [props.title] - Component title
 * @param {boolean} [props.disabled] - Whether component is disabled
 */
let { title, disabled = false } = $props();
```

## Svelte 5 Runes Integration

The setup is configured for Svelte 5 runes:

```javascript
// State
let count = $state(0);

// Props
let { title = 'Default' } = $props();

// Effects
$effect(() => {
	console.log('Count changed:', count);
});
```

## Available Components

### Button

- Variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
- Sizes: `default`, `sm`, `lg`, `icon`

### Card

- Basic card container with consistent styling

## Styling

The project uses a hybrid approach:

- shadcn-svelte CSS variables for component theming
- Existing custom colors and utilities preserved
- Tailwind CSS v4 with custom configuration

## Development

### Type Checking

```bash
npm run check
```

### Adding More Components

1. Run `npx shadcn-svelte@latest add [component-name]`
2. Add JSDoc types to the component
3. Test the component in your application

### Customizing Components

Components can be customized by:

1. Modifying the component files directly
2. Using the `class` prop to override styles
3. Creating new variants using `class-variance-authority`

## Notes

- The setup preserves all existing project styles and functionality
- JSDoc types provide IntelliSense without requiring TypeScript
- Components are fully compatible with Svelte 5 runes
- The `cn()` utility function handles class merging and conflicts
