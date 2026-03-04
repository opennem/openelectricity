/**
 * Lightweight markdown → HTML renderer for chat messages.
 * Handles: bold, italic, inline code, code blocks, tables, lists, headings.
 *
 * @param {string} text
 * @returns {string}
 */
export function renderMarkdown(text) {
	if (!text) return '';

	// Escape HTML
	let html = text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');

	// Code blocks (``` ... ```)
	html = html.replace(/```[\w]*\n([\s\S]*?)```/g, '<pre class="bg-light-warm-grey rounded px-2 py-1 my-1 overflow-x-auto">$1</pre>');

	// Tables — detect lines with | separators
	html = html.replace(
		/((?:^.*\|.*$\n?){2,})/gm,
		(/** @type {string} */ tableBlock) => {
			const rows = tableBlock.trim().split('\n').filter(Boolean);
			if (rows.length < 2) return tableBlock;

			// Check if second row is a separator (---|---|---)
			const isSep = /^\s*\|?\s*[-:]+[-| :]*$/.test(rows[1]);
			const dataRows = isSep ? [rows[0], ...rows.slice(2)] : rows;
			const startIdx = isSep ? 0 : -1;

			let table = '<table class="my-1 border-collapse">';
			dataRows.forEach((row, idx) => {
				const cells = row.split('|').map((c) => c.trim()).filter(Boolean);
				const tag = idx === 0 && startIdx === 0 ? 'th' : 'td';
				const cls = tag === 'th' ? ' class="text-left pr-3 text-dark-grey border-b border-warm-grey pb-0.5"' : ' class="text-left pr-3"';
				table += '<tr>' + cells.map((c) => `<${tag}${cls}>${c}</${tag}>`).join('') + '</tr>';
			});
			table += '</table>';
			return table;
		}
	);

	// Headings
	html = html.replace(/^### (.+)$/gm, '<strong class="text-dark-grey">$1</strong>');
	html = html.replace(/^## (.+)$/gm, '<strong class="text-dark-grey">$1</strong>');
	html = html.replace(/^# (.+)$/gm, '<strong class="text-dark-grey">$1</strong>');

	// Bold and italic
	html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
	html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-dark-grey">$1</strong>');
	html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

	// Inline code
	html = html.replace(/`([^`]+)`/g, '<code class="bg-light-warm-grey px-0.5 rounded">$1</code>');

	// Unordered lists (- item)
	html = html.replace(
		/((?:^[ \t]*[-*] .+$\n?)+)/gm,
		(/** @type {string} */ block) => {
			const items = block.trim().split('\n').map((l) => l.replace(/^[ \t]*[-*] /, ''));
			return '<ul class="my-0.5 ml-3 list-disc">' + items.map((i) => `<li>${i}</li>`).join('') + '</ul>';
		}
	);

	// Ordered lists (1. item)
	html = html.replace(
		/((?:^[ \t]*\d+\. .+$\n?)+)/gm,
		(/** @type {string} */ block) => {
			const items = block.trim().split('\n').map((l) => l.replace(/^[ \t]*\d+\. /, ''));
			return '<ol class="my-0.5 ml-3 list-decimal">' + items.map((i) => `<li>${i}</li>`).join('') + '</ol>';
		}
	);

	return html;
}
