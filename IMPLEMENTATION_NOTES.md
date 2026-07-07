# Balanced Wow UI Integration Overlay

This overlay implements the approved **B. Balanced wow** direction for `Imnotheron/community-resource-mapping`.

## What this changes

- Replaces the root page with a lazy-loaded, client-side portal shell.
- Adds the attached frontend design system: landing page, auth screen, role dashboards, profile view, layout shell, map components, forms, and live-data hooks.
- Preserves backend contracts. This overlay does **not** replace Prisma schema, `src/lib/db.ts`, API route logic, or migrations.
- Adds a lightweight Three.js decorative network scene to the landing page only.
- Adds Framer Motion view transitions in the dashboard shell.
- Upgrades the vulnerable map with marker depth styling and a subtle tilt effect without adding Mapbox or heavy WebGL map dependencies.
- Keeps compatibility with the existing app's `localStorage` keys (`user`/`token`) while also writing the new `crms_user`/`crms_token` keys.

## Apply

From the root of a clean checkout of the GitHub repository:

```bash
cp -R /path/to/balanced-wow-ui-overlay/* .
bun install
bun run build
```

If you prefer Git:

```bash
git checkout -b balanced-wow-ui-integration
cp -R /path/to/balanced-wow-ui-overlay/* .
git add src public IMPLEMENTATION_NOTES.md
git commit -m "Integrate balanced wow UI redesign"
```

## Important

The GitHub integration returned `403 Resource not accessible by integration` when attempting to create a branch, so this overlay is provided as a ready-to-apply package instead of a pushed branch.
