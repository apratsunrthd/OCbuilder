# OC Builder

A character sheet builder for original characters (OCs) — an offline, single-page web app for filling out deep worldbuilding details and turning them into a clean, printable sheet.

No sign-up, no server, no build step. Everything is stored locally in your browser.

## Using it

Open `index.html` in a browser (double-click it, or serve the folder with any static file server).

- Fill out the form: identity, appearance, personality, voice & mannerisms, abilities/skills, weaknesses, backstory + timeline, relationships, goals/motivation/secrets, and free notes.
- Repeatable sections (abilities, weaknesses, timeline events, relationships) let you add or remove rows.
- Your work autosaves to the browser's local storage as you type — nothing is lost on refresh.
- Use the top bar to manage multiple characters: **New**, **Duplicate**, **Delete**, and the dropdown to switch between saved sheets.
- **Export JSON** downloads the current character as a file you can back up or share; **Import…** loads one back in (as a new character).
- **Preview & Print** renders a clean, formatted sheet (no form chrome) that you can print or save as a PDF from your browser's print dialog.

## Notes

- Data lives in `localStorage`, scoped to the browser/profile you open the file in. Export to JSON if you want a portable backup or want to move a character to another machine/browser.
- No external dependencies at runtime other than a Google Fonts stylesheet (falls back to system fonts if offline).
