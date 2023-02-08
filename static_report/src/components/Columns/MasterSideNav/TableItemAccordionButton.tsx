import { AccordionButton, Flex, Icon, Text } from '@chakra-ui/react';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { Comparable, ComparableData } from '../../../types';
import { CompTableWithColEntryOverwrite } from '../../../utils';

/**
 * TableItem: Accordion UI parent
 */
interface TableItemAccordionButtonProps extends Comparable {
  compTableColItem: ComparableData<CompTableWithColEntryOverwrite>;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: (args: { tableName?: string; shouldNavigate?: boolean }) => void;
}
export function TableItemAccordionButton({
  compTableColItem: { base: baseTable, target: targetTable },
  isActive,
  isExpanded,
  onToggle,
}: TableItemAccordionButtonProps) {
  const tableName = (targetTable || baseTable)?.name;

  return (
    <h2>
      <AccordionButton
        bg={isActive ? 'piperider.400' : 'inherit'}
        _hover={{ bg: isActive ? 'piperider.500' : 'blackAlpha.50' }}
        onClick={(e) => {
          onToggle({
            tableName,
            shouldNavigate: true,
          });
        }}
      >
        <Flex w={'100%'} justify={'space-between'}>
          <Flex
            alignItems={'center'}
            justifyContent={'space-between'}
            gap={2}
            fontSize={'sm'}
            w={'100%'}
          >
            <Text
              noOfLines={1}
              fontWeight={isActive ? 'bold' : 'normal'}
              color={isActive ? 'white' : 'inherit'}
            >
              {tableName}
            </Text>
            <Icon
              as={isExpanded ? FiChevronDown : FiChevronRight}
              color={isActive ? 'white' : 'inherit'}
              onClick={(e) => {
                e.stopPropagation();
                onToggle({
                  shouldNavigate: false,
                });
              }}
            />
          </Flex>
        </Flex>
      </AccordionButton>
    </h2>
  );
}
