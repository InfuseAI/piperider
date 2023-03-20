import { AccordionButton, Flex, Icon, Text, Tooltip } from '@chakra-ui/react';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { useRoute } from 'wouter';
import { Comparable, ComparableData } from '../../../types';
import { borderVal, CompTableWithColEntryOverwrite } from '../../../utils';
import { TABLE_DETAILS_ROUTE_PATH } from '../../../utils/routes';

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
  isExpanded,
  onToggle,
}: TableItemAccordionButtonProps) {
  const tableName = (targetTable || baseTable)?.name;
  const [match, params] = useRoute(TABLE_DETAILS_ROUTE_PATH);
  const isActive =
    match && tableName === decodeURIComponent(params.tableName as string);

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
            <Tooltip label={tableName}>
              <Text
                noOfLines={1}
                fontWeight={isActive ? 'bold' : 'normal'}
                color={isActive ? 'white' : 'inherit'}
              >
                {tableName}
              </Text>
            </Tooltip>
            <Icon
              as={isExpanded ? FiChevronDown : FiChevronRight}
              onClick={(e) => {
                e.stopPropagation();
                onToggle({
                  shouldNavigate: false,
                });
              }}
              boxSize={5}
              border={borderVal}
              borderRadius={'lg'}
              color={isActive ? 'white' : 'inherit'}
              _hover={{ color: 'gray', bg: 'white' }}
            />
          </Flex>
        </Flex>
      </AccordionButton>
    </h2>
  );
}
