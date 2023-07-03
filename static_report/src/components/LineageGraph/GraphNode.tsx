import { Box, Flex, Icon, VStack, Text, Tooltip } from '@chakra-ui/react';
import { VscDiffAdded, VscDiffModified, VscDiffRemoved } from 'react-icons/vsc';

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
import { getIconForChangeStatus, IconImplicit } from '../Icons';

interface GraphNodeProps extends NodeProps {
  data: LineageGraphNode;
}

export function GraphNode({ data }: GraphNodeProps) {
  const { singleOnly, stat, isHighlighted } = data;

  const [location] = useLocation();
  const isActive = data.path === location;

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

  let msgChangeStatus;
  let changeStatus = data.changeStatus;
  let color = 'inherit';
  let iconChangeStatus;
  let fontWeight: CSSProperties['fontWeight'] = 'inherit';
  let borderStyle = 'solid';
  if (!singleOnly) {
    iconChangeStatus = getIconForChangeStatus(changeStatus).icon;
    color = getIconForChangeStatus(changeStatus).color;
    if (changeStatus === 'added') {
      msgChangeStatus = 'added';
      fontWeight = 600;
      borderStyle = 'dashed';
    } else if (changeStatus === 'modified') {
      msgChangeStatus = 'explict change';
      fontWeight = 600;
    } else if (changeStatus === 'implicit') {
      msgChangeStatus = 'implicit change';
      fontWeight = 600;
    } else if (changeStatus === 'removed') {
      msgChangeStatus = 'removed';
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
  let borderColor = 'black';
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
        <Tooltip label={resourceType}>
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
        </Tooltip>

        <VStack flex="1 0 auto" mx="1" width="100px">
          <Flex
            width="100%"
            textAlign="left"
            flex="1"
            fontWeight={fontWeight}
            p={1}
            alignItems="center"
          >
            <Box
              flex="1"
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
              color={isActive ? 'white' : 'inherit'}
            >
              <Tooltip label={name}>{name}</Tooltip>
            </Box>

            {!singleOnly && changeStatus && (
              <Tooltip label={msgChangeStatus}>
                <Flex>
                  <Icon
                    color={color}
                    as={iconChangeStatus}
                    fontWeight={fontWeight}
                    flex="0 0 20px"
                  />
                </Flex>
              </Tooltip>
            )}
            {singleOnly && stat && statValue !== undefined && (
              <Text fontWeight="bold" textAlign="right" fontSize="sm">
                {statValueF}
              </Text>
            )}
          </Flex>

          {!singleOnly && stat && statValue !== undefined && (
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
