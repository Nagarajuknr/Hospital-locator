// portal/src/pages/HospitalDetail.jsx
// Full hospital info — specialties, doctors, blood bank, book appointment

import { useState, useEffect } from "react";
import { hospitalAPI, bloodAPI } from "../services/api";
import { useAuth } from "../services/AuthContext";
import { Spinner, Card, Badge, Button, ErrorBox, StarRating, PageHeader, EmptyState } from "../components/UI";

export default function HospitalDetail({ hospitalId, onBack, onBook }) {
  const { isLoggedIn } = useAuth();
  const [hospital, setHospital] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [tab,      setTab]      = useState("overview"); // overview | doctors | blood

  useEffect(() => {
    setLoading(true);
    hospitalAPI.detail(hospitalId)
      .then(setHospital)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [hospitalId]);

  if (loading) return <Spinner />;
  if (error)   return <div style={{ padding:20 }}><ErrorBox message={error} /></div>;
  if (!hospital) return null;

  const h = hospital;

  return (
    <div style={{ minHeight:"100vh", background:"#F8FAFC" }}>
      <PageHeader
        title={h.name}
        subtitle={`${h.city}, ${h.state} · ${h.type}`}
        back={onBack}
      />

      {/* Hero stats */}
      <div style={{ background:"#1A56A0", padding:"12px 20px", display:"flex", gap:20, overflowX:"auto" }}>
        {[
          ["🛏", `${h.total_beds} beds`],
          ["🏥", `${h.icu_beds} ICU`],
          h.emergency_available && ["🚨", "24/7 Emergency"],
          h.ambulance_available && ["🚑", "Ambulance"],
          h.google_rating && ["⭐", `${h.google_rating} rating`],
        ].filter(Boolean).map(([icon, label], i) => (
          <div key={i} style={{ textAlign:"center", color:"#fff", minWidth:70 }}>
            <div style={{ fontSize:20 }}>{icon}</div>
            <div style={{ fontSize:11, color:"#BFDBFE", whiteSpace:"nowrap" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", background:"#fff", borderBottom:"2px solid #E5E7EB" }}>
        {["overview","doctors","blood"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:"12px 20px", border:"none", background:"none",
            fontWeight: tab===t ? 700 : 400,
            color: tab===t ? "#1A56A0" : "#6B7280",
            borderBottom: tab===t ? "2px solid #1A56A0" : "2px solid transparent",
            cursor:"pointer", fontSize:14, fontFamily:"inherit",
            textTransform:"capitalize",
          }}>{t === "blood" ? "🩸 Blood Bank" : t === "doctors" ? "👨‍⚕️ Doctors" : "📋 Overview"}</button>
        ))}
      </div>

      <div style={{ padding:"16px 20px", maxWidth:800, margin:"0 auto" }}>

        {/* ── OVERVIEW TAB ── */}
        {tab === "overview" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <Card>
              <h3 style={{ margin:"0 0 12px", color:"#0D3B7A", fontSize:16 }}>📍 Contact & Location</h3>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {[
                  ["Address", h.address],
                  ["City",    h.city + ", " + h.state + " " + (h.pincode||"")],
                  ["Phone",   h.phone || "—"],
                  ["Email",   h.email || "—"],
                  ["OPD Timing", h.opd_timing || "—"],
                  ["Website", h.website || "—"],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize:11, color:"#9CA3AF", fontWeight:600, textTransform:"uppercase" }}>{label}</div>
                    <div style={{ fontSize:14, color:"#1F2937", marginTop:2 }}>{val}</div>
                  </div>
                ))}
              </div>
              {h.latitude && h.longitude && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${h.latitude},${h.longitude}`}
                  target="_blank" rel="noreferrer"
                  style={{ display:"inline-block", marginTop:14, fontSize:13, color:"#1A56A0", fontWeight:600 }}>
                  🗺️ Open in Google Maps →
                </a>
              )}
            </Card>

            <Card>
              <h3 style={{ margin:"0 0 12px", color:"#0D3B7A", fontSize:16 }}>🏥 Specialties</h3>
              {h.specialties?.length > 0 ? (
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {h.specialties.map(s => (
                    <div key={s.name} style={{
                      background:"#F0F9FF", border:"1px solid #BFDBFE",
                      borderRadius:8, padding:"6px 14px", fontSize:13,
                    }}>
                      <span style={{ marginRight:6 }}>{s.icon}</span>{s.name}
                      {s.doctor_count > 0 && <span style={{ color:"#6B7280", fontSize:11 }}> ({s.doctor_count})</span>}
                    </div>
                  ))}
                </div>
              ) : <p style={{ color:"#9CA3AF", fontSize:14 }}>No specialties listed yet.</p>}
            </Card>

            {isLoggedIn && (
              <Button onClick={() => onBook?.(h)} fullWidth size="lg">
                📅 Book an Appointment
              </Button>
            )}
            {!isLoggedIn && (
              <div style={{ background:"#FEF3C7", borderRadius:8, padding:16, textAlign:"center" }}>
                <p style={{ margin:"0 0 10px", color:"#92400E" }}>Login to book appointments</p>
                <Button onClick={() => onBook?.("login")}>Login / Register</Button>
              </div>
            )}
          </div>
        )}

        {/* ── DOCTORS TAB ── */}
        {tab === "doctors" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {h.doctors?.length === 0 && (
              <EmptyState icon="👨‍⚕️" title="No doctors listed" message="Doctors will appear here once added by hospital staff." />
            )}
            {h.doctors?.map(d => (
              <Card key={d.id}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontWeight:700, color:"#0D3B7A", fontSize:15 }}>{d.name}</div>
                    <div style={{ color:"#6B7280", fontSize:13, marginTop:2 }}>{d.qualification}</div>
                    <div style={{ display:"flex", gap:10, marginTop:8, flexWrap:"wrap" }}>
                      <Badge label={`${d.experience_years} yrs exp`} color="blue" />
                      <Badge label={`₹${d.consultation_fee} fee`} color="green" />
                      {d.available_days && <Badge label={d.available_days} color="purple" />}
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end" }}>
                    <Badge label={d.is_available ? "✅ Available" : "❌ Unavailable"}
                      color={d.is_available ? "green" : "red"} />
                    {isLoggedIn && d.is_available && (
                      <Button size="sm" onClick={() => onBook?.(h, d)}>Book</Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── BLOOD BANK TAB ── */}
        {tab === "blood" && <BloodBankTab hospitalId={h.id} />}
      </div>
    </div>
  );
}

function BloodBankTab({ hospitalId }) {
  const [blood,   setBlood]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bloodAPI.get(hospitalId)
      .then(setBlood)
      .catch(() => setBlood(null))
      .finally(() => setLoading(false));
  }, [hospitalId]);

  if (loading) return <Spinner />;

  const groups = blood
    ? [["A+",blood["A+"]], ["A-",blood["A-"]], ["B+",blood["B+"]], ["B-",blood["B-"]],
       ["AB+",blood["AB+"]], ["AB-",blood["AB-"]], ["O+",blood["O+"]], ["O-",blood["O-"]]]
    : [];

  return (
    <Card>
      <h3 style={{ margin:"0 0 16px", color:"#0D3B7A" }}>🩸 Blood Availability</h3>
      {!blood ? (
        <EmptyState icon="🩸" title="No blood bank data" message="This hospital hasn't updated blood availability." />
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          {groups.map(([group, units]) => (
            <div key={group} style={{
              textAlign:"center", padding:"16px 8px", borderRadius:10,
              background: units > 0 ? "#DCFCE7" : "#FEE2E2",
              border: `1px solid ${units>0?"#86EFAC":"#FCA5A5"}`,
            }}>
              <div style={{ fontSize:20, fontWeight:800, color: units>0?"#166534":"#991B1B" }}>{group}</div>
              <div style={{ fontSize:24, fontWeight:800, color: units>0?"#166534":"#DC2626", margin:"4px 0" }}>{units}</div>
              <div style={{ fontSize:11, color:"#6B7280" }}>units</div>
            </div>
          ))}
        </div>
      )}
      {blood?.updated_at && (
        <p style={{ fontSize:12, color:"#9CA3AF", marginTop:12, marginBottom:0 }}>
          Last updated: {new Date(blood.updated_at).toLocaleString("en-IN")}
        </p>
      )}
    </Card>
  );
}
