import { Flex, Text, Icon, Tooltip } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { FiDatabase, FiAlertCircle } from 'react-icons/fi';

type Props = {
  sourceName: string;
  sourceType: string;
  children?: ReactNode;
};

export function TableActionBar({ sourceName, sourceType, children }: Props) {
  return (
    <Flex
      alignSelf="flex-start"
      justifyContent="space-between"
      width="100%"
      p={4}
      borderBottom="1px solid"
      borderBottomColor="gray.300"
    >
      <Flex gap={1} alignItems="center">
        <Icon as={FiDatabase} mr={2} />
        <Text fontSize="large">{sourceName}</Text>
        <Tooltip
          label={sourceType}
          prefix=""
          placement="right-end"
          shouldWrapChildren
        >
          <Flex alignItems={'center'}>
            <Icon as={FiAlertCircle} />
          </Flex>
        </Tooltip>
        {children}
      </Flex>
    </Flex>
  );
}
