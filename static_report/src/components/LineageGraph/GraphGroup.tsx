import { Flex } from '@chakra-ui/react';
import { NodeProps } from 'reactflow';
import { COLOR_GROUP } from './style';

interface GraphGroupProps extends NodeProps {
  data: any;
}

export function GraphGroup({ data }: GraphGroupProps) {
  return (
    <>
      <Flex
        style={{
          height: '100%',
          position: 'relative',
          backgroundColor: COLOR_GROUP,
          borderRadius: '5px',
        }}
      >
        <label
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            textAlign: 'right',
            margin: '5px',
          }}
        >
          {data.label}
        </label>
      </Flex>
    </>
  );
}
