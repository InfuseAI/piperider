import { useReportStore } from '../../utils/store';
import { Comparable } from '../../types';

import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Controls,
  Edge,
  Handle,
  MiniMap,
  Node,
  Position,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import dagre from 'dagre';

import 'reactflow/dist/style.css';
import {
  Box,
  Divider,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  Flex,
  Icon,
  useDisclosure,
} from '@chakra-ui/react';
import { Link } from 'wouter';
import { VscDiffAdded, VscDiffModified, VscDiffRemoved } from 'react-icons/vsc';
import React from 'react';
import { LineageGraphItem } from '../../utils/dbt';
import { FaLink } from 'react-icons/fa';
import TableSummary from './TableSummary';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 172;
const nodeHeight = 36;

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

function CustomNode(params) {
  const node = params as Node;
  const data = node.data;
  const singleOnly = data.singleOnly;
  const onClick = data.onClick;

  let style: any = {
    'background-color': 'rgb(203 246 253)',
    'border-color': '#0094b3',
  };
  let resourceType = node?.data?.type;

  if (resourceType === 'source') {
    style = {
      'background-color': 'rgb(214 255 188)',
      'border-color': '#5fb825',
    };
  } else if (resourceType === 'explosure') {
    style = {
      'background-color': '#ff694b',
      'border-color': '#ff694b',
    };
  } else if (resourceType === 'metric') {
    style = {
      'background-color': 'rgb(255 230 238)',
      'border-color': '#ff5688',
    };
  }

  let iconChangeStatus;
  let changeStatus = data.changeStatus;
  if (!singleOnly) {
    if (changeStatus === 'added') {
      iconChangeStatus = VscDiffAdded;
      // style = {
      //   ...style,
      //   'border-color': '#080',
      //   color: '#080',
      // };
    } else if (changeStatus === 'changed') {
      iconChangeStatus = VscDiffModified;
      // style = {
      //   ...style,
      //   'border-color': '#00f',
      //   color: '#00f',
      // };
    } else if (changeStatus === 'removed') {
      iconChangeStatus = VscDiffRemoved;
      style = {
        ...style,
        'border-style': 'dashed',
        color: 'gray',
      };
    }
  }

  const name = node?.data?.name;

  return (
    <Flex
      className="react-flow__node-default"
      // style={{ backgroundColor }}
      style={style}
      _hover={{ bg: 'gray.100' }}
      alignItems="center"
      width="172px"
      px={5}
    >
      <Handle type="target" position={Position.Left} />
      <Box
        width="100%"
        onClick={() => {
          onClick(node?.data);
        }}
      >
        {/* <Link href={node?.data?.path}>{name}</Link> */}
        {name}
      </Box>
      {!singleOnly && changeStatus && <Icon as={iconChangeStatus} />}

      <Handle type="source" position={Position.Right} />
    </Flex>
  );
}

const nodeTypes = {
  customNode: CustomNode,
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

  const onClick = useCallback(
    (item: LineageGraphItem) => {
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
    [setSelected, onOpen],
  );

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

  return (
    <div
      style={{
        width: '100%',
        height: 'calc(100vh - 160px)',
        border: '5 solid black',
      }}
    >
      <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="md">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerBody>
            <Box>
              {selected?.type}: {selected?.name}{' '}
              <Link href={selected?.path || ''}>
                <Icon as={FaLink} />
              </Link>
            </Box>
            <Divider></Divider>
            <TableSummary
              uniqueId={selected?.uniqueId || ''}
              singleOnly={singleOnly}
            ></TableSummary>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        minZoom={0.1}
      >
        <Controls />
        <MiniMap nodeStrokeWidth={3} zoomable pannable />
      </ReactFlow>
    </div>
  );
}
