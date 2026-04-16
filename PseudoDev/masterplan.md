# 🛸 PseudoDev Master Plan: cmux-Based Pure-Rust IDE

## 1. Vision & Core Philosophy
**PseudoDev** is a high-performance, "Terminal-First" development environment for macOS. It leverages the **cmux** core (a Swift/AppKit terminal multiplexer) but aims to move towards a **Native Rust** architecture where possible. It combines the aesthetic of **Xcode** with the utility of an **integrated Finder** and a **live Git Diff Tracker**.

*   **Primary Goal:** A lightweight, sub-100MB RAM IDE with instant UI response.
*   **Base Engine:** cmux (Swift/AppKit) with Ghostty (Native Process Embedding).
*   **Design Language:** Xcode "Default Dark" Syntax Theme.

---

## 2. Technical Stack
| Component | Technology | Role |
| :--- | :--- | :--- |
| **App Framework** | Swift / AppKit | Main window management and UI (cmux core) |
| **Terminal Engine** | `Ghostty` | GPU-accelerated terminal (Metal/macOS) |
| **Layout** | `Bonsplit` | Advanced pane splitting and management |
| **File System** | `NSFileManager` / `NSOutlineView` | Native file tree |
| **Git Engine** | `git` CLI / `libgit2` | Real-time local diff tracking |

---

## 3. Architecture & Panes

### 🛡️ Left Pane: Integrated Finder (Project Navigator)
*   **Aesthetic:** Replaces the cmux "Vertical Tabs" with an Xcode-style "Source List".
*   **Logic:** Native `NSOutlineView` backed by a file system scanner.
*   **Features:**
    *   **Native Icons:** Uses `NSWorkspace` to pull the *actual* system icons for folders/files.
    *   **Selection Sync:** Clicking a folder sends an IPC signal to `cd` the active Ghostty terminal.
    *   **Vibrancy:** Uses `NSVisualEffectView` for the blurred "glass" sidebar effect.

### ⌨️ Center Pane: Ghostty Terminal
*   **Integration:** Managed via `GhosttyTerminalView` and `TerminalPanel`.
*   **Configuration:** Custom `.ghostty` config injected to:
    *   Strip window decorations (title bar, buttons).
    *   Match background to Xcode Dark (`#1e1f22`).
    *   Set font to `JetBrains Mono` or `SF Mono`.

### 📉 Right Pane: Live Diff Tracker (File Explorer)
*   **Logic:** Integrates with cmux's `FileExplorerView` but enhanced for Git status.
*   **UI Elements:**
    *   **Status Badges:** `M` (Orange/Gold), `A` (Green), `D` (Red) using Xcode hex codes.
    *   **Git Integration:** Real-time status colors for local and SSH workspaces.

---

## 4. Visual Identity (Xcode Dark Palette)
| Element | Hex Code | Usage |
| :--- | :--- | :--- |
| **Background** | `#1e1f22` | Primary background |
| **Sidebar Borders**| `#303235` | Pane separators |
| **Selection** | `#45494e` | Active folder/file highlight |
| **Folder Blue** | `#3594cf` | Icon accent color |
| **Text Primary** | `#bcbec4` | Main labels |
| **Text Muted** | `#808080` | Secondary metadata |

---

## 5. Development Roadmap

### Phase 0: Foundation ✅ COMPLETE
*   [x] Clone cmux: Use `manaflow-ai/cmux` as the stable foundation.
*   [x] Understand cmux: Map out `ContentView`, `VerticalTabsSidebar`, and `FileExplorerView`.
*   [x] Initialize git submodules (ghostty, bonsplit, homebrew-cmux).
*   [x] Download GhosttyKit.xcframework prebuilt binary.

### Phase 1: Left Pane Rewrite (Integrated Finder) ✅ COMPLETE
*   [x] **Created `ProjectNavigatorStore.swift`** — File system tree store with:
  * Git repo root detection (walks up to find `.git` directory)
  * Per-project expanded path persistence via UserDefaults
  * Directory watching for live file system updates
  * Prefetch on hover for snappy folder expansion
  * Git status integration (reuses `GitStatusProvider`)
  * CWD sync callback (`onFolderSelect` → sends `cd` to active terminal)
*   [x] **Created `ProjectNavigatorView.swift`** — Xcode-style navigator with:
  * Pure AppKit `NSOutlineView` for native performance
  * `NavigatorContainerView` with header bar showing project path
  * `NavigatorCellView` with native macOS file/folder icons via `NSWorkspace`
  * Git status badges (M/A/D) with Xcode Dark palette colors
  * `NavigatorRowView` with rounded selection highlighting matching Xcode
  * Context menu (Open in Terminal, Open in Default Editor, Reveal in Finder, Copy Path)
  * Drag-to-terminal support (files are draggable as NSURLs)
*   [x] **Modified `ContentView.swift`**:
  * Replaced `VerticalTabsSidebar` with `ProjectNavigatorPanelView`
  * Added `navigatorStore` state object
  * Wired up `syncNavigatorDirectory()` alongside `syncFileExplorerDirectory()`
  * Added `wireUpNavigatorCallbacks()` for folder→terminal CWD sync
*   [x] **Updated Xcode project** (`project.pbxproj`) with new source files.
*   [x] **Build verified** — `xcodebuild` succeeds with no errors.

### Phase 2: Xcode Aesthetic ✅ COMPLETE
*   [x] Applied Xcode Dark palette (`ProjectNavigatorTheme`) to all navigator components:
  * Background: `#1e1f22`
  * Header: `#25262b`
  * Selection: `#45494e` (rounded rect)
  * Folder icons: `#3594cf` blue accent
  * Text primary: `#bcbec4`
  * Text muted: `#808080`
  * Git modified: `#e5a649` (orange)
  * Git added: `#5cb85c` (green)
  * Git deleted: `#d9534f` (red)

### Phase 3: Enhanced Git Tracking ✅ COMPLETE
*   [x] Refine Right Sidebar File Explorer to focus on Git diff tracking
*   [x] Add inline diff preview panel
*   [x] Git blame integration in navigator context menu
*   [x] Branch switching from navigator header

---

## 6. Directory Structure (Modified cmux)
```text
PseudoDev/cmux/
├── Sources/
│   ├── ContentView.swift              # Main Layout (HStack of Sidebar + Terminal)
│   ├── ProjectNavigatorView.swift     # Xcode-style Project Navigator (NSOutlineView) + Branch Switching
│   ├── ProjectNavigatorStore.swift    # File System Tree + Git Status + CWD Sync
│   ├── GitTrackerStore.swift          # NEW: Git tracking store (branches, files, diffs, blame)
│   ├── GitTrackerView.swift           # NEW: Git status panel (staged/unstaged sections, branch picker)
│   ├── GitDiffPreviewView.swift       # NEW: Inline diff preview + blame view
│   ├── GhosttyTerminalView.swift      # Terminal Rendering
│   ├── FileExplorerView.swift         # Right Pane (Git Status)
│   ├── FileExplorerStore.swift        # File Explorer Data Store
│   └── ... (existing cmux sources)
```

---

## 7. Build Status
| Phase | Status | Files Changed |
|:------|:-------|:-------------|
| Phase 0: Foundation | ✅ Complete | Submodules initialized, GhosttyKit downloaded |
| Phase 1: Left Pane | ✅ Complete | `ProjectNavigatorStore.swift`, `ProjectNavigatorView.swift`, `ContentView.swift`, `project.pbxproj` |
| Phase 2: Xcode Theme | ✅ Complete | Theme colors applied in `ProjectNavigatorTheme` |
| Phase 3: Git Tracking | ✅ Complete | `GitTrackerStore.swift`, `GitTrackerView.swift`, `GitDiffPreviewView.swift`, `ContentView.swift`, `ProjectNavigatorView.swift` |
