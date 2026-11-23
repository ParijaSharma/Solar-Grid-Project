import {
  LayoutDashboard,
  Sun,
  Activity,
  TrendingUp,
  FileText,
  Settings,
} from "lucide-react";
import "./OwnerSidebar.css";

function Sidebar({ activeTab = "overview", onSelectTab }) {
  const menuItems = [
    { id: "overview", label: "Overview", Icon: LayoutDashboard },
    { id: "farms", label: "Solar farms", Icon: Sun },
    { id: "performance", label: "Performance", Icon: Activity },
    { id: "forecast", label: "Energy forecast", Icon: TrendingUp },
    { id: "reports", label: "Reports", Icon: FileText },
    { id: "settings", label: "Settings", Icon: Settings },
  ];

  return (
    <aside className="sidebar owner-sidebar">
      <div className="owner-logo">
        <Sun size={21} />
        <span>SolarHub <strong>AI</strong></span>
      </div>

      <div className="owner-nav-label">WORKSPACE</div>

      <nav className="owner-navigation">
        {menuItems.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`owner-nav-item ${
              activeTab === id ? "active" : ""
            }`}
            onClick={() => onSelectTab?.(id)}
          >
            <Icon size={17} strokeWidth={1.7} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="owner-sidebar-footer">
        Solar farm management
      </div>
    </aside>
  );
}

export default Sidebar;

