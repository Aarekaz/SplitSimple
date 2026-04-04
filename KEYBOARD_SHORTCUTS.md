# Keyboard Shortcuts Reference

Quick reference guide for all keyboard shortcuts in SplitSimple.

## Quick Access

Press `?` at any time to open the keyboard shortcuts help dialog.

---

## Actions

| Shortcut | Description | Icon |
|----------|-------------|------|
| `N` | Add new item to bill | ➕ |
| `P` | Add person to split | 👥 |
| `C` | Copy bill summary to clipboard | 📋 |
| `S` | Share bill (open share dialog) | 🔗 |

---

## Editing

| Shortcut | Description | Platform |
|----------|-------------|----------|
| `⌘Z` / `Ctrl+Z` | Undo last action | Mac / Windows |
| `⌘⇧Z` / `Ctrl+Shift+Z` | Redo last action | Mac / Windows |

---

## Item Management

| Shortcut | Description | Platform |
|----------|-------------|----------|
| `⌘D` / `Ctrl+D` | Duplicate focused item | Mac / Windows |
| `Delete` | Delete focused item | All |

---

## Help

| Shortcut | Description |
|----------|-------------|
| `?` | Open keyboard shortcuts help |

---

## Notes

### Shortcut Behavior

- **Shortcuts are disabled when typing in input fields** to prevent conflicts
- Input fields include: text inputs, number inputs, textareas, and contenteditable elements
- Shortcuts work globally when no input field is focused

### Focus Requirements

- **Duplicate (`⌘D` / `Ctrl+D`)** and **Delete** shortcuts require an item to be focused
- Click on an item card to focus it before using these shortcuts
- The focused item will have a visual indicator (border/highlight)

### Platform-Specific

- Mac users should use `⌘` (Command) key
- Windows/Linux users should use `Ctrl` key
- The app automatically detects your platform

---

## Usage Tips

### Adding Items Quickly

1. Press `N` to add a new item
2. Fill in the item details
3. Press `Tab` to move between fields
4. Press `Enter` to save the item

### Managing People

1. Press `P` to add a new person
2. Enter their name
3. A unique color will be assigned automatically
4. Click on the person chip to edit or remove

### Undo/Redo Workflow

- **Undo** (`⌘Z` / `Ctrl+Z`) works for:
  - Adding/removing items
  - Adding/removing people
  - Editing item prices
  - Changing split methods
  - Modifying tax/tip/discount

- **Redo** (`⌘⇧Z` / `Ctrl+Shift+Z`) restores undone actions

- History is maintained during your session
- History is cleared when you reload the page

### Duplicating Items

Useful for adding similar items:
1. Click on an item to focus it
2. Press `⌘D` / `Ctrl+D`
3. A copy of the item is created with " (copy)" suffix
4. Modify the duplicated item as needed

### Copying Bill Summary

Press `C` to copy a formatted summary:
```
Bill Summary
------------
Item 1: $10.00
Item 2: $15.00

Subtotal: $25.00
Tax: $2.50
Tip: $3.75
Total: $31.25

Alice owes: $15.63
Bob owes: $15.62
```

---

## Accessibility

### Screen Reader Support

- All shortcuts are announced to screen readers
- Alternative text is provided for all icons
- Focus indicators are visible for keyboard navigation

### High Contrast Mode

- Shortcuts work the same in high contrast mode
- Visual indicators remain visible

### Reduced Motion

- Keyboard shortcuts trigger instant actions
- No animations are used for shortcut-triggered actions

---

## Troubleshooting

### Shortcuts Not Working?

**Problem:** Shortcuts don't respond when pressed

**Solutions:**
1. Check if you're typing in an input field (shortcuts are disabled there)
2. Click outside any input field to defocus it
3. Ensure you're using the correct modifier key (`⌘` on Mac, `Ctrl` on Windows)
4. Try refreshing the page

---

**Problem:** Item-specific shortcuts (Duplicate/Delete) don't work

**Solutions:**
1. Click on an item card to focus it first
2. Look for a visual indicator (border/outline) showing the item is focused
3. Only one item can be focused at a time

---

**Problem:** Copy shortcut doesn't copy to clipboard

**Solutions:**
1. Grant clipboard permissions if prompted by your browser
2. Try using the "Copy Summary" button as an alternative
3. Check browser console for permission errors

---

## Implementation Details

### For Developers

Keyboard shortcuts are implemented using a global event listener that:
- Captures keydown events at the document level
- Checks if the user is typing in an input field
- Prevents default browser behavior for custom shortcuts
- Triggers appropriate actions based on key combinations

**Code Location:**
- Shortcut definitions: `components/KeyboardShortcutsHelp.tsx:25-74`
- Event handler implementation: Look for `useKeyboardShortcuts` hook or global keyboard event handlers

**Preventing Conflicts:**

Input field detection checks for:
```typescript
const isInputField = (element: Element) => {
  return (
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.tagName === 'SELECT' ||
    element.getAttribute('contenteditable') === 'true'
  )
}
```

---

## Future Shortcuts (Planned)

Potential shortcuts being considered:

- `E` - Export bill to CSV
- `⌘F` / `Ctrl+F` - Search/filter items
- `⌘K` / `Ctrl+K` - Command palette
- `Esc` - Close open dialogs
- Arrow keys - Navigate between items
- `Enter` - Edit focused item
- `⌘S` / `Ctrl+S` - Quick save (if autosave is disabled)

---

## Related Documentation

- [README.md](./README.md) - Full project documentation
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Development guidelines
- Component: `components/KeyboardShortcutsHelp.tsx` - Shortcuts help dialog

---

## Feedback

Have suggestions for new shortcuts or improvements?

- Open an issue on GitHub
- Tag it with `enhancement` and `keyboard-shortcuts`
- Describe the shortcut and its use case
