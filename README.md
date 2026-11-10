# THE FUTURE — A History of Wonder

A cinematic, interactive journey through the history of science, from early human observation to a possible future shaped by superintelligence.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm ci
npm run dev
```

Open the local URL printed by the server. No API keys or external media services are needed.

## Explore

- **Begin the journey** enters the first of eight chapters.
- Scroll, swipe vertically, use **← / →**, or select an era on the timeline to travel through time.
- **Play journey** advances every 26 seconds; **Space** toggles playback when a button is not focused. Playback pauses while a chapter dialog is open or the browser is hidden.
- **Discover this era** opens milestones and institutional source links.
- Sound is optional, synthesized locally, and off by default.
- Fullscreen is available in browsers that support it.

## Implementation

React, TypeScript, Vinext/Vite, and Three.js. All nine sculptures (the introduction plus eight eras), their textures, star fields, and lighting are generated locally. The scene bounds pixel density, pauses when hidden, and disposes GPU resources on unmount. Device reduced-motion preferences are respected. A chapter-specific compatibility view is used when WebGL is unavailable.

`app/page.tsx` contains navigation, playback, dialogs, and ambient sound. `components/journey-scene.tsx` contains the visual scenes. `lib/chapters.json` holds sourced historical narratives and milestones. Chapter dates are narrative boundaries, not exclusive historical periods; the future chapter is explicitly speculative and has no predicted arrival date.

Typography uses Google Fonts with local serif and sans-serif fallbacks. All other visuals and sound work without external requests.

## Validate and build

```sh
npx tsc --noEmit
npm run build
```

The Sites hosting configuration is in `.openai/hosting.json`. The production bundle is generated under `dist/`. The repository includes the Sites/Vinext build integration and Cloudflare Worker adapter.
