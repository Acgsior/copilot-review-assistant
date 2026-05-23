# Change Log

All notable changes to the "copilot-review-assistant" extension will be documented in this file.

## [0.0.6] - 2026-05-24
### Added
- Unified the delete button icons using VS Code native-like inline SVGs in both Webviews.
- Added a re-edit feature for inline Draft Comments (allows toggling back to edit mode and saving the updated comment).
- Added a Cancel button to the Submit Plan Review view to safely discard or close the dialog.
- Improved focus management: automatically focuses the input text area when submitting, and attempts to autofocus comments upon thread creation.
- Added sequential numbering (e.g., `#1`) to Draft Comments globally for better differentiation, resetting back to `#1` after a successful submission.

## [0.0.5] - 2026-05-24
### Added
- Renamed project to Copilot Review Assistant.
- Migrated Drafts List from TreeView to Webview to support multi-line comment display with word wrapping.
- Updated the "Submit Plan Review" Webview with a modern, flat UI design matching the extension's branding.
- Generated a new app icon.

## [0.0.4] - 2026-05-24
### Added
- Lightbulb menu (Code Action Provider) for "Add Comment to Copilot".
- Dynamic submit button in the editor title bar that appears only when drafts exist.
- **Submit Plan Review Webview**: Clicking submit now opens a Webview panel allowing you to write a multi-line markdown summary. This summary is prepended to your drafts before sending them to Copilot Chat.
### Changed
- Simplified draft UI: changed author to "📝 [DRAFT]", removed "You", and changed thread label to "Draft Comment".
- Refined prompt format: changed prefix to "Complete changes:", removed "**Suggestion:**".

## [0.0.2] - 2026-05-23
### Added
- Support for merging multiple review drafts into a single prompt instead of sending them individually.
- Dedicated tree view in the sidebar to list all Draft Comments.

## [0.0.1] - 2026-05-23
### Added
- Initial release.
- Added `Add Comment to Copilot` command to the editor context menu.
- Added native inline Comment API support for reviewing code.
- Added `Submit to Copilot Chat` action to automatically forward context, code snippets, and review suggestions to GitHub Copilot Chat.
- Implemented text truncation (max 500 lines) to prevent Copilot prompt limits.