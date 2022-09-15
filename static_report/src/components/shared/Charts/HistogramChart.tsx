import {
  ChartOptions,
  Chart as ChartJS,
  BarElement,
  Tooltip,
  ChartData,
  ScaleOptionsByType,
  CartesianScaleTypeRegistry,
  TimeSeriesScale,
  CategoryScale,
  LinearScale,
  AnimationOptions,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { ColumnSchema, Histogram } from '../../../sdlc/single-report-schema';
import {
  formatAsAbbreviatedNumber,
  formatIntervalMinMax,
} from '../../../utils/formatters';
import { DATE_RANGE, TEXTLENGTH, VALUE_RANGE } from '../Columns/constants';

import 'chartjs-adapter-date-fns';
import { DeepPartial } from 'chart.js/types/utils';

/**
 * Histogram Chart that can display generic data types such as Numeric, Datetime, Integer
 * X: The Min/Max of the labels range is the scaled width of charting area
 * Y: The Min/Max of the counts range is the scaled height of charting area
 * Counts: Abbreviated based on K, Mn, Bn, Tr (see formatters)
 */
// Note: min/max represents the bin edge min/max
type ScaleTypeConfig = DeepPartial<
  ScaleOptionsByType<keyof CartesianScaleTypeRegistry>
>;

type HistogramChartProps = {
  data: Pick<ColumnSchema, 'total' | 'type' | 'histogram' | 'min' | 'max'>;
  animation?: AnimationOptions<'bar'>['animation'];
  hideAxis?: boolean;
};

export default function HistogramChart({
  data,
  hideAxis = false,
  animation = false,
}: HistogramChartProps) {
  ChartJS.register(
    BarElement,
    Tooltip,
    TimeSeriesScale,
    LinearScale,
    CategoryScale,
  );

  const chartOptions = getHistogramChartOptions(data, hideAxis, { animation });

  // Histograms are a mix between bar and scatter options (union)
  // uses cartesian x,y coordinates to plot and infer labels
  const chartData = getHistogramChartData(data);

  //infer `any` to allow for union data configurations & options
  return (
    <Chart
      type="bar"
      options={chartOptions}
      data={chartData as any}
      plugins={[]}
    />
  );
}

export function getHistogramChartData(
  data: HistogramChartProps['data'],
): ChartData<'bar' | 'scatter'> {
  const { histogram, type } = data;
  const isDatetime = type === 'datetime';
  const { counts = [], bin_edges } = histogram || ({} as Histogram);

  const newData = isDatetime
    ? counts.map((v, i) => ({ x: bin_edges[i], y: v }))
    : counts;

  const newLabels = bin_edges
    .map((v, i) => formatDisplayedBinItem(bin_edges, i))
    .slice(0, -1); // exclude last

  return {
    labels: newLabels,
    datasets: [
      {
        label: 'counts',
        data: newData as any, //infer `any` to allow datestring
        backgroundColor: '#63B3ED',
        borderColor: '#4299E1',
        hoverBackgroundColor: '#002A53',
        borderWidth: 1,
        categoryPercentage: 1, // tells bar to fill "bin area"
        barPercentage: 1, //tells bar to fill "bar area"
        xAxisID: 'x',
      },
    ],
  };
}

export function getHistogramChartOptions(
  data: HistogramChartProps['data'],
  hideAxis = false,
  { ...configOverrides }: ChartOptions<'bar'> = {},
): ChartOptions<'bar'> {
  const { histogram, type, total } = data;
  const { counts = [], bin_edges: binEdges = [] } =
    histogram || ({} as Histogram);
  const isDatetime = type === 'datetime';
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        mode: 'index',
        position: 'nearest',
        intersect: false,
        callbacks: {
          title([{ dataIndex }]) {
            const result = formatDisplayedBinItem(binEdges, dataIndex);

            const percentOfTotal = formatIntervalMinMax(
              counts[dataIndex] / (total as number), //total is always given (schema should make required)
            );

            const prefix = isDatetime
              ? DATE_RANGE
              : type === 'string'
              ? TEXTLENGTH
              : VALUE_RANGE;

            return `${prefix}\n${result}\n(${percentOfTotal})`;
          },
        },
      },
    },
    scales: getScales(data, hideAxis),
    ...configOverrides,
  };
}
/**
 * get x, y scales for histogram (dynamic based on datetime or not)
 */
function getScales(
  { histogram, min, max, type }: HistogramChartProps['data'],
  hideAxis = false,
) {
  const isDatetime = type === 'datetime';
  const { counts = [], bin_edges: binEdges = [] } =
    histogram || ({} as Histogram);

  const newLabels = binEdges
    .map((v, i) => formatDisplayedBinItem(binEdges, i))
    .slice(0, -1); // exclude last

  //swap x-scale when histogram is datetime
  const xScaleDate: ScaleTypeConfig = {
    display: hideAxis ? false : true,
    type: 'timeseries', // each datum is spread w/ equal distance
    min,
    max,
    adapters: {
      date: {},
    },
    time: {
      minUnit: 'day',
    },
    grid: { display: false },
    ticks: {
      minRotation: 30,
      maxRotation: 30,
      maxTicksLimit: 8,
    },
  };
  /**
   * NOTE: Category doesn't accept (min/max) -- will distort scales!
   */
  const xScaleCategory: ScaleTypeConfig = {
    display: hideAxis ? false : true,
    type: 'category', //Linear doesn't understand bins!
    grid: { display: false },
    ticks: {
      callback(val, index) {
        return newLabels[index];
      },
    },
  };
  const xScaleBase: ScaleTypeConfig = isDatetime ? xScaleDate : xScaleCategory;

  const yScaleBase: DeepPartial<
    ScaleOptionsByType<keyof CartesianScaleTypeRegistry>
  > = {
    display: hideAxis ? false : true,
    type: 'linear',
    max: Math.max(...counts), //NOTE: do not add `min` since if they are equal nothing gets displayed sometimes
    grid: {
      color: 'lightgray',
      borderDash: [2, 2],
    },
    ticks: {
      maxTicksLimit: 8,
      callback: function (val, index) {
        //slow, but necessary since chart-data is a number and can be hard to display
        return formatAsAbbreviatedNumber(val);
      },
    },
  };
  return { x: xScaleBase, y: yScaleBase };
}
/**
 * @returns a formatted, abbreviated, histogram bin display text
 */
function formatDisplayedBinItem(
  binEdges: Histogram['bin_edges'],
  currentIndex: number,
) {
  const startEdge = binEdges[currentIndex];
  const endEdge = binEdges[currentIndex + 1];

  const formattedStart = formatAsAbbreviatedNumber(startEdge);
  const formattedEnd = formatAsAbbreviatedNumber(endEdge);

  const result = `${formattedStart} - ${formattedEnd}`;
  return result;
}
