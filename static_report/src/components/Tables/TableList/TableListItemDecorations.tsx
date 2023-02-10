import { ReactNode, SyntheticEvent } from 'react';
import { Flex, Icon, Tooltip, Text } from '@chakra-ui/react';
import { FiAlertCircle, FiGrid } from 'react-icons/fi';
import { tableListWidth } from '../../../utils/layout';
import { BsChevronRight } from 'react-icons/bs';
export interface TableWrapperProps {
  children: ReactNode;
}

export function TableWrapper({ children }: TableWrapperProps) {
  return (
    <Flex
      gap={4}
      alignItems={'center'}
      p={'12px'}
      bgColor="white"
      borderRadius="md"
      _hover={{ bgColor: 'gray.100' }}
      justify={'space-between'}
      maxWidth={tableListWidth}
    >
      {children}
      <Icon
        data-cy="navigate-report-detail"
        as={BsChevronRight}
        color="piperider.500"
      />
    </Flex>
  );
}

export type TableItemNameProps = {
  name: string;
  description?: string;
  onInfoClick: (event: SyntheticEvent) => void;
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
          onClick={(e) => props.onInfoClick(e)}
        />
      </Flex>
    </Flex>
  );
}
