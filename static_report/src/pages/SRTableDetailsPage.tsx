import { Flex, Heading } from '@chakra-ui/react';
import { useLocation } from 'wouter';
import { useState } from 'react';
import { nanoid } from 'nanoid';

import { Main } from '../components/shared/Main';
import { ColumnHighlightsCard } from '../components/shared/Columns/ColumnCards/ColumnHighlightsCard';
import { CollapseContent } from '../components/shared/CollapseContent';
import { SRAssertionDetailsWidget } from '../components/shared/Widgets/SRAssertionDetailsWidget';

import { dataSourceSchema } from '../sdlc/single-report-schema.z';
import { formatReportTime } from '../utils/formatters';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ZTableSchema, zReport, ZColSchema } from '../types';
import type {
  SingleReportSchema,
  TableSchema,
} from '../sdlc/single-report-schema';
import { TableOverview } from '../components/shared/Tables/TableOverview';
import { SimpleBreadcrumbNavbar } from '../components/shared/BreadcrumbNav';
import { TABLE_DETAILS_ROUTE_PATH } from '../utils/routes';
import { NoData } from '../components/shared/NoData';

interface Props {
  data: SingleReportSchema;
  tableName: string;
}

export default function SRTableDetailsPage({ data, tableName }: Props) {
  const [, setLocation] = useLocation();
  const [assertionsVisible, setAssertionsVisible] = useState(false);
  const [columnsVisible, setColumnsVisible] = useState(false);

  const { datasource, tables } = data;
  const table = tables[tableName];
  const isAssertionsEmpty = checkAssertionsIsEmpty(table);

  zReport(ZTableSchema.safeParse(table));
  zReport(dataSourceSchema.safeParse(datasource));

  useDocumentTitle(tableName);

  if (!data || !tableName) {
    return (
      <Main isSingleReport time="-">
        <NoData text="No profile data found." />
      </Main>
    );
  }

  return (
    <Main isSingleReport time={formatReportTime(data.created_at)}>
      <Flex direction="column" width="100%">
        <SimpleBreadcrumbNavbar routePathToMatch={TABLE_DETAILS_ROUTE_PATH} />

        <Flex
          border="1px solid"
          borderColor="gray.300"
          bg="white"
          borderRadius="md"
          p={6}
          mt={3}
          mx="5%"
          direction="column"
          gap={4}
        >
          <TableOverview baseTable={table} />

          <Heading size="md">Assertions</Heading>
          <CollapseContent
            in={assertionsVisible}
            startingHeight={isAssertionsEmpty ? 50 : 250}
            collapseable={!isAssertionsEmpty}
            onVisible={() => setAssertionsVisible((visible) => !visible)}
          >
            <SRAssertionDetailsWidget
              assertions={{
                piperider: table.piperider_assertion_result,
                dbt: table?.dbt_assertion_result,
              }}
            />
          </CollapseContent>

          <Heading size="md" mt={4}>
            Columns
          </Heading>
          <CollapseContent
            in={columnsVisible}
            startingHeight={Object.keys(table.columns).length === 0 ? 50 : 350}
            collapseable={Object.keys(table.columns).length > 0}
            onVisible={() => setColumnsVisible((visible) => !visible)}
          >
            <Flex direction="row" flexWrap={'wrap'} gap={4}>
              {Object.keys(table.columns).map((key) => {
                const column = table.columns[key];
                zReport(ZColSchema.safeParse(column));

                return (
                  <ColumnHighlightsCard
                    key={nanoid()}
                    columnDatum={column}
                    onSelect={({ columnName }) =>
                      setLocation(`/tables/${table.name}/columns/${columnName}`)
                    }
                  />
                );
              })}
            </Flex>
          </CollapseContent>
        </Flex>
      </Flex>
    </Main>
  );
}

function checkAssertionsIsEmpty(table: TableSchema) {
  return (
    table.piperider_assertion_result?.tests.length === 0 &&
    Object.keys(table.piperider_assertion_result?.columns || {}).length === 0 &&
    table.dbt_assertion_result?.tests.length === 0 &&
    Object.keys(table.dbt_assertion_result?.columns || {}).length === 0
  );
}
