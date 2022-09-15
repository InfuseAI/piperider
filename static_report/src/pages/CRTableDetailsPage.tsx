import { Flex, Heading, useDisclosure } from '@chakra-ui/react';
import { useLocation } from 'wouter';
import { useState } from 'react';

import { Main } from '../components/shared/Layouts/Main';
import { getComparisonAssertions } from '../components/shared/Tables/utils';

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
import { TableOverview } from '../components/shared/Tables/TableOverview';
import { formatReportTime } from '../utils/formatters';
import { CollapseContent } from '../components/shared/Layouts/CollapseContent';
import { CRAssertionDetailsWidget } from '../components/shared/Widgets/CRAssertionDetailsWidget';
import { BreadcrumbNav } from '../components/shared/Layouts/BreadcrumbNav';
import { TABLE_DETAILS_ROUTE_PATH } from '../utils/routes';
import { NoData } from '../components/shared/Layouts/NoData';

type Props = {
  data: ComparisonReportSchema;
  tableName: string;
};
export default function CRTableDetailsPage({ data, tableName }: Props) {
  const [testDetail, setTestDetail] = useState<TestDetail | null>(null);
  const modal = useDisclosure();
  const [assertionsVisible, setAssertionsVisible] = useState(false);
  const [columnsVisible, setColumnsVisible] = useState(false);
  const [, setLocation] = useLocation();
  useDocumentTitle(tableName);

  if (!data || !tableName) {
    return (
      <Main isSingleReport time="-">
        <NoData text="No profile data found." />
      </Main>
    );
  }

  const { base, input: target } = data;
  zReport(ZComparisonSchema(true).safeParse(data));

  const baseTable = base.tables[tableName];
  const targetTable = target.tables[tableName];

  zReport(ZTableSchema.safeParse(baseTable));
  zReport(ZTableSchema.safeParse(targetTable));

  const [baseOverview, targetOverview] = getComparisonAssertions({
    data,
    tableName,
    type: 'piperider',
  });
  const [dbtBaseOverview, dbtTargetOverview] = getComparisonAssertions({
    data,
    tableName,
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

  return (
    <Main
      isSingleReport={false}
      time={`${formatReportTime(base.created_at)} -> ${formatReportTime(
        target.created_at,
      )}`}
    >
      <Flex direction="column" width="inherit">
        <BreadcrumbNav routePathToMatch={TABLE_DETAILS_ROUTE_PATH} />

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
          <TableOverview baseTable={baseTable} targetTable={targetTable} />

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
