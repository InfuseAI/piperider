import {
  CategoryScale,
  ChartData,
  ChartDataset,
  LinearScale,
  TimeSeriesScale,
  Tooltip,
  Chart as ChartJS,
  ChartOptions,
  LineElement,
  PointElement,
  TimeUnit,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  BLACK_COLOR,
  colorMap,
  DBTBusinessMetricGroupItem,
  skipped,
} from '../../lib';

import 'chartjs-adapter-date-fns';
/**
 * A line chart variant to visualize dbt processed business metrics, based on the dimension and time grain provided via Piperider CLI's report `metrics` property.
 */
type Props = {
  data?: (DBTBusinessMetricGroupItem | undefined)[]; //treat as multiple datasets
  timeGrain?: TimeUnit;
};
export function BMLineChart({ data = [], timeGrain }: Props) {
  ChartJS.register(
    LineElement,
    PointElement,
    TimeSeriesScale,
    LinearScale,
    CategoryScale,
    Legend,
    Tooltip,
  );

  let labelVal;
  const datasets: ChartDataset<'line'>[] = [];
  //NOTE: colorList (max: up to 6)
  const colorList = [...colorMap.values()];

  // for each BMGroup, map its chart dataset
  data.forEach((d, i) => {
    const { data = [] } = d ?? {};
    const [labels, dataValues = []] = data;

    //NOTE: narrow dependency (first-val: target > base)
    labelVal = labelVal ?? labels;

    //FIXME: Hack for target delta
    // fallback to undefined for coalescing NaN
    const numericalDataValues = dataValues.map(
      (v) => Number(v ?? undefined) * (i === 0 ? 1 : 2),
    );

    datasets.push({
      label: i === 0 ? 'Base' : 'Target',
      data: numericalDataValues,
      borderColor: colorList[i],
      pointBackgroundColor: colorList[i],
      spanGaps: true,
      segment: {
        borderColor: (ctx) => skipped(ctx, 'rgb(0,0,0,0.2)'),
        borderDash: (ctx) => skipped(ctx, [6, 6]),
      },
    });
  });

  const chartOpts: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      tooltip: {
        mode: 'index',
        position: 'nearest',
        intersect: false,
        callbacks: {
          labelColor: function ({ datasetIndex }) {
            return {
              borderColor: BLACK_COLOR,
              backgroundColor: colorList[datasetIndex],
            };
          },
        },
      },
      legend: {
        // might have to replace to support deselection?
        position: 'bottom',
        labels: {
          padding: 10,
          boxWidth: 30,
          generateLabels({ data: { datasets, labels } }) {
            return datasets.map((ds, i) => ({
              fillStyle: colorList[i],
              text: `${i === 0 ? 'Base' : 'Target'}`,
            }));
          },
        },
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: timeGrain,
        },
      },
    },
  };
  const chartData: ChartData<'line'> = {
    datasets,
    labels: labelVal,
  };

  return <Line data={chartData} options={chartOpts} />;
}
