import {
  Flex,
  Grid,
  Text,
  GridItem,
  Icon,
  Link as ChakraLink,
} from '@chakra-ui/react';
import { FiChevronRight } from 'react-icons/fi';
import { ReactNode } from 'react';
import { Link } from 'wouter';

import {
  TableListItem,
  TableItemName,
  TableItemDescription,
} from '../TableListItem';
import { CRTableListColumnsSummary } from './CRTableListColumnsSummary';
import { CRTableListDeltaSummary } from './CRTableListDeltaSummary';
import { SaferTableSchema } from '../../../../../types';

interface Props {
  name: string;
  isExpanded: boolean;
  baseTableDatum?: SaferTableSchema;
  targetTableDatum?: SaferTableSchema;
  children: ReactNode; //e.g. CRTableListAssertions
}

export function CRTableListItem({
  isExpanded,
  name,
  baseTableDatum,
  targetTableDatum,
  children,
}: Props) {
  const columnName = baseTableDatum?.name || targetTableDatum?.name;
  const description =
    baseTableDatum?.description || targetTableDatum?.description;

  return (
    <TableListItem isExpanded={isExpanded} data-cy="cr-table-overview-btn">
      <Grid
        templateColumns="218px 2fr 1.5fr"
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
        <GridItem>
          <Flex gap={2}>
            {children}
            {isExpanded && (
              <ChakraLink
                as={Link}
                to={`/tables/${name}`}
                data-cy="cr-navigate-report-detail"
              >
                <a href={`/tables/${name}`}>
                  <Icon as={FiChevronRight} color="piperider.500" boxSize={6} />
                </a>
              </ChakraLink>
            )}
          </Flex>
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
