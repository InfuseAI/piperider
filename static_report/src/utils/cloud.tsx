import React, { createContext, useContext } from 'react';

const CloudReportContext = createContext(false);

interface Props {
  cloud: boolean;
  children: React.ReactNode;
}
export const CloudReportProvider = ({ cloud, children }: Props) => {
  return (
    <CloudReportContext.Provider value={cloud}>
      {children}
    </CloudReportContext.Provider>
  );
};

export function useCloudReport() {
  return useContext(CloudReportContext);
}
