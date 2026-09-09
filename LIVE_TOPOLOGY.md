# Live topology snapshot — bittybox.org

This repository is a portable snapshot of the production BittyBox stack captured from the live host.

- Backend/API/MCP source is at the repository root.
- The currently served static frontend is under `frontend/docs`.
- `dist` is a tracked relative symlink to `frontend/docs`, matching the production server's static-root expectation without embedding an absolute VPS path.
- Runtime configuration, credentials, installed dependencies, and production user data are intentionally excluded.

Production currently serves the application through `bittybox-api.service`; this repository is a source snapshot, not a deployment command.
