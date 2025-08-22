

📄 Product Requirements Document (PRD)

Product Name

SplitSimple — a lightweight web app to record and split shared expenses.

⸻

1. Objective

Create a web app that makes it fast and effortless to record expenses across multiple people.
	•	Each item can be assigned to one or more people.
	•	The app automatically calculates each person’s share and updates totals in real time.
	•	Users can export the final breakdown in plain text or CSV.

No settle-up or payments in v1.
Focus is purely on recording and calculation.

⸻

2. Target Users
	•	Small groups (roommates, friends, travel buddies).
	•	Users who need speed, clarity, and correctness when splitting bills.

⸻

3. Core Features

3.1 People Management
	•	Users can add, edit, and remove people.
	•	People appear as chips with names + colors at the top.
	•	Default: all people included in new items.

3.2 Items Table

Each row = one expense. Columns:
	1.	Item Name (text input).
	2.	Price (numeric input, supports inline math like 7.48/2).
	3.	Split With (multi-select chips from people row).
	•	Quick buttons: All / None / Invert.
	•	Selected people highlighted.
	4.	Split Method (dropdown per row):
	•	Even (default): Divide evenly among selected people.
	•	Shares: User enters integer weights per person.
	•	Percent: User enters % per person (must sum to 100).
	•	Exact: User enters exact amounts (must equal price).
	5.	Per-Person Amounts (read-only, auto-calculated).
	6.	Delete Row (trash icon).

⚡ Core flow: As soon as “Split With” and “Price” are set, the app automatically calculates and displays per-person amounts both in the row and in totals.

3.3 Totals Panel
	•	Always visible (sticky right on desktop, sticky bottom on mobile).
	•	Shows per-person running totals.
	•	Shows Subtotal, Tax, Tip, and Grand Total.
	•	Updates live as items are added/edited.

3.4 Tax & Tip
	•	Input fields in header for Tax and Tip (numeric or %).
	•	Allocation modes:
	•	Proportional (default).
	•	Even across all people.
	•	Specific people only.
	•	Auto-calculated into totals.
	•	Rounding: pennies distributed fairly across people.

3.5 Output & Export
	•	Copy Totals (Text):

Anurag: $19.20
Praks: $32.42
Sunil: $3.00

Subtotal: $54.07
Tax: $0.54
Tip: $0.00
Grand Total: $54.61


	•	Copy Per-Item Breakdown (Text):

Grapes $7.48 → Anurag $3.74, Praks $3.74
Cheese $3.49 → Anurag $1.75, Sunil $1.75
...


	•	CSV Export:
	•	Items sheet: Item | Price | Method | Person 1 | Person 2 …
	•	Totals sheet: Person | Total

3.6 Data Persistence
	•	Autosave bill state to local storage.
	•	Optional: Shareable link with state encoded in URL.

⸻

4. UX Requirements

4.1 Desktop
	•	Header: Bill title, currency selector, tax/tip fields, export buttons.
	•	People row (sticky): Chips with add/remove option.
	•	Items table: Spreadsheet-like rows.
	•	Totals panel (sticky right): Live totals.

4.2 Mobile
	•	People chips scroll horizontally.
	•	Items displayed as cards (tap for split details).
	•	Totals collapsed into sticky bottom bar, expandable.

4.3 Data Entry Speed
	•	Keyboard-first: Enter = add new row.
	•	Inline math in Price field.
	•	Row duplication option.
	•	Smart defaults: all people selected + Even split.

4.4 Validation
	•	Errors flagged inline:
	•	Invalid price.
	•	Percent not 100.
	•	Exact not matching total.
	•	Undo/Redo for edits.

4.5 Accessibility
	•	ARIA labels for chips, inputs, dropdowns.
	•	Keyboard navigation for row inputs.
	•	High-contrast and large touch targets.

⸻

5. Non-Goals
	•	No settle-up (who pays whom).
	•	No payment integrations.
	•	No login/accounts (local only).
	•	No AI/receipt scanning.

⸻

6. Technical Requirements
	•	Frontend-only MVP.
	•	Framework: React + Tailwind.
	•	State: React Context or Redux.
	•	Persistence: LocalStorage.
	•	CSV/Text export client-side.
	•	No backend required.

⸻

7. Success Criteria
	•	User can:
	•	Add people quickly.
	•	Add items and select people.
	•	See automatic, correct per-person amounts.
	•	View live totals.
	•	Export summary in text/CSV.
	•	Totals always reconcile with bill total.

⸻

8. Future Enhancements (Not in v1)
	•	Settle-up calculation (who owes whom).
	•	Categories/tags for items.
	•	Cloud sync / login.
	•	Receipt OCR import.
	•	Multi-currency handling.

⸻

👉 The core feature (must be flawless):
Selecting people per item + automatic per-person calculation + live totals.
Everything else (tax, exports, UI polish) is secondary.

⸻

