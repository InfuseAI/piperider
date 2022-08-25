import { Flex, Center, Text, Icon } from '@chakra-ui/react';
import { FiGrid } from 'react-icons/fi';

export function SRTableListColumnLabel({
  name,
  visibleIcon = true,
  icon = FiGrid,
}: {
  visibleIcon?: boolean;
  name: string;
  icon?: any;
}) {
  return (
    <Flex borderRadius="md" bgColor="gray.100" py={0.5} px={1}>
      <Center>
        {visibleIcon && <Icon as={icon} color="piperider.500" mr={1} />}
        <Text as="span" fontSize="sm" color="gray.600">
          {name}
        </Text>
      </Center>
    </Flex>
  );
}
