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

import { Main } from '../components/shared/Layouts/Main';
import { TableActionBar } from '../components/shared/Tables/TableActionBar';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

import { SaferSRSchema } from '../types';
import { TableListItem } from '../components/shared/Tables/TableList/TableListItem';
import { tableListGridTempCols, tableListWidth } from '../utils/layout';
import { useReportStore } from '../utils/store';
import { TableColumnSchemaList } from '../components/shared/Tables/TableList/TableColumnSchemaList';
import { useAmplitudeOnMount } from '../hooks/useAmplitudeOnMount';
import { AMPLITUDE_EVENTS, SR_TYPE_LABEL } from '../utils/amplitudeEvents';

type Props = { data: SaferSRSchema };

export function SRTablesListPage({ data }: Props) {
  const setReportData = useReportStore((s) => s.setReportRawData);
  setReportData({ base: data });
  const { tableColumnsOnly = [], assertionsOnly } = useReportStore.getState();

  const [, setLocation] = useLocation();

  useDocumentTitle('Single-Run Report: Tables');
  useAmplitudeOnMount({
    eventName: AMPLITUDE_EVENTS.PAGE_VIEW,
    eventProperties: {
      type: SR_TYPE_LABEL,
      page: 'table-list-page',
    },
  });

  return (
    <Main isSingleReport>
      <TableActionBar />

      <Flex direction="column" width={tableListWidth} minHeight="650px">
        <Grid templateColumns={tableListGridTempCols} px={4} my={6}>
          <Text>Name</Text>
          <Text>Summary</Text>
          <Text>Assertions</Text>
        </Grid>
        <Accordion allowToggle reduceMotion>
          {tableColumnsOnly.map((tableColsEntry) => {
            return (
              <Flex key={nanoid()}>
                <AccordionItem>
                  {({ isExpanded }) => (
                    <>
                      <TableListItem
                        combinedAssertions={assertionsOnly}
                        combinedTableEntry={tableColsEntry}
                        isExpanded={isExpanded}
                        singleOnly
                        onSelect={({ tableName }) =>
                          setLocation(`/tables/${tableName}/columns/`)
                        }
                      />
                      {/* Accordion Children */}
                      <AccordionPanel bgColor="white">
                        {isExpanded && (
                          <TableColumnSchemaList
                            singleOnly
                            visibleDetail
                            baseTableEntryDatum={tableColsEntry[1].base}
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
