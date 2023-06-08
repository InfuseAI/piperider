import { Edge, Node, Position } from 'reactflow';
import dagre from 'dagre';
import ELK from 'elkjs/lib/elk.bundled.js';

import 'reactflow/dist/style.css';
import { LineageGraphData, LineageGraphNode } from '../../utils/dbt';

const nodeWidth = 300;
const nodeHeight = 60;
const groupMargin = 20;
const groupType = 'customGroup';

export const buildNodesAndEdges = async (
  lineageGraph: LineageGraphData,
  options: {
    groupBy?: string;
    isLayout?: boolean;
    layoutLibrary?: string;
    nodeOverrides?: Partial<LineageGraphNode>;
  },
) => {
  const groups: Node[] = [];
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const isLayout = options.isLayout || true;
  const layoutLibrary = options.layoutLibrary || 'elk';

  Object.entries(lineageGraph).forEach(([key, nodeData]) => {
    if (nodeData.type === 'test') return;
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

    if (options.groupBy) {
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
    }
    nodes.push(node);

    Object.entries(nodeData.dependsOn).forEach(([dependsOnKey, edgeData]) => {
      edges.push({
        source: dependsOnKey,
        target: key,
        id: `${key} -> ${dependsOnKey}`,
        type: 'customEdge',
        data: edgeData,
      });
    });
  });

  let nodesAndEdges = { nodes: groups.concat(nodes), edges };

  if (isLayout) {
    logWithTimestamp(`layout by ${layoutLibrary}`);
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
    } else if (layoutLibrary === 'elk') {
      let result: { elkNodes; elkEdges };
      if (groups.length > 0) {
        result = await layoutByElkWithGroups(groups, nodes, edges);
      } else {
        result = await layoutByElk(nodes, edges);
      }
      nodesAndEdges = { nodes: result.elkNodes, edges: result.elkEdges };
    }
    logWithTimestamp('layout complete');
  }

  return nodesAndEdges;
};

export const getUpstreamNodes = (lineageGraph, key) => {
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
  lineageGraph,
  key,
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

const layoutByElk = async (nodes, edges, direction = 'RIGHT', margin = 0) => {
  const isHorizontal = direction === 'RIGHT';
  const elk = new ELK();
  const options = {
    'elk.algorithm': 'layered',
    'elk.layered.spacing.nodeNodeBetweenLayers': '100',
    'elk.spacing.nodeNode': '80',
    'elk.direction': direction,
  };
  const transformToElkNode = (node: Node) => ({
    ...node,
    // Adjust the target and source handle positions based on the layout
    // direction.
    targetPosition: isHorizontal ? 'left' : 'top',
    sourcePosition: isHorizontal ? 'right' : 'bottom',

    // Hardcode a width and height for elk to use when layouting.
    width: nodeWidth,
    height: nodeHeight,
  });
  const graph = {
    id: 'root',
    layoutOptions: options,
    children: nodes.map(transformToElkNode),
    edges: edges,
  };

  try {
    // Perform the layout using ELK
    const layoutGraph = await elk.layout(graph);
    return {
      elkNodes: layoutGraph.children?.map((node) => ({
        ...node,
        // React Flow expects a position property on the node instead of `x`
        // and `y` fields.
        position: { x: node.x, y: node.y },
      })),
      elkEdges: layoutGraph.edges,
    };
    // Process the layout result as needed
  } catch (error) {
    return { elkNodes: nodes, elkEdges: edges };
  }
};

const layoutByElkWithGroups = async (
  groups,
  nodes,
  edges,
  direction = 'RIGHT',
  margin = 0,
) => {
  const isHorizontal = direction === 'RIGHT';
  const elk = new ELK();
  const options = {
    'elk.algorithm': 'layered',
    'elk.layered.spacing.nodeNodeBetweenLayers': '100',
    'elk.spacing.nodeNode': '80',
    'elk.direction': direction,
  };
  const transformToElkNode = (node: Node) => ({
    ...node,
    // Adjust the target and source handle positions based on the layout
    // direction.
    targetPosition: isHorizontal ? 'left' : 'top',
    sourcePosition: isHorizontal ? 'right' : 'bottom',

    // Hardcode a width and height for elk to use when layouting.
    width: nodeWidth,
    height: nodeHeight,
  });

  // Add the groups to the root
  const children = groups.map((group) => ({
    ...group,
    layoutOptions: {
      'org.eclipse.elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
    },
    targetPosition: isHorizontal ? 'left' : 'top',
    sourcePosition: isHorizontal ? 'right' : 'bottom',
    children: nodes
      .filter((node) => node.parentNode === group.id)
      .map(transformToElkNode),
  }));
  // Add the nodes without group to the root
  children.push(
    ...nodes
      .filter((node) => node.parentNode === undefined)
      .map(transformToElkNode),
  );

  const graph = {
    id: 'root',
    layoutOptions: options,
    edges: edges,
    children: children,
  };

  try {
    // Perform the layout using ELK
    const layoutGraph = await elk.layout(graph);
    const nodes: Node[] = [];
    const groups: Node[] = [];
    layoutGraph.children?.forEach((child: any) => {
      if (child.type === groupType) {
        groups.push({
          id: child.id,
          data: child.data,
          position: { x: child.x, y: child.y },
          style: {
            width: child.width,
            height: child.height,
          },
          type: child.type,
        });

        // Add the children of the group to the nodes array
        nodes.push(
          ...child.children.map((node) => ({
            ...node,
            position: { x: node.x, y: node.y },
          })),
        );
      } else {
        // Add ungrouped nodes to the nodes array
        nodes.push({
          ...child,
          position: { x: child.x, y: child.y },
        });
      }
    });

    return {
      elkNodes: groups.concat(nodes),
      elkEdges: layoutGraph.edges,
    };
    // Process the layout result as needed
  } catch (error) {
    return { elkNodes: groups.concat(nodes), elkEdges: edges };
  }
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

function logWithTimestamp(message) {
  var timestamp = new Date().toLocaleTimeString();
  console.log('[' + timestamp + '] ' + message);
}
