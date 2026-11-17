
function Navbar({ activePage, onNavigate }) {
  const pages = [
    { id: "dashboard", label: "Dashboard", icon: "⌂" },
    { id: "statistics", label: "Statistiche", icon: "▥" },
    { id: "controls", label: "Controlli", icon: "⚙" },
    { id: "maintenance", label: "Manutenzione", icon: "🔧" },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-icon">🌱</span>
        <h2>PlantPulse</h2>
      </div>

      <p className="menu-label">MENU PRINCIPALE</p>

      <nav>
        {pages.map((page) => (
          <button
            key={page.id}
            className={
              activePage === page.id
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => onNavigate(page.id)}
          >
            <span>{page.icon}</span>
            {page.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        PlantPulse v0.1.0
      </div>
    </aside>
  );
}

export default Navbar;
