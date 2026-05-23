# Copilot Review Assistant

Copilot Review Assistant is a VS Code extension designed to improve the code review and AI-assisted development experience. It leverages the native VS Code Comments API, allowing you to select any snippet in your code, trigger an inline comment box, and seamlessly send your review suggestions along with context directly to GitHub Copilot Chat.

## Features

- **Inline Reviews:** Select code and start a review thread right inside your editor (just like GitHub PR reviews).
- **Context Aware:** Automatically captures file path, line numbers, and the selected source code.
- **One-Click Copilot Integration:** Push your suggestions and context to Copilot Chat with a single click.
- **Code Actions:** Select code and use the lightbulb menu to quickly "Add Comment to Copilot".
- **Drafts Panel:** View and manage all your drafted comments in a dedicated sidebar Webview with multi-line support.
- **Smart Submit Button:** A dynamic submit button appears in your editor's title bar only when you have active drafts.
- **Batch Submission:** Combine multiple drafts into a structured list and send them to Copilot Chat together.

## Usage

1. Select the code block you want to review.
2. Click the lightbulb icon (Code Action) and choose **Add Comment to Copilot**, or right-click the selection and choose **Add Comment to Copilot**.
3. Type your review suggestions into the inline comment box and click **Add to Draft**.
4. Repeat for other files as needed.
5. Click the **Submit Drafts to Copilot** button (sparkle icon) in the top-right of your editor or in the left sidebar's Plan Review view.
6. Copilot Chat will open with a prepared prompt containing your context and suggestions for you to review and send.

## Requirements

- **GitHub Copilot Chat** extension must be installed and active to handle the `workbench.action.chat.open` command.