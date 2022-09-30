import { Main } from '../components/shared/Layouts/Main';
import { TableActionBar } from '../components/shared/Tables/TableActionBar';

import { formatReportTime } from '../utils/formatters';

import { TableListItem } from '../components/shared/Tables/TableList/TableListItem';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
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
  Flex,
  Grid,
  Text,
} from '@chakra-ui/react';
import { nanoid } from 'nanoid';
import { useLocation } from 'wouter';

import { tableListGridTempCols, tableListWidth } from '../utils/layout';
import { TableColumnSchemaList } from '../components/shared/Tables/TableList/TableColumnSchemaList';

type Props = { data: ComparisonReportSchema };

//FIXME: Refactor components w/ less props, more store consumption
export function CRTablesListPage({ data }: Props) {
  const [, setLocation] = useLocation();
  const { base, input: target } = data;
  const tables = transformAsNestedBaseTargetRecord<
    SaferSRSchema['tables'],
    SaferTableSchema
  >(base.tables, target.tables);

  zReport(ZSingleSchema.safeParse(base));
  zReport(ZSingleSchema.safeParse(target));

  useDocumentTitle('Comparison Reports');

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
                        onSelect={() => setLocation(`/tables/${key}/columns/`)}
                      />

                      {/* Accordion Children Types */}
                      <AccordionPanel bgColor="white">
                        {isExpanded && (
                          <TableColumnSchemaList
                            baseTableDatum={table?.base}
                            targetTableDatum={table?.target}
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
