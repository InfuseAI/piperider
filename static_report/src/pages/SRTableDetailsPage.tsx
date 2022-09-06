import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Flex,
  Heading,
} from '@chakra-ui/react';
import { Link, useLocation } from 'wouter';
import { FiDatabase, FiGrid } from 'react-icons/fi';
import { useState } from 'react';
import { nanoid } from 'nanoid';

import { Main } from '../components/shared/Main';
import { ColumnCard } from '../components/shared/Columns/ColumnCard';
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

interface Props {
  data: SingleReportSchema;
  name: string;
}

export default function SRTableDetailsPage({ data, name }: Props) {
  const [, setLocation] = useLocation();
  const [assertionsVisible, setAssertionsVisible] = useState(false);
  const [columnsVisible, setColumnsVisible] = useState(false);

  const { datasource, tables } = data;
  const table = tables[name];
  const isAssertionsEmpty = checkAssertionsIsEmpty(table);

  zReport(ZTableSchema.safeParse(table));
  zReport(dataSourceSchema.safeParse(datasource));

  useDocumentTitle(name);

  if (!data) {
    return (
      <Main isSingleReport time="-">
        <Flex justifyContent="center" alignItems="center" minHeight="100vh">
          No profile data found.
        </Flex>
      </Main>
    );
  }

  return (
    <Main isSingleReport time={formatReportTime(data.created_at)}>
      <Flex direction="column" width="100%">
        <Flex mx="5%" mt={4}>
          <Breadcrumb fontSize="lg">
            <BreadcrumbItem>
              <Link href="/">
                <BreadcrumbLink href="/" data-cy="sr-report-breadcrumb-back">
                  <Flex alignItems="center" gap={1}>
                    <FiDatabase /> {datasource.name}
                  </Flex>
                </BreadcrumbLink>
              </Link>
            </BreadcrumbItem>

            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink href="#">
                <Flex alignItems="center" gap={1}>
                  <FiGrid /> {table.name}
                </Flex>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>
        </Flex>

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
          <TableOverview baseTable={table} singleOnly />

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
                  <ColumnCard
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
