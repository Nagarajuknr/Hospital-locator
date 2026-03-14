// portal/src/pages/MyAppointments.jsx
// Patient sees all their booked appointments

import { useState, useEffect } from "react";
import { appointmentAPI } from "../services/api";
import { Card, Spinner, EmptyState, ErrorBox, StatusBadge, PageHeader } from "../components/UI";

export default function MyAppointments({ onBack }) {
  const [appointments, setAppointments] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [filter,       setFilter]       = useState("all"); // all | upcoming | done

  useEffect(() => {
    appointmentAPI.myAppointments()
      .then(res => setAppointments(res.appointments || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = appointments.filter(a => {
    if (filter === "upcoming") return ["booked","confirmed","arrived","in_progress"].includes(a.status);
    if (filter === "done")     return ["completed","cancelled"].includes(a.status);
    return true;
  });

  return (
    <div style={{ minHeight:"100vh", background:"#F8FAFC" }}>
      <PageHeader title="My Appointments" subtitle={`${appointments.length} total`} back={onBack} />

      {/* Filter tabs */}
      <div style={{ display:"flex", background:"#fff", borderBottom:"1px solid #E5E7EB" }}>
        {[["all","All"],["upcoming","Upcoming"],["done","Completed"]].map(([val,label]) => (
          <button key={val} onClick={() => setFilter(val)}
            style={{
              padding:"10px 20px", border:"none", background:"none",
              fontWeight: filter===val ? 700 : 400,
              color: filter===val ? "#1A56A0" : "#6B7280",
              borderBottom: filter===val ? "2px solid #1A56A0" : "2px solid transparent",
              cursor:"pointer", fontSize:14, fontFamily:"inherit",
            }}>{label}</button>
        ))}
      </div>

      <div style={{ padding:"16px 20px", maxWidth:600, margin:"0 auto" }}>
        <ErrorBox message={error} />
        {loading && <Spinner />}
        {!loading && filtered.length === 0 && (
          <EmptyState icon="📅" title="No appointments" message="Book an appointment from the Hospitals page." />
        )}
        {!loading && filtered.map(a => (
          <Card key={a.id} style={{ marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontWeight:700, color:"#0D3B7A", fontSize:15 }}>
                  {a.hospital_name || "Hospital"}
                </div>
                <div style={{ color:"#6B7280", fontSize:13, marginTop:2 }}>
                  Dr. {a.doctor_name || "Doctor"}
                </div>
                {a.reason && (
                  <div style={{ color:"#6B7280", fontSize:13, marginTop:4 }}>
                    📝 {a.reason}
                  </div>
                )}
              </div>
              <StatusBadge status={a.status} />
            </div>
            <div style={{ display:"flex", gap:16, marginTop:10, flexWrap:"wrap" }}>
              {a.token_no && (
                <div style={{ textAlign:"center", background:"#DBEAFE",
                  borderRadius:8, padding:"8px 14px", minWidth:60 }}>
                  <div style={{ fontSize:10, color:"#1E40AF", fontWeight:600 }}>TOKEN</div>
                  <div style={{ fontSize:22, fontWeight:900, color:"#1A56A0" }}>#{a.token_no}</div>
                </div>
              )}
              <div style={{ fontSize:13, color:"#4B5563", display:"flex", flexDirection:"column", gap:4 }}>
                <span>🕐 {new Date(a.booked_at).toLocaleString("en-IN", {
                  day:"numeric", month:"short", year:"numeric",
                  hour:"2-digit", minute:"2-digit"
                })}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
