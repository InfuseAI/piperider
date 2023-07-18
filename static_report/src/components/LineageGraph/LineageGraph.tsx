import { useReportStore } from '../../utils/store';
import { Comparable } from '../../types';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Controls,
  MiniMap,
  Node,
  Panel,
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
  Link,
  Portal,
  MenuGroup,
  MenuOptionGroup,
  MenuItemOption,
  Tooltip,
} from '@chakra-ui/react';
import { useLocation } from 'wouter';
import { LineageGraphNode } from '../../utils/dbt';
import { GraphNode } from './GraphNode';
import GraphEdge from './GraphEdge';
import { GraphGroup } from './GraphGroup';
import { useTableRoute } from '../../utils/routes';
import { ChevronDownIcon, InfoIcon } from '@chakra-ui/icons';
import {
  buildNodesAndEdges,
  FilterBy,
  selectDownstream,
  selectStateChanged,
  selectStateModified,
  selectUnion,
  selectUpstream,
} from './util';
import { useTrackOnMount } from '../../hooks/useTrackOnMount';
import { CR_TYPE_LABEL, EVENTS, SR_TYPE_LABEL } from '../../utils/trackEvents';
import { useHashParams } from '../../hooks';

const nodeTypes = {
  customNode: GraphNode,
  customGroup: GraphGroup,
};
const edgeTypes = {
  customEdge: GraphEdge,
};

function LineageGraphWrapped({ singleOnly }: Comparable) {
  const reactflow = useReactFlow();
  const { lineageGraph = {} } = useReportStore.getState();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [location, setLocation] = useLocation();
  const hashParams = useHashParams();

  const [selected, setSelected] = useState<string | undefined>();

  const [expandLeft, setExpandLeft] = useState<string[]>([]);
  const [expandRight, setExpandRight] = useState<string[]>([]);

  const stat = hashParams.get('g_stat') || '';
  const setStat = useCallback(
    (stat: string) => {
      hashParams.set('g_stat', stat);
      setLocation(`${location}?${hashParams}`);
    },
    [hashParams, location, setLocation],
  );
  const filterBy: FilterBy = hashParams.has('g_filter_by')
    ? (hashParams.get('g_filter_by') as FilterBy)
    : singleOnly
    ? 'all'
    : 'all';
  const setFilterBy = useCallback(
    (filterBy: string) => {
      hashParams.set('g_filter_by', filterBy);
      setLocation(`${location}?${hashParams}`);
    },
    [hashParams, location, setLocation],
  );

  const [changeSelect, setChangeSelect] = useState<string>('impacted');

  // Context Menu
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [position, setPosition] = useState<[number, number]>([0, 0]);
  const [contextNodeId, setContextNodeId] = useState<string | undefined>();

  useTrackOnMount({
    eventName: EVENTS.PAGE_VIEW,
    eventProperties: {
      type: singleOnly ? SR_TYPE_LABEL : CR_TYPE_LABEL,
      page: 'lineage-graph',
    },
  });

  const onResetClick = () => {
    setSelected(undefined);
    setExpandLeft([]);
    setExpandRight([]);
    setLocation(`${location}?g_v=1`);
  };

  const defaultNodeSets = useMemo(() => {
    const all = new Set(Object.keys(lineageGraph));
    const modified = selectStateModified(lineageGraph);
    const changed = selectStateChanged(lineageGraph);
    const impacted = selectDownstream(lineageGraph, Array.from(modified));
    const impactedPlus = selectUnion(
      impacted,
      selectUpstream(lineageGraph, Array.from(modified), 1),
    );

    return {
      all,
      changed,
      impacted,
      impactedPlus,
    };
  }, [lineageGraph, singleOnly]);

  const rebuild = useCallback(
    (includeSet: Set<string>, selectSet: Set<string>) => {
      const { nodes, edges } = buildNodesAndEdges(
        lineageGraph,
        includeSet,
        selectSet,
        {
          nodeOverrides: {
            singleOnly: singleOnly || false,
            isHighlighted: false,
            stat,
          },
          edgeOverrides: {
            singleOnly: singleOnly || false,
          },
        },
      );
      setNodes(nodes);
      setEdges(edges);

      setTimeout(() => reactflow.fitView({ maxZoom: 1 }), 0);
    },
    [lineageGraph, singleOnly, stat, setNodes, setEdges],
  );

  useEffect(() => {
    // nodes
    let includeSet: Set<string>;
    let selectSet: Set<string>;

    if (selected) {
      includeSet = new Set<string>();
      if (selected) {
        includeSet = selectUnion(
          selectDownstream(lineageGraph, [selected]),
          selectUpstream(lineageGraph, [selected]),
        );
      }
    } else if (filterBy === 'impacted') {
      includeSet = defaultNodeSets.impacted;
    } else if (filterBy === 'impacted+') {
      includeSet = defaultNodeSets.impactedPlus;
    } else {
      includeSet = defaultNodeSets.all;
    }

    if (changeSelect === 'impacted') {
      selectSet = defaultNodeSets.impacted;
    } else if (changeSelect === 'changed') {
      selectSet = defaultNodeSets.changed;
    } else {
      selectSet = defaultNodeSets.all;
    }

    includeSet = selectUnion(
      includeSet,
      selectUpstream(lineageGraph, expandLeft, 1),
      selectDownstream(lineageGraph, expandRight, 1),
    );

    rebuild(includeSet, selectSet);
  }, [
    lineageGraph,
    filterBy,
    changeSelect,
    stat,
    selected,
    expandLeft,
    expandRight,
  ]);

  function highlightPath(node: Node) {
    onClose();

    const relatedNodes = selectUnion(
      selectUpstream(lineageGraph, [node.id]),
      selectDownstream(lineageGraph, [node.id]),
    );

    const relatedEdges = new Set(
      edges
        .filter((edge) => {
          return relatedNodes.has(edge.source) && relatedNodes.has(edge.target);
        })
        .map((edge) => edge.id),
    );

    setEdges(
      edges.map((edge) => {
        if (relatedEdges.has(edge.id)) {
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
        if (relatedNodes.has(node.id)) {
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
      {/* Control Bar */}
      <Box flex="1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onClick={() => {
            onClose();
          }}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeMouseEnter={(_event, node) => highlightPath(node)}
          onNodeMouseLeave={() => resetHighlightPath()}
          onContextMenu={(e) => {
            e.preventDefault();
            setPosition([e.pageX, e.pageY]);
            const target = e.target as HTMLElement;
            const domNode = target.closest('.react-flow__node') as HTMLElement;
            if (domNode) {
              const uniqueId = domNode?.dataset?.id;
              setContextNodeId(uniqueId);
            } else {
              setContextNodeId(undefined);
            }
            onOpen();
          }}
          minZoom={0.1}
          fitView
        >
          <Controls showInteractive={false} />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
          <Panel position="top-right">
            <Button variant="outline" colorScheme="gray" size="sm">
              Copy URL
            </Button>
          </Panel>
          {/* {(filterBy === 'selected' || filterBy === 'impacted') && (
            <Panel position="top-left">
              <Text fontSize="sm">
                {filterBy === 'selected' &&
                  (nodes.length > 0
                    ? 'Active node and its depedencies.'
                    : 'No active node.')}
                {filterBy === 'impacted' &&
                  (nodes.length > 0
                    ? 'Changed nodes and their downstreams.'
                    : 'No changed nodes found.')}{' '}
                <Link
                  color="blue"
                  onClick={() => {
                    onFullGraphClick();
                  }}
                >
                  Show all nodes
                </Link>
              </Text>
            </Panel>
          )} */}
        </ReactFlow>
      </Box>

      {/* Control Bar */}
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
        {!singleOnly && (
          <Box p={2}>
            <Text fontSize="sm" color="gray">
              Change Status
            </Text>
            <Menu>
              <MenuButton>{`${filterBy}`}</MenuButton>
              <MenuList>
                <MenuOptionGroup
                  title="Include"
                  value={filterBy}
                  onChange={(value) => setFilterBy(value as string)}
                >
                  <MenuItemOption value="all" fontSize="sm">
                    All nodes
                  </MenuItemOption>
                  <MenuItemOption value="impacted" fontSize="sm">
                    Impacted
                  </MenuItemOption>
                  <MenuItemOption value="impacted+" fontSize="sm">
                    Impacted+{' '}
                    <Tooltip label="Impacted and 1st degree parents">
                      <InfoIcon />
                    </Tooltip>
                  </MenuItemOption>
                </MenuOptionGroup>
                <MenuOptionGroup
                  title="Select"
                  value={changeSelect}
                  onChange={(value) => {
                    setChangeSelect(value as string);
                  }}
                >
                  <MenuItemOption fontSize="sm" value="all">
                    All nodes
                  </MenuItemOption>
                  <MenuItemOption fontSize="sm" value="impacted">
                    Impacted
                  </MenuItemOption>
                  <MenuItemOption fontSize="sm" value="changed">
                    Changed
                  </MenuItemOption>
                </MenuOptionGroup>
              </MenuList>
            </Menu>
          </Box>
        )}
        <Spacer />

        <Button _hover={{ bg: 'gray.200' }} onClick={onResetClick}>
          Reset
        </Button>
      </Flex>

      {/* Context Menu */}
      <Portal>
        <Menu isOpen={isOpen} onClose={onClose} size="sm">
          <MenuButton
            aria-hidden={true}
            w={1}
            h={1}
            style={{
              position: 'absolute',
              left: position[0],
              top: position[1],
              cursor: 'default',
            }}
          />
          <MenuList zIndex="modal" fontSize="12px">
            {contextNodeId && lineageGraph[contextNodeId]?.path && (
              <MenuItem
                onClick={() => {
                  setLocation(lineageGraph[contextNodeId]?.path || '');
                }}
              >
                Go to page
              </MenuItem>
            )}
            {contextNodeId && (
              <MenuItem
                onClick={() => {
                  setSelected(contextNodeId);
                }}
              >
                Focus on node
              </MenuItem>
            )}
            {contextNodeId && (
              <MenuItem
                onClick={() => {
                  setExpandLeft([...expandLeft, contextNodeId || '']);
                }}
              >
                Expand left
              </MenuItem>
            )}
            {contextNodeId && (
              <MenuItem
                onClick={() => {
                  setExpandRight([...expandRight, contextNodeId || '']);
                }}
              >
                Expand Right
              </MenuItem>
            )}
            <MenuItem>Export PNG</MenuItem>
          </MenuList>
        </Menu>
      </Portal>
    </Flex>
  );
}

export function LineageGraph({ singleOnly }: Comparable) {
  return (
    <ReactFlowProvider>
      <LineageGraphWrapped singleOnly={singleOnly} />
    </ReactFlowProvider>
  );
}
