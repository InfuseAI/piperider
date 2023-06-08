import { Box, Flex, Icon, VStack, Text } from '@chakra-ui/react';
import { VscDiffAdded, VscDiffModified, VscDiffRemoved } from 'react-icons/vsc';

import { RxDotFilled } from 'react-icons/rx';

import { Handle, NodeProps, Position } from 'reactflow';
import { useLocation } from 'wouter';
import { LineageGraphNode } from '../../utils/dbt';
import { FiGrid } from 'react-icons/fi';
import { CSSProperties } from 'react';
import {
  COLOR_ADDED,
  COLOR_CHANGED,
  COLOR_HIGHLIGHT,
  COLOR_NOPROFILED,
  COLOR_REMOVED,
  COLOR_UNCHANGED,
} from './style';
import { getStatDiff } from './util';
import { TriangleDownIcon, TriangleUpIcon } from '@chakra-ui/icons';
import { FaChartBar } from 'react-icons/fa';

interface GraphNodeProps extends NodeProps {
  data: LineageGraphNode;
}

export function GraphNode({ data }: GraphNodeProps) {
  const { singleOnly, stat } = data;

  const [location] = useLocation();
  const isActive = data.path === location;
  const isHighlighted: boolean = (data as any).isHighlighted || false;

  let resourceType = data?.type;
  let isNoProfile = false;

  // resource background color
  let resourceColor: CSSProperties['color'] = 'inherit';
  let resourceIcon = FiGrid;
  if (
    resourceType === 'source' ||
    resourceType === 'seed' ||
    resourceType === 'model'
  ) {
    resourceColor = '#c0eafd';
    isNoProfile = (data.target ?? data.base)?.__table?.row_count === undefined;
  } else if (
    resourceType === 'metric' ||
    resourceType === 'exposure' ||
    resourceType === 'analysis'
  ) {
    resourceColor = 'rgb(255 230 238)';
    resourceIcon = FaChartBar;
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
    } else if (changeStatus === 'implicit') {
      iconChangeStatus = RxDotFilled;
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
    } else if (isNoProfile) {
      color = COLOR_NOPROFILED;
    } else {
      color = COLOR_UNCHANGED;
    }
  }

  // border width and color
  let borderWidth = 1;
  let borderColor = color;
  let backgroundColor = 'white';
  let boxShadow = 'unset';

  if (isActive) {
    borderWidth = 1;
    borderColor = COLOR_HIGHLIGHT;
    backgroundColor = 'piperider.400';
    color = 'white';
  }
  if (isHighlighted) {
    borderWidth = 1;
    borderColor = COLOR_HIGHLIGHT;
    boxShadow = '0px 5px 15px #00000040';
  }

  const name = data?.name;

  let statResult: ReturnType<typeof getStatDiff> = {};
  if (stat === 'execution_time') {
    statResult = getStatDiff(
      data?.base?.__runResult,
      data?.target?.__runResult,
      'execution_time',
      'duration',
    );
  } else if (stat === 'row_count') {
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
        _hover={{ backgroundColor: isActive ? backgroundColor : 'gray.100' }}
        borderColor={borderColor}
        borderWidth={borderWidth}
        borderStyle={borderStyle}
        backgroundColor={backgroundColor}
        borderRadius={3}
        boxShadow={boxShadow}
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
          <Icon as={resourceIcon} />
        </Flex>

        <VStack flex="1" mx="1" color={color}>
          <Flex
            width="100%"
            textAlign="left"
            flex="1"
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
                  <Text
                    as="span"
                    color={
                      statDiff < 0
                        ? isActive
                          ? 'white'
                          : 'red.500'
                        : isActive
                        ? 'green.200'
                        : 'green.500'
                    }
                  >
                    {statDiff < 0 ? <TriangleDownIcon /> : <TriangleUpIcon />}
                    {statDiffF}
                  </Text>
                )}
              </Text>
            </Box>
          )}
        </VStack>

        {Object.keys(data?.dependsOn ?? {}).length > 0 && (
          <Handle type="target" position={Position.Left} />
        )}
        {Object.keys(data?.children ?? {}).length > 0 && (
          <Handle type="source" position={Position.Right} />
        )}
      </Flex>
    </>
  );
}
