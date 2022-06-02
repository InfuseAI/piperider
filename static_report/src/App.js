import { SingleReport } from './components/SingleReport';
import { ComparisonReport } from './components/ComparsionReport';

function App() {
  const isSingleReport = process.env.REACT_APP_SINGLE_REPORT === 'true';

  if (isSingleReport) {
    return (
      <SingleReport />
    );
  }

  return <ComparisonReport />;
}

export default App;
