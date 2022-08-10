import {
  ChartOptions,
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  ChartData,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Histogram } from '../../../sdlc/single-report-schema';
import { formatAsAbbreviatedNumber } from '../../../utils/formatters';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);
// TODO: Replace SRBarChart (gradually)

/**
 * Histogram Chart that can display generic data types such as Numeric, Datetime, Integer
 * Should handle columns that don't have `histogram` property (TBD)
 * X: The Min/Max of the domain data range is the width of charting area
 * Y: The Min/Max of the domain data range is the height of charting area
 * counts: Abbreviated based on K, Mn, Bn, Tr (see formatters)
 * Guides: horizontal dashed lines, at the 30/60/90 percentile
 */
interface Props {
  data: Histogram;
}
export function HistogramChartSimple({ data }: Props) {
  const { counts, bin_edges } = data;

  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        mode: 'index',
        position: 'nearest',
        intersect: false,
        callbacks: {
          title([{ dataIndex }]) {
            const result = getDisplayedBinItem(bin_edges, dataIndex);

            return result;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: false,
        grid: { display: false },
        ticks: {
          maxRotation: 0,
          autoSkip: false,
          format: { maximumFractionDigits: 2 },
          callback: function (val, index, ticks) {
            // val is an chartjs indexObject, not actual index's value; thus using original bin_edges
            if (index === ticks.length) return null;
            const result = getDisplayedBinItem(bin_edges, index);

            const isStartOrEnd = index === 0 || index === ticks.length - 1;

            //preserve all gridline items by defaulting empty-string
            return isStartOrEnd ? result : '';
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'lightgray',
          borderDash: [2, 2],
        },
        ticks: {
          callback: function (val) {
            return formatAsAbbreviatedNumber(val);
          },
        },
      },
    },
  };

  // defaults to `category` type, as `bin edges` are used as-is.
  // this means that the x-axis ticks are explicitly provided, not inferred or automatically spread over the chart area.
  const chartData: ChartData<'bar'> = {
    labels: bin_edges.slice(0, -1), //offset final edge
    datasets: [
      {
        data: counts,
        backgroundColor: '#63B3ED',
        borderColor: '#4299E1',
        borderWidth: 1,
        categoryPercentage: 1, // tells bar to fill "bin area"
        barPercentage: 1, //tells bar to fill "bar area"
        hoverBackgroundColor: 'red',
      },
    ],
  };

  return <Bar options={chartOptions} data={chartData} />;
}

/**
 * @returns a formatted, abbreviated, histogram bin display text
 */
function getDisplayedBinItem(
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
