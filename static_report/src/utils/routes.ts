export const HOME_ROUTE_PATH = '/';
export const TABLE_LIST_ROUTE_PATH = '/tables';
export const TABLE_DETAILS_ROUTE_PATH = '/tables/:tableName';
export const COLUMN_DETAILS_ROUTE_PATH =
  '/tables/:tableName/columns/:columnName';
export const TESTS_ROUTE_PATH = `/tests`;
export const METRICS_ROUTE_PATH = `/metrics`;

export const SOURCE_DETAILS_ROUTE_PATH = '/sources/:uniqueId';
export const SOURCE_COLUMN_DETAILS_ROUTE_PATH =
  '/sources/:uniqueId/columns/:columnName';

export const MODEL_DETAILS_ROUTE_PATH = '/models/:uniqueId';
export const MODEL_COLUMN_DETAILS_ROUTE_PATH =
  '/models/:uniqueId/columns/:columnName';

export const SEED_DETAILS_ROUTE_PATH = '/seeds/:uniqueId';
export const SEED_COLUMN_DETAILS_ROUTE_PATH =
  '/seeds/:uniqueId/columns/:columnName';

/**
 * Server side render. Because in the SSR, there is no hash path. We need to use a different path to indicate it is rendered in SSR.
 * SSR is only happens in the PipeRider cloud. The server render the react tree in the server, and the client update the tree later.
 */
export const SSR_ROUTE_PATH = `/ssr`;
