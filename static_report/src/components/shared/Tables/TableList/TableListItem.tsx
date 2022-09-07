import { ReactNode } from 'react';
import {
  AccordionButton,
  AccordionButtonProps,
  Flex,
  Icon,
  Tooltip,
  Text,
} from '@chakra-ui/react';
import { FiAlertCircle, FiGrid } from 'react-icons/fi';

interface TableListItemProps extends AccordionButtonProps {
  isExpanded: boolean;
  children: ReactNode;
}

export function TableListItem({
  isExpanded,
  children,
  ...props
}: TableListItemProps) {
  return (
    <AccordionButton bgColor="white" borderRadius="md" {...props}>
      <Flex
        direction="column"
        gap={4}
        py="10px"
        maxH={isExpanded ? '135px' : '90px'}
      >
        {children}
      </Flex>
    </AccordionButton>
  );
}

export function TableItemName({
  name,
  description,
  descriptionIconVisible,
}: {
  name: string;
  description?: string;
  descriptionIconVisible: boolean;
}) {
  return (
    <Flex alignItems="center" justifyContent="center">
      <Icon as={FiGrid} color="piperider.500" />
      <Text mx={1}>{name}</Text>

      {!descriptionIconVisible && (
        <Tooltip label={description} placement="right-end" shouldWrapChildren>
          <Icon as={FiAlertCircle} ml={1} />
        </Tooltip>
      )}
    </Flex>
  );
}

export function TableItemDescription({ description }: { description: string }) {
  return (
    <Text color="gray.500" noOfLines={3} textAlign="left">
      <Text as="span">Description</Text>{' '}
      <Text as="span" ml={4} title={description}>
        {description}
      </Text>
    </Text>
  );
}
