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

export type ToggleListView = 'schema' | 'summary';

type Props = {
  currentView: 'schema' | 'summary';
  toggleView: (view: ToggleListView) => void;
  sourceName: string;
  sourceType: string;
};

export function ToggleList({
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

      <ButtonGroup size="sm" isAttached variant="outline">
        <Button
          bgColor={currentView === 'schema' ? 'gray.200' : 'inherit'}
          onClick={() => toggleView('schema')}
        >
          <Icon as={FiCreditCard} mr={1} boxSize={4} /> Schema
        </Button>
        <Button
          bgColor={currentView === 'summary' ? 'gray.200' : 'inherit'}
          onClick={() => toggleView('summary')}
        >
          <Icon as={FiBookOpen} mr={1} boxSize={4} /> Summary
        </Button>
      </ButtonGroup>
    </Flex>
  );
}
