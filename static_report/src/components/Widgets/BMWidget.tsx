import { Box, Flex, Text } from '@chakra-ui/react';
import { TimeUnit } from 'chart.js';
import {
  Comparable,
  ComparableData,
  DBTBusinessMetricGroupItem,
} from '../../lib';
import { BMLineChart } from '../Charts/BMLineChart';

interface Props extends Comparable {
  data: ComparableData<DBTBusinessMetricGroupItem>;
}
export function BMWidget({ data: { base, target }, singleOnly }: Props) {
  // Determines the datasets shown by BM*Chart
  const bmGroupList = singleOnly ? [base] : [base, target];

  //shared timeGrain selection + options (SR+CR+Dimensions)
  const fallbackBMData = target || base;

  return (
    <Box>
      <Flex className="widget-header" py={5} justifyContent={'space-between'}>
        <Text fontWeight={'medium'}>{fallbackBMData?.name}</Text>
      </Flex>
      <Flex maxH={'300px'} justifyContent={'center'}>
        <BMLineChart
          data={bmGroupList}
          timeGrain={fallbackBMData?.grain as TimeUnit}
        />
      </Flex>
    </Box>
  );
}
