import { useRoute } from 'wouter';
import { getIconForResourceType } from '../components/Icons';
import {
  EVENTS,
  NoData,
  SR_TYPE_LABEL,
  TableColumnHeader,
  useReportStore,
  useTrackOnMount,
} from '../lib';
import { SEMANTIC_MODEL_DETAILS_ROUTE_PATH } from '../utils/routes';

export function SRSemanticModelPage() {
  const [match, params] = useRoute(SEMANTIC_MODEL_DETAILS_ROUTE_PATH);

  useTrackOnMount({
    eventName: EVENTS.PAGE_VIEW,
    eventProperties: {
      type: SR_TYPE_LABEL,
      page: 'resource-page',
    },
  });

  if (!match) {
    return <>Something wrong.</>;
  }

  const { tableColumnsOnly = [] } = useReportStore.getState();
  const entry = tableColumnsOnly.find(([key]) => key === params?.uniqueId);
  if (!entry) {
    return <NoData text={`No data found for '${params?.uniqueId}'`} />;
  }

  const [, { base: data }] = entry;

  const name = data?.name;
  const description = data?.description;
  const resourceType = data?.resource_type;
  const { icon } = getIconForResourceType(resourceType);

  return (
    <>
      <TableColumnHeader
        subtitle="Semantic Model"
        title={name}
        icon={icon}
        infoTip={description}
      />
    </>
  );
}
