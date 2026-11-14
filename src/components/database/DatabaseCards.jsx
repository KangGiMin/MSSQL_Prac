import {
  Building2,
  ShoppingBag,
  GraduationCap,
  Check,
  ArrowUpRight,
  Database,
} from "lucide-react";
const icons = { company: Building2, store: ShoppingBag, campus: GraduationCap };
export default function DatabaseCards({
  databases,
  selected,
  onSelect,
  disabled,
}) {
  return (
    <section className="database-section">
      <div className="section-heading">
        <h2>
          <Database size={16} />
          데이터베이스 선택
        </h2>
        <span>실습할 데이터를 고르세요</span>
      </div>
      <div className="database-cards">
        {databases.map((db) => {
          const Icon = icons[db.id] || Database;
          return (
            <button
              key={db.id}
              disabled={disabled}
              className={`database-card ${selected === db.id ? "selected" : ""}`}
              aria-pressed={selected === db.id}
              onClick={() => onSelect(db.id)}
              style={{ "--card-accent": db.color }}
            >
              <span className="database-icon">
                <Icon size={22} />
              </span>
              <div>
                <h3>{db.label}</h3>
                <p>{db.subtitle}</p>
                <span className="database-meta">
                  기본 테이블 {db.tables.length}개
                </span>
              </div>
              <span className="card-select">
                {selected === db.id ? (
                  <Check size={14} />
                ) : (
                  <ArrowUpRight size={17} />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
