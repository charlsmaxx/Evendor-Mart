# PWA icons

These PNGs are required for installability (Android, Desktop Chromium, and Apple touch).

| File | Size | Purpose |
|------|------|---------|
| `icon-192.png` | 192×192 | Standard install icon |
| `icon-512.png` | 512×512 | Splash / high-res install icon |
| `maskable-512.png` | 512×512 | Android adaptive / maskable icon (safe zone) |

Generated from `public/logo-icon.png` via:

```bash
node scripts/generate-pwa-icons.mjs
```

To replace with a custom brand mark, drop a square PNG at `public/logo-icon.png` (ideally 1024×1024 with transparent or solid background) and re-run the script. For maskable icons, keep important artwork inside the center ~80% so Android launchers do not crop it.
