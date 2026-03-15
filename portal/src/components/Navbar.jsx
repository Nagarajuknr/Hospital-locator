// portal/src/components/Navbar.jsx
import { useAuth } from "../services/AuthContext";

export default function Navbar({ page, setPage }) {
  const { user, logout, isLoggedIn, isStaff } = useAuth();

  const navItems = [
    { id:"hospitals",   label:"🏥 Hospitals",    always:true },
    { id:"blood",       label:"🩸 Blood Bank",   always:true },
    { id:"track",       label:"📍 Track Patient",always:true },
    { id:"appointments",label:"📅 My Bookings",  auth:true   },
    { id:"staff",       label:"🏨 Staff Panel",  staff:true  },
  ];

  const visible = navItems.filter(n =>
    n.always || (n.auth && isLoggedIn) || (n.staff && isStaff)
  );

  return (
    <nav style={{
      background:"#0D3B7A", display:"flex", alignItems:"center",
      padding:"0 16px", height:52, gap:4, overflowX:"auto",
    }}>
      <span style={{ color:"#fff", fontWeight:800, fontSize:16, marginRight:12, whiteSpace:"nowrap" }}>
        🏥 MediGuide
      </span>

      <div style={{ display:"flex", gap:2, flex:1 }}>
        {visible.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)}
            style={{
              background: page===n.id ? "#1A56A0" : "transparent",
              color:"#fff", border:"none", borderRadius:6,
              padding:"6px 12px", cursor:"pointer", fontSize:13,
              fontWeight: page===n.id ? 700 : 400, whiteSpace:"nowrap",
              fontFamily:"inherit",
            }}
          >{n.label}</button>
        ))}
      </div>

      <div style={{ marginLeft:"auto" }}>
        {isLoggedIn ? (
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ color:"#BFDBFE", fontSize:13 }}>
              👤 {user?.name || user?.phone}
            </span>
            <button onClick={logout} style={{
              background:"#FEE2E2", color:"#991B1B", border:"none",
              borderRadius:6, padding:"5px 12px", cursor:"pointer",
              fontSize:12, fontWeight:600, fontFamily:"inherit",
            }}>Logout</button>
          </div>
        ) : (
          <button onClick={() => setPage("login")} style={{
            background:"#FCD34D", color:"#0D3B7A", border:"none",
            borderRadius:6, padding:"6px 14px", cursor:"pointer",
            fontWeight:700, fontSize:13, fontFamily:"inherit",
          }}>Login</button>
        )}
      </div>
    </nav>
  );
}
