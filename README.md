# Picsee Uploader

React image uploader with a fully custom UI and headless Uppy integration.

## Features

- Uppy headless flow (`@uppy/core` + `@uppy/transloadit`) with no Uppy UI plugins
- Worker-based image preprocessing (resize + WebP conversion before upload)
- Immediate preview flow (original preview first, processed preview after worker completes)
- Drag-and-drop, file picker, and clipboard paste (`Cmd/Ctrl + V`)
- Status-based filtering (`All`, `Ready for upload`, `Uploaded`, `Failed`)
- Per-file and overall progress tracking
- Masonry-style virtualized grid for large batches
- Session-scoped duplicate detection
- Toast-based validation and error feedback with auto-dismiss + manual dismiss
- Remove action is UI-only (does not delete from Transloadit host)

## Tech Stack

- React 19, TypeScript, Vite
- `@uppy/core`, `@uppy/transloadit`
- `@jsquash/resize`, `@jsquash/webp`
- `@tanstack/react-virtual`
- CSS Modules
- Vitest + Testing Library (unit)
- Cypress (e2e)

## Environment Variables

Create a `.env` file in project root:

```bash
VITE_TRANSLOADIT_AUTH_KEY=your_transloadit_auth_key
VITE_TRANSLOADIT_TEMPLATE_ID=your_transloadit_template_id
```

Notes:

- This client app uses the Transloadit auth key + template id only.
- `AUTH_SECRET` is not used in this frontend-only setup.

## Setup

```bash
npm install
npm run dev
```

Notes:
- The worker doesn't work in the dev mode, please build and use preview for testing the entire app.

Build and preview:

```bash
npm install
npm run build
npm run preview
```

## Scripts

- `npm run dev` - start Vite dev server
- `npm run build` - TypeScript build + Vite production build
- `npm run preview` - preview production build locally
- `npm run lint` - run ESLint
- `npm run test:unit` - run unit tests
- `npm run test:e2e` - run Cypress e2e against local preview server

## Overall Architecture

### End-to-end flow

1. User adds files via drop, browse, or paste.
2. `useUppyUploader` validates type/size and session dedupe rules.
3. UI immediately shows original preview and marks item as `processing`.
4. `ImagePreprocessor` queues the task and assigns it to an available worker slot.
5. Worker decodes image, resizes to max width 1600, then encodes to WebP.
6. Hook swaps preview to processed WebP and adds processed file to Uppy.
7. Upload starts via Transloadit plugin; hook updates item/overall progress from Uppy events.
8. On remove, item is removed from UI state only (no remote delete call is made).

### Layered design

- **UI layer** - `src/UploaderApp.tsx` + `src/components/uploader/`*
- **State/orchestration layer** - `src/hooks/useUppyUploader.ts`
- **Processing layer** - `src/lib/imagePreprocessor.ts` + `src/workers/imageProcessor.worker.ts`
- **Shared types/utilities** - `src/types/`*, `src/utils/uploaderFormatters.ts`

## Component Structure

```text
src/
  UploaderApp.tsx
  components/
    uploader/
      DropZone.tsx
      FileGrid.tsx
      FilterChips.tsx
      ToastStack.tsx
      UploadControls.tsx
      UploaderContent.tsx
      UploaderHeader.tsx
  hooks/
    useUppyUploader.ts
  lib/
    imagePreprocessor.ts
  workers/
    imageProcessor.worker.ts
  types/
    uploader.ts
    imageProcessor.types.ts
  utils/
    uploaderFormatters.ts
```

## Architecture Decisions

### 1) Headless Uppy, custom UI

Uppy is used as a state/upload engine only. All visuals and interactions are custom React components.

### 2) Off-main-thread image pipeline

Preprocessing happens in workers so heavy decode/resize/encode work does not block UI interactions.

### 3) Worker pooling with queue

`ImagePreprocessor` manages a small worker pool, task queueing, and timeout-based recovery. This keeps throughput stable for large batches.

### 4) Preview strategy (original -> processed)

- original image preview appears immediately
- processing state applies blur/skeleton treatment
- preview swaps to processed WebP when conversion completes
- uploaded file is the processed WebP

### 5) Session-only duplicate logic

Duplicate tracking is in-memory for the current runtime only and resets after page reload.

### 6) Resilient remove behavior

Remove is instant in UI and local state only. Uploaded assets are not deleted from the host in the current version.

### 7) Deterministic tests

Unit tests cover hook/components/lib/worker behavior, while Cypress e2e runs with a mock mode flag for deterministic flows.