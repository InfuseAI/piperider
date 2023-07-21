import { Box, Flex, Icon, VStack, Text, Tooltip } from '@chakra-ui/react';

import { Handle, NodeProps, Position, useStore } from 'reactflow';
import { LineageGraphNode } from '../../utils/dbt';
import { CSSProperties } from 'react';
import { COLOR_HIGHLIGHT, COLOR_NOPROFILED, COLOR_UNCHANGED } from './style';
import { getIconForChangeStatus, getIconForResourceType } from '../Icons';
import { dbtNodeStatDiff, StatDiff } from '../Widgets/StatDiff';

interface GraphNodeProps extends NodeProps {
  data: LineageGraphNode;
}

export function GraphNode({ selected, data }: GraphNodeProps) {
  const { singleOnly, stat, isSelected, isHighlighted } = data;
  const showContent = useStore((s) => s.transform[2] > 0.3);

  // const [location] = useLocation();
  // const isActive = data.path === location;
  const isActive = false;

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
  let zoomOutColor = isSelected ? 'gray.300' : 'gray.200';
  if (!singleOnly) {
    iconChangeStatus = getIconForChangeStatus(changeStatus).icon;
    color = getIconForChangeStatus(changeStatus).color;
    zoomOutColor = changeStatus ? color : zoomOutColor;
    if (changeStatus === 'added') {
      msgChangeStatus = 'added';
      borderStyle = 'dashed';
    } else if (changeStatus === 'modified') {
      msgChangeStatus = 'modified';
    } else if (changeStatus === 'implicit') {
      msgChangeStatus = 'implicit';
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

  if (!isSelected) {
    borderWidth = 1;
    borderColor = 'gray.200';
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
    <Tooltip
      label={resourceType === 'model' ? name : `${name} (${resourceType})`}
      placement="top"
    >
      <Flex
        width="300px"
        _hover={{ backgroundColor: 'gray.100' }}
        borderColor={borderColor}
        borderWidth={borderWidth}
        borderStyle={borderStyle}
        backgroundColor={showContent ? backgroundColor : zoomOutColor}
        borderRadius={3}
        boxShadow={boxShadow}
        padding={0}
      >
        <Flex
          backgroundColor={isSelected ? resourceColor : 'gray.100'}
          padding={2}
          borderRightWidth={borderWidth}
          borderColor={borderColor}
          borderStyle={borderStyle}
          alignItems="top"
          visibility={showContent ? 'inherit' : 'hidden'}
        >
          <Icon as={resourceIcon} />
        </Flex>

        <VStack flex="1 0 auto" mx="1" width="100px">
          <Flex
            width="100%"
            textAlign="left"
            flex="1"
            fontWeight={fontWeight}
            p={1}
            alignItems="center"
            visibility={showContent ? 'inherit' : 'hidden'}
          >
            <Box
              flex="1"
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
              color={isSelected ? 'inherit' : 'gray.400'}
            >
              {name}
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
          </Flex>

          {stat && statValue !== undefined && (
            <Box width="100%" visibility={showContent ? 'inherit' : 'hidden'}>
              <Text
                textAlign="right"
                fontSize="sm"
                color={isActive ? 'white' : 'inherit'}
              >
                {singleOnly ? (
                  <>{statValueF}</>
                ) : (
                  <StatDiff
                    base={data?.base}
                    target={data?.target}
                    stat={stat as any}
                    isActive={isActive}
                  />
                )}
              </Text>
            </Box>
          )}
        </VStack>

        {Object.keys(data?.dependsOn ?? {}).length > 0 && (
          <Handle
            type="target"
            position={Position.Left}
            isConnectable={false}
          />
        )}
        {Object.keys(data?.children ?? {}).length > 0 && (
          <Handle
            type="source"
            position={Position.Right}
            isConnectable={false}
          />
        )}
      </Flex>
    </Tooltip>
  );
}
