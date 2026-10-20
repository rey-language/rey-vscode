<p align="center">
  <img src="icons/logo.png" width="128" height="128" alt="Rey Programming Language Logo" />
</p>

<h1 align="center">Rey Language Support for Visual Studio Code</h1>

<p align="center">
  Official Visual Studio Code extension for the <strong>Rey Programming Language</strong> (v0.3.0).
</p>

---

## Features

- **Rich Syntax Highlighting:** Modern TextMate grammar supporting Rey v0.3.0 syntax, operators, block comments `/* ... */`, string interpolation `{expr}`, numeric formats (hex, binary, scientific, underscores), and all 50+ standard library functions.
- **Language Server Protocol (LSP):**
  - **Autocomplete & IntelliSense:** Context-aware completions including built-in functions, keywords, types, and member completions for standard types (`string`, `Vec`, `HashMap`, `Option`, `Result`).
  - **Static Path Completions:** Double-colon `::` completions for enums (e.g. `Option::Some`, `Option::None`) and constructors (`Vec::new`, `HashMap::new`).
  - **Hover Documentation:** Markdown documentation and type signatures for language constructs, standard library functions, and user symbols.
  - **Signature Help:** Parameter hints and active parameter tracking during function and method calls.
  - **Navigation & Refactoring:** Scope-aware Go-to-Definition, Find References, Document Highlights, and Rename Symbol.
  - **Type Inlay Hints:** Inline type hints for unannotated variables and constants.
  - **Diagnostics & Quick-Fixes:** Real-time semantic diagnostics flagging missing semicolons and uppercase primitive types (e.g. `String` &rarr; `string`) with one-click quick-fixes.
- **Editor Commands & Compiler Integration:**
  - `Rey: Run File` &mdash; Run the active `.rey` file via compiler auto-detection.
  - `Rey: Build File` &mdash; Build the active `.rey` file.
  - `Rey: Check Diagnostics` &mdash; Run compiler static checks on the active file.
  - `Rey: Restart Language Server` &mdash; Fast reload of the LSP background server.

## Installation

### From VSIX Package
```bash
npx @vscode/vsce package
code --install-extension rey-lang-0.3.0.vsix --force
```

### From Marketplace
Search for `Rey` or `rey-lang` by `rey-language` in the VS Code Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`).
