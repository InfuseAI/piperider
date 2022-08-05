import { BarChartDatum } from './../components/SingleReport/SRBarChart';
import * as d3 from 'd3';
import {
  CATEGORY_RANGE,
  TEXTLENGTH,
  DATE_RANGE,
  VALUE_RANGE,
  BOOLEANCOUNT,
} from '../components/shared/ColumnCard/ColumnTypeDetail/constants';

const tooltipDefaultStyle = {
  paddingTop: 'var(--chakra-space-2)',
  paddingBottom: 'var(--chakra-space-2)',
  paddingLeft: 'var(--chakra-space-4)',
  paddingRight: 'var(--chakra-space-4)',
  borderRadius: 'var(--chakra-radii-md)',
  color: 'var(--chakra-colors-white)',
  backgroundColor: 'var(--chakra-colors-blackAlpha-700)',
};

export function getChartTooltip({ target, style = {} as any }) {
  const tooltip = d3
    .select(target)
    .append('div')
    .attr('class', 'chart_tooltip')
    .style('visibility', 'hidden')
    .style('position', 'absolute')
    .style('z-index', '1501')
    .style('padding-top', style?.paddingTop || tooltipDefaultStyle.paddingTop)
    .style(
      'padding-bottom',
      style?.paddingBottom || tooltipDefaultStyle.paddingBottom,
    )
    .style(
      'border-radius',
      style?.borderRadius || tooltipDefaultStyle.borderRadius,
    )
    .style(
      'padding-left',
      style?.paddingLeft || tooltipDefaultStyle.paddingLeft,
    )
    .style(
      'padding-right',
      style?.paddingRight || tooltipDefaultStyle.paddingRight,
    )
    .style('color', style?.color || tooltipDefaultStyle.color)
    .style(
      'background-color',
      style?.backgroundColor || tooltipDefaultStyle.backgroundColor,
    );

  return tooltip;
}

/**
 * get the metric label to display, based on column's generic type
 */
export function getLabelTitle({ type, isCategorical }: BarChartDatum): string {
  const labelTitle = isCategorical
    ? CATEGORY_RANGE
    : type === 'string'
    ? TEXTLENGTH
    : type === 'boolean'
    ? BOOLEANCOUNT
    : type === 'datetime'
    ? DATE_RANGE
    : VALUE_RANGE;

  return labelTitle;
}
