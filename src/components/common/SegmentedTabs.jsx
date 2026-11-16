export default function SegmentedTabs({
  items,
  value,
  onChange,
  pressed = false,
}) {
  return (
    <div className="segmented">
      {items.map(({ id, label, icon: Icon, count }) => (
        <button
          key={id}
          className={value === id ? "active" : ""}
          aria-pressed={pressed ? value === id : undefined}
          onClick={() => onChange(id)}
        >
          {Icon && <Icon size={15} />}
          {`${label} `}
          {count}
        </button>
      ))}
    </div>
  );
}
