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
  useDisclosure,
  Spacer,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Portal,
  MenuOptionGroup,
  MenuItemOption,
  Tooltip,
} from '@chakra-ui/react';
import { useLocation } from 'wouter';
import { GraphNode } from './GraphNode';
import GraphEdge from './GraphEdge';
import { GraphGroup } from './GraphGroup';
import { ChevronUpIcon, InfoIcon } from '@chakra-ui/icons';
import {
  buildNodesAndEdges,
  selectDownstream,
  selectStateChanged,
  selectStateModified,
  selectUnion,
  selectUpstream,
} from './util';
import { useTrackOnMount } from '../../hooks/useTrackOnMount';
import { CR_TYPE_LABEL, EVENTS, SR_TYPE_LABEL } from '../../utils/trackEvents';
import { useHashParams } from '../../hooks';
import { CopyGraphUrlButton } from './CopyGraphUrlButton';

const nodeTypes = {
  customNode: GraphNode,
  customGroup: GraphGroup,
};
const edgeTypes = {
  customEdge: GraphEdge,
};

const statName = {
  '': 'No Stat',
  execution_time: 'Execution Time',
  row_count: 'Row Count',
};

const changeStatusName = {
  all: 'All nodes',
  impacted: 'Impacted',
  'impacted+': 'Impacted+',
};

function LineageGraphWrapped({ singleOnly }: Comparable) {
  const reactflow = useReactFlow();
  const { lineageGraph = {} } = useReportStore.getState();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [, setLocation] = useLocation();
  const hashParams = useHashParams();

  const [selected, setSelected] = useState<string | undefined>();

  const [expandLeft, setExpandLeft] = useState<string[]>([]);
  const [expandRight, setExpandRight] = useState<string[]>([]);

  const [stat, setStat] = useState<string>(hashParams.get('g_s') || '');
  const [changeInclude, setChangeInclude] = useState<string>('impacted+');
  const [changeSelect, setChangeSelect] = useState<string>('impacted');

  const {
    isOpen: isStatOpen,
    onOpen: onStatOpen,
    onClose: onStatClose,
  } = useDisclosure();

  const {
    isOpen: isChangeStatusOpen,
    onOpen: onChangeStatusOpen,
    onClose: onChangeStatusClose,
  } = useDisclosure();

  // Context Menu
  const {
    isOpen: isContextMenuOpen,
    onOpen: onContextMenuOpen,
    onClose: onContextMenuClose,
  } = useDisclosure();
  const [position, setPosition] = useState<[number, number]>([0, 0]);
  const [contextNodeId, setContextNodeId] = useState<string | undefined>();

  useTrackOnMount({
    eventName: EVENTS.PAGE_VIEW,
    eventProperties: {
      type: singleOnly ? SR_TYPE_LABEL : CR_TYPE_LABEL,
      page: 'lineage-graph',
    },
  });

  const paramStat = hashParams.get('g_s');
  const paramChangeInclude = hashParams.get('g_ci');

  useEffect(() => {
    if (paramStat) {
      setStat(paramStat);
    }
  }, [paramStat]);

  useEffect(() => {
    if (paramChangeInclude) {
      setChangeInclude(paramChangeInclude);
    }
  }, [paramChangeInclude]);

  const copyParams = new URLSearchParams();
  copyParams.append('g_v', '1');
  copyParams.append('g_s', stat);
  if (!singleOnly) {
    copyParams.append('g_ci', changeInclude);
  }

  const onResetClick = () => {
    setSelected(undefined);
    setChangeInclude('impacted+');
    setChangeSelect('impacted');
    setExpandLeft([]);
    setExpandRight([]);
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
  }, [lineageGraph]);

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
    [lineageGraph, singleOnly, stat, setNodes, setEdges, reactflow],
  );

  useEffect(() => {
    // nodes
    let includeSet: Set<string> = defaultNodeSets.all;
    let selectSet: Set<string> = defaultNodeSets.all;

    if (selected) {
      includeSet = new Set<string>();
      if (selected) {
        includeSet = selectUnion(
          selectDownstream(lineageGraph, [selected]),
          selectUpstream(lineageGraph, [selected]),
        );
      }
    } else if (!singleOnly) {
      if (changeInclude === 'impacted') {
        includeSet = defaultNodeSets.impacted;
      } else if (changeInclude === 'impacted+') {
        includeSet = defaultNodeSets.impactedPlus;
      }

      if (changeSelect === 'impacted') {
        selectSet = defaultNodeSets.impacted;
      } else if (changeSelect === 'changed') {
        selectSet = defaultNodeSets.changed;
      }
    }

    includeSet = selectUnion(
      includeSet,
      selectUpstream(lineageGraph, expandLeft, 1),
      selectDownstream(lineageGraph, expandRight, 1),
    );

    rebuild(includeSet, selectSet);
  }, [
    lineageGraph,
    changeInclude,
    changeSelect,
    stat,
    selected,
    expandLeft,
    expandRight,
    defaultNodeSets,
    singleOnly,
    rebuild,
  ]);

  function highlightPath(node: Node) {
    onContextMenuClose();

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
            onStatClose();
            onChangeStatusClose();
            onContextMenuClose();
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
            onContextMenuOpen();
          }}
          minZoom={0.1}
          fitView
        >
          <Controls showInteractive={false} />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
          <Panel position="top-right">
            <CopyGraphUrlButton params={copyParams} />
          </Panel>
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
        <Box p={2} flex="0 1 160px" fontSize="14px">
          <Text color="gray" mb="2px">
            Stat
          </Text>
          <Menu closeOnSelect={false} isOpen={isStatOpen} onClose={onStatClose}>
            <MenuButton as={Box} onClick={onStatOpen}>
              <Flex alignItems="center" fontSize="sm" gap={2}>
                {statName[stat] || '(unknown)'}
                <ChevronUpIcon />
              </Flex>
            </MenuButton>
            <MenuList>
              <MenuOptionGroup
                value={stat}
                onChange={(value) => {
                  setStat(value as string);
                }}
              >
                <MenuItemOption value="" fontSize="sm">
                  {statName['']}
                </MenuItemOption>
                <MenuItemOption value="execution_time" fontSize="sm">
                  {statName['execution_time']}
                </MenuItemOption>
                <MenuItemOption value="row_count" fontSize="sm">
                  {statName['row_count']}
                </MenuItemOption>
              </MenuOptionGroup>
            </MenuList>
          </Menu>
        </Box>
        {!singleOnly && (
          <Box p={2} flex="0 1 160px" fontSize="14px">
            <Text color="gray" mb="2px">
              Change Status
            </Text>
            <Menu
              closeOnSelect={false}
              isOpen={isChangeStatusOpen}
              onClose={onChangeStatusClose}
            >
              <MenuButton as={Box} onClick={onChangeStatusOpen}>
                <Flex gap={2} alignItems="center" fontSize="sm">
                  {changeStatusName[changeInclude] || '(unknown)'}
                  <ChevronUpIcon />
                </Flex>
              </MenuButton>
              <MenuList>
                <MenuOptionGroup
                  title="Include"
                  value={changeInclude}
                  onChange={(value) => {
                    setChangeInclude(value as string);
                    setSelected(undefined);
                    setExpandLeft([]);
                    setExpandRight([]);
                  }}
                >
                  <MenuItemOption value="impacted" fontSize="sm">
                    Impacted
                  </MenuItemOption>
                  <MenuItemOption value="impacted+" fontSize="sm">
                    Impacted+{' '}
                    <Tooltip label="Impacted and 1st degree parents">
                      <InfoIcon />
                    </Tooltip>
                  </MenuItemOption>
                  <MenuItemOption value="all" fontSize="sm">
                    All nodes
                  </MenuItemOption>
                </MenuOptionGroup>
                <MenuOptionGroup
                  title="Select"
                  value={changeSelect}
                  onChange={(value) => {
                    setChangeSelect(value as string);
                  }}
                >
                  <MenuItemOption fontSize="sm" value="changed">
                    Changed
                  </MenuItemOption>
                  <MenuItemOption fontSize="sm" value="impacted">
                    Impacted
                  </MenuItemOption>
                  <MenuItemOption fontSize="sm" value="all">
                    All nodes
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
        <Menu
          isOpen={isContextMenuOpen && contextNodeId !== undefined}
          onClose={onContextMenuClose}
          size="sm"
        >
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
                  setExpandLeft([]);
                  setExpandRight([]);
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
                Expand Left
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
            {/* <MenuItem>Export PNG</MenuItem> */}
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
