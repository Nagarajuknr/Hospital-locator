// portal/src/components/UI.jsx
// Reusable components used across all pages.
// Import what you need: import { Button, Card, Badge, Spinner } from "../components/UI"

// ── Spinner ───────────────────────────────────────────────
export function Spinner({ size = 32, color = "#1A56A0" }) {
  return (
    <div style={{ display:"flex", justifyContent:"center", padding:40 }}>
      <div style={{
        width: size, height: size, border: `3px solid #E5E7EB`,
        borderTop: `3px solid ${color}`, borderRadius:"50%",
        animation:"spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Button ────────────────────────────────────────────────
export function Button({ children, onClick, variant="primary", disabled=false, fullWidth=false, size="md", type="button" }) {
  const styles = {
    primary:   { background:"#1A56A0", color:"#fff", border:"none" },
    secondary: { background:"#F3F4F6", color:"#1F2937", border:"1px solid #D1D5DB" },
    danger:    { background:"#DC2626", color:"#fff", border:"none" },
    success:   { background:"#16A34A", color:"#fff", border:"none" },
    ghost:     { background:"transparent", color:"#1A56A0", border:"1px solid #1A56A0" },
  };
  const sizes = {
    sm: { padding:"6px 12px", fontSize:13 },
    md: { padding:"10px 20px", fontSize:14 },
    lg: { padding:"14px 28px", fontSize:16 },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{
        ...styles[variant], ...sizes[size],
        borderRadius:8, fontWeight:600, cursor:disabled?"not-allowed":"pointer",
        opacity:disabled?0.6:1, width:fullWidth?"100%":"auto",
        transition:"opacity 0.15s, transform 0.1s",
        fontFamily:"inherit",
      }}
    >{children}</button>
  );
}

// ── Card ──────────────────────────────────────────────────
export function Card({ children, style={}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background:"#fff", borderRadius:12,
      boxShadow:"0 1px 4px rgba(0,0,0,0.08)",
      border:"1px solid #F3F4F6", padding:20,
      cursor:onClick?"pointer":"default",
      transition:"box-shadow 0.15s",
      ...style,
    }}>{children}</div>
  );
}

// ── Badge ─────────────────────────────────────────────────
export function Badge({ label, color="blue" }) {
  const colors = {
    blue:   { bg:"#DBEAFE", text:"#1E40AF" },
    green:  { bg:"#DCFCE7", text:"#166534" },
    red:    { bg:"#FEE2E2", text:"#991B1B" },
    orange: { bg:"#FEF3C7", text:"#92400E" },
    purple: { bg:"#EDE9FE", text:"#5B21B6" },
    gray:   { bg:"#F3F4F6", text:"#4B5563" },
  };
  const c = colors[color] || colors.blue;
  return (
    <span style={{
      background:c.bg, color:c.text,
      padding:"3px 10px", borderRadius:20,
      fontSize:12, fontWeight:600, whiteSpace:"nowrap",
    }}>{label}</span>
  );
}

// ── Input ─────────────────────────────────────────────────
export function Input({ label, value, onChange, placeholder, type="text", error }) {
  return (
    <div style={{ marginBottom:16 }}>
      {label && <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>{label}</label>}
      <input
        type={type} value={value} onChange={onChange}
        placeholder={placeholder}
        style={{
          width:"100%", padding:"10px 14px", borderRadius:8,
          border: error ? "1px solid #DC2626" : "1px solid #D1D5DB",
          fontSize:14, outline:"none", boxSizing:"border-box",
          fontFamily:"inherit",
        }}
      />
      {error && <p style={{ color:"#DC2626", fontSize:12, marginTop:4 }}>{error}</p>}
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────────
export function PageHeader({ title, subtitle, back }) {
  return (
    <div style={{ background:"#0D3B7A", padding:"16px 20px", color:"#fff" }}>
      {back && (
        <button onClick={back} style={{
          background:"none", border:"none", color:"#93C5FD",
          cursor:"pointer", fontSize:14, padding:0, marginBottom:8,
          fontFamily:"inherit",
        }}>← Back</button>
      )}
      <h1 style={{ margin:0, fontSize:20, fontWeight:700 }}>{title}</h1>
      {subtitle && <p style={{ margin:"4px 0 0", fontSize:13, color:"#BFDBFE" }}>{subtitle}</p>}
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────
export function EmptyState({ icon="📭", title, message }) {
  return (
    <div style={{ textAlign:"center", padding:60, color:"#6B7280" }}>
      <div style={{ fontSize:48, marginBottom:12 }}>{icon}</div>
      <div style={{ fontWeight:600, fontSize:16, color:"#374151", marginBottom:6 }}>{title}</div>
      {message && <div style={{ fontSize:14 }}>{message}</div>}
    </div>
  );
}

// ── ErrorBox ──────────────────────────────────────────────
export function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div style={{
      background:"#FEE2E2", border:"1px solid #FECACA",
      borderRadius:8, padding:"12px 16px",
      color:"#991B1B", fontSize:14, marginBottom:16,
    }}>❌ {message}</div>
  );
}

// ── StatusBadge ───────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    booked:      { label:"Booked",       color:"blue"   },
    confirmed:   { label:"Confirmed",    color:"green"  },
    arrived:     { label:"Arrived",      color:"purple" },
    in_progress: { label:"In Progress",  color:"orange" },
    completed:   { label:"Completed",    color:"green"  },
    cancelled:   { label:"Cancelled",    color:"red"    },
    admitted:    { label:"Admitted",     color:"blue"   },
    stable:      { label:"Stable",       color:"green"  },
    critical:    { label:"Critical",     color:"red"    },
    in_surgery:  { label:"In Surgery",   color:"orange" },
    in_icu:      { label:"In ICU",       color:"red"    },
    recovering:  { label:"Recovering",   color:"purple" },
    discharged:  { label:"Discharged",   color:"gray"   },
  };
  const s = map[status] || { label: status, color:"gray" };
  return <Badge label={s.label} color={s.color} />;
}

// ── StarRating ────────────────────────────────────────────
export function StarRating({ rating, reviews }) {
  if (!rating) return null;
  return (
    <span style={{ fontSize:13, color:"#D97706", fontWeight:600 }}>
      ⭐ {rating}
      {reviews > 0 && <span style={{ color:"#9CA3AF", fontWeight:400 }}> ({reviews.toLocaleString()})</span>}
    </span>
  );
}
