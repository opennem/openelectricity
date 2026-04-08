# @openelectricity/stratify-mcp

MCP server for creating [Stratify](https://openelectricity.org.au/stratify) charts via Claude.

Chat with Claude to create, customise, and publish data visualisation charts powered by the Open Electricity Stratify chart builder.

## Installation

### Claude Code

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "stratify": {
      "command": "npx",
      "args": ["@openelectricity/stratify-mcp"]
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "stratify": {
      "command": "npx",
      "args": ["@openelectricity/stratify-mcp"]
    }
  }
}
```

### With API access (optional)

To save charts directly to Stratify, add environment variables:

```json
{
  "mcpServers": {
    "stratify": {
      "command": "npx",
      "args": ["@openelectricity/stratify-mcp"],
      "env": {
        "STRATIFY_API_URL": "https://openelectricity.org.au",
        "STRATIFY_AUTH_TOKEN": "<your-clerk-jwt>"
      }
    }
  }
}
```

## Modes

**Offline mode** (default) — generates chart configs as JSON. Import into Stratify via the "Import JSON" button.

**Online mode** (with API credentials) — creates and updates charts directly via the Stratify API. Returns preview URLs.

## Tools

| Tool | Mode | Description |
|------|------|-------------|
| `create_chart_config` | Offline | Generate a chart config from CSV data + options |
| `validate_chart_config` | Offline | Validate a chart config |
| `list_chart_types` | Offline | List available chart types |
| `list_colour_palettes` | Offline | List available colour palettes |
| `list_style_presets` | Offline | List available style presets |
| `list_line_styles` | Offline | List available line styles for per-series customisation |
| `save_chart` | Online | Save a chart to Stratify |
| `update_chart` | Online | Update an existing chart |
| `get_chart` | Online | Fetch a chart by ID |
| `list_charts` | Online | List your charts |
| `fork_chart` | Online | Fork a published chart |

## Usage examples

> "Create a line chart from this CSV data showing solar and wind generation"

> "Make a stacked area chart with the tableau10 palette and mono style"

> "Generate a bar chart sorted by value, high to low"

## Chart types

`line`, `area`, `column`, `column-stacked`, `column-grouped`, `bar`, `bar-stacked`, `bar-grouped`

## Colour palettes

**Qualitative:** `oe-energy` (default), `tableau10`, `set1`, `set2`, `set3`, `paired`, `dark2`, `pastel1`, `pastel2`, `accent`

**Sequential:** `blues`, `greens`, `oranges`, `purples`, `reds`, `greys`, `ylgn`, `ylorrd`, `bugn`, `pubu`

**Diverging:** `rdbu`, `rdylgn`, `brbg`, `piyg`, `prgn`, `rdylbu`, `spectral`

## Line styles

`solid` (default), `dashed`, `dotted`, `dash-dot`, `long-dash`

Set per-series via `seriesLineStyles: { "series_key": "dashed" }`. Only applies to line chart series.
