import {
  Button,
  Flex,
  Text,
  Icon,
  ButtonGroup,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiDatabase,
  FiCreditCard,
  FiBookOpen,
  FiAlertCircle,
} from 'react-icons/fi';

export type TableActionBarView = 'schema' | 'summary';

type Props = {
  currentView: 'schema' | 'summary';
  toggleView: (view: TableActionBarView) => void;
  sourceName: string;
  sourceType: string;
};

export function TableActionBar({
  currentView,
  toggleView,
  sourceName,
  sourceType,
}: Props) {
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
        <Icon as={FiDatabase} boxSize={4} />
        <Text fontSize="large">{sourceName}</Text>
        <Tooltip
          label={sourceType}
          prefix=""
          placement="right-end"
          shouldWrapChildren
        >
          <Icon as={FiAlertCircle} />
        </Tooltip>
      </Flex>

      <ButtonGroup
        size="sm"
        isAttached
        variant="outline"
        data-attached={currentView}
      >
        <Button
          data-cy="schema-view"
          bgColor={currentView === 'schema' ? 'gray.200' : 'inherit'}
          onClick={() => toggleView('schema')}
          _active={{ bgColor: 'gray.50' }}
        >
          <Icon as={FiCreditCard} mr={1} boxSize={4} /> Schema
        </Button>
        <Button
          data-cy="summary-view"
          bgColor={currentView === 'summary' ? 'gray.200' : 'inherit'}
          onClick={() => toggleView('summary')}
          _active={{ bgColor: 'gray.50' }}
        >
          <Icon as={FiBookOpen} mr={1} boxSize={4} /> Summary
        </Button>
      </ButtonGroup>
    </Flex>
  );
}
