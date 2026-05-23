# Change Log

All notable changes to the "copilot-review-assistant" extension will be documented in this file.

## [0.0.8] - 2026-05-24
### Added
- Add to Draft button is now styled as the primary button (ordered first), and Cancel as secondary.
- Added Cancel (X) icon to the top right of the new Draft Comment interface.
### Changed
- Removed "📝 [DRAFT #x]" from the comment author name.
- Changed the inline thread title to "DRAFT Comment #x".
- Renamed the sidebar view title to "DRAFT".
### Fixed
- Fixed an issue where the edited comment content would not display correctly in the editor after saving.
- Fixed a bug where the DRAFT sidebar view would lose synchronization with the editor and fail to display items upon reloading.

## [0.0.7] - 2026-05-24
### Added
- Added a Cancel button to the left of the "Add to Draft" button in the inline comment thread.
- Added a Delete button next to the Edit icon for already added Draft Comments.
- Added an Edit button to the sidebar card of "Review: Draft Comment" to allow quick edit jumping.
- Sidebar view now correctly displays previously added draft comments upon initial load.
### Changed
- Replaced the trash icon in the Draft Comment sidebar with an X (Cancel) icon.
- Renamed sidebar panel from "Drafts" to "Review: Draft Comment".
### Fixed
- Fixed focus management during Draft Comment creation/editing by removing invalid command `workbench.action.focusComment`.
- Fixed the "unsafe.replace is not a function" error when submitting the final review.

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