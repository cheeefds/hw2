export type ProblemId = 'sales' | 'housing';

type ProblemSelectorProps = {
  value: ProblemId;
  onChange: (problem: ProblemId) => void;
};

export default function ProblemSelector({ value, onChange }: ProblemSelectorProps) {
  return (
    <div className="problem-selector glass-panel">
      <div>
        <div className="problem-selector__eyebrow">Problem Workspace</div>
        <label htmlFor="problem-select">選擇分析問題</label>
      </div>
      <select
        id="problem-select"
        value={value}
        onChange={(event) => onChange(event.target.value as ProblemId)}
      >
        <option value="sales">Sales：零售需求預測</option>
        <option value="housing">Housing：房價預測</option>
      </select>
    </div>
  );
}
