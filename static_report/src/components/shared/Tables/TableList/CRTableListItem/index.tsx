import { Flex, Grid, Text, GridItem, Icon } from '@chakra-ui/react';
import { FiChevronRight } from 'react-icons/fi';
import { ReactNode } from 'react';

import {
  TableListItem,
  TableItemName,
  TableItemDescription,
} from '../TableListItem';
import { CRTableListColumnsSummary } from './CRTableListColumnsSummary';
import { CRTableListDeltaSummary } from './CRTableListDeltaSummary';
import { SaferTableSchema } from '../../../../../types';

interface Props {
  isExpanded: boolean;
  baseTableDatum?: SaferTableSchema;
  targetTableDatum?: SaferTableSchema;
  onSelect: () => void;
  children: ReactNode; //e.g. CRTableListAssertions
}

export function CRTableListItem({
  isExpanded,
  baseTableDatum,
  targetTableDatum,
  onSelect,
  children,
}: Props) {
  const columnName = baseTableDatum?.name || targetTableDatum?.name;
  const description =
    baseTableDatum?.description || targetTableDatum?.description;

  return (
    <TableListItem isExpanded={isExpanded} data-cy="cr-table-overview-btn">
      <Grid
        templateColumns="218px 2fr 1.5fr 2.8rem"
        justifyItems="flex-start"
        width="calc(900px - 30px)"
      >
        <GridItem>
          <TableItemName
            name={columnName || ''}
            description={description}
            descriptionIconVisible={isExpanded}
          />
        </GridItem>
        <GridItem>
          <Flex gap={10} color="gray.500">
            <Text>Rows</Text>
            <CRTableListDeltaSummary
              baseCount={baseTableDatum?.row_count}
              targetCount={targetTableDatum?.row_count}
            />
          </Flex>
        </GridItem>
        <GridItem>{children}</GridItem>
        <GridItem>
          {isExpanded && (
            <Flex
              as="a"
              data-cy="cr-navigate-report-detail"
              onClick={() => onSelect()}
            >
              <Icon as={FiChevronRight} color="piperider.500" boxSize={6} />
            </Flex>
          )}
        </GridItem>
      </Grid>
      <Grid
        templateColumns="218px 1fr"
        justifyItems="flex-start"
        width="calc(900px - 30px)"
      >
        <GridItem>
          <Flex />
        </GridItem>
        <GridItem>
          {isExpanded ? (
            <TableItemDescription description={description || ''} />
          ) : (
            <Flex mr="30px" color="gray.500" maxWidth="650px" gap={1}>
              <Text as="span" mr={4}>
                Columns
              </Text>
              <CRTableListColumnsSummary
                baseCount={baseTableDatum?.col_count}
                targetCount={targetTableDatum?.col_count}
              />
            </Flex>
          )}
        </GridItem>
      </Grid>
    </TableListItem>
  );
}
