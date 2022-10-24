import { Main } from '../components/shared/Layouts/Main';
import { TableActionBar } from '../components/shared/Tables/TableActionBar';

import { TableListItem } from '../components/shared/Tables/TableList/TableListItem';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { type ComparisonReportSchema } from '../types';
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  Flex,
  Grid,
  Text,
} from '@chakra-ui/react';
import { nanoid } from 'nanoid';
import { useLocation } from 'wouter';

import { tableListGridTempCols, tableListWidth } from '../utils/layout';
import { useReportStore } from '../utils/store';
import { TableColumnSchemaList } from '../components/shared/Tables/TableList/TableColumnSchemaList';
import { useAmplitudeOnMount } from '../hooks';
import { AMPLITUDE_EVENTS, CR_TYPE_LABEL } from '../utils/amplitudeEvents';

type Props = { data: ComparisonReportSchema };

export function CRTablesListPage({ data }: Props) {
  useDocumentTitle('Comparison Report: Tables');
  useAmplitudeOnMount({
    eventName: AMPLITUDE_EVENTS.PAGE_VIEW,
    eventProperties: {
      type: CR_TYPE_LABEL,
      page: 'table-list-page',
    },
  });
  const [, setLocation] = useLocation();
  const setReportData = useReportStore((s) => s.setReportRawData);
  setReportData({ base: data.base, input: data.input });
  const { tableColumnsOnly: tableColEntries = [], assertionsOnly } =
    useReportStore.getState();

  return (
    <Main isSingleReport={false}>
      <TableActionBar />

      <Flex direction="column" width={tableListWidth} minHeight="650px">
        <Grid templateColumns={tableListGridTempCols} px={4} my={6}>
          <Text>Name</Text>
          <Text>Summary</Text>
          <Text>Assertions</Text>
        </Grid>
        <Accordion allowToggle reduceMotion>
          {tableColEntries.map((tableColEntry) => {
            return (
              <Flex key={nanoid()}>
                <AccordionItem>
                  {({ isExpanded }) => (
                    <>
                      <TableListItem
                        combinedAssertions={assertionsOnly}
                        isExpanded={isExpanded}
                        combinedTableEntry={tableColEntry}
                        onSelect={() =>
                          setLocation(`/tables/${tableColEntry[0]}/columns/`)
                        }
                      />

                      {/* Accordion Children Types */}
                      <AccordionPanel bgColor="white">
                        {isExpanded && (
                          <TableColumnSchemaList
                            baseTableEntryDatum={tableColEntry[1].base}
                            targetTableEntryDatum={tableColEntry[1].target}
                            visibleDetail
                            onSelect={({ tableName, columnName }) =>
                              setLocation(
                                `/tables/${tableName}/columns/${columnName}`,
                              )
                            }
                          />
                        )}
                      </AccordionPanel>
                    </>
                  )}
                </AccordionItem>
              </Flex>
            );
          })}
        </Accordion>
      </Flex>
    </Main>
  );
}
