import { ClipboardList, Shuffle } from "lucide-react";
import { practiceLabel } from "../database/labels";

export default function PracticeProblem({ problem, onNext, disabled }) {
  return (
    <section
      className="practice-problem"
      aria-labelledby="practice-problem-title"
      data-problem-id={problem.id}
      data-database={problem.database}
    >
      <div className="practice-problem-toolbar">
        <span>
          <ClipboardList size={16} />
          이번 실습 문제
        </span>
        <button
          onClick={onNext}
          disabled={disabled}
          title="문제만 바꾸고 작성 중인 SQL은 유지합니다."
        >
          <Shuffle size={14} />
          다른 문제
        </button>
      </div>
      <div key={problem.id} className="practice-problem-body">
        <div className="lesson-database">
          실습 데이터 <span>{practiceLabel(problem.database)}</span>
        </div>
        <h3 id="practice-problem-title">{problem.title}</h3>
        <ol>
          {problem.requirements.map((requirement) => (
            <li key={requirement}>{requirement}</li>
          ))}
        </ol>
        <div className="practice-problem-tables">
          사용할 테이블{" "}
          {problem.tables.map((table) => (
            <code key={table}>dbo.{table}</code>
          ))}
        </div>
        <div className="practice-problem-help">
          <details>
            <summary>힌트 보기</summary>
            <p>{problem.hint}</p>
          </details>
          <details>
            <summary>정답 보기</summary>
            <p>같은 결과를 얻는 다른 SQL도 가능합니다.</p>
            <pre>{problem.answer}</pre>
          </details>
        </div>
        <p className="practice-problem-note">
          아래에 SQL을 작성하고 실행해 보세요. 문제를 바꿔도 작성한 SQL은
          유지됩니다. 새로고침하면 새 문제와 빈 입력창으로 시작합니다.
        </p>
      </div>
    </section>
  );
}
