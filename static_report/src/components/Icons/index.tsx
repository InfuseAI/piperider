import { IconType } from 'react-icons';
import { AiOutlineFileText } from 'react-icons/ai';
import { BiQuestionMark, BiText } from 'react-icons/bi';
import { BsCalendarDate } from 'react-icons/bs';
import { FaChartBar } from 'react-icons/fa';
import { FiCloud, FiGrid, FiPlus } from 'react-icons/fi';
import { TbCircleHalf } from 'react-icons/tb';
import { TiSortNumerically } from 'react-icons/ti';
import {
  VscDiffAdded,
  VscDiffModified,
  VscDiffRemoved,
  VscSymbolOperator,
} from 'react-icons/vsc';
import { ChangeStatus, ImpactStatus } from '../../lib';

export const IconAdded = VscDiffAdded;
export const IconRemoved = VscDiffRemoved;
export const IconModified = VscDiffModified;
export const IconChanged = (props) => {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      stroke-width="0"
      viewBox="0 0 16 16"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M8 11 a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
      />

      <path fill-rule="evenodd" clip-rule="evenodd" d="" />
    </svg>
  );
};

export const IconDsImpacted = (props) => {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      stroke-width="0"
      viewBox="0 0 16 16"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M1.5 1 h13 l.5.5 v13 l-.5.5 h-13 l-.5-.5 v-13l.5-.5zM2 2v4h-1v4h1v4h4v1h4v-1h4v-4h1v-4h-1v-4h-4v-1h-4v1h-4z"
      />
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M8 11 a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
      />

      <path fill-rule="evenodd" clip-rule="evenodd" d="" />
    </svg>
  );
};

export const IconDsPotential = (props) => {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      stroke-width="0"
      viewBox="0 0 16 16"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M1.5 1 h13 l.5.5 v13 l-.5.5 h-13 l-.5-.5 v-13l.5-.5zM2 2v4h-1v4h1v4h4v1h4v-1h4v-4h1v-4h-1v-4h-4v-1h-4v1h-4z"
      />
      <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286zm1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94z"></path>
    </svg>
  );
};

export const IconDsNoChanged = (props) => {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      stroke-width="0"
      viewBox="0 0 16 16"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M1.5 1 h13 l.5.5 v13 l-.5.5 h-13 l-.5-.5 v-13l.5-.5zM2 2v4h-1v4h1v4h4v1h4v-1h4v-4h1v-4h-1v-4h-4v-1h-4v1h-4z"
      />
      <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"></path>
    </svg>
  );
};

export const IconImplicit = IconDsImpacted;

export function getIconForChangeStatus(
  changeStatus?: ChangeStatus,
  impactStatus?: ImpactStatus,
): {
  color: string;
  icon: any; //IconType not provided
} {
  if (changeStatus === 'added') {
    return { color: '#1dce00', icon: IconAdded };
  } else if (changeStatus === 'removed') {
    return { color: '#ff067e', icon: IconRemoved };
  } else if (changeStatus === 'modified') {
    return { color: '#ffa502', icon: IconModified };
  } else if (changeStatus === 'col_added') {
    return { color: '#1dce00', icon: IconAdded };
  } else if (changeStatus === 'col_removed') {
    return { color: '#ff067e', icon: IconRemoved };
  } else if (changeStatus === 'col_changed') {
    return { color: '#ffa502', icon: IconModified };
  } else if (changeStatus === 'folder_changed') {
    return { color: '#ffa502', icon: IconChanged };
  }

  if (impactStatus === 'impacted') {
    return { color: '#fd6136', icon: IconDsImpacted };
  }

  return { color: 'inherit', icon: undefined };
}

export function getIconForResourceType(resourceType?: string): {
  color: string;
  icon: any; //IconType not provided
} {
  if (resourceType === 'model') {
    return { color: '#c0eafd', icon: FiGrid };
  } else if (resourceType === 'source' || resourceType === 'seed') {
    return { color: '#a6dda6', icon: FiGrid };
  } else if (
    resourceType === 'metric' ||
    resourceType === 'exposure' ||
    resourceType === 'analysis'
  ) {
    return { color: 'rgb(255 230 238)', icon: FaChartBar };
  } else {
    return { color: 'inherit', icon: undefined };
  }
}

export function getIconForColumnType(type?: string): {
  backgroundColor: string;
  icon: any; //IconType not provided
} {
  if (type === 'integer') {
    return { backgroundColor: 'orange.500', icon: TiSortNumerically };
  }
  if (type === 'string') {
    return { backgroundColor: 'blue.500', icon: BiText };
  }
  if (type === 'numeric') {
    return { backgroundColor: 'red.500', icon: VscSymbolOperator };
  }
  if (type === 'datetime') {
    return { backgroundColor: 'teal.500', icon: BsCalendarDate };
  }
  if (type === 'boolean') {
    return { backgroundColor: 'pink.500', icon: TbCircleHalf };
  }
  if (type === 'other') {
    return { backgroundColor: 'limegreen', icon: AiOutlineFileText };
  }
  return { backgroundColor: 'gray.500', icon: BiQuestionMark };
}

export const CloudPlusIcon: IconType = () => {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <FiCloud size={30} color="#888888" />
      <FiPlus
        size={15}
        color="#888888"
        style={{
          position: 'absolute',
          bottom: '7px',
          right: '10px',
        }}
      />
    </div>
  );
};
