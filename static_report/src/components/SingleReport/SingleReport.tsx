import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Flex,
  Heading,
} from '@chakra-ui/react';
import { Link } from 'wouter';
import { FiDatabase, FiGrid } from 'react-icons/fi';
import { useState } from 'react';

import { Main } from '../shared/Main';
import { CollapseContent } from '../shared/CollapseContent';

import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { SingleReportSchema } from '../../sdlc/single-report-schema';
import { SRProfilingDetails } from './SRProfilingDetails';
import { SRAssertionDetails } from './SRAssertionDetails';
import { SRTableOverview } from './SRTableOverview';
import { dataSourceSchema } from '../../sdlc/single-report-schema.z';
import { ZTableSchema, zReport } from '../../types';
import { formatReportTime } from '../../utils/formatters';
interface Props {
  data: SingleReportSchema;
  name: string;
}

export default function SingleReport({ data, name }: Props) {
  const { datasource, tables } = data;
  const table = tables[name];
  const [assertionsVisible, setAssertionsVisible] = useState(false);
  const [columnsVisible, setColumnsVisible] = useState(false);

  const isAssertionsEmpty =
    table.piperider_assertion_result?.tests.length === 0 &&
    Object.keys(table.piperider_assertion_result?.columns || {}).length === 0 &&
    table.dbt_assertion_result?.tests.length === 0 &&
    Object.keys(table.dbt_assertion_result?.columns || {}).length === 0;

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
      <Flex direction="column" minH="calc(100vh + 1px)" width="100%">
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
          <SRTableOverview table={table} />

          <Heading size="md">Assertions</Heading>
          <CollapseContent
            in={assertionsVisible}
            startingHeight={isAssertionsEmpty ? 50 : 250}
            collapseable={!isAssertionsEmpty}
            onVisible={() => setAssertionsVisible((visible) => !visible)}
          >
            <SRAssertionDetails
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
            <SRProfilingDetails data={table.columns} />
          </CollapseContent>
        </Flex>
      </Flex>
    </Main>
  );
}
