import { Box, Flex, Icon, Text, VStack } from '@chakra-ui/react';
import { VscDiffAdded, VscDiffModified, VscDiffRemoved } from 'react-icons/vsc';
import { Handle, Node, Position } from 'reactflow';
import { useLocation } from 'wouter';
import { LineageGraphItem } from '../../utils/dbt';
import { TriangleDownIcon, TriangleUpIcon } from '@chakra-ui/icons';

export function GraphNode(params) {
  const node = params as Node;
  const data = node.data as LineageGraphItem;
  const singleOnly = (data as any).singleOnly;
  const onClick = (data as any).onClick;

  const [location] = useLocation();
  const isActive = data.path === location;
  const isHighlighted: boolean = (data as any).isHighlighted || false;

  let style: any = {
    width: '300px',
  };
  let resourceType = node?.data?.type;

  if (resourceType === 'source' || resourceType === 'seed') {
    style = {
      ...style,
      'background-color': 'rgb(214 255 188)',
      'border-color': '#5fb825',
    };
  } else if (resourceType === 'exposure' || resourceType === 'analysis') {
    style = {
      ...style,
      'background-color': '#f6e3ff',
      'border-color': '#ad94bb',
    };
  } else if (resourceType === 'metric') {
    style = {
      ...style,
      'background-color': 'rgb(255 230 238)',
      'border-color': '#ff5688',
    };
  } else {
    style = {
      ...style,
      'background-color': '#eee',
      'border-color': '#aaa',
    };
  }

  if (isActive) {
    style = {
      ...style,
      'border-width': 3,
    };
  }

  let iconChangeStatus;
  let changeStatus = data.changeStatus;
  if (!singleOnly) {
    if (changeStatus === 'added') {
      iconChangeStatus = VscDiffAdded;
      // style = {
      //   ...style,
      //   'border-color': '#080',
      //   color: '#080',
      // };
    } else if (changeStatus === 'changed') {
      iconChangeStatus = VscDiffModified;
      // style = {
      //   ...style,
      //   'border-color': '#00f',
      //   color: '#00f',
      // };
    } else if (changeStatus === 'removed') {
      iconChangeStatus = VscDiffRemoved;
      style = {
        ...style,
        'border-style': 'dashed',
        color: 'gray',
      };
    }
  }

  if (isHighlighted) {
    style = {
      ...style,
      'border-color': 'darkorange',
    };
  }

  const name = node?.data?.name;
  const statValue = singleOnly
    ? data?.stat?.target || 0
    : data?.stat?.base || 0;
  const statChange =
    data?.stat?.target !== undefined && data?.stat?.base !== undefined
      ? data?.stat?.target - data?.stat?.base
      : undefined;

  return (
    <Flex
      className="react-flow__node-default"
      // style={{ backgroundColor }}
      style={style}
      _hover={{ bg: 'gray.100' }}
      alignItems="center"
      px={5}
      onClick={() => {
        onClick(node?.data);
      }}
    >
      <Handle type="target" position={Position.Left} />
      {!singleOnly && changeStatus && <Icon as={iconChangeStatus} mr={1} />}
      <Box width="100%" textAlign="left" flex="1">
        {/* <Link href={node?.data?.path}>{name}</Link> */}
        {name}
      </Box>

      {data?.stat && (
        <VStack flex="0 1 60px" alignItems="flex-end" spacing={0}>
          <Text fontWeight="bold" textAlign="right">
            {statValue}
          </Text>
          {statChange !== undefined && (
            <Box textAlign="right" color={statChange < 0 ? 'red' : 'green'}>
              {statChange < 0 ? <TriangleDownIcon /> : <TriangleUpIcon />}
              {statChange}%
            </Box>
          )}
        </VStack>
      )}

      <Handle type="source" position={Position.Right} />
    </Flex>
  );
}
