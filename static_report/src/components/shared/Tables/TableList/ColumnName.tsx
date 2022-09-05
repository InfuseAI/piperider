import { Flex, Icon, Text } from '@chakra-ui/react';
import { FiCornerDownRight } from 'react-icons/fi';

export function ColumnName({ name, icon }: { name: string; icon: any }) {
  return (
    <Flex alignItems="center">
      <Icon as={FiCornerDownRight} color="gray.300" boxSize={5} />
      <Icon as={icon} color="piperider.500" mx={2} boxSize={5} />
      <Text noOfLines={1} mr={1}>
        {name}
      </Text>
    </Flex>
  );
}
