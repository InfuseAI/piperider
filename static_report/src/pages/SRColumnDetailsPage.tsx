import { Box, Flex, Grid } from '@chakra-ui/react';
import { useRoute } from 'wouter';
import {
  ColumnCardHeader,
  getIconForColumnType,
} from '../components/shared/ColumnCard/ColumnCardHeader';
import { DataCompositionMetrics } from '../components/shared/ColumnCard/ColumnMetrics/DataCompositionMetrics';
import { Main } from '../components/shared/Main';
import { SingleReportSchema } from '../sdlc/single-report-schema';

interface Props {
  data: SingleReportSchema;
}
export function SRColumnDetailsPage({ data: { tables } }: Props) {
  const [_, params] = useRoute('/tables/:reportName/columns/:columnName');

  if (!params?.columnName) {
    return (
      <Main>
        <Flex justifyContent="center" alignItems="center" minHeight="100vh">
          No profile column data found.
        </Flex>
      </Main>
    );
  }
  const { reportName, columnName } = params;
  const dataColumns = tables[reportName].columns;
  const columnDatum = dataColumns[columnName];

  return (
    <Main>
      <Flex width={'inherit'} minHeight="90vh" p={5}>
        {/* Master Area */}
        <Flex width={'400px'} direction={'column'}>
          <h1>Table Columns</h1>
          {Object.entries(dataColumns).map(([key, value], index) => {
            return <li key={index}>{key}</li>;
          })}
        </Flex>
        {/* Detail Area */}
        <Flex width={'inherit'} direction={'column'}>
          {/* Label Block */}
          <ColumnCardHeader columnDatum={columnDatum} />
          <Grid templateColumns={'1fr 1fr'} mt={5} gap={5}>
            {/* Data Composition Block */}
            <DataCompositionMetrics columnDatum={columnDatum} />
            {/* Histogram/Distinct Block */}
            <Box gridRow={'span 1'} bg={'red.300'}></Box>
            {/* Summary Block */}
            <Box gridRow={'span 2'} bg={'red.300'}></Box>
            {/* Quantiles Block */}
            <Box gridRow={'span 1'} bg={'red.300'}></Box>
          </Grid>
        </Flex>
      </Flex>
    </Main>
  );
}
