# CRMS Account-Wide Interface Scale

This corrects the difference shown in the screenshots.

The current feature changes the root font size. That resizes rem-based text,
but pixel-sized controls, cards, dialogs, and other UI elements can remain at
their original size.

This patch keeps the base font at 16px and uses the saved Small/Default/Large
preference to scale the complete document:

- Small: 93.75%
- Default: 100%
- Large: 106.25%

The ratios preserve the previous 15px/16px/17px text choices, so text does not
become unexpectedly larger than before. The change now also covers cards,
buttons, controls, spacing, icons, forms, tables, dialogs, sheets, toasts, maps,
navigation, and fixed-pixel UI dimensions.

The existing API and database preference remain unchanged. Each Admin, Worker,
and Vulnerable user keeps an independent saved choice.

Apply from the project root:

node .\scripts\apply-account-wide-interface-scale.mjs

Build:

Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npx prisma generate
npm run build

Stage only the runtime files:

git restore --staged .

Get-Content .\scripts\account-wide-interface-scale-files.txt | ForEach-Object {
  git add -- $_
}

git diff --cached --name-only

Expected files:

src/components/profile-view.tsx
src/components/providers/theme-provider.tsx

Commit and push:

git commit -m "Scale the complete UI with saved interface size"
git push origin main

Cleanup:

Remove-Item .\scripts\apply-account-wide-interface-scale.mjs
Remove-Item .\scripts\account-wide-interface-scale-files.txt
