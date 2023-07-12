import { AiOutlineFileText } from 'react-icons/ai';
import { BiQuestionMark, BiText } from 'react-icons/bi';
import { BsCalendarDate } from 'react-icons/bs';
import { FaChartBar } from 'react-icons/fa';
import { FiGrid } from 'react-icons/fi';
import { TbCircleHalf } from 'react-icons/tb';
import { TiSortNumerically } from 'react-icons/ti';
import {
  VscDiffAdded,
  VscDiffModified,
  VscDiffRemoved,
  VscSymbolOperator,
} from 'react-icons/vsc';
import { ChangeStatus } from '../../lib';

export const IconAdded = VscDiffAdded;
export const IconRemoved = VscDiffRemoved;
export const IconModified = VscDiffModified;
export const IconImplicit = (props) => {
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

export function getIconForChangeStatus(changeStatus?: ChangeStatus): {
  color: string;
  icon: any; //IconType not provided
} {
  if (changeStatus === 'added') {
    return { color: '#1dce00', icon: IconAdded };
  } else if (changeStatus === 'removed') {
    return { color: '#ff067e', icon: IconRemoved };
  } else if (changeStatus === 'modified') {
    return { color: '#ffc808', icon: IconModified };
  } else if (changeStatus === 'implicit') {
    return { color: '#fd6136', icon: IconImplicit };
  } else {
    return { color: 'inherit', icon: undefined };
  }
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
