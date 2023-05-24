import { useReportStore } from '../../utils/store';
import { Comparable } from '../../types';

import { useEffect } from 'react';
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
import { Box, Flex, Icon } from '@chakra-ui/react';
import { Link } from 'wouter';
import { VscDiffAdded, VscDiffModified, VscDiffRemoved } from 'react-icons/vsc';

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

function Hello(options) {
  // const [, setLocation] = useLocation();

  const node = options as Node;
  const data = node.data;

  // const onClick = () => {
  //   setLocation();
  // };

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

  if (changeStatus === 'added') {
    iconChangeStatus = VscDiffAdded;
    style = {
      ...style,
      'border-color': '#080',
      color: '#080',
    };
  } else if (changeStatus === 'changed') {
    iconChangeStatus = VscDiffModified;
    style = {
      ...style,
      'border-color': '#00f',
      color: '#00f',
    };
  } else if (changeStatus === 'removed') {
    iconChangeStatus = VscDiffRemoved;
    style = {
      ...style,
      'border-color': '#f00',
      color: '#f00',
    };
  }

  const singleOnly = false;
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
      <Box width="100%">
        <Link href={node?.data?.path}>{name}</Link>
      </Box>
      {!singleOnly && changeStatus && <Icon as={iconChangeStatus} />}

      <Handle type="source" position={Position.Right} />
    </Flex>
  );
}

const nodeTypes = {
  hello: Hello,
};

export function ReactFlowGraph({ singleOnly }: Comparable) {
  const { lineageGraph = {} } = useReportStore.getState();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const initialNodes: Node[] = [];
    const initialEdges: Edge[] = [];

    Object.entries(lineageGraph).forEach(([key, node]) => {
      if (node.type === 'test') return;

      initialNodes.push({
        id: key,
        position: { x: 0, y: 0 },
        data: {
          label: `${node.name}`,
          ...node,
        },
        draggable: true,
        type: 'hello',
      });

      Object.entries(node.dependsOn).forEach(([dependsOnKey, from]) => {
        const style = {};

        if (!from.includes('base')) {
          style['stroke'] = 'green';
        }

        if (!from.includes('target')) {
          style['stroke'] = 'red';
        }

        initialEdges.push({
          source: dependsOnKey,
          target: key,
          id: `${key} -> ${dependsOnKey}`,
          style,
        });
      });
    });

    layout(initialNodes, initialEdges, 'LR');

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [lineageGraph, setNodes, setEdges]);

  // const initialNodes = [
  //   { id: '1', position: { x: 0, y: 0 }, data: { label: '1' } },
  //   { id: '2', position: { x: 0, y: 100 }, data: { label: '2' } },
  // ];
  // const initialEdges = [{ id: 'e1-2', source: '1', target: '2' }];
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
      >
        <Controls />
        <MiniMap
          // nodeColor={nodeColor}
          nodeStrokeWidth={3}
          // nodeComponent={MiniMapNode}
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  );
}
