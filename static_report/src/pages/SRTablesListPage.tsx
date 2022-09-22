import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  Flex,
  Grid,
  Text,
} from '@chakra-ui/react';
import { nanoid } from 'nanoid';
import { useLocalStorage } from 'usehooks-ts';
import { useLocation } from 'wouter';

import { Main } from '../components/shared/Layouts/Main';
import {
  TableActionBar,
  type TableActionBarView,
} from '../components/shared/Tables/TableActionBar';
import { formatReportTime } from '../utils/formatters';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { SR_LIST_VIEW } from '../utils/localStorageKeys';
import { type SingleReportSchema } from '../sdlc/single-report-schema';

import { zReport, ZTableSchema } from '../types';
import { TableListItem } from '../components/shared/Tables/TableList/TableListItem';
import { tableListGridTempCols, tableListWidth } from '../utils/layout';
import { TableColumnSummaryList } from '../components/shared/Tables/TableList/TableColumnSummaryList';
import { TableColumnSchemaList } from '../components/shared/Tables/TableList/TableColumnSchemaList';

type Props = { data: SingleReportSchema };

export function SRTablesListPage({ data }: Props) {
  const { created_at, datasource, tables } = data;

  const [, setLocation] = useLocation();
  const [view, setView] = useLocalStorage<TableActionBarView>(
    SR_LIST_VIEW,
    'summary',
  );

  useDocumentTitle('Single-Run Reports');

  return (
    <Main isSingleReport time={formatReportTime(created_at) || ''}>
      <TableActionBar
        sourceName={datasource.name}
        sourceType={datasource.type}
        currentView={view}
        toggleView={(nextView) => {
          setView(nextView);
        }}
      ></TableActionBar>

      <Flex direction="column" width={tableListWidth} minHeight="650px">
        <Grid templateColumns={tableListGridTempCols} px={4} my={6}>
          <Text>Name</Text>
          <Text>Summary</Text>
          <Text>Assertions</Text>
        </Grid>
        <Accordion allowToggle>
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
                        {view === 'summary' ? (
                          <TableColumnSummaryList
                            baseTableDatum={table}
                            singleOnly
                            onSelect={({ tableName, columnName }) =>
                              setLocation(
                                `/tables/${tableName}/columns/${columnName}`,
                              )
                            }
                          />
                        ) : (
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
