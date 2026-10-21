'use client';

import { useState } from 'react';
import HousingDashboard from '@/components/HousingDashboard';
import ProblemSelector, { ProblemId } from '@/components/ProblemSelector';
import SalesDashboard from '@/components/SalesDashboard';

export default function Home() {
  const [problem, setProblem] = useState<ProblemId>('sales');

  return (
    <>
      <div className="problem-selector-shell">
        <ProblemSelector value={problem} onChange={setProblem} />
      </div>
      {problem === 'sales' ? <SalesDashboard /> : <HousingDashboard />}
    </>
  );
}
