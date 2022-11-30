import { Flex, Text, Icon, Link, Box } from '@chakra-ui/react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

import {
  TableAccordionWrapper,
  TableItemName,
} from './TableListItemDecorations';
import { TableRowColDeltaSummary } from './TableRowColDeltaSummary';

import { TableListAssertionSummary } from './TableListAssertions';

import { Comparable, Selectable } from '../../../../types';
import {
  formatColumnValueWith,
  formatNumber,
} from '../../../../utils/formatters';
import { NoData } from '../../Layouts';
import { AssertionPassFailCountLabel } from '../../Assertions/AssertionPassFailCountLabel';
import { getAssertionStatusCountsFromList } from '../utils';
import { tableListMaxWidth } from '../../../../utils/layout';
import { ColumnSchemaDeltaSummary } from './ColumnSchemaDeltaSummary';
import { CompTableColEntryItem, ReportState } from '../../../../utils/store';
import { NO_DESCRIPTION_MSG } from '../../Layouts/constant';

interface Props extends Selectable, Comparable {
  isExpanded: boolean;
  combinedTableEntry?: CompTableColEntryItem;
  combinedAssertions?: ReportState['assertionsOnly'];
}

export function TableListItem({
  isExpanded,
  combinedAssertions,
  combinedTableEntry,
  onSelect,
  singleOnly,
}: Props) {
  const [tableName, tableValue, tableMetadata] = combinedTableEntry || [];
  const filteredBaseTableTests = combinedAssertions?.base?.filter(
    (v) => v?.table === tableName,
  );
  const filteredTargetTableTests = combinedAssertions?.target?.filter(
    (v) => v?.table === tableName,
  );
  const { failed: baseFailed, total: baseTotal } =
    getAssertionStatusCountsFromList(filteredBaseTableTests || []);
  const { failed: targetFailed, total: targetTotal } =
    getAssertionStatusCountsFromList(filteredTargetTableTests || []);

  const fallbackTable = tableValue?.base || tableValue?.target;

  const description = fallbackTable?.description || NO_DESCRIPTION_MSG;

  if (!combinedTableEntry) {
    return <NoData />;
  }
  return (
    <TableAccordionWrapper
      isExpanded={isExpanded}
      data-cy="table-list-accordion-btn"
    >
      <Box width={tableListMaxWidth} position={'relative'}>
        {/* 1st Row */}
        <Flex grow={1} mb={2}>
          <TableItemName name={tableName || ''} description={description} />
        </Flex>

        {/* 2nd Row */}
        <Flex gap={singleOnly ? 12 : 5} alignItems={'center'}>
          <Link
            data-cy="navigate-report-detail"
            onClick={(event) => {
              event.stopPropagation();
              onSelect({ tableName });
            }}
          >
            <Text
              py={1}
              px={2}
              borderRadius={'md'}
              bg={'blue.700'}
              color={'white'}
            >
              Table Details
            </Text>
          </Link>
          {singleOnly && (
            <Flex color="gray.500" maxWidth="650px" fontSize={'sm'}>
              <Text as="span" mr={2}>
                Columns:
              </Text>
              <Text>
                {formatColumnValueWith(fallbackTable?.col_count, formatNumber)}
              </Text>
            </Flex>
          )}
          {singleOnly && (
            <Flex color="gray.500" fontSize={'sm'}>
              <Text mr={2}>Rows:</Text>
              <Text>
                {formatColumnValueWith(fallbackTable?.row_count, formatNumber)}
              </Text>
            </Flex>
          )}
          {!singleOnly && (
            <Flex
              color={'gray.500'}
              fontSize={'sm'}
              alignItems={'center'}
              justifyContent={'space-evenly'}
              grow={1}
            >
              <Box>
                <Flex>
                  <Text as="span" mr={2}>
                    Rows:
                  </Text>
                  <TableRowColDeltaSummary
                    baseCount={tableValue?.base?.row_count}
                    targetCount={tableValue?.target?.row_count}
                  />
                </Flex>
                <Flex>
                  <Text as="span" mr={2}>
                    Columns:
                  </Text>
                  <ColumnSchemaDeltaSummary
                    added={tableMetadata?.added}
                    deleted={tableMetadata?.deleted}
                    changed={tableMetadata?.changed}
                  />
                </Flex>
              </Box>
              <Box>
                <TableListAssertionSummary
                  baseAssertionFailed={baseFailed}
                  baseAssertionTotal={baseTotal}
                  targetAssertionFailed={targetFailed}
                  targetAssertionTotal={targetTotal}
                />
              </Box>
            </Flex>
          )}
          {singleOnly && (
            <Flex>
              <AssertionPassFailCountLabel
                total={baseTotal}
                failed={baseFailed}
              />
            </Flex>
          )}
          <Icon
            position={'absolute'}
            right={0}
            ml={5}
            as={isExpanded ? FiChevronUp : FiChevronDown}
            color="piperider.500"
            boxSize={6}
          />
        </Flex>
      </Box>
    </TableAccordionWrapper>
  );
}
