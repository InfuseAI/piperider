import { Flex, Text, Icon } from '@chakra-ui/react';
import { FiGrid } from 'react-icons/fi';

export function SRTableListColumnLabel({
  name,
  icon = FiGrid,
}: {
  name: string;
  icon?: any;
}) {
  return (
    <Flex
      borderRadius="md"
      bgColor="gray.100"
      py={0.5}
      px={1}
      alignItems="center"
    >
      <Icon as={icon} color="piperider.500" mr={1} />
      <Text as="span" fontSize="sm" color="gray.600" width="max-content">
        {name}
      </Text>
    </Flex>
  );
}
