import {
  ChangeStatus,
  CompColEntryItem,
  CompDbtNodeEntryItem,
  ImpactStatus,
} from './store';
import {
  DbtManifestSchema,
  Metric,
  ModelNode,
  SourceDefinition,
} from '../sdlc/dbt-manifest-schema';
import { ColumnSchema, DbtNode, SaferSRSchema } from '../types/index';
import _ from 'lodash';
import { HOME_ROUTE_PATH } from './routes';
import { DbtRunResultsSchema } from '../sdlc/dbt-run-results-schema';

export type ItemType =
  | DbtManifestSchema['nodes'][string]['resource_type']
  | DbtManifestSchema['sources'][string]['resource_type']
  | DbtManifestSchema['metrics'][string]['resource_type']
  | DbtManifestSchema['exposures'][string]['resource_type']
  | DbtManifestSchema['semantic_models'][string]['resource_type']
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
  changeStatus?: ChangeStatus;
  impactStatus?: ImpactStatus;
}

export interface LineageGraphNode {
  uniqueId: string;
  name: string;
  from: ('base' | 'target')[];
  type: ItemType;
  path?: string;
  filePath: string;
  packageName?: string;
  changeStatus?: ChangeStatus;
  impactStatus?: ImpactStatus;
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
  isHighlighted?: boolean;
  isSelected?: boolean;
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
  const table_ids: string[] = Object.keys(run?.tables);
  Object.entries(run?.tables).forEach(([key, table]) => {
    let uniqueId = '';
    let name = '';
    if (table_ids.includes(table?.ref_id as string)) {
      uniqueId = `table.${table?.ref_id}`;
      name = table?.ref_id ?? '';
    } else {
      uniqueId = `table.${table?.name}`;
      name = table?.name ?? '';
    }
    dbtNodes[uniqueId] = {
      name: name,
      description: table?.description ?? '',
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
        if (table_ids.includes(node.unique_id)) {
          dbtNode.__table = run.tables[node.unique_id];
        } else {
          dbtNode.__table = run.tables[node.name];
        }
      }

      if (
        node.resource_type === 'model' &&
        node.config.materialized !== 'ephemeral'
      ) {
        if (table_ids.includes(node.unique_id)) {
          dbtNode.__table = run.tables[node.unique_id];
        } else {
          dbtNode.__table = run.tables[node.name];
        }
      }
    });

    Object.values(manifest?.metrics ?? {}).forEach((metric) => {
      const dbtNode: DbtNode = metric;
      const queries = (run?.metrics ?? []).filter((m) =>
        m.name.startsWith(metric.name),
      );

      if (queries.length > 0) {
        dbtNode.__queries = queries;
      }
    });

    Object.assign(
      dbtNodes,
      manifest?.sources,
      manifest?.metrics,
      manifest?.nodes,
      manifest?.semantic_models,
    );
  }

  if (runResults && runResults.results) {
    runResults.results.forEach((result) => {
      const uniqueId = result.unique_id;
      if (dbtNodes[uniqueId]) {
        dbtNodes[uniqueId].__runResult = result;
      }
    });
  }

  return dbtNodes;
};

export function compareColumn(
  base?: Partial<ColumnSchema>,
  target?: Partial<ColumnSchema>,
): ChangeStatus | undefined {
  // schema change
  if (!base) {
    return 'col_added';
  } else if (!target) {
    return 'col_removed';
  } else if (
    base.schema_type &&
    target.schema_type &&
    base.schema_type !== target.schema_type
  ) {
    return 'col_changed';
  }

  // value change
  if (base?.nulls !== undefined && target?.nulls !== undefined) {
    if (base?.nulls !== target?.nulls) {
      return 'col_changed';
    }

    if (base?.distinct !== target?.distinct) {
      return 'col_changed';
    }

    if (base?.duplicates !== target?.duplicates) {
      return 'col_changed';
    }
  }
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

export function buildColumnTree(
  itemsColumnComparison: CompColEntryItem[],
  pathPrefix,
): [SidebarTreeItem[], ChangeStatus | undefined] {
  let items: SidebarTreeItem[] = [];
  let resultChangeStatus: ChangeStatus | undefined = undefined;

  itemsColumnComparison.forEach(([columnName, { base, target }]) => {
    const fallback = target || base;

    if (base?.total === undefined && target?.total === undefined) {
      return;
    }

    let type = `column_${fallback?.type}` as any;
    let changeStatus = compareColumn(base, target);

    items.push({
      type,
      name: columnName,
      path: `${pathPrefix}/columns/${columnName}`,
      changeStatus,
    });
  });
  return [items, resultChangeStatus];
}

export function buildSourceTree(
  itemsNodeComparison: CompDbtNodeEntryItem[],
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
      const [columnItems] = buildColumnTree(metadata!.columns || [], path);

      const changeStatus = metadata.changeStatus;
      const impactStatus = metadata.impactStatus;

      tree[sourceName].items.push({
        type: 'source',
        name: name,
        path,
        items: columnItems,
        changeStatus,
        impactStatus,
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
  itemsNodeComparison: CompDbtNodeEntryItem[],
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
    const [columnItems] = buildColumnTree(metadata!.columns || [], path);
    const changeStatus = metadata.changeStatus;
    const impactStatus = metadata.impactStatus;

    curDir[fname] = {
      type: resourceType,
      name: displayName,
      path,
      items: columnItems,
      changeStatus,
      impactStatus,
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

export function buildMetricTree(
  itemsNodeComparison: CompDbtNodeEntryItem[],
): SidebarTreeItem[] {
  let tree = {};

  _.each(
    itemsNodeComparison,
    function ([uniqueId, { base, target }, metadata]) {
      if (!uniqueId.startsWith('metric.')) {
        return;
      }

      const fallback = target || base;
      var packageName = (fallback as any as Metric)?.package_name;
      var name = fallback?.label ?? fallback?.name;

      if (!tree[packageName]) {
        tree[packageName] = {
          type: 'folder',
          name: packageName,
          items: [],
          expanded: true,
        };
      }

      const path = `/metrics/${fallback?.unique_id}`;
      const changeStatus = metadata.changeStatus;
      const impactStatus = metadata.impactStatus;
      tree[packageName].items.push({
        type: 'metric',
        name: name,
        path,
        changeStatus,
        impactStatus,
      });
    },
  );

  // sort schemas
  let metrics: SidebarTreeItem[] = _.sortBy(_.values(tree), 'name');

  // sort tables in the schema
  _.each(metrics, function (metric) {
    metric.items = _.sortBy(metric.items, 'name');
  });

  return metrics;
}

export function buildLegacyTablesTree(
  itemsNodeComparison: CompDbtNodeEntryItem[],
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
    const [columnItems] = buildColumnTree(metadata!.columns || [], path);
    const changeStatus = metadata.changeStatus;

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
  itemsNodeComparison: CompDbtNodeEntryItem[],
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
    items: buildMetricTree(itemsNodeComparison),
  };
  const assertion: SidebarTreeItem = {
    name: 'Assertions',
    type: 'test_list',
    path: `/assertions`,
  };

  if (isLegacy) {
    return [overview, table, metric, assertion];
  } else {
    return [overview, model, source, seed, metric, assertion];
  }
}

export function buildDatabaseTree(
  itemsNodeComparison: CompDbtNodeEntryItem[],
): SidebarTreeItem[] {
  const overview: SidebarTreeItem = {
    name: 'Overview',
    type: 'overview',
    path: HOME_ROUTE_PATH,
  };
  let items: SidebarTreeItem[] = [overview];
  const treeNodes: DbtNode[] = [];
  const changeStatuses: { [key: string]: ChangeStatus | undefined } = {};
  const impactStatuses: { [key: string]: ImpactStatus | undefined } = {};
  const mapColumns: { [key: string]: CompColEntryItem[] | undefined } = {};

  itemsNodeComparison.forEach(([key, { base, target }, metadata]) => {
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

    changeStatuses[key] = metadata.changeStatus;
    impactStatuses[key] = metadata.impactStatus;
    mapColumns[key] = metadata.columns;
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
        const [columnItems] = buildColumnTree(
          mapColumns[node!.unique_id!] || [],
          path,
        );

        const changeStatus = changeStatuses[node!.unique_id!];
        const impactStatus = impactStatuses[node!.unique_id!];
        let itemTable: SidebarTreeItem = {
          type: node.resource_type as any,
          name: node.identifier || node.alias || node.name,
          path,
          items: columnItems,
          changeStatus,
          impactStatus,
        };

        itemSchema.items!.push(itemTable);
      });
    });
  });

  return items;
}

export function buildLineageGraph(
  itemsNodeComparison: CompDbtNodeEntryItem[],
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
    const [key, { base, target }, metadata] = tableEntry;
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
    const filePath = fallback?.original_file_path.replace(/^models\//, '');
    const tags = fallback?.tags || [];
    const changeStatus = metadata.changeStatus;
    const impactStatus = metadata.impactStatus;

    data[key] = {
      uniqueId: key,
      name: fallback?.name || '',
      type: fallback!.resource_type!,
      from,
      path,
      filePath,
      packageName,
      changeStatus,
      impactStatus,
      base: base as DbtNode,
      target: target as DbtNode,
      dependsOn,
      children: {},
      tags,
    };
  });

  return linkLineageGraphItemChildren(data);
}
