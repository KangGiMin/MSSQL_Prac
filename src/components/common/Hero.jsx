import { BookOpen } from "lucide-react";
export default function Hero({ onLearn }) {
  return (
    <section className="hero">
      <div>
        <h1>SQL 실습</h1>
        <p>데이터베이스를 선택하고 SQL을 작성해 실행하세요.</p>
      </div>
      <button onClick={onLearn}>
        <BookOpen size={15} />
        학습 문제 보기
      </button>
    </section>
  );
}
