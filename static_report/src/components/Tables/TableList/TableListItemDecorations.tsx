import { ReactNode } from 'react';
import { Flex, Icon, Tooltip, Text } from '@chakra-ui/react';
import { FiAlertCircle, FiGrid } from 'react-icons/fi';
import { tableListWidth } from '../../../utils/layout';
export interface TableWrapperProps {
  children: ReactNode;
}

export function TableWrapper({ children }: TableWrapperProps) {
  return (
    <Flex
      direction="column"
      gap={4}
      p={'12px'}
      bgColor="white"
      borderRadius="md"
      _hover={{ bgColor: 'gray.100' }}
    >
      {children}
    </Flex>
  );
}

export type TableItemNameProps = {
  name: string;
  description?: string;
  onInfoClick: () => void;
};

export function TableItemName({
  name,
  description,
  ...props
}: TableItemNameProps) {
  return (
    <Flex alignItems="center">
      <Icon as={FiGrid} color="piperider.500" />
      <Tooltip label={name} placement={'top'}>
        <Text
          maxW={tableListWidth / 2.75}
          textOverflow={'ellipsis'}
          as="span"
          textAlign={'start'}
          fontSize={'sm'}
          whiteSpace={'normal'}
          noOfLines={1}
          mx={1}
        >
          {name}
        </Text>
      </Tooltip>

      <Flex alignItems={'center'}>
        <Icon
          cursor="pointer"
          as={FiAlertCircle}
          ml={1}
          onClick={() => props.onInfoClick()}
        />
      </Flex>
    </Flex>
  );
}
