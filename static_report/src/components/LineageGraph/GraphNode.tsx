import { Box, Flex, Icon, VStack, Text, Tooltip } from '@chakra-ui/react';

import { Handle, NodeProps, Position } from 'reactflow';
import { useLocation } from 'wouter';
import { LineageGraphNode } from '../../utils/dbt';
import { CSSProperties } from 'react';
import { COLOR_HIGHLIGHT, COLOR_NOPROFILED, COLOR_UNCHANGED } from './style';
import { getIconForChangeStatus, getIconForResourceType } from '../Icons';
import { dbtNodeStatDiff, StatDiff } from '../Widgets/StatDiff';

interface GraphNodeProps extends NodeProps {
  data: LineageGraphNode;
}

export function GraphNode({ data }: GraphNodeProps) {
  const { singleOnly, stat, isHighlighted } = data;

  const [location] = useLocation();
  const isActive = data.path === location;

  let resourceType = data?.type;
  let isNoProfile = false;

  const { color: resourceColor, icon: resourceIcon } =
    getIconForResourceType(resourceType);
  if (
    resourceType === 'source' ||
    resourceType === 'seed' ||
    resourceType === 'model'
  ) {
    isNoProfile = (data.target ?? data.base)?.__table?.row_count === undefined;
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
      borderStyle = 'dashed';
    } else if (changeStatus === 'modified') {
      msgChangeStatus = 'explict change';
    } else if (changeStatus === 'implicit') {
      msgChangeStatus = 'implicit change';
    } else if (changeStatus === 'removed') {
      msgChangeStatus = 'removed';
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
  const { statValue, statValueF } = dbtNodeStatDiff({
    base: data?.base,
    target: data?.target,
    stat: stat as any,
  });
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
              <Text
                textAlign="right"
                fontSize="sm"
                color={isActive ? 'white' : 'inherit'}
              >
                <StatDiff
                  base={data?.base}
                  target={data?.target}
                  stat={stat as any}
                  isActive={isActive}
                />
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
