import { useReportStore } from '../../utils/store';
import { Comparable } from '../../types';

import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Controls,
  Edge,
  MiniMap,
  Node,
  Position,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import dagre from 'dagre';

import 'reactflow/dist/style.css';
import {
  Text,
  Flex,
  Box,
  Button,
  ButtonGroup,
  Select,
  Spacer,
  useDisclosure,
} from '@chakra-ui/react';
import { useLocation } from 'wouter';
import { LineageGraphData, LineageGraphNode } from '../../utils/dbt';
import TableSummary from './TableSummary';
import { GraphNode } from './GraphNode';
import GraphEdge from './GraphEdge';
import { set } from 'lodash';

const nodeWidth = 300;
const nodeHeight = 60;
const groupMargin = 20;

const buildReactFlowNodesAndEdges = (
  lineageGraph: LineageGraphData,
  isLayout: boolean = true,
  options: {
    singleOnly: boolean;
    isHighlighted: boolean;
    groupBy?: string;
  },
) => {
  const groups: Node[] = [];
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  Object.entries(lineageGraph).forEach(([key, nodeData]) => {
    if (nodeData.type === 'test') return;

    const node: Node = {
      id: key,
      position: { x: 0, y: 0 },
      data: {
        ...nodeData,
        ...options,
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
      }

      if (groupId && groupName) {
        if (!groups.find((group) => group.id === groupId)) {
          groups.push({
            id: groupId,
            position: { x: 0, y: 0 },
            data: {
              label: `Group: ${nodeData.type}`,
            },
            type: 'group',
          });
          console.log('group', groupId, groupName);
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

  if (isLayout) {
    if (groups.length > 0) {
      logWithTimestamp('layoutByGroups');
      layoutByGroups(groups, nodes, edges, 'LR');
      logWithTimestamp('layoutByGroups complete');
    } else {
      logWithTimestamp('layout');
      layout(nodes, edges, 'LR');
      logWithTimestamp('layout complete');
    }
    // layoutGroups(groups, nodes);
  }

  return { nodes: groups.concat(nodes), edges };
};

const getUpstreamNodes = (lineageGraph, key) => {
  const node = lineageGraph[key];
  const relatedNodes: string[] = [key];

  if (Object.keys(node.dependsOn).length > 0) {
    Object.keys(node.dependsOn).forEach((dependsOnKey) => {
      relatedNodes.push(...getUpstreamNodes(lineageGraph, dependsOnKey));
    });
  }
  return relatedNodes;
};

const getDownstreamNodes = (
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

const layoutByGroups = (
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

const layoutGroups = (groups: Node[], nodes: Node[]) => {
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
      ...getDownstreamNodes(lineageGraph, selectedItem?.uniqueId),
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

  const onChangeGroupBy = useCallback(
    (event) => {
      const groupedBy = event.target.value;

      const { nodes, edges } = buildReactFlowNodesAndEdges(lineageGraph, true, {
        singleOnly: singleOnly || false,
        isHighlighted: false,
        groupBy: groupedBy || undefined,
      });

      setNodes(nodes);
      setEdges(edges);
    },
    [setNodes, setEdges, lineageGraph, singleOnly],
  );

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
      ...getDownstreamNodes(lineageGraph, node.id),
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
      <Flex>
        <Box>
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
        </Box>
        <Spacer />
        <Text>Group by: </Text>
        <Box width={'20%'}>
          <Select placeholder="None" size="sm" onChange={onChangeGroupBy}>
            <option value="type">Type</option>
            <option value="package">Package</option>
          </Select>
        </Box>
      </Flex>
    </div>
  );
}

export function ReactFlowGraphProvider(props) {
  return (
    <ReactFlowProvider>
      <ReactFlowGraph {...props} />
    </ReactFlowProvider>
  );
}
