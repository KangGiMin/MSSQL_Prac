import { useState, useEffect } from "react";
import { practiceLabel } from "../database/labels";
import {
  BookOpen,
  ArrowUpRight,
  Lightbulb,
  Eye,
  Code2,
  Check,
  ChevronRight,
  AlertTriangle,
  Copy,
} from "lucide-react";
export default function LessonPanel({
  lesson,
  onLoad,
  onSource,
  completed,
  onComplete,
  onBrowse,
  disabled,
  sourceMatches = true,
}) {
  const [answer, setAnswer] = useState(false);
  useEffect(() => setAnswer(false), [lesson?.id]);
  if (!lesson)
    return (
      <aside className="lesson-panel">
        <p>학습 로드맵에서 문제를 선택하세요.</p>
        <button onClick={onBrowse}>문제 찾아보기</button>
      </aside>
    );
  return (
    <aside className="lesson-panel">
      <div className="lesson-panel-top">
        <span>
          <BookOpen size={15} />
          함께 연습하기
        </span>
        <button
          className="icon-button"
          aria-label="학습 목록 열기"
          onClick={onBrowse}
        >
          <ArrowUpRight size={16} />
        </button>
      </div>
      <div className="lesson-content">
        <div className="lesson-badges">
          <span className="level-badge">{lesson.level}</span>
          <span>{lesson.category}</span>
          {lesson.pages.length > 0 && (
            <span className="source-badge">
              {sourceMatches ? "PDF 기반" : "이전 교재 기반"}
            </span>
          )}
        </div>
        <div className="lesson-number">
          {lesson.kind === "exercise"
            ? `문제 ${lesson.number}`
            : lesson.kind === "advanced"
              ? "확장 실습"
              : "기본 개념"}
        </div>
        <h3>{lesson.title}</h3>
        <p className="lesson-description">{lesson.explanation}</p>
        <div className="lesson-database">
          실습 DB <span>{practiceLabel(lesson.database)}</span>
        </div>
        {lesson.setup && (
          <div className="setup-note">
            <Code2 size={14} />
            <p>
              문제를 열 때 준비 SQL이 먼저 들어갑니다. 준비 부분을 실행한 뒤
              직접 답안을 작성해 보세요.
            </p>
          </div>
        )}
        <div className={`caution-box ${lesson.correction ? "corrected" : ""}`}>
          <div>
            {lesson.correction ? (
              <AlertTriangle size={14} />
            ) : (
              <Lightbulb size={14} />
            )}
            <strong>
              {lesson.correction
                ? "원본 정정 · 꼭 확인하세요"
                : "작성할 때 기억해요"}
            </strong>
          </div>
          <p>{lesson.caution}</p>
        </div>
        <button className="answer-toggle" onClick={() => setAnswer((v) => !v)}>
          <Eye size={14} />
          {answer ? "정답 접기" : "정답 보기"}
          <ChevronRight size={14} className={answer ? "rotated" : ""} />
        </button>
        {answer && (
          <div className="answer-box">
            <pre>{lesson.answer}</pre>
            <button disabled={disabled} onClick={() => onLoad(lesson, true)}>
              <Copy size={13} />
              편집기에 불러오기
            </button>
          </div>
        )}
        {lesson.pages.length > 0 && (
          <button
            className="source-link"
            disabled={!sourceMatches}
            title={
              sourceMatches
                ? undefined
                : "교체된 PDF와 이 문제의 원본 페이지가 일치하지 않습니다."
            }
            onClick={() => onSource(lesson.pages[0])}
          >
            원본 자료 {lesson.pages[0]}–{lesson.pages[1]}쪽{" "}
            <ArrowUpRight size={13} />
          </button>
        )}
      </div>
      <div className="lesson-actions">
        <button
          className="complete-button"
          onClick={() => onComplete(lesson.id)}
        >
          <Check size={15} />
          {completed ? "학습 완료 · 다시 체크 해제" : "이해했어요 · 학습 완료"}
        </button>
        <small>직접 이해 여부를 체크해 주세요.</small>
      </div>
    </aside>
  );
}
