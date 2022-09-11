import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  Divider,
  Flex,
  Grid,
  Stack,
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
import { SRTableListColumnList } from '../components/shared/Tables/TableList/SRTableListItem/SRTableListColumnList';
import { SRTableListSchemaDetail } from '../components/shared/Tables/TableList/SRTableListItem/SRTableListSchemaDetail';
import { SRTableListItem } from '../components/shared/Tables/TableList/SRTableListItem';
import { BreadcrumbNav } from '../components/shared/Layouts/BreadcrumbNav';

type Props = { data: SingleReportSchema };

export function SRTablesListPage({ data }: Props) {
  const { created_at, datasource, tables } = data;

  const [, setLocation] = useLocation();
  const [view, setView] = useLocalStorage<TableActionBarView>(
    SR_LIST_VIEW,
    'summary',
  );

  useDocumentTitle('Report List');

  return (
    <Main isSingleReport time={formatReportTime(created_at) || ''}>
      <TableActionBar
        sourceName={datasource.name}
        sourceType={datasource.type}
        currentView={view}
        toggleView={(nextView) => {
          setView(nextView);
        }}
      >
        <>
          <Divider orientation="vertical" mx={3} />
          <BreadcrumbNav routePathToMatch="/" />
        </>
      </TableActionBar>

      <Flex direction="column" width="900px" minHeight="650px">
        <Grid templateColumns="1fr 2fr 1fr" px={4} my={6}>
          <Text width="100px">Name</Text>
          <Text width="">Summary</Text>
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
                      {/* Accordion Parent */}
                      <SRTableListItem
                        isExpanded={isExpanded}
                        tableDatum={table}
                        onSelect={({ tableName }) =>
                          setLocation(`/tables/${tableName}`)
                        }
                      />

                      {/* Accordion Children Types */}
                      <AccordionPanel bgColor="white">
                        {view === 'summary' ? (
                          <Stack gap={6}>
                            <SRTableListColumnList
                              table={table}
                              onSelect={({ tableName, columnName }) =>
                                setLocation(
                                  `/tables/${tableName}/columns/${columnName}`,
                                )
                              }
                            />
                          </Stack>
                        ) : (
                          <SRTableListSchemaDetail
                            table={table}
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
