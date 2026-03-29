# Google Apps Script Project Instructions

This project is a Google Apps Script (GAS) Web App acting as a CRM/Dashboard, using Google Sheets as the database.

## Architecture & patterns

- **Runtime Environment**: Google Apps Script (Server-side) + HTML5/JavaScript (Client-side).
- **Entry Point**: `Code.gs` handles `doGet(e)` for routing.
- **Data Layer**: 
  - Google Sheets act as the database.
  - Controllers (`SheetController.gs`, `ClientController.gs`, etc.) encapsulate sheet operations.
  - Schema migration is handled proactively in `getOrCreate*Sheet()` functions (checking & adding missing headers).
- **Client-Side Framework**:
  - **Single Page Application (SPA)** feel using vanilla JS. 
  - **Navigation**: Controlled by `appNavigate(viewName)` in `js-navigation.html`, which toggles visibility of sections (e.g., `#view-dashboard`, `#view-caregivers`).
  - **Templating**: `.html` files are combined using the `include()` pattern (e.g., `<?!= include('styles'); ?>`).
  - **Styling**: Tailwind CSS (via CDN) and Phosphor Icons.
  - **State Management**: Global variables (e.g., `cgData`, `clData`) defined in `js-utils.html`.

## Code Conventions

### Server-Side (`.gs`)
- **Controllers**: Logic is separated by domain (e.g., `ClientController.gs` for client logic, `SheetController.gs` for generic/caregiver sheet logic).
- **Public Functions**: Functions intended for the client are top-level and called via `google.script.run`.
- **Schema Management**: Always use `getOrCreateSheet` pattern to access sheets; check for and append new columns if missing.

### Client-Side (`.html`)
- **Separation of Concerns**:
  - `page-*.html`: Main view structures (often hidden/shown by navigation).
  - `js-*.html`: Logic files containing `<script>` tags, included into the main HTML.
  - `view-*.html`: Partial views or sub-components.
- **Interactivity**: Use `google.script.run.withSuccessHandler(callback).serverFunction()` for async data fetching.
- **DOM Manipulation**: helper functions in `js-*.html` manipulate the DOM directly (no React/Vue/Angular).

## Critical Workflows

- **Routing**: `doGet(e)` checks `e.parameter.page` to serve different dedicated HTML entry points (e.g., public forms like 'apply', 'onboarding') vs the main app (`index.html`).
- **Data Loading**: 
  - Views often have a `load*` function (e.g., `loadCaregiverList()`, `loadClientList()`) called by `appNavigate`.
  - These functions call the server, update global state, and then render.

## Development & Debugging

- **Logging**:
  - Server: Use `Logger.log()` or `console.log()`. 
  - Client: Use `console.log()` (visible in browser dev tools).
- **Environment**: This code runs in the browser or Google's servers. 
- **Dependencies**: Libraries are loaded via CDN in `index.html` (Tailwind, SweetAlert2, Phosphor Icons).
