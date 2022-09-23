import { Flex, Text, Icon, ColorProps } from '@chakra-ui/react';
import { FiGrid } from 'react-icons/fi';

interface Props {
  name?: string;
  icon: any;
  iconColor?: ColorProps['color'];
}
export function ColumnBadge({
  name,
  icon = FiGrid,
  iconColor = 'piperider.500',
}: Props) {
  return (
    <Flex
      borderRadius="md"
      bgColor="gray.100"
      py={0.5}
      px={1}
      alignItems="center"
    >
      <Icon as={icon} color={iconColor} mr={1} />
      <Text as="span" fontSize="sm" color="gray.600" width="max-content">
        {name}
      </Text>
    </Flex>
  );
}
