# Donna Walks

A phone-first walk log for Donna, my leash-reactive black Lab. I tap once to log a reaction (what set her off, how close it was, how big it got), a pee or a poo with a quality score. The app tracks the route and distance and shows whether training is working.

**Live:** [donna-walks.vercel.app](https://donna-walks.vercel.app) · **With sample data:** [donna-walks.vercel.app/?demo](https://donna-walks.vercel.app/?demo)

## Why I built it

Donna reacts to dogs, bikes and the odd scooter. Our trainer and vet both asked the same questions: how often, how close, how bad, and is it getting better? I was answering from memory. Notes apps were too slow to use mid-walk with a leash in one hand.

So the job is: **log a reaction in under five seconds, one-handed, then see the trend.**

## What it does

- **Walk tracking.** Start and end a walk. GPS records the route and distance.
- **One-tap logging.** Reaction, pee and poo buttons sized for a thumb. Pee is a single tap with undo. Each entry is tagged with time and location.
- **Reactions** capture the trigger, distance to it (in buckets, since nobody measures metres mid-lunge), intensity on a 1–5 scale with plain-language descriptions, and whether she'd still take a treat afterwards. That's a common sign she was under threshold.
- **Poo quality** uses the 1–7 fecal score vets use, plus flags for mucus, blood and straining.
- **Insights.** Reactions per km by week, average intensity, a hotspot map, trigger breakdown and a poo quality timeline.
- **Exports.** A CSV log to send the vet or trainer, and a full JSON backup and restore.
- **Demo mode.** 12 weeks of generated sample data in a separate database, so I can show the app without exposing my own walks.

## Product decisions

| Decision | Why |
|---|---|
| **Reactions per km** as the headline metric | Raw reaction counts go up on longer walks. Normalizing by distance makes weeks comparable. |
| **No backend, data stays on the phone** (IndexedDB) | Single user, works with no signal on trails, zero hosting cost, nothing personal on a server. The trade-off is that clearing Chrome's data deletes it, so backup and export are first-class features. |
| **PWA, not a native app** | Installs from Chrome on Android, deploys on every push and needs no Play Store. |
| **Keep the screen on during walks** | Chrome on Android pauses GPS when the screen is off. A wake lock keeps tracking accurate, and you can correct the distance after the walk if the screen did go off. |
| **GPS filtering** | Drops fixes worse than ±30 m, ignores jitter under 4 m and rejects jumps faster than a jog. Otherwise standing still at a corner adds phantom distance. |
| **Buckets for trigger distance** | Faster to tap and honest about precision. |
| **Material 3 design** | It's used on an Android phone, so it follows Android's own design system: navigation bar, bottom sheets, chips, dynamic-colour-style tonal palette and dark mode. |
| **Cut: AI summary** | Considered an LLM-written weekly summary for the trainer. The CSV export and the charts already answer the trainer's questions, so the extra cost and complexity weren't worth it for v1. |

## What I'd do next

- Optional sync (e.g. Supabase) so the data survives a phone change without manual backups
- Log what I did in response (U-turn, treat scatter, "look at that") to see which techniques work
- Weather and time-of-day overlays on reactions

## Tech

React 19, TypeScript and Vite · Dexie (IndexedDB) · Leaflet with OpenStreetMap tiles · vite-plugin-pwa (offline service worker, installable) · hand-built SVG charts · deployed on Vercel.

```bash
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
```

GPS needs HTTPS (or localhost), so test location features on the deployed site or with `npm run dev -- --host` behind a tunnel.

## Credits

Built with Claude as a pair programmer. Map data © OpenStreetMap contributors.
