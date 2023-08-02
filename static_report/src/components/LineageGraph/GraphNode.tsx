import { Box, Flex, Icon, Text, Tooltip } from '@chakra-ui/react';

import { Handle, NodeProps, Position, useStore } from 'reactflow';
import { LineageGraphNode } from '../../utils/dbt';
import { COLOR_HIGHLIGHT } from './style';
import { getIconForChangeStatus, getIconForResourceType } from '../Icons';
import { dbtNodeStatDiff, StatDiff } from '../Widgets/StatDiff';
import { NODE_IMPACT_STATUS_MSGS } from '../../lib';

interface GraphNodeProps extends NodeProps {
  data: LineageGraphNode;
}

export function GraphNode({ selected, data }: GraphNodeProps) {
  const { singleOnly, stat, isSelected, isHighlighted } = data;
  const showContent = useStore((s) => s.transform[2] > 0.3);

  const isActive = false;

  let resourceType = data?.type;

  const { color: resourceColor, icon: resourceIcon } =
    getIconForResourceType(resourceType);

  // let isNoProfile = false;
  // if (
  //   resourceType === 'source' ||
  //   resourceType === 'seed' ||
  //   resourceType === 'model'
  // ) {
  //   isNoProfile = (data.target ?? data.base)?.__table?.row_count === undefined;
  // }

  // text color, icon
  let changeStatus = data.changeStatus;
  let impactStatus = data.impactStatus;
  let color = isSelected ? 'gray.400' : 'gray.200';
  let iconChangeStatus;

  let borderStyle = 'solid';
  if (singleOnly) {
    color = resourceColor;
  } else {
    iconChangeStatus = getIconForChangeStatus(changeStatus, impactStatus).icon;
    if (changeStatus || impactStatus === 'impacted') {
      color = getIconForChangeStatus(changeStatus, impactStatus).color;
    }

    if (changeStatus === 'added' || changeStatus === 'removed') {
      borderStyle = 'dashed';
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
  let { statValue, statValueF } = dbtNodeStatDiff({
    base: data?.base,
    target: data?.target,
    stat: stat as any,
  });

  let hasStat = false;
  if (stat === 'impact' && impactStatus) {
    hasStat = true;
    statValueF = NODE_IMPACT_STATUS_MSGS[impactStatus][0];
  } else if (stat && statValue !== undefined) {
    hasStat = true;
  }

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
        backgroundColor={showContent ? backgroundColor : color}
        borderRadius={3}
        boxShadow={boxShadow}
        padding={0}
      >
        <Flex
          backgroundColor={isSelected ? color : 'gray.100'}
          padding={2}
          borderRightWidth={borderWidth}
          borderColor={borderColor}
          borderStyle={borderStyle}
          alignItems="top"
          visibility={showContent ? 'inherit' : 'hidden'}
        >
          <Icon as={resourceIcon} />
        </Flex>

        <Flex flex="1 0 auto" mx="1" width="100px" direction="column">
          <Flex
            width="100%"
            textAlign="left"
            flex="1"
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

            {!singleOnly && iconChangeStatus && (
              <Flex>
                <Icon
                  color={isSelected ? color : 'gray.400'}
                  as={iconChangeStatus}
                  flex="0 0 20px"
                />
              </Flex>
            )}
          </Flex>

          {hasStat && (
            <Box
              width="100%"
              visibility={showContent ? 'inherit' : 'hidden'}
              mt={0}
            >
              <Text
                textAlign="right"
                fontSize="sm"
                color={isActive ? 'white' : 'inherit'}
              >
                {singleOnly ? (
                  <>{statValueF}</>
                ) : stat === 'impact' ? (
                  <>{statValueF}</>
                ) : (
                  <StatDiff
                    base={data?.base}
                    target={data?.target}
                    stat={stat as any}
                    isActive={isActive}
                    negativeChange={stat === 'execution_time'}
                  />
                )}
              </Text>
            </Box>
          )}
        </Flex>

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
