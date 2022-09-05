import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Flex,
  Heading,
  useDisclosure,
} from '@chakra-ui/react';
import { Link, useLocation } from 'wouter';
import { useState } from 'react';
import { FiDatabase, FiGrid } from 'react-icons/fi';

import { Main } from '../components/shared/Main';
import { getComparisonAssertions } from '../utils/assertion';

import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  CRModal,
  TestDetail,
} from '../components/shared/Modals/CRModal/CRModal';
import {
  ComparisonReportSchema,
  ZComparisonSchema,
  zReport,
  ZTableSchema,
} from '../types';
import { CRColumnSummaryListWidget } from '../components/shared/Widgets/CRColumnSummaryListWidget';
import { CRTableOverview } from '../components/shared/Tables/CRTableOverview';
import { formatReportTime } from '../utils/formatters';
import { CollapseContent } from '../components/shared/CollapseContent';
import { CRAssertionDetailsWidget } from '../components/shared/Widgets/CRAssertionDetailsWidget';

type Props = {
  data: ComparisonReportSchema;
  name: string;
};
export default function CRTableDetailsPage({ data, name: reportName }: Props) {
  const [testDetail, setTestDetail] = useState<TestDetail | null>(null);
  const modal = useDisclosure();
  const [assertionsVisible, setAssertionsVisible] = useState(false);
  const [columnsVisible, setColumnsVisible] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [location, setLocation] = useLocation();

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

  const piperiderAssertions = [
    ...(baseOverview?.tests || []),
    ...(targetOverview?.tests || []),
  ];
  const dbtAssertions = [
    ...(dbtBaseOverview?.tests || []),
    ...(dbtTargetOverview?.tests || []),
  ];
  const isAssertionsEmpty =
    piperiderAssertions.length === 0 && dbtAssertions.length === 0;

  useDocumentTitle(reportName);

  return (
    <Main
      isSingleReport={false}
      time={`${formatReportTime(base.created_at)} -> ${formatReportTime(
        target.created_at,
      )}`}
    >
      <Flex direction="column" width="inherit">
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

          <Heading size="md">Assertions</Heading>
          <CollapseContent
            in={assertionsVisible}
            startingHeight={isAssertionsEmpty ? 50 : 250}
            collapseable={!isAssertionsEmpty}
            onVisible={() => setAssertionsVisible((visible) => !visible)}
          >
            <CRAssertionDetailsWidget
              assertions={{
                piperider: piperiderAssertions,
                dbt: dbtAssertions,
              }}
              onDetailVisible={({ data, type }) => {
                setTestDetail({
                  type,
                  data,
                });
                modal.onOpen();
              }}
            />
          </CollapseContent>

          <Heading size="md" mt={4}>
            Columns
          </Heading>
          <CollapseContent
            in={columnsVisible}
            startingHeight={
              baseTable === undefined && targetTable === undefined ? 50 : 350
            }
            collapseable={baseTable !== undefined || targetTable !== undefined}
            onVisible={() => setColumnsVisible((visible) => !visible)}
          >
            <CRColumnSummaryListWidget
              baseTable={baseTable}
              targetTable={targetTable}
              onSelect={({ tableName, columnName }) =>
                setLocation(`/tables/${tableName}/columns/${columnName}`)
              }
            />
          </CollapseContent>
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
