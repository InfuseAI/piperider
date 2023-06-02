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
  EdgeChange,
  NodeChange,
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
import { LineageGraphData, LineageGraphItem } from '../../utils/dbt';
import TableSummary from './TableSummary';
import { GraphNode } from './GraphNode';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 300;
const nodeHeight = 60;

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

function logWithTimestamp(message) {
  var timestamp = new Date().toLocaleTimeString();
  console.log('[' + timestamp + '] ' + message);
}

export function ReactFlowGraph({ singleOnly }: Comparable) {
  const { lineageGraph = {} } = useReportStore.getState();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selected, setSelected] = useState<LineageGraphItem>();
  const [, setLocation] = useLocation();

  const onClick = useCallback(
    (item: LineageGraphItem) => {
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
    const initialNodes: Node[] = [];
    const initialEdges: Edge[] = [];
    console.log(Object.keys(lineageGraph).length);

    Object.entries(lineageGraph).forEach(([key, node]) => {
      if (node.type === 'test') return;

      initialNodes.push({
        id: key,
        position: { x: 0, y: 0 },
        data: {
          label: `${node.name}`,
          singleOnly,
          onClick,
          isHighlighted: false,
          ...node,
        },
        draggable: true,
        type: 'customNode',
      });

      Object.entries(node.dependsOn).forEach(([dependsOnKey, from]) => {
        const style = {};

        if (!singleOnly) {
          if (!from.includes('target')) {
            style['stroke'] = 'gray';
            style['stroke-dasharray'] = '5';
          }
        }

        initialEdges.push({
          source: dependsOnKey,
          target: key,
          id: `${key} -> ${dependsOnKey}`,
          style,
        });
      });
    });

    logWithTimestamp('layout');
    layout(initialNodes, initialEdges, 'LR');
    logWithTimestamp('layout complete');

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [lineageGraph, setNodes, setEdges, singleOnly, onClick]);

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
            style: {
              ...edge.style,
              stroke: 'darkorange',
              strokeWidth: 2,
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
          style: {
            ...edge.style,
            stroke: 'gray',
            strokeWidth: 1,
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

  // function onEdgesSelect(edgeChanges: EdgeChange[]) {
  //   edgeChanges.forEach((edgeChange) => {
  //     if (edgeChange.type === 'select') {
  //       const [to, from] = edgeChange.id.split(' -> ');
  //       if (edgeChange.selected) {
  //         setMessage(
  //           `Selected Edge: ${from.split('.').pop()} -> ${to.split('.').pop()}`,
  //         );
  //         // console.log(findRelatedNodes(lineageGraph, to));
  //         console.log(edges);
  //       }
  //     }
  //   });
  //   onEdgesChange(edgeChanges);
  // }

  // function onNodesSelect(nodeChanges: NodeChange[]) {
  //   nodeChanges.forEach((nodeChange) => {
  //     if (nodeChange.type === 'select') {
  //       if (nodeChange.selected) {
  //         setMessage(`Selected Node: ${nodeChange.id}`);
  //         nodes[0].selected = true;
  //         console.log(nodes);
  //       }
  //     }
  //   });
  //   onNodesChange(nodeChanges);
  // }

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
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeMouseEnter={(_event, node) => highlightPath(node)}
        onNodeMouseLeave={() => resetHighlightPath()}
        minZoom={0.1}
      >
        <Controls />
        <MiniMap nodeStrokeWidth={3} zoomable pannable />
      </ReactFlow>
      <Box
        style={{
          position: 'absolute',
          background: 'white',
          top: 0,
          left: 0,
        }}
      >
        <Select variant="outline" size="sm">
          <option>No stats</option>
          <option>Row count</option>
          <option>Execution time</option>
          <option>Metric total</option>
        </Select>
      </Box>

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
