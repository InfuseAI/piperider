import { Flex, Grid } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { ColumnSchema, TableSchema } from '../../sdlc/single-report-schema';
import { zReport, ZTableSchema } from '../../types';
import {
  getColumnTypeChartData,
  transformAsNestedBaseTargetRecord,
  transformCRStringDateHistograms,
  CRHistogramDatum,
} from '../../utils/transformers';
import { BarChartDatum, SRBarChart } from '../SingleReport/SRBarChart';
import { CRBarChart } from './CRBarChart';
import { CRTableColumnDetails } from './CRTableColumnDetails';

type CRTabProfilingDetailsProps = {
  baseTable?: TableSchema;
  targetTable?: TableSchema;
};
export function CRTabProfilingDetails({
  baseTable,
  targetTable,
}: CRTabProfilingDetailsProps) {
  zReport(ZTableSchema.safeParse(baseTable));
  zReport(ZTableSchema.safeParse(targetTable));

  const transformedData = transformAsNestedBaseTargetRecord<
    TableSchema['columns'],
    ColumnSchema
  >(baseTable?.columns, targetTable?.columns);

  return (
    <>
      {Object.entries(transformedData).map(([key, value]) => {
        return (
          <CRProfilingColumn
            key={key}
            name={key}
            base={value?.base}
            target={value?.target}
          />
        );
      })}
    </>
  );
}

/**
 * Optional values due to column-drift across runs
 * Renders combined single chart when type is string or datetime
 * Otherwise, renders two charts per histogram
 */
type CRProfilingColumnProps = {
  name: string;
  base?: ColumnSchema;
  target?: ColumnSchema;
};
function CRProfilingColumn({ name, base, target }: CRProfilingColumnProps) {
  const [combinedData, setCombinedData] = useState<CRHistogramDatum[] | null>(
    null,
  );
  const [splitData, setSplitData] = useState<
    (BarChartDatum[] | null | undefined)[]
  >([]);

  useEffect(() => {
    const isSameGenericType = base?.type === target?.type;
    const isStringOrDatetime =
      base?.type === 'string' || base?.type === 'datetime';

    // Determine combined data histograms
    if (isSameGenericType && isStringOrDatetime) {
      const transformResult = transformCRStringDateHistograms({
        base: base?.histogram,
        target: target?.histogram,
      });

      setCombinedData(transformResult);
    } else {
      // Determine split data histograms
      const transformBaseResult = getColumnTypeChartData(base);
      const transformTargetResult = getColumnTypeChartData(target);

      // Needs to show mismatched columns (null | undefined)
      setSplitData([transformBaseResult, transformTargetResult]);
    }
  }, [base, target]);

  // Show combined base|target chart or split charts
  return (
    <Flex key={name} direction="column">
      <Grid my={8} templateColumns="500px 1fr" gap={12}>
        <CRTableColumnDetails baseColumn={base} targetColumn={target} />

        <Grid
          my={4}
          templateColumns={`1fr ${combinedData ? '' : '1fr'}`}
          gap={combinedData ? 0 : 12}
          overflowX={'hidden'}
        >
          {combinedData ? (
            <CRBarChart data={combinedData} />
          ) : combinedData ? (
            <NoData />
          ) : null}
          {splitData[0] ? (
            <SRBarChart data={splitData[0]} />
          ) : combinedData ? null : (
            <NoData />
          )}
          {splitData[1] ? (
            <SRBarChart data={splitData[1]} />
          ) : combinedData ? null : (
            <NoData />
          )}
        </Grid>
      </Grid>
    </Flex>
  );
}

function NoData() {
  return (
    <Flex alignItems="center" justifyContent="center" color="gray.500">
      No data available
    </Flex>
  );
}
