FlatNotes Modifications
=======================

This fork builds on `dullage/flatnotes` with a focus on advanced reading, layout, and deployment controls. All changes are optional, driven through scripts or the new Settings UI, so upstream behaviour remains available if you leave the toggles off.

Reader Enhancements
-------------------

* **Auto-generated Table of Contents** for note viewer pages, with sticky navigation, slugged heading anchors, and a user setting to hide/show the TOC globally.
* **Toast Viewer Options** exposed via settings:
  * Ctrl + S behaviour (save vs. strikethrough).
  * Text justification.
  * Paragraph, bullet-list, and numbered-list spacing tweaks.
* **Browser Tab Customisation**:
  * Editable site name, used in document titles.
  * Option to hide the favicon/icon links at runtime.
* **Logo Controls** allowing the “f” mark, the “flatnotes” wordmark, or both to be hidden without touching SVGs.

Layout & UI Controls
--------------------

All toggles persist to `/config/settings.json`, making them container-friendly:

* Compact header spacing.
* Wider application shell (`~80vw`) for desktops.
* Search list customisations:
  * Compact result rows.
  * Hide `#tags`.
* Note-level TOC visibility.

Settings UI
-----------

* New `Settings` route (and menu item) housing every toggle plus the site-name editor.
* Each toggle updates individually using partial PUTs, so preferences do not clobber each other.

Developer Notes
---------------

* `server/settings_manager.py` reads/writes `/config/settings.json` (JSON, not CommonJS). On start it auto-creates the file with defaults.
* Settings API now exposes `GET /api/settings` and `PUT /api/settings`, the latter accepting partial payloads.
* Front-end state lives in Pinia (`globalStore.settings`) and is bootstrapped alongside the existing `/api/config` call.
