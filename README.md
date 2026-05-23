# Antigravity Plan Review

Antigravity Plan Review is a VS Code extension designed to improve the code review and AI-assisted development experience. It leverages the native VS Code Comments API, allowing you to select any snippet in your code, trigger an inline comment box, and seamlessly send your review suggestions along with context directly to GitHub Copilot Chat.

## Features

- **Inline Reviews:** Select code and start a review thread right inside your editor (just like GitHub PR reviews).
- **Context Aware:** Automatically captures file path, line numbers, and the selected source code.
- **One-Click Copilot Integration:** Push your suggestions and context to Copilot Chat with a single click.

## Usage

1. Open a file and select the code block you want to review.
2. Right-click the selection and choose **Start AI Plan Review** (or use the command palette).
3. Type your review suggestions or plan into the inline comment box.
4. Click the **Submit to Copilot Chat** button (sparkle icon) within the comment box.
5. Copilot Chat will open with a prepared prompt containing your context and suggestion.

## 

- **GitHub Copilot Chat** extension must be installed and active to handle the `workbench.action.chat.open` command.
Requirements