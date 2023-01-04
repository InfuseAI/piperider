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
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { BLACK_COLOR, colorMap, BusinessMetric, skipped } from '../../lib';

import 'chartjs-adapter-date-fns';
/**
 * A line chart variant to visualize dbt processed business metrics, based on the dimension and time grain provided via Piperider CLI's report `metrics` property.
 */
type Props = {
  data?: (BusinessMetric | undefined)[]; //treat as multiple datasets
  timeGrain?: TimeUnit;
  fill?: boolean;
  stacked?: boolean;
  hasDimensions?: boolean;
};
export function BMLineChart({
  data = [],
  timeGrain,
  fill,
  stacked,
  hasDimensions,
}: Props) {
  ChartJS.register(
    LineElement,
    PointElement,
    TimeSeriesScale,
    LinearScale,
    CategoryScale,
    Filler,
    Legend,
    Tooltip,
  );

  const datasets: ChartDataset<'line'>[] = [];
  //NOTE: colorList (max: up to 6)
  const colorList = [...colorMap.values()];

  const isComparison = !hasDimensions && data.length === 2;

  // for each BMGroup, map its chart dataset (base, value, ...dimensions?)
  data.forEach((d, i) => {
    const { data = [] } = d ?? {};
    const [labels, dataValues = []] = data;

    //use {x, y} for dynamic date range (rather than data.cat-labels)
    const chartXYDataset: ChartDataset<'line'>['data'] = dataValues.map(
      (v, k) => {
        const x = labels[k] as any; //NOTE: type doesn't support this.
        const y = Number(v ?? undefined);
        return { x, y };
      },
    );

    const label = isComparison ? (i === 0 ? 'Base' : 'Target') : d?.label;

    datasets.push({
      label,
      data: chartXYDataset,
      borderColor: colorList[i],
      pointBackgroundColor: colorList[i],
      spanGaps: true,
      fill,
      backgroundColor: colorList[i] + '50',
      segment: {
        borderColor: (ctx) => skipped(ctx, 'rgb(0,0,0,0.2)'),
        borderDash: (ctx) => skipped(ctx, [6, 6]),
        backgroundColor: (ctx) => skipped(ctx, 'rgb(0,0,0,0.1)'),
      },
    });
  });

  const chartOpts: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      filler: {},
      tooltip: {
        mode: 'index',
        position: 'nearest',
        intersect: false,
        callbacks: {
          title([{ label }]) {
            const endAt = label.lastIndexOf(',');
            return label.slice(0, endAt);
          },
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
          generateLabels({ data: { datasets } }) {
            return datasets.map((ds, i) => ({
              fillStyle: colorList[i],
              text: `${ds.label}`,
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
      y: {
        stacked,
      },
    },
  };
  const chartData: ChartData<'line'> = {
    datasets,
  };

  return <Line data={chartData} options={chartOpts} />;
}
