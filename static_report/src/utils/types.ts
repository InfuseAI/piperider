export type SingleChartDataItem = {
  label: string;
  value: number;
  total: number;
};
export type ComparisonChartDataItem = {
  label: string;
  base: number;
  input: number;
};
export type ChartProps<T> = {
  data: T[];
};
export type DrawChartArgs<T> = {
  containerWidth: number;
  containerHeight: number;
  svgTarget: any;
  tooltipTarget: any;
  data: T[];
};
