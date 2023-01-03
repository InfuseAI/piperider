import { InfoIcon } from '@chakra-ui/icons';
import { Box, Flex, Icon, Select, Tag, Text, Tooltip } from '@chakra-ui/react';
import { TimeUnit } from 'chart.js';
import { useState } from 'react';
import {
  BMChartTypes,
  Comparable,
  ComparableData,
  DBTBusinessMetricGroupItem,
} from '../../lib';
import { BMBarChart } from '../Charts/BMBarChart';
import { BMLineChart } from '../Charts/BMLineChart';

interface Props extends Comparable {
  data: ComparableData<DBTBusinessMetricGroupItem>;
}
/**
 * A Widget container for displaying BM Charts (line).
 */
export function BMWidget({ data: { base, target }, singleOnly }: Props) {
  const [selectedBMChartType, setSelectedBMChartType] =
    useState<BMChartTypes>('line');
  const chartViewOpts: BMChartTypes[] = [
    'line',
    'stacked-line',
    'x-bar',
    'y-bar',
    'stacked-x-bar',
    'stacked-y-bar',
  ];

  //shared timeGrain selection + options (SR+CR+Dimensions)
  const fallbackBMData = target || base;
  const timeGrain = fallbackBMData?.grain;
  const dateRangeStartEnd = [
    fallbackBMData?.data[0][0],
    fallbackBMData?.data[0].slice(-1),
  ].map((v) => String(v));

  return (
    <Box p={3}>
      <Box pb={3}>
        <Flex
          className="widget-header"
          alignItems={'center'}
          gap={2}
          mb={2}
          justifyContent={'space-between'}
        >
          <Flex alignItems={'center'} gap={2}>
            <Tag colorScheme={'blue'} variant={'subtle'} fontWeight={'medium'}>
              {fallbackBMData?.label}
            </Tag>
            <Tooltip
              shouldWrapChildren
              label={fallbackBMData?.description}
              placement={'right'}
            >
              <Icon as={InfoIcon} />
            </Tooltip>
          </Flex>
          <Select
            w={'initial'}
            size={'sm'}
            value={selectedBMChartType}
            onChange={(evt) =>
              setSelectedBMChartType(evt.currentTarget.value as BMChartTypes)
            }
          >
            {chartViewOpts.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </Flex>
        <Flex>
          <Text color={'gray.500'} fontSize={'sm'}>
            from {dateRangeStartEnd[0]} to {dateRangeStartEnd[1]}
          </Text>
        </Flex>
      </Box>
      <Flex maxH={'300px'}>
        {_getBMChart({
          selectedBMChartType,
          comparableBMData: { base, target },
          singleOnly,
          timeGrain,
        })}
      </Flex>
    </Box>
  );
}

/**
 * gets the Business Metric chart for the selected type
 * NOTE: exporting from utils will cause circular dep breakage
 */
function _getBMChart({
  selectedBMChartType,
  singleOnly,
  timeGrain,
  comparableBMData,
}: {
  selectedBMChartType: BMChartTypes;
  timeGrain?: string;
  singleOnly?: boolean;
  comparableBMData?: ComparableData<DBTBusinessMetricGroupItem>;
}) {
  const { base, target } = comparableBMData ?? {};
  // Determines the datasets shown by BM*Chart (later: dimensions)
  const bmGroupList = singleOnly ? [base] : [base, target];

  if (selectedBMChartType === 'line') {
    return <BMLineChart data={bmGroupList} timeGrain={timeGrain as TimeUnit} />;
  }
  if (selectedBMChartType === 'stacked-line') {
    return (
      <BMLineChart
        data={bmGroupList}
        timeGrain={timeGrain as TimeUnit}
        fill
        stacked
      />
    );
  }
  if (selectedBMChartType === 'y-bar') {
    return <BMBarChart data={bmGroupList} />;
  }
  if (selectedBMChartType === 'stacked-y-bar') {
    return <BMBarChart data={bmGroupList} stacked />;
  }
  //determine chart type by arg
  //based on arg, provide the correct dataset info for selected chart
  //return JSX of chart
  return null;
}
