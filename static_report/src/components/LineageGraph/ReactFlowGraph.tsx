import { useReportStore } from '../../utils/store';
import { Comparable } from '../../types';

import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Controls,
  Edge,
  MiniMap,
  Node,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import dagre from 'dagre';

import 'reactflow/dist/style.css';
import {
  Box,
  Button,
  ButtonGroup,
  Select,
  useDisclosure,
} from '@chakra-ui/react';
import { useLocation } from 'wouter';
import { LineageGraphData, LineageGraphNode } from '../../utils/dbt';
import TableSummary from './TableSummary';
import { GraphNode } from './GraphNode';
import GraphEdge from './GraphEdge';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 300;
const nodeHeight = 60;

const buildReactFlowNodesAndEdges = (
  lineageGraph: LineageGraphData,
  isLayout: boolean = true,
  options: {
    singleOnly: boolean;
    isHighlighted: boolean;
  },
) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  Object.entries(lineageGraph).forEach(([key, nodeData]) => {
    if (nodeData.type === 'test') return;

    nodes.push({
      id: key,
      position: { x: 0, y: 0 },
      data: {
        ...nodeData,
        ...options,
      },
      draggable: true,
      type: 'customNode',
    });

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

  if (isLayout) {
    logWithTimestamp('layout');
    layout(nodes, edges, 'LR');
    logWithTimestamp('layout complete');
  }

  return { nodes, edges };
};

const getUpstreamNodes = (lineageGraph, key) => {
  const node = lineageGraph[key];
  const relatedNodes = [key];

  if (Object.keys(node.dependsOn).length > 0) {
    Object.keys(node.dependsOn).forEach((dependsOnKey) => {
      relatedNodes.push(...getUpstreamNodes(lineageGraph, dependsOnKey));
    });
  }
  return relatedNodes;
};

const getDownstreamNodes = (edges: Edge[], key) => {
  const relatedNodes: string[] = [];

  Object.entries(edges).forEach(([_, edge]) => {
    if (edge.source === key) {
      relatedNodes.push(edge.target);
      relatedNodes.push(...getDownstreamNodes(edges, edge.target));
    }
  });

  return relatedNodes;
};

const layout = (nodes, edges, direction = 'LR') => {
  const isHorizontal = direction === 'LR';
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
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };

    return node;
  });
};

const nodeTypes = {
  customNode: GraphNode,
};

const edgeTypes = {
  customEdge: GraphEdge,
};

function logWithTimestamp(message) {
  var timestamp = new Date().toLocaleTimeString();
  console.log('[' + timestamp + '] ' + message);
}

export function ReactFlowGraph({ singleOnly }: Comparable) {
  const { lineageGraph = {} } = useReportStore.getState();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selected, setSelected] = useState<LineageGraphNode>();
  const [, setLocation] = useLocation();

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const item = node.data as LineageGraphNode;
      if (item?.path) {
        setLocation(item?.path || '');
      }

      if (
        item.type !== 'source' &&
        item.type !== 'seed' &&
        item.type !== 'model'
      ) {
        return;
      }

      setSelected(item);
      onOpen();
    },
    // eslint-disable-next-line
    [setSelected, onOpen],
  );

  const onFocusClick = useCallback(() => {
    const selectedItem = selected;
    console.log(selectedItem);
    const relatedNodes = [
      ...getUpstreamNodes(lineageGraph, selectedItem?.uniqueId),
      ...getDownstreamNodes(edges, selectedItem?.uniqueId),
    ];
    const relatedEdges = edges.filter((edge) => {
      return (
        relatedNodes.includes(edge.source) && relatedNodes.includes(edge.target)
      );
    });

    setNodes((nodes) =>
      nodes.map((node) => {
        if (!relatedNodes.includes(node.id)) {
          return {
            ...node,
            hidden: true,
          };
        } else {
          return node;
        }
      }),
    );
    setEdges((edges) =>
      edges.map((edge) => {
        if (!relatedEdges.includes(edge)) {
          return {
            ...edge,
            hidden: true,
          };
        } else {
          return edge;
        }
      }),
    );
  }, [selected, lineageGraph, setNodes, setEdges, edges]);

  const onFullGraphClick = useCallback(() => {
    const hide = (hidden: boolean) => (nodeOrEdge) => {
      nodeOrEdge.hidden = hidden;
      return nodeOrEdge;
    };
    setNodes((nodes) => nodes.map(hide(false)));
    setEdges((edges) => edges.map(hide(false)));
  }, [setNodes, setEdges]);

  useEffect(() => {
    console.log(Object.keys(lineageGraph).length);

    const { nodes, edges } = buildReactFlowNodesAndEdges(lineageGraph, true, {
      singleOnly: singleOnly || false,
      isHighlighted: false,
    });

    setNodes(nodes);
    setEdges(edges);
  }, [lineageGraph, setNodes, setEdges, singleOnly]);

  function highlightPath(node: Node) {
    const relatedNodes = [
      ...getUpstreamNodes(lineageGraph, node.id),
      ...getDownstreamNodes(edges, node.id),
    ];
    const relatedEdges = edges.filter((edge) => {
      return (
        relatedNodes.includes(edge.source) && relatedNodes.includes(edge.target)
      );
    });

    setEdges(
      edges.map((edge) => {
        if (relatedEdges.includes(edge)) {
          return {
            ...edge,
            data: {
              ...edge.data,
              isHighlighted: true,
            },
          };
        } else {
          return edge;
        }
      }),
    );

    setNodes(
      nodes.map((node) => {
        if (relatedNodes.includes(node.id)) {
          return {
            ...node,
            data: {
              ...node.data,
              isHighlighted: true,
            },
          };
        } else {
          return node;
        }
      }),
    );
  }

  function resetHighlightPath() {
    setEdges(
      edges.map((edge) => {
        return {
          ...edge,
          data: {
            ...edge.data,
            isHighlighted: false,
          },
        };
      }),
    );
    setNodes(
      nodes.map((node) => {
        return {
          ...node,
          data: {
            ...node.data,
            isHighlighted: false,
          },
        };
      }),
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: 'calc(100vh - 160px)',
        border: '5 solid black',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={(_event, node) => highlightPath(node)}
        onNodeMouseLeave={() => resetHighlightPath()}
        minZoom={0.1}
      >
        <Controls showInteractive={false} />
        <MiniMap nodeStrokeWidth={3} zoomable pannable />
      </ReactFlow>

      <TableSummary
        singleOnly={singleOnly}
        isOpen={isOpen}
        onClose={onClose}
      ></TableSummary>
      <ButtonGroup gap="2">
        <Button colorScheme="orange" size="sm" onClick={onFullGraphClick}>
          Full graph
        </Button>
        <Button colorScheme="orange" size="sm" onClick={onFocusClick}>
          Focus on selected
        </Button>
        <Button colorScheme="orange" size="sm">
          Change only
        </Button>
      </ButtonGroup>
    </div>
  );
}
