# Wow Motion V2 Overlay

This overlay upgrades the existing Balanced Wow UI with animations and visual polish for **all role surfaces**, not just admin:

- Admin dashboard
- Worker dashboard
- Vulnerable citizen dashboard
- Profile page/cards
- Login / role selection
- Map views
- Shared shell/sidebar/header/mobile navigation

## What changed

- Shared animated dashboard ambient background
- Animated sticky header seals
- Spring-animated sidebar active pill
- Mobile navigation entrance transitions
- Dashboard page transitions
- Floating glass workspace bar
- Card/table/stat hover depth
- Animated role-selection cards
- Animated auth form glass panel
- Pulsing Leaflet markers and map scanline layer
- Reduced-motion support

## Apply

From the project root where `package.json` exists:

```powershell
Expand-Archive wow-motion-v2-overlay.zip -DestinationPath . -Force
Copy-Item -Recurse -Force .\wow-motion-v2-overlay\* .
bun run build
bun run dev
```

If Git Bash:

```bash
unzip -o wow-motion-v2-overlay.zip
cp -R wow-motion-v2-overlay/* .
bun run build
bun run dev
```

## Backend safety

No Prisma schema, database client, migrations, or API routes are included. This is a frontend-only animation/polish overlay.
