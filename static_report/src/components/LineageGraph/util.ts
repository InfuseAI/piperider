function _formatValue(value?: number, formatStyle: string = 'decimal') {
  if (value === undefined) {
    return undefined;
  }

  if (formatStyle === 'decimal') {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  } else if (formatStyle === 'percent') {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  } else if (formatStyle === 'duration') {
    const sign = value < 0 ? '-' : '';
    const abs = Math.abs(value);
    const seconds = Math.floor(abs % 60);
    const minutes = Math.floor((abs / 60) % 60);
    const hours = Math.floor(abs / 3600);

    const fmt2f = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const fmt2d = new Intl.NumberFormat('en-US', {
      minimumIntegerDigits: 2,
    });

    if (abs < 10) {
      return `${sign}${fmt2f.format(abs)}"`;
    } else if (abs < 60) {
      return `${sign}${seconds}"`;
    } else if (abs < 3600) {
      return `${sign}${minutes}'${fmt2d.format(seconds)}"`;
    } else {
      return `${sign}${hours}h${fmt2d.format(minutes)}'${fmt2d.format(
        seconds,
      )}"`;
    }
  }

  return undefined;
}

export function getStatDiff(
  base?: object,
  target?: object,
  key: string = '',
  formatStyle: 'percent' | 'decimal' | 'duration' = 'decimal',
): {
  statValue?: number;
  statValueF?: string;
  statDiff?: number;
  statDiffF?: string;
} {
  const targetValue =
    target !== undefined && target.hasOwnProperty(key)
      ? (target[key] as number)
      : undefined;
  const baseValue =
    base !== undefined && base.hasOwnProperty(key)
      ? (base[key] as number)
      : undefined;
  const statValue = targetValue ?? baseValue;
  if (statValue === undefined) {
    return {};
  }

  const statValueF = _formatValue(statValue, formatStyle);

  if (baseValue === undefined || targetValue === undefined) {
    return { statValue, statValueF };
  }

  const statDiff = targetValue - baseValue;
  const statDiffF = _formatValue(statDiff, formatStyle);

  return { statValue, statValueF, statDiff, statDiffF };
}
