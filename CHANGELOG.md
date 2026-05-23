# Change Log

All notable changes to the "antigravity-plan-review" extension will be documented in this file.

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
- Added `Start AI Plan Review` command to the editor context menu.
- Added native inline Comment API support for reviewing code.
- Added `Submit to Copilot Chat` action to automatically forward context, code snippets, and review suggestions to GitHub Copilot Chat.
- Implemented text truncation (max 500 lines) to prevent Copilot prompt limits.