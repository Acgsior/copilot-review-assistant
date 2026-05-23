# Antigravity Plan Review - Extension Development Plan

## 📖 项目概述 (Project Overview)
**Antigravity Plan Review** 是一款基于 VS Code 的插件，旨在提升代码审查和 AI 辅助开发的体验。它通过调用 VS Code 原生的 Comments API，允许用户在代码编辑器中选中任意段落，触发类似 GitHub PR Review 的悬浮内联评论框。用户在其中输入审查建议后，插件会自动抓取上下文（文件路径、行号、选中的源码），并将其一键发送至 GitHub Copilot Chat 会话框中，实现无缝的 AI 代码审查工作流。

---

## 🏗️ 技术蓝图 (Technical Blueprint)

### 1. 核心架构与 API 依赖
插件的核心逻辑依赖于以下 VS Code 扩展 API：
- `vscode.comments`: 用于创建和管理内联评论容器 (`CommentController` 和 `CommentThread`)。
- `vscode.window.activeTextEditor`: 获取当前编辑器的状态和用户选中的代码范围 (`Selection`)。
- `vscode.commands.executeCommand`: 用于触发内置命令，特别是向 Copilot 发送消息的 `workbench.action.chat.open`。

### 2. 核心模块设计
*   **Controller 初始化模块**:
    *   在 `activate` 周期内注册全局 `CommentController` (ID: `antigravity-review`)。
*   **交互触发模块 (Commands)**:
    *   `antigravity.createReviewThread`: 绑定到编辑器右键菜单（要求当前有选中内容 `editorHasSelection`），用于在选中行实例化一个 `CommentThread`。
    *   `antigravity.submitToCopilot`: 绑定到评论框内部的按钮。接收 `vscode.CommentReply` 对象作为参数。
*   **上下文汇编模块 (Context Assembler)**:
    *   提取 `CommentReply` 中的文本（用户意图）。
    *   读取 `thread.uri`（文件路径）、`thread.range`（行号范围）和对应的源码内容。
*   **AI 通信模块 (Chat Bridge)**:
    *   构建标准的 Markdown Prompt 模板。
    *   通过 `workbench.action.chat.open` 将数据推送至侧边栏的 Copilot 聊天窗。

### 3. `package.json` 清单规划 (Manifest)
```json
{
  "activationEvents": [],
  "contributes": {
    "commands": [
      {
        "command": "antigravity.createReviewThread",
        "title": "Start AI Plan Review",
        "icon": "$(comment-add)"
      },
      {
        "command": "antigravity.submitToCopilot",
        "title": "Submit to Copilot Chat",
        "icon": "$(sparkle)"
      }
    ],
    "menus": {
      "editor/context": [
        {
          "when": "editorHasSelection",
          "command": "antigravity.createReviewThread",
          "group": "1_modification"
        }
      ],
      "comments/commentThread/context": [
        {
          "command": "antigravity.submitToCopilot",
          "group": "inline"
        }
      ]
    }
  }
}
```

---

## ✅ 任务清单 (Task Breakdown)

### Phase 1: 项目初始化 (Project Setup)
- [x] 使用 `yo code` 脚手架生成基础 VS Code 插件项目 (TypeScript)。
- [x] 清理无用的脚手架代码（如 `helloworld` 命令）。
- [x] 配置 `eslint` 和 `prettier` 以保持代码风格统一。
- [x] 更新 `README.md`，添加项目介绍和功能演示占位符。

### Phase 2: 配置文件构建 (Manifest Configuration)
- [x] 在 `package.json` 中添加 `contributes.commands` 注册两个核心命令。
- [x] 在 `package.json` 中配置 `menus`，确保命令正确注入到编辑器右键菜单 (`editor/context`) 和评论框上下文 (`comments/commentThread/context`)。
- [x] 配置插件激活事件（使用现代 VS Code 插件的隐式激活，或配置对应的命令激活）。

### Phase 3: 核心交互逻辑开发 (Core Logic Implementation)
- [x] 实例化 `vscode.comments.createCommentController`。
- [x] 实现 `antigravity.createReviewThread` 命令：
  - 获取当前 `activeTextEditor` 和 `selection`。
  - 创建并展开一个新的 `CommentThread`，允许用户输入回复 (`canReply = true`)。
- [x] 实现基础的 `Comment` 类，实现 `vscode.Comment` 接口，以便在 UI 中正确渲染（可选，但推荐用于更复杂的 UI 控制）。

### Phase 4: 整合 Copilot Chat (Copilot Integration)
- [x] 实现 `antigravity.submitToCopilot` 命令：
  - 从回调参数 `reply: vscode.CommentReply` 中提取用户输入的文本。
  - 获取文档对应的 URI、语言类型 (Language ID)、起始行和结束行、以及具体源码字符串。
- [x] 编写 Prompt 组装函数，生成包含代码块、行号和用户指令的 Markdown 字符串。
- [x] 调用 `vscode.commands.executeCommand('workbench.action.chat.open', { query: prompt })`。
- [x] 执行成功后，调用 `thread.dispose()` 销毁当前的评论悬浮窗以保持界面整洁。

### Phase 5: 异常处理与边界测试 (Edge Cases & Testing)
- [x] 处理未选中代码时的异常反馈 (提示用户先选中代码)。
- [x] 处理文档内容过长时的截断逻辑（避免把 1000 行代码塞入 Prompt 导致 Copilot 拒绝响应，可设置最大行数限制）。
- [x] 兼容性测试：确保在没有安装 GitHub Copilot 插件时，友好地提示用户安装或降级为复制到剪贴板。

### Phase 6: 打包与发布 (Packaging & Release)
- [x] 准备插件图标 (`icon.png`) 和演示动画 (GIF)。 (Skipped for initial build)
- [x] 更新 `CHANGELOG.md`。
- [x] 使用 `@vscode/vsce` 打包生成 `.vsix` 文件，并准备发布至 VS Code Marketplace。
