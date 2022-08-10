import {
  ChartOptions,
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  ChartData,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar } from 'react-chartjs-2';
import { Topk } from '../../../sdlc/single-report-schema';
import { formatAsAbbreviatedNumber } from '../../../utils/formatters';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);
interface Props {
  data: Topk;
}
/**
 * A horizontal bar chart that visualized categorical dataset plotted against each category group
 * @param data the topk value (categorical counts)
 * @returns
 */
export function CategoricalBarChart({ data }: Props) {
  const { counts, values } = data;

  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
      },
    },
    plugins: {
      tooltip: {
        mode: 'y',
        position: 'nearest',
        intersect: false,
      },
      datalabels: {
        labels: {
          title: {
            align: 'end',
            anchor: 'end',
            formatter(val) {
              return isNaN(val) ? val : formatAsAbbreviatedNumber(val);
            },
          },
        },
      },
    },
  };
  const chartData: ChartData<'bar'> = {
    labels: values,
    datasets: [
      {
        indexAxis: 'y',
        data: counts,
        backgroundColor: '#63B3ED',
        borderColor: '#4299E1',
        borderRadius: 24,
        hoverBackgroundColor: '#002A53',
        categoryPercentage: 0.5,
      },
    ],
  };
  return (
    <Bar data={chartData} options={chartOptions} plugins={[ChartDataLabels]} />
  );
}
