import { ColumnAssertionLabelWidget } from '../../../Widgets/ColumnAssertionLabelWidget';
import { getAssertions } from '../../../../../utils/assertion';
import { type AssertionTest } from '../../../../../sdlc/single-report-schema';

export function SRTableListAssertionsSummary({
  assertions,
}: {
  assertions: AssertionTest[];
}) {
  const { total, failed } = getAssertions(assertions);
  const isPassed = failed === 0;

  return (
    <ColumnAssertionLabelWidget
      isPassed={isPassed}
      total={total}
      failed={failed}
    />
  );
}
