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

export interface TableAccordionWrapperProps extends AccordionButtonProps {
  isExpanded: boolean;
  children: ReactNode;
}

export function TableAccordionWrapper({
  isExpanded,
  children,
  ...props
}: TableAccordionWrapperProps) {
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

export type TableItemNameProps = {
  name: string;
  description?: string;
  descriptionIconVisible: boolean;
};

export function TableItemName({
  name,
  description,
  descriptionIconVisible,
}: TableItemNameProps) {
  return (
    <Flex alignItems="center" justifyContent="flex-start" width={'10em'}>
      <Icon as={FiGrid} color="piperider.500" />
      <Tooltip label={name} placement={'top'}>
        <Text noOfLines={1} mr={1}>
          {name}
        </Text>
      </Tooltip>

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
