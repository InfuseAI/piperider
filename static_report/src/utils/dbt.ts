import { CompColEntryItem, CompTableColEntryItem } from './store';
import {
  DbtManifestSchema,
  ModelNode,
  SourceDefinition,
} from '../sdlc/dbt-manifest-schema';
import { DbtNode, SaferSRSchema } from '../types/index';
import _ from 'lodash';
import { HOME_ROUTE_PATH } from './routes';
import { DbtRunResultsSchema } from '../sdlc/dbt-run-results-schema';

export type ItemType =
  | DbtManifestSchema['nodes'][string]['resource_type']
  | DbtManifestSchema['sources'][string]['resource_type']
  | DbtManifestSchema['metrics'][string]['resource_type']
  | DbtManifestSchema['exposures'][string]['resource_type']
  | 'overview'
  | 'folder'
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
  | 'test_list'
  | 'graph';

export interface SidebarTreeItem {
  name: string;
  type: ItemType;
  path?: string;
  expanded?: boolean;
  items?: SidebarTreeItem[];
  changeStatus?: 'changed' | 'added' | 'removed';
}

export interface LineageGraphNode {
  uniqueId: string;
  name: string;
  from: ('base' | 'target')[];
  type: ItemType;
  path?: string;
  packageName?: string;
  changeStatus?: 'changed' | 'added' | 'removed';
  dependsOn: {
    [key: string]: LineageGraphEdge;
  };
  children: {
    [key: string]: LineageGraphEdge;
  };
  base?: DbtNode;
  target?: DbtNode;
  tags: string[];
  singleOnly?: boolean;
  stat?: string;
}

export interface LineageGraphEdge {
  source: string;
  target: string;
  from: ('base' | 'target')[];
  singleOnly?: boolean;
  isHighlighted?: boolean;
}

export interface LineageGraphData {
  [key: string]: LineageGraphNode;
}

export const buildDbtNodes = (run?: SaferSRSchema) => {
  if (!run) {
    return undefined;
  }

  const manifest = run?.dbt?.manifest as DbtManifestSchema;
  const runResults = run?.dbt?.run_results as DbtRunResultsSchema;

  const dbtNodes: {
    [key: string]: DbtNode;
  } = {};

  /* Add the pseudo node for piperider table */
  Object.values(run?.tables).forEach((table) => {
    const uniqueId = `table.${table?.name}`;
    dbtNodes[uniqueId] = {
      name: table?.name ?? '',
      unique_id: uniqueId,
      resource_type: 'table',
      __table: table,
    };
  });

  /* Add all used dbt nodes and add `__table` for the piperider profiling data */
  if (manifest) {
    let nodes: any[] = ([] as any).concat(
      Object.values(manifest?.sources),
      Object.values(manifest?.nodes),
    );

    nodes.forEach((node) => {
      const dbtNode: DbtNode = node;

      if (node.resource_type === 'source' || node.resource_type === 'seed') {
        dbtNode.__table = run.tables[node.name];
      }

      if (
        node.resource_type === 'model' &&
        node.config.materialized !== 'ephemeral'
      ) {
        dbtNode.__table = run.tables[node.name];
      }
    });

    Object.assign(
      dbtNodes,
      manifest?.sources,
      manifest?.metrics,
      manifest?.nodes,
    );
  }

  if (runResults) {
    runResults.results.forEach((result) => {
      const uniqueId = result.unique_id;
      if (dbtNodes[uniqueId]) {
        dbtNodes[uniqueId].__runResult = result;
      }
    });
  }

  return dbtNodes;
};

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

export function buildColumnTree(
  itemsColumnComparison: CompColEntryItem[],
  pathPrefix,
): [SidebarTreeItem[], boolean] {
  let items: SidebarTreeItem[] = [];
  let schemaChanged = false;

  itemsColumnComparison.forEach(([columnName, { base, target }]) => {
    const fallback = target || base;

    if (base?.total === undefined && target?.total === undefined) {
      return;
    }

    let type = `column_${fallback?.type}` as any;
    let changeStatus;

    if (!base) {
      changeStatus = 'added';
      schemaChanged = true;
    } else if (!target) {
      changeStatus = 'removed';
      schemaChanged = true;
    } else if (base.schema_type !== target.schema_type) {
      changeStatus = 'changed';
      schemaChanged = true;
    }

    items.push({
      type,
      name: columnName,
      path: `${pathPrefix}/columns/${columnName}`,
      changeStatus,
    });
  });
  return [items, schemaChanged];
}

export function buildSourceTree(
  itemsNodeComparison: CompTableColEntryItem[],
): SidebarTreeItem[] {
  let tree = {};

  _.each(
    itemsNodeComparison,
    function ([uniqueId, { base, target }, metadata]) {
      if (!uniqueId.startsWith('source.')) {
        return;
      }

      const fallback = target || base;
      var sourceName = (fallback as any as SourceDefinition)?.source_name;
      var name = fallback?.name;

      if (!tree[sourceName]) {
        tree[sourceName] = {
          type: 'folder',
          name: sourceName,
          items: [],
          expanded: true,
        };
      }

      const path = `/sources/${fallback?.unique_id}`;
      const [columnItems, schemaChanged] = buildColumnTree(
        fallback!.__columns || [],
        path,
      );

      let changeStatus: SidebarTreeItem['changeStatus'];
      if (!base) {
        changeStatus = 'added';
      } else if (!target) {
        changeStatus = 'removed';
      } else if (schemaChanged) {
        changeStatus = 'changed';
      }

      tree[sourceName].items.push({
        type: 'source',
        name: name,
        path,
        items: columnItems,
        changeStatus,
      });
    },
  );

  // sort schemas
  let sources: SidebarTreeItem[] = _.sortBy(_.values(tree), 'name');

  // sort tables in the schema
  _.each(sources, function (source) {
    source.items = _.sortBy(source.items, 'name');
  });

  return sources;
}

export function buildModelOrSeedTree(
  itemsNodeComparison: CompTableColEntryItem[],
  resourceType?: 'seed' | 'model',
): SidebarTreeItem[] {
  let tree = {};

  _.each(itemsNodeComparison, ([uniqueId, { base, target }, metadata]) => {
    const fallback = target || base;

    let pathParts;
    if (fallback?.resource_type !== resourceType) {
      return;
    }

    const originalFilePath = fallback?.original_file_path || '';
    if (originalFilePath.indexOf('\\') !== -1) {
      pathParts = originalFilePath.split('\\');
    } else {
      pathParts = originalFilePath.split('/');
    }
    let modifiedFilePath = [fallback?.package_name || ''].concat(
      _.slice(pathParts, 1),
    );
    let dirpath = _.initial(modifiedFilePath || []);
    let fname = _.last(modifiedFilePath) ?? '';
    let displayName;
    if (
      fallback?.resource_type === 'model' &&
      (fallback as any as ModelNode)?.version != null
    ) {
      displayName =
        fallback?.name + '_v' + (fallback as any as ModelNode)?.version;
    } else {
      displayName = fallback?.name;
    }

    var curDir = tree;
    _.each(dirpath, function (dir) {
      if (!(dir in curDir)) {
        curDir[dir] = {
          type: 'folder',
          name: dir,
          items: {},
          expanded: true,
        };
      }
      curDir = curDir[dir].items;
    });

    const path = `/${resourceType}s/${fallback?.unique_id}`;
    const [columnItems, schemaChanged] = buildColumnTree(
      fallback!.__columns || [],
      path,
    );
    let changeStatus: SidebarTreeItem['changeStatus'];
    if (!base) {
      changeStatus = 'added';
    } else if (!target) {
      changeStatus = 'removed';
    } else if (schemaChanged) {
      changeStatus = 'changed';
    }

    curDir[fname] = {
      type: resourceType,
      name: displayName,
      path,
      items: columnItems,
      changeStatus,
    };
  });

  function recursiveFlattenItems(tree) {
    let res: any[] = [];

    let subtrees = _.values(tree);
    _.each(subtrees, function (subtree) {
      if (subtree.items) {
        let flattened = recursiveFlattenItems(subtree.items);
        if (tree.type === 'folder') {
          flattened = _.sortBy(flattened, 'name');
        }
        subtree.items = flattened;
      }
      res.push(subtree);
    });

    return res;
  }

  return recursiveFlattenItems(tree);
}

export function buildLegacyTablesTree(
  itemsNodeComparison: CompTableColEntryItem[],
): SidebarTreeItem[] {
  let itemsTable: SidebarTreeItem[] = [];
  _.each(itemsNodeComparison, ([uniqueId, { base, target }, metadata]) => {
    const fallback = target || base;
    if (!fallback) {
      return;
    }

    if (fallback.resource_type !== 'table') {
      return;
    }

    const path = `/tables/${fallback?.name}`;
    const [columnItems, schemaChanged] = buildColumnTree(
      fallback!.__columns || [],
      path,
    );
    let changeStatus: SidebarTreeItem['changeStatus'];
    if (!base) {
      changeStatus = 'added';
    } else if (!target) {
      changeStatus = 'removed';
    } else if (schemaChanged) {
      changeStatus = 'changed';
    }

    const itemTable: SidebarTreeItem = {
      name: fallback?.name || '',
      type: 'table',
      path,
      items: columnItems,
      changeStatus,
    };
    itemsTable.push(itemTable);
  });

  return itemsTable;
}

export function buildProjectTree(
  itemsNodeComparison: CompTableColEntryItem[],
  isLegacy: boolean = false,
): SidebarTreeItem[] {
  const overview: SidebarTreeItem = {
    name: 'Overview',
    type: 'overview',
    path: HOME_ROUTE_PATH,
  };

  const source: SidebarTreeItem = {
    name: 'Sources',
    type: 'folder',
    items: buildSourceTree(itemsNodeComparison),
    expanded: true,
  };
  const seed: SidebarTreeItem = {
    name: 'Seeds',
    type: 'folder',
    items: buildModelOrSeedTree(itemsNodeComparison, 'seed'),
    expanded: true,
  };
  const model: SidebarTreeItem = {
    name: 'Models',
    type: 'folder',
    items: buildModelOrSeedTree(itemsNodeComparison, 'model'),
    expanded: true,
  };
  const table: SidebarTreeItem = {
    name: 'Tables',
    type: 'folder',
    path: `/tables`,
    items: buildLegacyTablesTree(itemsNodeComparison),
    expanded: true,
  };
  const metric: SidebarTreeItem = {
    name: 'Metrics',
    type: 'metric_list',
    path: `/metrics`,
  };
  const assertion: SidebarTreeItem = {
    name: 'Assertions',
    type: 'test_list',
    path: `/assertions`,
  };

  if (isLegacy) {
    return [overview, table, metric, assertion];
  } else {
    return [overview, source, seed, model, metric, assertion];
  }
}

export function buildDatabaseTree(
  itemsNodeComparison: CompTableColEntryItem[],
): SidebarTreeItem[] {
  let items: SidebarTreeItem[] = [];
  const treeNodes: DbtNode[] = [];
  const added: string[] = [];
  const removed: string[] = [];

  itemsNodeComparison.forEach(([key, { base, target }]) => {
    const node = target || base;

    if (!node) {
      return;
    }

    if (node.resource_type === 'source' || node.resource_type === 'seed') {
      treeNodes.push(node as DbtNode);
    }

    if (
      node.resource_type === 'model' &&
      node.config?.materialized !== 'ephemeral'
    ) {
      treeNodes.push(node as DbtNode);
    }

    if (!base) {
      added.push(key);
    } else if (!target) {
      removed.push(key);
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
      expanded: true,
    };
    items.push(itemDatabase);

    var bySchema = _.groupBy(dbNodes, 'schema');
    _.each(bySchema, function (schema_nodes, schema) {
      let itemSchema: SidebarTreeItem = {
        type: 'schema',
        name: schema,
        items: [],
        expanded: true,
      };

      itemDatabase.items!.push(itemSchema);

      _.each(schema_nodes, function (node) {
        const path = '/' + node.resource_type + 's/' + node.unique_id;
        const [columnItems, schemaChanged] = buildColumnTree(
          node.__columns || [],
          path,
        );

        let changeStatus: SidebarTreeItem['changeStatus'];
        if (added.includes(node!.unique_id!)) {
          changeStatus = 'added';
        } else if (removed.includes(node!.unique_id!)) {
          changeStatus = 'removed';
        } else if (schemaChanged) {
          changeStatus = 'changed';
        }

        let itemTable: SidebarTreeItem = {
          type: node.resource_type as any,
          name: node.identifier || node.alias || node.name,
          path,
          items: columnItems,
          changeStatus,
        };

        itemSchema.items!.push(itemTable);
      });
    });
  });

  return items;
}

export function buildLineageGraph(
  itemsNodeComparison: CompTableColEntryItem[],
): LineageGraphData {
  const data: LineageGraphData = {};

  function linkLineageGraphItemChildren(
    data: LineageGraphData,
  ): LineageGraphData {
    Object.entries(data).forEach(([key, item]) => {
      Object.entries(item.dependsOn).forEach(([node, from]) => {
        if (data[node]) {
          data[node].children[key] = from;
        }
      });
    });
    return data;
  }

  itemsNodeComparison.forEach((tableEntry) => {
    const [key, { base, target }] = tableEntry;
    const fallback = (target ?? base) as DbtNode;
    const dependsOn: LineageGraphNode['dependsOn'] = {};
    const from: LineageGraphNode['from'] = [];

    if (fallback.resource_type === 'table') {
      return;
    }

    if (base) {
      from.push('base');
      (base.depends_on?.nodes || []).forEach((node) => {
        dependsOn[node] = {
          source: key,
          target: node,
          from: ['base'],
        };
      });
    }

    if (target) {
      from.push('target');
      (target.depends_on?.nodes || []).forEach((node) => {
        if (dependsOn[node]) {
          dependsOn[node].from.push('target');
        } else {
          dependsOn[node] = {
            source: key,
            target: node,
            from: ['target'],
          };
        }
      });
    }

    const path = `/${fallback?.resource_type}s/${fallback?.unique_id}`;
    const packageName = fallback?.package_name;
    const tags = fallback?.tags || [];
    const [, schemaChanged] = buildColumnTree(fallback!.__columns || [], path);
    let changeStatus: SidebarTreeItem['changeStatus'];
    if (!base) {
      changeStatus = 'added';
    } else if (!target) {
      changeStatus = 'removed';
    } else if (schemaChanged) {
      changeStatus = 'changed';
    }

    data[key] = {
      uniqueId: key,
      name: fallback?.name || '',
      type: fallback!.resource_type!,
      from,
      path,
      packageName,
      changeStatus,
      base: base as DbtNode,
      target: target as DbtNode,
      dependsOn,
      children: {},
      tags,
    };
  });

  return linkLineageGraphItemChildren(data);
}
