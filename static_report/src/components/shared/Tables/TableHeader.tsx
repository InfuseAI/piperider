import { Heading, Flex, Icon, Box, Text, BoxProps } from '@chakra-ui/react';
import { FiGrid } from 'react-icons/fi';
import { NO_VALUE } from '../Columns';
interface Props {
  tableName?: string;
}
export function TableHeader({ tableName, ...props }: Props & BoxProps) {
  return (
    <Box {...props}>
      <Text color="gray.500">Table</Text>
      <Heading fontSize={24}>
        <Flex alignItems="center">
          <Icon as={FiGrid} mr={2} color={'piperider.500'} />
          {tableName || NO_VALUE}
        </Flex>
      </Heading>
    </Box>
  );
}
