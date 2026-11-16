import {
  Building2,
  ShoppingBag,
  GraduationCap,
  Check,
  Database,
} from "lucide-react";
import { practiceData } from "./labels";
const icons = {
  building: Building2,
  shopping: ShoppingBag,
  graduation: GraduationCap,
};
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
          연습할 데이터
        </h2>
      </div>
      <p className="database-help">하나를 고르면 아래 SQL 실습에 적용됩니다.</p>
      <div
        className="database-cards"
        role="group"
        aria-label="연습 데이터 선택"
      >
        {databases.map((db) => {
          const Icon = icons[db.icon] || Database;
          const presentation = practiceData[db.id] || {
            name: db.label,
            description: db.subtitle,
          };
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
              <div className="database-label">
                <h3>{presentation.name}</h3>
                <p>{presentation.description}</p>
              </div>
              {selected === db.id && (
                <span className="card-select">
                  <Check size={14} aria-hidden="true" />
                  <span>선택됨</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
