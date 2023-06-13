import { Edge, Node, Position } from 'reactflow';
import dagre from 'dagre';

import 'reactflow/dist/style.css';
import {
  LineageGraphData,
  LineageGraphEdge,
  LineageGraphNode,
} from '../../utils/dbt';

const nodeWidth = 300;
const nodeHeight = 60;
const groupMargin = 20;
const groupType = 'customGroup';

export type FilterBy = 'changed' | 'selected' | undefined;

export const buildNodesAndEdges = async (
  lineageGraph: LineageGraphData,
  options: {
    filterBy?: FilterBy;
    selected?: string;
    groupBy?: string;
    isLayout?: boolean;
    layoutLibrary?: string;
    nodeOverrides?: Partial<LineageGraphNode>;
    edgeOverrides?: Partial<LineageGraphEdge>;
  },
) => {
  let nodeSet: Set<String>;
  const groups: Node[] = [];
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const isLayout = options.isLayout || true;
  const layoutLibrary = options.layoutLibrary || 'dagre';

  // nodes
  if (options.filterBy === 'selected') {
    nodeSet = new Set(filterBySelected(lineageGraph, options.selected));
  } else if (options.filterBy === 'changed') {
    nodeSet = new Set(filterByChanged(lineageGraph));
  } else {
    nodeSet = new Set(Object.keys(lineageGraph));
  }

  Object.entries(lineageGraph).forEach(([key, nodeData]) => {
    if (!nodeSet.has(key)) {
      return;
    }

    if (nodeData.type === 'test') {
      return;
    }

    const node: Node = {
      id: key,
      position: { x: 0, y: 0 },
      data: {
        ...nodeData,
        ...options.nodeOverrides,
      },
      draggable: true,
      type: 'customNode',
    };

    nodes.push(node);
  });

  //edges
  nodes.forEach((node) => {
    const nodeData = node.data as LineageGraphNode;
    Object.entries(nodeData.dependsOn).forEach(([dependsOnKey, edgeData]) => {
      if (!nodeSet.has(dependsOnKey)) {
        return;
      }

      edges.push({
        source: dependsOnKey,
        target: nodeData.uniqueId,
        id: `${nodeData.uniqueId} -> ${dependsOnKey}`,
        type: 'customEdge',
        data: {
          ...edgeData,
          ...options.edgeOverrides,
        },
      });
    });
  });

  // groups
  if (options.groupBy) {
    nodes.forEach((node) => {
      const nodeData = node.data;

      // TODO: group by type
      let groupId: string | undefined = undefined;
      let groupName: string | undefined = undefined;

      switch (options.groupBy) {
        case 'type':
          groupId = `group-${nodeData.type}`;
          groupName = nodeData.type;
          break;
        case 'package':
          if (nodeData.packageName) {
            groupId = `group-${nodeData.packageName}`;
            groupName = nodeData.packageName;
          }
          break;
        case 'tag:piperider':
          if (nodeData.tags.includes('piperider')) {
            groupId = `group-piperider`;
            groupName = 'piperider';
          }
          break;
        case 'filepath':
          if (
            nodeData.filePath &&
            nodeData.filePath.split('/').length > 1 &&
            nodeData.type === 'model'
          ) {
            // Only get the first layer of the file path
            const folder = nodeData.filePath.split('/')[0];
            groupId = `group-${folder}`;
            groupName = folder;
          }
          break;
      }

      if (groupId && groupName) {
        if (!groups.find((group) => group.id === groupId)) {
          groups.push({
            id: groupId,
            position: { x: 0, y: 0 },
            data: {
              label: `Group: ${groupName}`,
            },
            type: groupType,
          });
        }

        node.parentNode = groupId;
        node.extent = 'parent';
        node.expandParent = true;
        node.draggable = false;
      }
    });
  }

  let nodesAndEdges = { nodes: groups.concat(nodes), edges };

  if (isLayout) {
    // logWithTimestamp(`layout by ${layoutLibrary}`);
    if (layoutLibrary === 'dagre') {
      if (groups.length > 0) {
        layoutWithGroups(groups, nodes, edges, 'LR');
      } else {
        layout(nodes, edges, 'LR');
      }
      nodesAndEdges = { nodes: groups.concat(nodes), edges };
    } else if (layoutLibrary === 'subflow') {
      layout(nodes, edges, 'LR');
      groupBySubFlow(groups, nodes);
    }
    // logWithTimestamp('layout complete');
  }

  return nodesAndEdges;
};

export const getUpstreamNodes = (
  lineageGraph: LineageGraphData,
  key: string,
) => {
  const node = lineageGraph[key];
  const relatedNodes: string[] = [key];

  if (Object.keys(node.dependsOn).length > 0) {
    Object.keys(node.dependsOn).forEach((dependsOnKey) => {
      relatedNodes.push(...getUpstreamNodes(lineageGraph, dependsOnKey));
    });
  }
  return relatedNodes;
};

export const getDownstreamNodes = (
  lineageGraph: LineageGraphData,
  key: string,
  isDownStreamNode: boolean = false,
) => {
  const node = lineageGraph[key];
  const relatedNodes: string[] = [];

  if (isDownStreamNode) {
    relatedNodes.push(key);
  }

  if (Object.keys(node.children).length > 0) {
    Object.keys(node.children).forEach((childKey) => {
      relatedNodes.push(...getDownstreamNodes(lineageGraph, childKey, true));
    });
  }
  return relatedNodes;
};

/* The changed nodes and their intermedia nodes */
const filterByChanged = (lineageGraph: LineageGraphData) => {
  const changeSet = new Set<string>();
  const upstreamSet = new Set<string>();
  const downstreamSet = new Set<string>();

  Object.entries(lineageGraph).forEach(([uniqueId, node]) => {
    if (node.changeStatus !== undefined) {
      changeSet.add(uniqueId);

      for (const upstream of getUpstreamNodes(lineageGraph, uniqueId)) {
        upstreamSet.add(upstream);
      }

      for (const downstream of getDownstreamNodes(lineageGraph, uniqueId)) {
        downstreamSet.add(downstream);
      }
    }
  });

  // Add all (<change upstream> & <change downstream>) to changeSet
  const isDownAndUpSet = [...upstreamSet].filter((uniqueId) =>
    downstreamSet.has(uniqueId),
  );

  // union of changeSet and isDownAndUpSet
  isDownAndUpSet.forEach((uniqueId) => {
    changeSet.add(uniqueId);
  });

  return [...changeSet];
};

/* The selected node and its upstream and downstream */
const filterBySelected = (
  lineageGraph: LineageGraphData,
  selected?: string,
) => {
  if (!selected) {
    return [];
  }

  return [
    ...getUpstreamNodes(lineageGraph, selected),
    ...getDownstreamNodes(lineageGraph, selected),
  ];
};

const layout = (nodes, edges, direction = 'LR', margin = 0) => {
  const isHorizontal = direction === 'LR';
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = isHorizontal ? 'left' : 'top';
    node.sourcePosition = isHorizontal ? 'right' : 'bottom';

    // We are shifting the dagre node position (anchor=center center) to the top left
    // so it matches the React Flow node anchor point (top left).
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2 + margin,
      y: nodeWithPosition.y - nodeHeight / 2 + margin,
    };

    return node;
  });
};

const layoutWithGroups = (
  groups: Node[],
  nodes: Node[],
  edges: Edge[],
  direction = 'LR',
) => {
  const isHorizontal = direction === 'LR';
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 100, ranksep: 100 });

  groups.forEach((group) => {
    // Layout all the nodes in the group
    const nodesInGroup = nodes.filter((node) => node.parentNode === group.id);
    const edgesInGroup = edges.filter(
      (edge) =>
        nodesInGroup.map((n) => n.id).includes(edge.source) &&
        nodesInGroup.map((n) => n.id).includes(edge.target),
    );
    layout(nodesInGroup, edgesInGroup, direction, groupMargin);

    // Set the group node
    const groupWidth =
      Math.max(...nodesInGroup.map((node) => node.position.x + nodeWidth)) +
      groupMargin;
    const groupHeight =
      Math.max(...nodesInGroup.map((node) => node.position.y + nodeHeight)) +
      groupMargin;
    dagreGraph.setNode(group.id, { width: groupWidth, height: groupHeight });
    group.style = {
      width: groupWidth,
      height: groupHeight,
    };

    // Mark the edges in the group
    edges.forEach((edge) => {
      if (edgesInGroup.includes(edge)) {
        edge.data['group'] = group.id;
      } else {
        edge.data['group'] = undefined;
      }
    });
  });

  // Set the nodes without group
  nodes.forEach((nodeWithoutGroup) => {
    if (nodeWithoutGroup.parentNode === undefined) {
      dagreGraph.setNode(nodeWithoutGroup.id, {
        width: nodeWidth,
        height: nodeHeight,
      });
    }
  });

  edges.forEach((edge) => {
    if (edge.data['group']) return; // Skip edges inside group

    const source =
      nodes.find((node) => node.id === edge.source)?.parentNode || edge.source;
    const target =
      nodes.find((node) => node.id === edge.target)?.parentNode || edge.target;

    console.log('Group edge', source, target);
    dagreGraph.setEdge(source, target);
  });

  dagre.layout(dagreGraph);

  groups.forEach((group) => {
    const groupWithPosition = dagreGraph.node(group.id);
    group.targetPosition = isHorizontal ? Position.Left : Position.Top;
    group.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

    group.position = {
      x: groupWithPosition.x - groupWithPosition.width / 2,
      y: groupWithPosition.y - groupWithPosition.height / 2,
    };
  });

  nodes.forEach((node) => {
    if (node.parentNode) return; // Skip nodes inside group
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = isHorizontal ? Position.Left : Position.Top;
    node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
  });
};

const groupBySubFlow = (groups: Node[], nodes: Node[]) => {
  groups.forEach((group) => {
    group.position.x =
      Math.min(
        ...nodes
          .filter((node) => node.parentNode === group.id)
          .map((node) => node.position.x),
      ) - groupMargin;
    group.position.y =
      Math.min(
        ...nodes
          .filter((node) => node.parentNode === group.id)
          .map((node) => node.position.y),
      ) - groupMargin;

    group.style = {
      width:
        Math.max(
          ...nodes
            .filter((node) => node.parentNode === group.id)
            .map((node) => node.position.x + nodeWidth),
        ) -
        group.position.x +
        groupMargin,
      height:
        Math.max(
          ...nodes
            .filter((node) => node.parentNode === group.id)
            .map((node) => node.position.y + nodeHeight),
        ) - group.position.y,
    };

    nodes.forEach((node) => {
      if (node.parentNode === group.id) {
        node.position.x -= group.position.x;
        node.position.y -= group.position.y;
      }
    });
  });
};

// function logWithTimestamp(message) {
//   var timestamp = new Date().toLocaleTimeString();
//   console.log('[' + timestamp + '] ' + message);
// }
