import { BookOpen } from "lucide-react";
export default function Hero({ onLearn }) {
  return (
    <section className="hero">
      <div>
        <h1>SQL 실습</h1>
        <p>데이터를 고르면 실습 문제가 나옵니다. SQL을 작성해 풀어보세요.</p>
      </div>
      <button onClick={onLearn}>
        <BookOpen size={15} />
        학습 문제 보기
      </button>
    </section>
  );
}
