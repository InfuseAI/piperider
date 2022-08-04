import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Flex,
  Heading,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useDisclosure,
} from '@chakra-ui/react';
import { Link } from 'wouter';
import { useState } from 'react';

import { Main } from '../shared/Main';
import { getComparisonAssertions } from '../../utils/assertion';

import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { CRModal, TestDetail } from './CRModal/CRModal';
import {
  ComparisonReportSchema,
  ZComparisonSchema,
  zReport,
  ZTableSchema,
} from '../../types';
import { CRTabProfilingDetails } from './CRTabProfilingDetails';
import { CRTabSchemaDetails } from './CRTabSchemaDetails';
import { CRTabTestDetails } from './CRTabTestDetails';
import { CRTableOverview } from './CRTableOverview';

type Props = {
  data: ComparisonReportSchema;
  name: string;
};
export default function ComparisonReport({ data, name: reportName }: Props) {
  const [testDetail, setTestDetail] = useState<TestDetail>(null);
  const modal = useDisclosure();

  const { base, input: target } = data;
  zReport(ZComparisonSchema(true).safeParse(data));

  const baseTable = base.tables[reportName];
  const targetTable = target.tables[reportName];
  const existsDbtTests = base.tables[reportName]?.dbt_assertion_result;
  zReport(ZTableSchema.safeParse(baseTable));
  zReport(ZTableSchema.safeParse(targetTable));

  const [baseOverview, targetOverview] = getComparisonAssertions({
    data,
    reportName,
    type: 'piperider',
  });
  const [dbtBaseOverview, dbtTargetOverview] = getComparisonAssertions({
    data,
    reportName,
    type: 'dbt',
  });

  useDocumentTitle(reportName);

  return (
    <Main>
      <Flex direction="column" minH="calc(100vh + 1px)" width="100%">
        <Flex mx="10%" mt={4}>
          <Breadcrumb fontSize="lg">
            <BreadcrumbItem>
              <Link href="/">
                <BreadcrumbLink href="/" data-cy="cr-report-breadcrumb-back">
                  Tables
                </BreadcrumbLink>
              </Link>
            </BreadcrumbItem>

            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink href="#">{reportName}</BreadcrumbLink>
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
          gap={8}
        >
          {/* overview */}
          <Heading fontSize={24}>Overview</Heading>
          <CRTableOverview baseTable={baseTable} targetTable={targetTable} />

          <Tabs isLazy>
            <TabList>
              <Tab>Schema</Tab>
              <Tab data-cy="cr-report-tab-item-profiling">Profiling</Tab>
              <Tab data-cy="cr-report-tab-item-tests">Tests</Tab>
              {existsDbtTests && <Tab>dbt Tests</Tab>}
            </TabList>

            <TabPanels>
              <TabPanel>
                {baseTable?.columns && targetTable?.columns ? (
                  <CRTabSchemaDetails base={baseTable} target={targetTable} />
                ) : (
                  <Text>
                    <p>
                      There seems to be a mismatch between your report columns.
                    </p>
                    Please check your run.json
                  </Text>
                )}
              </TabPanel>

              <TabPanel>
                <CRTabProfilingDetails
                  baseTable={baseTable}
                  targetTable={targetTable}
                />
              </TabPanel>

              <TabPanel>
                <CRTabTestDetails
                  base={baseOverview?.tests}
                  target={targetOverview?.tests}
                  onDetailVisible={(data) => {
                    setTestDetail({
                      type: 'piperider',
                      data,
                    });
                    modal.onOpen();
                  }}
                />
              </TabPanel>

              <TabPanel>
                {dbtBaseOverview?.tests.length === 0 &&
                dbtTargetOverview?.tests.length === 0 ? (
                  <Flex
                    justifyContent="center"
                    alignItems="center"
                    height="100px"
                  >
                    <Text color="gray.500">No dbt tests available.</Text>
                  </Flex>
                ) : (
                  <CRTabTestDetails
                    base={dbtBaseOverview?.tests}
                    target={dbtTargetOverview?.tests}
                    onDetailVisible={(data) => {
                      setTestDetail({
                        type: 'dbt',
                        data,
                      });
                      modal.onOpen();
                    }}
                  />
                )}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Flex>
      </Flex>

      <CRModal
        {...modal}
        type={testDetail?.type}
        data={testDetail?.data}
        onClose={() => {
          modal.onClose();
          setTestDetail(null);
        }}
      />
    </Main>
  );
}
