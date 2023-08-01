import { Edge, Node } from 'reactflow';
import dagre from 'dagre';

import 'reactflow/dist/style.css';
import {
  LineageGraphData,
  LineageGraphEdge,
  LineageGraphNode,
} from '../../utils/dbt';
import { getDownstreamSet, getUpstreamSet } from '../../utils/graph';

const nodeWidth = 300;
const nodeHeight = 60;

export const buildNodesAndEdges = (
  lineageGraph: LineageGraphData,
  includeSet: Set<String>,
  selectSet: Set<String>,
  options: {
    nodeOverrides?: Partial<LineageGraphNode>;
    edgeOverrides?: Partial<LineageGraphEdge>;
  },
) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  Object.entries(lineageGraph).forEach(([key, nodeData]) => {
    if (!includeSet.has(key)) {
      return;
    }

    const isSelected = selectSet.has(key);

    if (nodeData.type === 'test') {
      return;
    }

    const node: Node = {
      id: key,
      position: { x: 0, y: 0 },
      data: {
        ...nodeData,
        ...options.nodeOverrides,
        isSelected,
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
      if (!includeSet.has(dependsOnKey)) {
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

  layout(nodes, edges, 'LR');

  return { nodes, edges };
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

export function selectUpstream(
  lineageGraph: LineageGraphData,
  keys: string[],
  degree: number = 1000,
): Set<string> {
  return getUpstreamSet(
    keys,
    (id) => {
      return Object.keys(lineageGraph[id].dependsOn);
    },
    degree,
  );
}

export function selectDownstream(
  lineageGraph: LineageGraphData,
  keys: string[],
  degree: number = 1000,
): Set<string> {
  return getDownstreamSet(
    keys,
    (id) => {
      return Object.keys(lineageGraph[id].children);
    },
    degree,
  );
}

export function selectAll(lineageGraph: LineageGraphData): Set<string> {
  const changeSet = new Set<string>();

  Object.entries(lineageGraph).forEach(([uniqueId, node]) => {
    changeSet.add(uniqueId);
  });

  return changeSet;
}

export function selectStateChanged(
  lineageGraph: LineageGraphData,
): Set<string> {
  const changeSet = new Set<string>();

  Object.entries(lineageGraph).forEach(([uniqueId, node]) => {
    if (
      node.changeStatus === 'added' ||
      node.changeStatus === 'removed' ||
      node.changeStatus === 'modified'
    ) {
      changeSet.add(uniqueId);
    }
  });

  return changeSet;
}

export function selectStateModified(
  lineageGraph: LineageGraphData,
): Set<string> {
  const changeSet = new Set<string>();

  Object.entries(lineageGraph).forEach(([uniqueId, node]) => {
    if (
      node.changeStatus === 'added' ||
      node.changeStatus === 'removed' ||
      node.changeStatus === 'modified'
    ) {
      changeSet.add(uniqueId);
    }
  });

  return changeSet;
}

export function selectUnion(...sets: Set<string>[]) {
  const unionSet = new Set<string>();

  sets.forEach((set) => {
    set.forEach((key) => {
      unionSet.add(key);
    });
  });

  return unionSet;
}

export function selectIntersection(...sets: Set<string>[]) {
  const intersectionSet = new Set<string>();

  sets.forEach((set) => {
    set.forEach((key) => {
      if (intersectionSet.has(key)) {
        intersectionSet.add(key);
      }
    });
  });

  return intersectionSet;
}

// function logWithTimestamp(message) {
//   var timestamp = new Date().toLocaleTimeString();
//   console.log('[' + timestamp + '] ' + message);
// }

function _formatValue(value?: number, formatStyle: string = 'decimal') {
  if (value === undefined) {
    return undefined;
  }

  if (formatStyle === 'decimal') {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  } else if (formatStyle === 'percent') {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  } else if (formatStyle === 'duration') {
    const sign = value < 0 ? '-' : '';
    const abs = Math.abs(value);
    const seconds = Math.floor(abs % 60);
    const minutes = Math.floor((abs / 60) % 60);
    const hours = Math.floor(abs / 3600);

    const fmt2f = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const fmt2d = new Intl.NumberFormat('en-US', {
      minimumIntegerDigits: 2,
    });

    if (abs < 10) {
      return `${sign}${fmt2f.format(abs)}"`;
    } else if (abs < 60) {
      return `${sign}${seconds}"`;
    } else if (abs < 3600) {
      return `${sign}${minutes}'${fmt2d.format(seconds)}"`;
    } else {
      return `${sign}${hours}h${fmt2d.format(minutes)}'${fmt2d.format(
        seconds,
      )}"`;
    }
  }

  return undefined;
}

export function getStatDiff(
  base?: object,
  target?: object,
  key: string = '',
  formatStyle: 'percent' | 'decimal' | 'duration' = 'decimal',
): {
  statValue?: number;
  statValueF?: string;
  statDiff?: number;
  statDiffF?: string;
} {
  const targetValue =
    target !== undefined && target.hasOwnProperty(key)
      ? (target[key] as number)
      : undefined;
  const baseValue =
    base !== undefined && base.hasOwnProperty(key)
      ? (base[key] as number)
      : undefined;
  const statValue = targetValue ?? baseValue;
  if (statValue === undefined) {
    return {
      statValueF: '-',
    };
  }

  const statValueF = _formatValue(statValue, formatStyle);

  if (baseValue === undefined || targetValue === undefined) {
    return { statValue, statValueF };
  }

  let statDiff = targetValue - baseValue;
  if (formatStyle === 'duration' && Math.abs(statDiff) < 0.01) {
    statDiff = 0;
  }

  const statDiffF = _formatValue(statDiff, formatStyle);

  return { statValue, statValueF, statDiff, statDiffF };
}
