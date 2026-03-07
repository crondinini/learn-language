import { Outlet, NavLink } from "react-router";

const NAV_ITEMS = [
  { to: "/", icon: "💪", label: "Fit" },
  { to: "/plan", icon: "📋", label: "Plan" },
  { to: "/home", icon: "🩸", label: "Cycle" },
  { to: "/calendar", icon: "📅", label: "Calendar" },
  { to: "/settings", icon: "⚙️", label: "Settings" },
];

export function Layout() {
  return (
    <>
      <main style={{ flex: 1, paddingBottom: 80 }}>
        <Outlet />
      </main>
      <nav className="bottom-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `bottom-nav__item${isActive ? " bottom-nav__item--active" : ""}`
            }
          >
            <span className="bottom-nav__icon">{item.icon}</span>
            <span className="bottom-nav__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
