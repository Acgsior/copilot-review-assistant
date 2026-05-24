# Copilot Review Assistant

Copilot Review Assistant is a premium VS Code extension designed to revolutionize your code review and AI-assisted development experience. It leverages VS Code's native Comments API, allowing you to select any snippet in your code, add inline review draft comments, and seamlessly send your review suggestions along with full context to GitHub Copilot Chat.

---

## 🌟 Key Features

- **Inline Reviews:** Select code and start a review thread right inside your editor, matching the native GitHub PR review experience.
- **Context-Aware Snippets:** Automatically captures file paths, line ranges, and the precise source code you selected.
- **Workspace State Persistence:** Draft comments are safely persisted across sessions on a per-workspace basis. Closing VS Code or reloading a window will never lose your unsaved reviews.
- **Flexible View Modes (Flat / Grouped):**
  - **Flat List View (`$(list-flat)`):** Lists drafts in chronological order.
  - **Grouped File View (`$(list-tree)`):** Organizes draft comments by file, sorted logically by starting line number, complete with collapsible files and item count status badges.
- **Smart Code Preview & Reference Strategies:**
  - **Collapsible Code Preview:** Inside the submission panel, long code snippets are neatly tucked inside collapsible `<details>` blocks.
  - **Reference Strategy (Token Saving):** If a draft contains more than a configurable number of lines (e.g. 10 lines), the extension automatically references the snippet by its file path and line numbers (e.g. `path/to/file.ts#L12~L45`) when submitting to Copilot Chat, instead of copying massive blocks of text.
- **Customizable Templates:** Take full control of what is sent to Copilot Chat and how individual draft items are formatted using intuitive configuration templates.
- **Seamless Keybindings:** Boost your productivity with quick keyboard shortcuts.
- **Sequential Draft Numbering:** Track drafts with sequential numbering (e.g., `#1`, `#2`) that resets automatically after submission.

---

## 🚀 Usage

1. **Create Drafts:**
   - Select a block of code in the editor.
   - Right-click and choose **Add Comment to Copilot**, or use the global shortcut **`Ctrl+Shift+D`** (or **`Cmd+Shift+D`** on macOS).
   - Alternatively, click the lightbulb icon (Code Action) and choose **Add Comment to Copilot**.
   - Type your suggestions in the inline comment box, then click **Add to Draft** (or edit and save existing comments).

2. **Manage Drafts:**
   - Open the **Plan Review** sidebar view (`$(comment-discussion)` in the Activity Bar) to view your draft comments.
   - Toggle between **Flat View** and **Grouped View** using the navigation icons in the sidebar header.
   - Click the edit icon to jump directly to a draft comment in the editor, or delete drafts using the trash icon.

3. **Submit to Copilot Chat:**
   - Click the **Submit Drafts to Copilot** button (sparkle icon) in the editor title bar or the sidebar panel, or press **`Ctrl+Shift+Enter`** (or **`Cmd+Shift+Enter`** on macOS).
   - A beautiful review dashboard will open. Enter a summary of your plan or code changes, preview your drafts, and hit **Submit to Copilot Chat**.
   - Copilot Chat will automatically focus with the perfectly structured review prompt containing your summary, context, and review comments.

---

## ⚙️ Configuration Settings

Customize the extension behavior using the following settings in your VS Code `settings.json`:

| Setting Key | Default Value | Description |
| :--- | :--- | :--- |
| `copilotReview.promptTemplate` | `"${summary}\n\n---\n\nComplete changes:\n\n${drafts}"` | The template for the prompt sent to Copilot Chat. Supports `${summary}` and `${drafts}` variables. |
| `copilotReview.draftTemplate` | `"- \`${filePath}\` (Lines ${startLine}-${endLine})\n  ${codeBlock}\n  ${comment}\n\n"` | The template formatting each draft item in the prompt. Supports `${filePath}`, `${startLine}`, `${endLine}`, `${language}`, `${code}`, `${codeBlock}`, and `${comment}` variables. |
| `copilotReview.codePreviewMaxLines` | `20` | Maximum number of lines of source code to show in the review submission preview dashboard (range: `0-20`). Snippets longer than this are truncated. |
| `copilotReview.inlineCodeThreshold` | `10` | The threshold (in lines) above which code snippets are referenced by path and line number range (e.g. `file.ts#L10~L35`) instead of being fully inlined into the Copilot prompt. |

---

## ⌨️ Keybindings

Accelerate your workflow with these keyboard shortcuts:

* **Create Review Comment:**
  * Windows/Linux: `Ctrl+Shift+D`
  * macOS: `Cmd+Shift+D`
  * *Condition:* Active selection in editor.
* **Submit Plan Review:**
  * Windows/Linux: `Ctrl+Shift+Enter`
  * macOS: `Cmd+Shift+Enter`
  * *Condition:* Unsubmitted drafts exist in the workspace.

---

## 🛠️ Requirements

- **GitHub Copilot Chat** extension must be installed and active to receive and process the generated review prompts.