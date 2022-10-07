export const TABLE_DETAILS_ROUTE_PATH = '/tables/:tableName';
export const COLUMN_DETAILS_ROUTE_PATH = `${TABLE_DETAILS_ROUTE_PATH}/columns/:columnName*`;
export const ASSERTIONS_ROUTE_PATH = `/assertions`;
export const getBreadcrumbPaths = (tableName: string, columnName: string) => [
  { label: 'Tables', path: '/' },
  { label: tableName, path: `/tables/${tableName}/columns/` },
  {
    label: columnName,
    path: `/tables/${tableName}/columns/${columnName}`,
  },
];
