import "../../styles/DashboardTabs.css";

export default function DashboardTabs({ tabs, activeTab, setActiveTab, loading }) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`tab ${activeTab === t.id ? "active" : ""}`}
          type="button"
          onClick={() => setActiveTab(t.id)}
          disabled={loading}
          aria-pressed={activeTab === t.id}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
