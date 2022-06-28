import * as d3 from 'd3';
import fill from 'lodash/fill';
import zip from 'lodash/zip';

import {
  getChartTooltip,
  getReportAsserationStatusCounts,
  formatNumber,
} from '.';
import { ComparisonChartDataItem, DrawChartArgs } from './types';

const inputBarColor = 'var(--chakra-colors-blue-300)';
const baseBarColor = 'var(--chakra-colors-blue-100)';

//TODO: Refactor file name (currently confusing with component file)
// -- shouldn't this be part of component folder?
//see: https://www.robinwieruch.de/react-folder-structure/
export function drawComparsionChart({
  containerWidth,
  containerHeight,
  svgTarget,
  tooltipTarget,
  data,
}: DrawChartArgs<ComparisonChartDataItem>) {
  const margin = { top: 10, right: 30, bottom: 30, left: 55 };
  const width = containerWidth - margin.left - margin.right;
  const height = containerHeight - margin.top - margin.bottom;
  const overlayOffset = 8;

  const svgEl = d3.select(svgTarget);
  svgEl.selectAll('*').remove();

  const svg = svgEl
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const tooltip = getChartTooltip({ target: tooltipTarget });

  // TODO: Refactor these as utils
  function onShowTooltip(event, d) {
    tooltip
      .html(
        `
        <div>
          <p>Label: ${d.label}</p>
          <p>Count: ${formatNumber(d.value)}</p>
        </div>
      `,
      )
      .transition()
      .duration(500)
      .style('visibility', 'visible');
    //@ts-ignore
    d3.select(this).style('fill', baseBarColor).style('opacity', 0.3);
  }

  function onMoveTooltip(event) {
    tooltip
      .style('top', `${event.pageY - 10}px`)
      .style('left', `${event.pageX + 10}px`);
  }

  function onHideTooltip() {
    tooltip.html('').transition().duration(500).style('visibility', 'hidden');
    //@ts-ignore
    d3.select(this).style('opacity', 0);
  }

  const groups = d3.map<any, any>(data, ({ label }) => label);
  const x = d3.scaleBand().domain(groups).range([0, width]).padding(0.3);

  svg
    .append('g')
    .attr('transform', `translate(0, ${height})`)
    .call(
      d3.axisBottom(x).tickFormat((value, i) => {
        const xAxisItemLength = x.domain().length - 1;

        if (i === 0 || i === xAxisItemLength / 2 || i === xAxisItemLength) {
          return value;
        }
        return null;
      }),
    );

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, ({ base, input }) => Math.max(base, input))])
    .range([height, 0]);
  svg.append('g').call(d3.axisLeft(y));

  const xSubGroup = d3
    .scaleBand()
    .domain(['base', 'input'])
    .range([0, x.bandwidth()])
    .padding(0.05);

  const color = d3
    .scaleOrdinal()
    .domain(['base', 'input'])
    .range([baseBarColor, inputBarColor]);

  svg
    .append('g')
    .selectAll('g')
    .data(data)
    .join('g')
    .attr('transform', (d: any) => `translate(${x(d.label)}, 0)`)
    .selectAll('rect')
    .data(function (d: any) {
      return ['base', 'input'].map(function (key) {
        return { label: d.label, key: key, value: d[key] };
      });
    })
    .join('rect')
    .attr('x', (d) => xSubGroup(d.key))
    .attr('y', (d) => y(d.value))
    .attr('width', xSubGroup.bandwidth())
    .attr('height', (d: any) => height - y(d.value))
    .attr('fill', (d: any) => color(d.key) as any);

  // plot backdrop hover area
  svg
    .selectAll()
    .data(data)
    .enter()
    .append('rect')
    .style('opacity', 0)
    .attr('class', 'overlay-bars')
    .attr('x', (s: any) => x(s.label) - overlayOffset / 2)
    .attr('y', (s: any) => 0)
    .attr('width', x.bandwidth() + overlayOffset)
    .attr('height', (s: any) => height)
    .on('mouseover', onShowTooltip)
    .on('mousemove', onMoveTooltip)
    .on('mouseout', onHideTooltip);
}

export function joinBykey(base = {}, input = {}) {
  const result = {};

  Object.entries(base).forEach(([key, value]) => {
    if (!result[key]) {
      result[key] = {};
    }

    result[key]['base'] = value;
  });

  Object.entries(input).forEach(([key, value]) => {
    if (!result[key]) {
      result[key] = {};
    }
    result[key]['input'] = value;
  });

  return result;
}

export function getComparisonTests(assertion, from) {
  const { passed, failed } = getReportAsserationStatusCounts(assertion);

  if (assertion) {
    const table = assertion.tests.map((test) => ({
      ...test,
      level: 'Table',
      column: '-',
      from,
    }));

    const columns = Object.keys(assertion.columns).map((column) => {
      const columnAssertion = assertion.columns[column];
      return columnAssertion.map((test) => ({
        ...test,
        level: 'Column',
        column,
        from,
      }));
    });

    return {
      passed,
      failed,
      tests: [...table, ...columns.flat()],
    };
  }

  return {
    passed,
    failed,
    tests: [],
  };
}

// for `type` equal to string, datetime
export function transformDistribution({ base, input }) {
  const mapIndex = {};
  const result = [];

  for (let i = 0; i < base.labels.length; i++) {
    let label = base.labels[i];
    let count = base.counts[i];
    mapIndex[label] = i;
    result.push({
      label: label,
      base: count,
      input: 0,
    });
  }

  for (let i = 0; i < input.labels.length; i++) {
    let label = input.labels[i];
    let count = input.counts[i];

    if (mapIndex.hasOwnProperty(label)) {
      result[mapIndex[label]].input = count;
    } else {
      result.push({
        label: label,
        base: 0,
        input: count,
      });
    }
  }

  return result;
}

export function transformDistributionWithLabels({ base, input, labels }) {
  if (!base) {
    base = fill(Array(labels.length), 0);
  }

  if (!input) {
    input = fill(Array(labels.length), 0);
  }

  const z = zip(labels, base, input);
  const m = z.map(([label, base, input]) => ({
    label,
    base,
    input,
  }));

  return m;
}
