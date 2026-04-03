# Attenborofy frontend

React + TypeScript + Vite UI for [Attenborofy](../README.md): upload a short video, get David Attenborough–style narration.

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Dev server (default Vite port; `/api` is proxied to `http://localhost:5001`) |
| `npm run build` | Typecheck + production bundle to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |

## Local development

1. From the repo root, configure `.env` and start the backend: `cd backend && uv run python app.py` (listens on port **5001**).
2. In another terminal: `cd frontend && npm install && npm run dev`.

API calls use relative `/api/...` URLs; Vite proxies them to the Flask app during development. For a single-process setup without the proxy, build the frontend and run only the backend — it serves `frontend/dist` as static files.

## Stack

- React 19, React Router, Vite 8
- Tailwind CSS v4 (`@tailwindcss/vite`), Base UI, Lucide icons

Configuration: `vite.config.ts`, `eslint.config.js`, `tsconfig.app.json`.
