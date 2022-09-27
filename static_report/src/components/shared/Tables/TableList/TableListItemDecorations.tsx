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
};

export function TableItemName({ name, description }: TableItemNameProps) {
  return (
    <Flex alignItems="center" justifyContent="flex-start" width={'10em'}>
      <Icon as={FiGrid} color="piperider.500" />
      <Tooltip label={name} placement={'top'}>
        <Text noOfLines={1} mx={1}>
          {name}
        </Text>
      </Tooltip>

      <Tooltip label={description} placement="right-end" shouldWrapChildren>
        <Flex alignItems={'center'}>
          <Icon as={FiAlertCircle} ml={1} />
        </Flex>
      </Tooltip>
    </Flex>
  );
}
