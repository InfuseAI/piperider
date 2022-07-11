# Mock Profiling Data Sets (E2E)

This folder exists for the purposes of End-to-end testing, where ready-to-use data sets are available for building data-embedded apps against variations of the expected data schema.

This is to ensure that the majority of report profiling data is responsibly handled by the frontend UI.

## Maintaining the Data Sets

As the mock data sets are not auto-generated (perhaps a future improvement), the mock jsons would need updating later on.

## How Data Sets Are Used

1. The data sets are specifically read by the `embed:html:e2e` command, which calls `static_report/src/sdlc/embed-window-data.js` with arguments `e2e` and `<$DATASET_NAME>`
1. The specified `public/e2e-profiling-data/<$DATASET_NAME>` path is read for their respective Single Report (`run.json`) and Comparison Report (`comparison_data.json`).
1. The apps are embedded and built to local `build/`
1. Simple http-server serve during CI
1. Cypress runs e2e tests against served statics
