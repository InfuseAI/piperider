import { IconType } from 'react-icons/lib';
import { FiCloud, FiPlus } from 'react-icons/fi';

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
