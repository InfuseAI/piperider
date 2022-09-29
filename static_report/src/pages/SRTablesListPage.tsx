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
import { formatReportTime } from '../utils/formatters';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

import { SaferSRSchema, zReport, ZTableSchema } from '../types';
import { TableListItem } from '../components/shared/Tables/TableList/TableListItem';
import { tableListGridTempCols, tableListWidth } from '../utils/layout';
import { useReportStore } from '../components/shared/Tables/store';
import { TableColumnSchemaList } from '../components/shared/Tables/TableList/TableColumnSchemaList';

type Props = { data: SaferSRSchema };

export function SRTablesListPage({ data }: Props) {
  const setReportData = useReportStore((s) => s.setReportRawData);
  setReportData({ base: data });
  const state = useReportStore.getState();
  console.log(state);

  const { created_at, datasource, tables } = data;

  const [, setLocation] = useLocation();

  useDocumentTitle('Single-Run Reports');

  return (
    <Main isSingleReport time={formatReportTime(created_at) || ''}>
      <TableActionBar
        sourceName={datasource.name}
        sourceType={datasource.type}
      />

      <Flex direction="column" width={tableListWidth} minHeight="650px">
        <Grid templateColumns={tableListGridTempCols} px={4} my={6}>
          <Text>Name</Text>
          <Text>Summary</Text>
          <Text>Assertions</Text>
        </Grid>
        <Accordion allowToggle reduceMotion>
          {Object.keys(tables).map((key) => {
            const table = tables[key];
            zReport(ZTableSchema.safeParse(table));

            return (
              <Flex key={nanoid()}>
                <AccordionItem>
                  {({ isExpanded }) => (
                    <>
                      <TableListItem
                        isExpanded={isExpanded}
                        baseTableDatum={table}
                        singleOnly
                        onSelect={({ tableName }) =>
                          setLocation(`/tables/${tableName}/columns/`)
                        }
                      />
                      {/* Accordion Children Types */}
                      <AccordionPanel bgColor="white">
                        {isExpanded && (
                          <TableColumnSchemaList
                            singleOnly
                            visibleDetail
                            baseTableDatum={table}
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
