import { DbtManifestSchema } from '../sdlc/dbt-manifest-schema';
import { SaferSRSchema } from '../types/index';
import _ from 'lodash';

export interface SidebarTreeItem {
  name: string;
  type:
    | 'folder'
    | 'model'
    | 'metric'
    | 'exposure'
    | 'seed'
    | 'source'
    | 'analysis'
    | 'database'
    | 'schema'
    | 'table'
    | 'column_string'
    | 'column_numeric'
    | 'column_integer'
    | 'column_datetime'
    | 'column_boolean'
    | 'column_other'
    | 'metric_list'
    | 'test_list';
  path?: string;
  expanded?: boolean;
  items?: SidebarTreeItem[];
}

export function findNodeByUniqueID(
  manifest: DbtManifestSchema,
  uniqueId: string,
) {
  let node: any = manifest.nodes[uniqueId];
  if (node) {
    return node;
  }

  node = manifest.sources[uniqueId];
  if (node) {
    return node;
  }

  node = manifest.metrics[uniqueId];
  if (node) {
    return node;
  }

  node = manifest.exposures[uniqueId];
  if (node) {
    return node;
  }

  return null;
}

export function buildSourceTree(run?: SaferSRSchema): SidebarTreeItem[] {
  let tree = {};
  if (!run) return [];

  const manifest = run?.dbt?.manifest as DbtManifestSchema;
  const tables = run?.tables;

  _.each(manifest.sources, function (node) {
    var sourceName = node.source_name;
    var name = node.name;

    if (!tree[sourceName]) {
      tree[sourceName] = {
        type: 'folder',
        name: sourceName,
        items: [],
      };
    }

    let items: SidebarTreeItem[] = [];
    let table = tables[node.name];
    if (table) {
      Object.entries(table?.columns).forEach(([name, column]) => {
        if (column) {
          let type = `column_${column?.type}` as any;
          items.push({
            type,
            name: column.name,
            path: `/sources/${node.unique_id}/columns/${column.name}`,
          });
        }
      });
    }

    tree[sourceName].items.push({
      type: 'source',
      name: name,
      path: `/sources/${node.unique_id}`,
      items,
    });
  });

  // sort schemas
  let sources: SidebarTreeItem[] = _.sortBy(_.values(tree), 'name');

  // sort tables in the schema
  _.each(sources, function (source) {
    source.items = _.sortBy(source.items, 'name');
  });

  return sources;
}

export function buildExposureTree(run?: SaferSRSchema): SidebarTreeItem[] {
  let tree = {};
  if (!run) return [];

  const manifest = run?.dbt?.manifest as DbtManifestSchema;

  _.each(manifest.exposures, function (node) {
    let type = node.type || 'Uncategorized';

    if (!tree[type]) {
      tree[type] = {
        type: 'folder',
        name: type,
        items: [],
      };
    }

    tree[type].items.push({
      type: 'exposure',
      name: node.label,
      path: `/exposures/${node.unique_id}`,
    });
  });

  // sort exposure types
  let exposures: SidebarTreeItem[] = _.sortBy(_.values(tree), 'name');

  // sort entries in the exposure folder
  _.each(exposures, function (exposure) {
    exposure.items = _.sortBy(exposure.items, 'name');
  });

  return exposures;
}

export function buildModelOrSeedTree(
  run: SaferSRSchema,
  resourceType: 'seed' | 'model',
): SidebarTreeItem[] {
  let tree = {};
  if (!run) return [];

  const manifest = run?.dbt?.manifest as DbtManifestSchema;
  const tables = run?.tables;
  const nodes = manifest.nodes;

  _.each(nodes, (node) => {
    let pathParts;
    if (node.resource_type !== resourceType) {
      return;
    }

    if (node.original_file_path.indexOf('\\') !== -1) {
      pathParts = node.original_file_path.split('\\');
    } else {
      pathParts = node.original_file_path.split('/');
    }
    var path = [node.package_name].concat(_.slice(pathParts, 1));

    var dirpath = _.initial(path);

    let fname = _.last(path) ?? '';
    let displayName;
    if (node.resource_type === 'model' && node.version != null) {
      displayName = node.name + '_v' + node.version;
    } else {
      displayName = node.name;
    }

    var curDir = tree;
    _.each(dirpath, function (dir) {
      if (!(dir in curDir)) {
        curDir[dir] = {
          type: 'folder',
          name: dir,
          items: {},
        };
      }
      curDir = curDir[dir].items;
    });

    let items: SidebarTreeItem[] = [];
    let table = tables[node.name];
    if (table) {
      Object.entries(table?.columns).forEach(([name, column]) => {
        if (column) {
          let type = `column_${column?.type}` as any;
          items.push({
            type,
            name: column.name,
            path: `/${resourceType}s/${node.unique_id}/columns/${column.name}`,
          });
        }
      });
    }

    curDir[fname] = {
      type: node.resource_type,
      name: displayName,
      path: `/${resourceType}s/${node.unique_id}`,
      items,
    };
  });

  function recursiveFlattenItems(tree) {
    let res: any[] = [];

    let subtrees = _.values(tree);
    _.each(subtrees, function (subtree) {
      if (subtree.items) {
        var flattened = recursiveFlattenItems(subtree.items);
        var sorted = _.sortBy(flattened, 'name');
        subtree.items = sorted;
      }
      res.push(subtree);
    });

    return res;
  }

  return recursiveFlattenItems(tree);
}

export function buildMetricTree(run?: SaferSRSchema): SidebarTreeItem[] {
  if (!run) return [];

  const manifest = run?.dbt?.manifest as DbtManifestSchema;
  let tree = {};

  _.each(manifest.metrics, function (metric) {
    let project = metric.package_name;

    if (!tree[project]) {
      tree[project] = {
        type: 'folder',
        name: project,
        items: [],
      };
    }

    tree[project].items.push({
      type: 'metric',
      name: metric.label,
      path: `/metrics/${metric.unique_id}`,
    });
  });

  let metrics: SidebarTreeItem[] = _.sortBy(_.values(tree), 'name');

  _.each(metrics, function (metric) {
    metric.items = _.sortBy(metric.items, 'name');
  });

  return metrics;
}

export function buildLegacyTablesTree(run?: SaferSRSchema): SidebarTreeItem[] {
  if (!run) return [];
  let itemsTable: SidebarTreeItem[] = [];

  _.each(run.tables, function (table) {
    const itemsColumns: SidebarTreeItem[] = [];
    const itemTable: SidebarTreeItem = {
      name: table?.name || '',
      type: 'table',
      path: `/tables/${table?.name}`,
      items: itemsColumns,
    };
    itemsTable.push(itemTable);

    _.each(table?.columns, function (column) {
      let type = `column_${column?.type}` as any;

      const itemsColumn: SidebarTreeItem = {
        type,
        name: column?.name || '',
        path: `/tables/${table?.name}/columns/${column?.name}`,
      };
      itemsColumns.push(itemsColumn);
    });
  });

  return itemsTable;
}

export function buildProjectTree(run?: SaferSRSchema): SidebarTreeItem[] {
  if (!run) return [];

  const source: SidebarTreeItem = {
    name: 'Sources',
    type: 'folder',
    items: buildSourceTree(run),
  };
  const seed: SidebarTreeItem = {
    name: 'Seeds',
    type: 'folder',
    items: buildModelOrSeedTree(run, 'seed'),
  };
  const model: SidebarTreeItem = {
    name: 'Models',
    type: 'folder',
    items: buildModelOrSeedTree(run, 'model'),
  };
  const table: SidebarTreeItem = {
    name: 'Tables',
    type: 'folder',
    path: `/tables`,
    items: buildLegacyTablesTree(run),
  };
  const metric: SidebarTreeItem = {
    name: 'Metrics',
    type: 'metric_list',
    path: `/metrics`,
  };
  const test: SidebarTreeItem = {
    name: 'Tests',
    type: 'test_list',
    path: `/tests`,
  };

  return [source, seed, model, metric, test];
}

export function buildDatabaseTree(run?: SaferSRSchema): SidebarTreeItem[] {
  if (!run) return [];

  const manifest = run?.dbt?.manifest as DbtManifestSchema;
  const tables = run?.tables;

  let nodes: any[] = ([] as any).concat(
    Object.values(manifest?.sources),
    Object.values(manifest?.nodes),
  );

  var items: SidebarTreeItem[] = [];
  var treeNodes = _.filter(nodes, function (node) {
    if (node.resource_type === 'source' || node.resource_type === 'seed') {
      return true;
    }

    if (node.resource_type === 'model') {
      return node.config.materialized !== 'ephemeral';
    }
  });

  var treeNodesSorted = _.sortBy(treeNodes, function (node) {
    return (
      node.database +
      '.' +
      node.schema +
      '.' +
      (node.identifier || node.alias || node.name)
    );
  });

  var byDatabase = _.groupBy(treeNodesSorted, 'database');
  _.each(byDatabase, function (dbNodes, db) {
    var itemDatabase: SidebarTreeItem = {
      type: 'database',
      name: db,
      items: [],
    };
    items.push(itemDatabase);

    var bySchema = _.groupBy(dbNodes, 'schema');
    _.each(bySchema, function (schema_nodes, schema) {
      let itemSchema: SidebarTreeItem = {
        type: 'schema',
        name: schema,
        items: [],
      };

      itemDatabase.items!.push(itemSchema);

      _.each(schema_nodes, function (node) {
        let itemTable: SidebarTreeItem = {
          type: node.resource_type,
          name: node.identifier || node.alias || node.name,
          path: '/' + node.resource_type + 's/' + node.unique_id,
          items: [],
        };
        itemSchema.items!.push(itemTable);

        let table = tables[node.name];
        if (table) {
          Object.entries(table?.columns).forEach(([name, column]) => {
            if (column) {
              let type = `column_${column?.type}` as any;
              itemTable.items?.push({
                type,
                name: column.name,
                path: `/${node.resource_type}s/${node.unique_id}/columns/${column.name}`,
              });
            }
          });
        }
      });
    });
  });

  return items;
}
