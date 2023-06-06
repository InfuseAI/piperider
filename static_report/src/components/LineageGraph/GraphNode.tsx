import { Box, Flex, Icon, VStack, Text } from '@chakra-ui/react';
import { VscDiffAdded, VscDiffModified, VscDiffRemoved } from 'react-icons/vsc';
import { Handle, NodeProps, Position } from 'reactflow';
import { useLocation } from 'wouter';
import { LineageGraphNode } from '../../utils/dbt';
import { FiGrid } from 'react-icons/fi';
import { CSSProperties, useState } from 'react';
import {
  COLOR_ADDED,
  COLOR_CHANGED,
  COLOR_HIGHLIGHT,
  COLOR_REMOVED,
  COLOR_UNCHANGED,
} from './style';
import { getStatDiff } from './util';
import { TriangleDownIcon, TriangleUpIcon } from '@chakra-ui/icons';

interface GraphNodeProps extends NodeProps {
  data: LineageGraphNode;
}

export function GraphNode({ data }: GraphNodeProps) {
  const [stat, setStat] = useState('row_count');
  const singleOnly = (data as any).singleOnly;

  const [location] = useLocation();
  const isActive = data.path === location;
  const isHighlighted: boolean = (data as any).isHighlighted || false;

  let resourceType = data?.type;

  // resource background color
  let resourceColor: CSSProperties['color'] = 'inherit';
  if (
    resourceType === 'source' ||
    resourceType === 'seed' ||
    resourceType === 'model'
  ) {
    resourceColor = '#c0eafd';
  } else if (resourceType === 'exposure' || resourceType === 'analysis') {
    resourceColor = '#f6e3ff';
  } else if (resourceType === 'metric') {
    resourceColor = 'rgb(255 230 238)';
  }

  // text color, icon
  let iconChangeStatus;
  let changeStatus = data.changeStatus;
  let color = 'inherit';
  let fontWeight: CSSProperties['fontWeight'] = 'inherit';
  let borderStyle = 'solid';
  if (!singleOnly) {
    if (changeStatus === 'added') {
      iconChangeStatus = VscDiffAdded;
      color = '#1a7f37';
      color = COLOR_ADDED;
      fontWeight = 600;
      borderStyle = 'dashed';
    } else if (changeStatus === 'changed') {
      iconChangeStatus = VscDiffModified;
      color = '#9a6700';
      color = COLOR_CHANGED;
      fontWeight = 600;
      borderStyle = 'dashed';
    } else if (changeStatus === 'removed') {
      iconChangeStatus = VscDiffRemoved;
      color = COLOR_REMOVED;
      color = '#cf222e';
      fontWeight = 600;
      borderStyle = 'dashed';
    } else {
      color = COLOR_UNCHANGED;
    }
  }

  // border width and color
  let borderWidth = 1;
  let borderColor = color;

  if (isActive || isHighlighted) {
    borderWidth = 1;
    borderColor = COLOR_HIGHLIGHT;
  }

  const name = data?.name;
  const fallback = data?.target || data?.base;

  let statResult: ReturnType<typeof getStatDiff> = {};
  if (stat === 'execution_time') {
    statResult = getStatDiff(
      data?.base?.__runResult,
      data?.target?.__runResult,
      'execution_time',
      'duration',
    );
  } else if (stat == 'row_count') {
    statResult = getStatDiff(
      data?.base?.__table,
      data?.target?.__table,
      'row_count',
      'decimal',
    );
  }

  const { statValue, statValueF, statDiff, statDiffF } = statResult;
  return (
    <>
      <Flex
        width="300px"
        _hover={{ bg: 'gray.100' }}
        borderColor={borderColor}
        borderWidth={borderWidth}
        borderStyle={borderStyle}
        backgroundColor="white"
        borderRadius={3}
        padding={0}
      >
        <Flex
          backgroundColor={resourceColor}
          padding={2}
          borderRightWidth={borderWidth}
          borderColor={borderColor}
          borderStyle={borderStyle}
          alignItems="top"
        >
          <Icon as={FiGrid} />
        </Flex>

        <VStack flex="1" mx="1">
          <Flex
            width="100%"
            textAlign="left"
            flex="1"
            color={color}
            fontWeight={fontWeight}
            ml={2}
            alignItems="center"
          >
            <Box flex="1">{name}</Box>
            {!singleOnly && changeStatus && (
              <Icon
                color={color}
                as={iconChangeStatus}
                fontWeight={fontWeight}
                flex="0 0 20px"
              />
            )}
          </Flex>

          {stat && statValue !== undefined && (
            <Box width="100%">
              <Text fontWeight="bold" textAlign="right" fontSize="sm">
                {statValueF}&nbsp;
                {statDiff !== undefined && (
                  <Text as="span" color={statDiff < 0 ? 'red' : 'green'}>
                    {statDiff < 0 ? <TriangleDownIcon /> : <TriangleUpIcon />}
                    {statDiffF}
                  </Text>
                )}
              </Text>
            </Box>
          )}
        </VStack>

        <Handle type="target" position={Position.Left} />
        <Handle type="source" position={Position.Right} />
      </Flex>
    </>
  );
}
