import SegmentedTabs from "../common/SegmentedTabs";
import { browserSql } from "../../config/runtime";
import { browserLessonLimits } from "../../config/browserSupport";
import { useState } from "react";
import {
  Search,
  CheckCircle2,
  BookOpen,
  Code2,
  FileText,
  ChevronRight,
} from "lucide-react";
export default function LessonLibrary({
  lessons,
  completed,
  onChoose,
  kind = "concept",
  coverage,
}) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("전체"),
    [filter, setFilter] = useState(kind);
  const source = lessons.filter((l) => filter === "all" || l.kind === filter);
  const categories = ["전체", ...new Set(source.map((l) => l.category))];
  const visible = source.filter(
    (l) =>
      (category === "전체" || l.category === category) &&
      `${l.title} ${l.category} ${l.explanation} ${l.number || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="library">
      <div className="library-controls">
        <SegmentedTabs
          items={[
            {
              id: "concept",
              label: "개념",
              icon: BookOpen,
              count: coverage.concepts,
            },
            {
              id: "exercise",
              label: "기출",
              icon: Code2,
              count: coverage.exercises,
            },
            { id: "advanced", label: "확장 실습", count: coverage.advanced },
          ]}
          value={filter}
          pressed
          onChange={(next) => {
            setFilter(next);
            setCategory("전체");
          }}
        />
        <div className="library-search">
          <Search size={16} />
          <input
            aria-label="학습 내용 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제목·내용 검색"
          />
        </div>
      </div>
      <div className="category-filters">
        {categories.map((c) => (
          <button
            key={c}
            className={category === c ? "active" : ""}
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="library-summary">{visible.length}개 학습 항목</div>
      <div className="lesson-grid">
        {visible.map((lesson, i) => (
          <button
            className={`lesson-card ${completed.includes(lesson.id) ? "completed" : ""}`}
            key={lesson.id}
            onClick={() => onChoose(lesson)}
          >
            <span className="lesson-card-number">
              {lesson.kind === "exercise"
                ? `Q.${lesson.number.split("-")[0]}`
                : String(i + 1).padStart(2, "0")}
            </span>
            <div className="lesson-card-body">
              <div className="lesson-card-title">
                <h3>{lesson.title}</h3>
                {completed.includes(lesson.id) ? (
                  <CheckCircle2 size={17} aria-label="학습 완료" />
                ) : (
                  <ChevronRight size={17} />
                )}
              </div>
              <p>{lesson.explanation}</p>
              <footer>
                {browserSql && browserLessonLimits[lesson.id] && (
                  <span className="correction-label">SQL Server 실습 필요</span>
                )}
                <span className="lesson-category">
                  {lesson.category} · {lesson.level}
                </span>
                <span>
                  {lesson.pages.length
                    ? `${coverage.matchesSource === false ? "이전 교재" : "원본"} ${lesson.pages[0]}–${lesson.pages[1]}쪽`
                    : "추가 실습"}
                </span>
                {lesson.correction && (
                  <span className="correction-label">원본 정정</span>
                )}
              </footer>
            </div>
          </button>
        ))}
      </div>
      {!visible.length && (
        <div className="result-empty">
          <Search size={26} />
          <strong>검색 결과가 없습니다</strong>
          <p>다른 키워드나 주제를 선택해 보세요.</p>
        </div>
      )}
      {filter === "exercise" && (
        <details className="coverage-note">
          <summary>
            <FileText size={16} />
            교재·문항 안내
          </summary>
          <div>
            <p>{coverage.note}</p>
            <p>
              원본에 없는 문항 번호: {coverage.missingSourceNumbers.join(", ")}.
              문제 10은 원본에서 번호 없이 수록된 부산지점 응용 문제입니다.
            </p>
          </div>
        </details>
      )}
    </div>
  );
}
