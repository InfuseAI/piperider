import { useLocalStorage } from 'usehooks-ts';

import { Main } from '../components/shared/Layouts/Main';
import {
  TableActionBar,
  type TableActionBarView,
} from '../components/shared/Tables/TableActionBar';

import { formatReportTime } from '../utils/formatters';

import { TableListItem } from '../components/shared/Tables/TableList/TableListItem';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { CR_LIST_VIEW } from '../utils/localStorageKeys';
import {
  SaferSRSchema,
  SaferTableSchema,
  ZComparisonTableSchema,
  zReport,
  ZSingleSchema,
  type ComparisonReportSchema,
} from '../types';
import { transformAsNestedBaseTargetRecord } from '../utils/transformers';
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
import { useLocation } from 'wouter';

import { CRTableListColumnList } from '../components/shared/Tables/TableList/CRTableListItem/CRTableListColumnList';
import { CRTableSchemaDetails } from '../components/shared/Tables/TableList/CRTableListItem/CRTableSchemaDetails';
import { BreadcrumbNav } from '../components/shared/Layouts/BreadcrumbNav';
import { tableListGridTempCols } from '../utils/layout';

type Props = { data: ComparisonReportSchema };

export function CRTablesListPage({ data }: Props) {
  const [view, setView] = useLocalStorage<TableActionBarView>(
    CR_LIST_VIEW,
    'summary',
  );
  const [, setLocation] = useLocation();
  const { base, input: target } = data;
  const tables = transformAsNestedBaseTargetRecord<
    SaferSRSchema['tables'],
    SaferTableSchema
  >(base.tables, target.tables);

  zReport(ZSingleSchema.safeParse(base));
  zReport(ZSingleSchema.safeParse(target));

  useDocumentTitle('Report List');

  return (
    <Main
      isSingleReport={false}
      time={`${formatReportTime(base.created_at)} -> ${formatReportTime(
        target.created_at,
      )}`}
    >
      <TableActionBar
        sourceName={data.input.datasource.name}
        sourceType={data.input.datasource.type}
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
        <Grid templateColumns={tableListGridTempCols} px={4} my={6}>
          <Text>Name</Text>
          <Text>Summary</Text>
          <Text>Assertions</Text>
        </Grid>
        <Accordion allowToggle>
          {Object.keys(tables).map((key) => {
            const table = tables[key];
            ZComparisonTableSchema(false).safeParse(table);

            return (
              <Flex key={nanoid()}>
                <AccordionItem>
                  {({ isExpanded }) => (
                    <>
                      <TableListItem
                        isExpanded={isExpanded}
                        baseTableDatum={table.base}
                        targetTableDatum={table.target}
                        onSelect={() => setLocation(`/tables/${key}`)}
                      />

                      {/* Accordion Children Types */}
                      <AccordionPanel bgColor="white">
                        {view === 'summary' ? (
                          // FIXME:
                          <Stack gap={6}>
                            <CRTableListColumnList
                              baseTableDatum={table?.base}
                              targetTableDatum={table?.target}
                              onSelect={({ tableName, columnName }) =>
                                setLocation(
                                  `/tables/${tableName}/columns/${columnName}`,
                                )
                              }
                            />
                          </Stack>
                        ) : (
                          //FIXME:
                          <CRTableSchemaDetails
                            visibleDetail
                            baseTableDatum={table?.base}
                            targetTableDatum={table?.target}
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
