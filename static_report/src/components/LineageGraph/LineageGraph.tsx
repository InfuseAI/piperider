import { useReportStore } from '../../utils/store';
import { Comparable } from '../../types';

import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Controls,
  MiniMap,
  Node,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from 'reactflow';

import 'reactflow/dist/style.css';
import {
  Text,
  Flex,
  Box,
  Select,
  useDisclosure,
  Spacer,
  ButtonGroup,
  Button,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { useLocation } from 'wouter';
import { LineageGraphNode } from '../../utils/dbt';
import TableSummary from './TableSummary';
import { GraphNode } from './GraphNode';
import GraphEdge from './GraphEdge';
import { GraphGroup } from './GraphGroup';
import { useTableRoute } from '../../utils/routes';
import { ChevronDownIcon } from '@chakra-ui/icons';
import {
  buildNodesAndEdges,
  FilterBy,
  getDownstreamNodes,
  getUpstreamNodes,
} from './graph';

const nodeTypes = {
  customNode: GraphNode,
  customGroup: GraphGroup,
};
const edgeTypes = {
  customEdge: GraphEdge,
};

function _LineageGraph({ singleOnly }: Comparable) {
  const reactflow = useReactFlow();
  const { lineageGraph = {} } = useReportStore.getState();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const { isOpen, onOpen, onClose } = useDisclosure();
  let { uniqueId } = useTableRoute();
  const [, setLocation] = useLocation();
  const [filterBy, setFilterBy] = useState<FilterBy>(undefined);
  const [selected, setSelected] = useState<string | undefined>(uniqueId);
  const [layoutAlgorithm, setLayoutAlgorithm] = useState('dagre');
  const [stat, setStat] = useState('');
  const [groupBy, setGroupBy] = useState('');

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

      // don't show the sidebar now.
      if (false) {
        onOpen();
      }
    },
    // eslint-disable-next-line
    [onOpen],
  );

  const onChangeOnlyClick = useCallback(() => {
    setFilterBy('changed');
  }, [setFilterBy]);

  const onFocusClick = useCallback(() => {
    setSelected(uniqueId);
    setFilterBy('selected');
  }, [uniqueId, setSelected, setFilterBy]);

  const onFullGraphClick = useCallback(() => {
    setFilterBy(undefined);
  }, [setFilterBy]);

  const onResetClick = useCallback(() => {
    setFilterBy(undefined);
    setStat('');
    setLayoutAlgorithm('dagre');
    setGroupBy('');
    reactflow.fitView();
  }, [onFullGraphClick]);

  useEffect(() => {
    const renderGraph = async () => {
      console.log(Object.keys(lineageGraph).length);
      const { nodes, edges } = await buildNodesAndEdges(lineageGraph, {
        nodeOverrides: {
          singleOnly: singleOnly || false,
          isHighlighted: false,
          stat,
        },
        edgeOverrides: {
          singleOnly: singleOnly || false,
        },
        layoutLibrary: layoutAlgorithm,
        filterBy,
        selected,
        groupBy: groupBy || undefined,
      });
      setNodes(nodes);
      setEdges(edges);
    };
    renderGraph();
  }, [
    lineageGraph,
    setNodes,
    setEdges,
    singleOnly,
    layoutAlgorithm,
    groupBy,
    stat,
    filterBy,
    selected,
  ]);

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
    <Flex
      flexDirection="column"
      style={{
        width: '100%',
        height: 'calc(100vh - 160px)',
      }}
    >
      <Flex flex="1">
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
          onNodeContextMenu={(event, node) => {
            event.preventDefault();
            console.log('context menu');
          }}
          minZoom={0.1}
          fitView
        >
          <Controls showInteractive={false} />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
        </ReactFlow>

        <TableSummary
          singleOnly={singleOnly}
          isOpen={isOpen}
          onClose={onClose}
        ></TableSummary>
      </Flex>
      <Flex
        flex="0 0 60px"
        bg="gray.100"
        gap={3}
        px={10}
        py={2}
        border="0px solid lightgray"
        borderTopWidth={1}
        alignItems="center"
      >
        <Box p={2}>
          <Text fontSize="sm" color="gray">
            Stat
          </Text>
          <Select
            value={stat}
            fontSize="sm"
            variant="unstyled"
            onChange={(event) => {
              const value = event.target.value || '';
              setStat(value);
            }}
          >
            <option value="">No stat</option>
            <option value="execution_time">Execution time</option>
            <option value="row_count">Row count</option>
          </Select>
        </Box>
        {/* <Box p={2}>
          <Text fontSize="sm" color="gray">
            Group by
          </Text>
          <Select
            value={groupBy}
            placeholder="None"
            fontSize="sm"
            onChange={(event) => {
              const value = event.target.value || '';
              setGroupBy(value);
            }}
            variant="unstyled"
          >
            <option value="filepath">DBT Model Folder Structure</option>
            <option value="type">Type</option>
            <option value="package">Package</option>
            <option value="tag:piperider">Tag: Piperider</option>
          </Select>
        </Box>
        <Box p={2}>
          <Text fontSize="sm" color="gray">
            Layout algorithm
          </Text>
          <Select
            value={layoutAlgorithm}
            fontSize="sm"
            variant="unstyled"
            onChange={(event) =>
              setLayoutAlgorithm(event.target.value as string)
            }
          >
            <option value="dagre">Dagre</option>
            <option value="subflow">Dagre with Sub Flow</option>
          </Select>
        </Box> */}
        <Spacer />
        <ButtonGroup
          size="sm"
          isAttached
          variant="outline"
          borderRadius="md"
          borderWidth="1px"
        >
          <Button _hover={{ bg: 'gray.200' }} onClick={onResetClick}>
            Reset
          </Button>
          <Menu>
            <MenuButton
              as={IconButton}
              icon={<ChevronDownIcon />}
              _hover={{ bg: 'gray.200' }}
            />
            <MenuList>
              <MenuItem fontSize="sm" onClick={onFullGraphClick}>
                All nodes
              </MenuItem>
              {!singleOnly && (
                <MenuItem fontSize="sm" onClick={onChangeOnlyClick}>
                  Change only
                </MenuItem>
              )}
              <MenuItem fontSize="sm" onClick={onFocusClick}>
                Focus active
              </MenuItem>
            </MenuList>
          </Menu>
        </ButtonGroup>
      </Flex>
    </Flex>
  );
}

export function LineageGraph({ singleOnly }: Comparable) {
  return (
    <ReactFlowProvider>
      <_LineageGraph singleOnly={singleOnly} />
    </ReactFlowProvider>
  );
}
