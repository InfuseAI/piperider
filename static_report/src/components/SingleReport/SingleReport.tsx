import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Flex,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import { Link } from 'wouter';

import { Main } from '../shared/Main';
import { getReportAsserationStatusCounts } from '../../utils';

import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import type { AssertionResult } from '../../types';
import { SingleReportSchema } from '../../sdlc/single-report-schema';
import { SRTabProfilingDetails } from './SRTabProfilingDetails';
import { SRTabTestDetails } from './SRTabTestDetails';
import { SRTableOverview } from './SRTableOverview';

interface Props {
  data: SingleReportSchema;
  name: string;
}
export default function SingleReport({ data, name }: Props) {
  const { datasource: source, tables } = data;
  const table = tables[name] as any;

  useDocumentTitle(name);

  if (!data) {
    return (
      <Main>
        <Flex justifyContent="center" alignItems="center" minHeight="100vh">
          No profile data found.
        </Flex>
      </Main>
    );
  }

  const overview = getReportAsserationStatusCounts(
    table.piperider_assertion_result,
  );

  return (
    <Main>
      <Flex direction="column" minH="calc(100vh + 1px)" width="100%">
        <Flex mx="10%" mt={4}>
          <Breadcrumb fontSize="lg">
            <BreadcrumbItem>
              <Link href="/">
                <BreadcrumbLink href="/">{source.name}</BreadcrumbLink>
              </Link>
            </BreadcrumbItem>

            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink href="#">{table.name}</BreadcrumbLink>
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
          mx="10%"
          direction="column"
        >
          <SRTableOverview table={table} overview={overview} />

          <Tabs isLazy>
            <TabList>
              <Tab>Profiling</Tab>
              <Tab>Tests</Tab>
              {/* If have `dbt_test_result` it will render this tab */}
              {table.dbt_test_result && <Tab>dbt Tests</Tab>}
            </TabList>

            <TabPanels>
              <TabPanel>
                <SRTabProfilingDetails data={table.columns} />
              </TabPanel>

              <TabPanel>
                <SRTabTestDetails data={table.assertion_results} />
              </TabPanel>

              {table?.dbt_test_result && (
                <TabPanel>
                  <SRTabTestDetails type="dbt" data={table.dbt_test_results} />
                </TabPanel>
              )}
            </TabPanels>
          </Tabs>
        </Flex>
      </Flex>
    </Main>
  );
}
