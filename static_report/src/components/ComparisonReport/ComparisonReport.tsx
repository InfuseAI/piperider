import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Flex,
  useDisclosure,
} from '@chakra-ui/react';
import { Link } from 'wouter';
import { useState } from 'react';
import { FiDatabase, FiGrid } from 'react-icons/fi';

import { Main } from '../shared/Main';
import { getComparisonAssertions } from '../../utils/assertion';

import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAmplitudeOnMount } from '../../hooks/useAmplitudeOnMount';
import { AMPLITUDE_EVENTS } from '../../utils/amplitudeEvents';
import { CRModal, TestDetail } from './CRModal/CRModal';
import {
  ComparisonReportSchema,
  ZComparisonSchema,
  zReport,
  ZTableSchema,
} from '../../types';
import { CRProfilingDetails } from './CRProfilingDetails';
// import { CRTabSchemaDetails } from './CRTabSchemaDetails';
import { CRAssertionDetails } from './CRAssertionDetails';
import { CRTableOverview } from './CRTableOverview';
import { formatReportTime } from '../../utils/formatters';

type Props = {
  data: ComparisonReportSchema;
  name: string;
};
export default function ComparisonReport({ data, name: reportName }: Props) {
  const [testDetail, setTestDetail] = useState<TestDetail | null>(null);
  const modal = useDisclosure();

  const { base, input: target } = data;
  zReport(ZComparisonSchema(true).safeParse(data));

  const baseTable = base.tables[reportName];
  const targetTable = target.tables[reportName];

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

  // For calculating user stay purposes
  useAmplitudeOnMount({
    eventName: AMPLITUDE_EVENTS.PAGE_VIEW,
    eventProperties: {
      type: 'comparison-report',
      tab: 'Schema',
    },
  });

  return (
    <Main
      isSingleReport={false}
      time={`${formatReportTime(base.created_at)} -> ${formatReportTime(
        target.created_at,
      )}`}
    >
      <Flex direction="column" minH="calc(100vh + 1px)" width="inherit">
        <Flex mx="5%" mt={4}>
          <Breadcrumb fontSize="lg">
            <BreadcrumbItem>
              <Link href="/">
                <BreadcrumbLink href="/" data-cy="cr-report-breadcrumb-back">
                  <Flex alignItems="center" gap={1}>
                    <FiDatabase /> Tables
                  </Flex>
                </BreadcrumbLink>
              </Link>
            </BreadcrumbItem>

            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink href="#">
                <Flex alignItems="center" gap={1}>
                  <FiGrid />
                  {reportName}
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
        >
          <CRTableOverview baseTable={baseTable} targetTable={targetTable} />

          <CRAssertionDetails
            assertions={{
              piperider: [
                ...(baseOverview?.tests || []),
                ...(targetOverview?.tests || []),
              ],
              dbt: [
                ...(dbtBaseOverview?.tests || []),
                ...(dbtTargetOverview?.tests || []),
              ],
            }}
            onDetailVisible={({ data, type }) => {
              setTestDetail({
                type,
                data,
              });
              modal.onOpen();
            }}
          />

          <CRProfilingDetails baseTable={baseTable} targetTable={targetTable} />
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
