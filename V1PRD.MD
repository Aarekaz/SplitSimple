

⸻

📄 Product Requirements Document (PRD)

Product Name

SplitSimple — a lightweight web app to record shared expenses.

⸻

1. Objective

Create a simple, reliable web application that allows groups of people to record expenses, assign them to participants, and automatically calculate per-person totals.
	•	Focus: Expense recording only (no settle-up / payment flows).
	•	Goal: Minimize friction in adding people, entering items, and splitting costs.
	•	Output: A clean per-person breakdown + copyable/exportable summary.

⸻

2. Target Users
	•	Small groups (roommates, friends, travel companions) who share expenses.
	•	Users want speed and clarity, not complex accounting.

⸻

3. Core Features

3.1 People Management
	•	Add/edit/remove people.
	•	Displayed as chips with name + color across the top.
	•	Default: everyone is “included” when adding a new item.
	•	Ability to toggle inclusion for each item.

3.2 Items Table

Each row = one expense. Columns:
	1.	Item Name (free text).
	2.	Price (numeric; supports inline math like 7.48/2 or 2*3.5).
	3.	Split With (multi-select chips of people; quick buttons: All, None, Invert).
	4.	Method (dropdown per row):
	•	Even (default)
	•	Shares (weights: e.g., A=2, B=1)
	•	Percent (must sum to 100)
	•	Exact (explicit amounts; must sum to item price)
	5.	Per-person allocations (read-only; calculated).
	6.	Delete (trash icon).

3.3 Totals Panel
	•	Displays running totals per person.
	•	Displays bill subtotal, tax, tip, grand total.
	•	Always visible (right side on desktop, bottom sticky panel on mobile).

3.4 Tax & Tip Handling
	•	Inputs in header:
	•	Tax: numeric (amount or %)
	•	Tip: numeric (amount or %)
	•	Allocation modes (selectable):
	•	Proportional to item price (default)
	•	Even across all people
	•	Assign to specific people only
	•	Rounding: auto-distribute pennies across participants.

3.5 Export & Copy
	•	Copy summary (text):

Anurag: $19.20
Praks: $32.42
Sunil: $3.00
Subtotal: $54.07
Tax: $0.54
Tip: $0.00
Grand Total: $54.61


	•	Copy per-item breakdown (text) (human-readable lines).
	•	CSV export:
	•	Items sheet: Item | Price | Method | Per-person columns
	•	Totals sheet: Person | Total

3.6 Data Persistence
	•	Autosave state to local storage.
	•	Optional: generate shareable link with state encoded in URL.

⸻

4. UX Requirements

4.1 Desktop Layout
	•	Header: Bill title, currency selector, tax/tip inputs.
	•	People row: Sticky horizontal chips.
	•	Items table: Spreadsheet-like rows with inline editing.
	•	Totals panel: Sticky right-hand column.

4.2 Mobile Layout
	•	People chips: horizontally scrollable.
	•	Items: displayed as cards.
	•	“Split With” → opens bottom sheet.
	•	Totals: sticky bottom bar, expandable.

4.3 Data Entry Speed
	•	Keyboard-first: Enter adds new row; inline math accepted.
	•	Row duplication option.
	•	Smart defaults: new row = “All people, Even split.”

4.4 Validation
	•	Highlight errors:
	•	Non-numeric price.
	•	Percent ≠ 100.
	•	Exact split not equal to item price.
	•	Undo/Redo across all actions.

4.5 Accessibility
	•	ARIA labels for all interactive elements.
	•	High-contrast mode.
	•	Large tap targets for mobile.

⸻

5. Non-Goals (Explicitly Out of Scope for v1)
	•	No settle-up calculations or transfer suggestions.
	•	No payment integrations.
	•	No accounts/login system (local-only).
	•	No AI/receipt scanning.

⸻

6. Technical Requirements
	•	Frontend-only MVP (React, Vue, or Svelte acceptable).
	•	State management: simple (React Context/Redux/Pinia).
	•	Persistence: LocalStorage.
	•	Exports: CSV generated client-side.
	•	No backend required initially.

⸻

7. Success Criteria
	•	User can:
	•	Add people and items quickly.
	•	Split items by different methods.
	•	See correct per-person totals live.
	•	Export/share results in text or CSV.
	•	Totals reconcile exactly with the bill.

⸻

8. Future Enhancements (Post-MVP)
	•	Settle-up calculation (who pays whom).
	•	Cloud sync / team login.
	•	Receipt OCR upload.
	•	Categories/tags for items.
	•	Multiple currencies.



 