import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Flex,
  Box,
  Heading,
} from '@chakra-ui/react';
import { Link } from 'wouter';
import { FiDatabase, FiGrid } from 'react-icons/fi';

import { Main } from '../shared/Main';

import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAmplitudeOnMount } from '../../hooks/useAmplitudeOnMount';
import { AMPLITUDE_EVENTS } from '../../utils/amplitudeEvents';
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

  zReport(ZTableSchema.safeParse(table));
  zReport(dataSourceSchema.safeParse(datasource));

  useDocumentTitle(name);

  // For calculating user stay purposes
  useAmplitudeOnMount({
    eventName: AMPLITUDE_EVENTS.PAGE_VIEW,
    eventProperties: {
      type: 'single-report',
      tab: 'Profiling',
    },
  });

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

          <Box>
            <Heading size="md">Assertions</Heading>
            <SRAssertionDetails
              assertions={{
                piperider: table.piperider_assertion_result,
                dbt: table?.dbt_assertion_result,
              }}
            />
          </Box>

          <Box mt={4}>
            <Heading size="md">Columns</Heading>
            <SRProfilingDetails data={table.columns} />
          </Box>
        </Flex>
      </Flex>
    </Main>
  );
}
