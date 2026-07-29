# All-UI Font Size Response Fix

The existing setting already changes the root font size and persists it in the
user's database preferences. Standard Tailwind sizes such as `text-sm`,
`text-base`, and `text-xl` therefore respond automatically.

Some UI labels use fixed arbitrary pixel classes such as:

- `text-[10px]`
- `text-[11px]`
- `text-[13px]`

Pixel values do not respond to the root font-size setting.

This helper converts only typography values:

- `text-[10px]` becomes `text-[0.625rem]`
- `fontSize: '12px'` becomes `fontSize: '0.75rem'`
- CSS `font-size: 14px` becomes `font-size: 0.875rem`

At the Default 16px setting, every converted value remains visually identical.
Small and Large then resize those letters together with the rest of the UI.

It does not convert widths, heights, spacing, icons, borders, maps, charts, or
other dimensions.

The helper also fixes the initial saved font-size reference in the shared
appearance provider.

## Apply

Extract this package into the project root and run:

node scripts/apply-font-size-all-ui-text.mjs

The helper writes the exact changed runtime-file list to:

scripts/font-size-responsive-files.txt

## Build

Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npx prisma generate
npm run build

## Stage exactly the generated runtime files

Get-Content scripts\font-size-responsive-files.txt | ForEach-Object {
  git add -- $_
}

git diff --cached --name-only

## Commit

git commit -m "Make all UI text follow font size setting"
git push origin main

## Cleanup

Remove-Item scripts\apply-font-size-all-ui-text.mjs
Remove-Item scripts\font-size-responsive-files.txt
