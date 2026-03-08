

## Add LaTeX Button to Markdown Toolbar

Add a math/equation button to the `MarkdownToolbar` in `src/components/MarkdownToolbar.tsx`.

### Changes

**`src/components/MarkdownToolbar.tsx`**:
- Import the `Sigma` icon from lucide-react (or similar math icon)
- Add two new format actions to the `formatActions` array:
  - **Inline Math**: prefix `$`, suffix `$`, placeholder `E = mc^2`
  - **Block Math**: prefix `$$\n`, suffix `\n$$`, placeholder `\\int_0^\\infty e^{-x} dx = 1`, as a block element
- These will appear after the Link button, before the image upload divider

This is a single-file, minimal change that reuses the existing format action system.

