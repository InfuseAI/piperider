import {
  Flex,
  Grid,
  Text,
  AccordionButton,
  GridItem,
  Center,
  Icon,
  Tooltip,
} from '@chakra-ui/react';
import { FiAlertCircle, FiChevronRight, FiGrid } from 'react-icons/fi';

import { CRTableListColumnsSummary } from './CRTableListColumnsSummary';
import { CRTableListRowsSummary } from './CRTableListRowsSummary';
import { SaferTableSchema } from '../../../../../types';
import { ReactNode } from 'react';

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
    <AccordionButton
      bgColor="white"
      borderRadius="md"
      data-cy="cr-table-overview-btn"
    >
      <Flex
        direction="column"
        gap={4}
        py="10px"
        maxH={isExpanded ? '135px' : '90px'}
      >
        <Grid
          templateColumns="218px 2fr 1.5fr 2.8rem"
          justifyItems="flex-start"
          width="calc(900px - 30px)"
        >
          <GridItem>
            <Center>
              <Icon as={FiGrid} color="piperider.500" />
              <Text mx={1}>{columnName}</Text>

              {!isExpanded && (
                <Tooltip
                  shouldWrapChildren
                  placement="right-end"
                  label={description}
                >
                  <Icon as={FiAlertCircle} ml={1} />
                </Tooltip>
              )}
            </Center>
          </GridItem>
          <GridItem>
            <Flex gap={10} color="gray.500">
              <Text>Rows</Text>
              <CRTableListRowsSummary
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
                bg={'red'}
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
              <Text color="gray.500" noOfLines={3} textAlign="left">
                <Text as="span">Description</Text>{' '}
                <Text as="span" ml={4} title={description}>
                  {description}
                </Text>
              </Text>
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
      </Flex>
    </AccordionButton>
  );
}
