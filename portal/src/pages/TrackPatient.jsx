// portal/src/pages/TrackPatient.jsx
// Family enters a code (e.g. MG-X7K2) to see real-time patient status.
// No login required — anyone with the code can check.

import { useState } from "react";
import { monitoringAPI } from "../services/api";
import { Button, Card, Input, Spinner, ErrorBox, StatusBadge, PageHeader } from "../components/UI";

const STATUS_INFO = {
  admitted:   { icon:"🏥", msg:"Patient has been admitted and is being assessed.", color:"#DBEAFE" },
  stable:     { icon:"💚", msg:"Patient is stable and under observation.",          color:"#DCFCE7" },
  critical:   { icon:"🔴", msg:"Patient is in critical condition. Doctors attending.", color:"#FEE2E2" },
  in_surgery: { icon:"🔪", msg:"Patient is currently in surgery.",                  color:"#FEF3C7" },
  in_icu:     { icon:"⚕️", msg:"Patient is in the ICU under close monitoring.",    color:"#FEE2E2" },
  recovering: { icon:"💛", msg:"Patient is recovering well.",                       color:"#FEF9C3" },
  discharged: { icon:"🏠", msg:"Patient has been discharged. Please collect them.", color:"#DCFCE7" },
};

export default function TrackPatient({ onBack }) {
  const [code,    setCode]    = useState("");
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const track = async () => {
    const c = code.trim().toUpperCase();
    if (c.length < 4) { setError("Enter a valid tracking code (e.g. MG-X7K2)"); return; }
    setLoading(true); setError(""); setData(null);
    try {
      const res = await monitoringAPI.track(c);
      setData(res);
    } catch (e) {
      setError("Code not found. Check the code given by the hospital.");
    } finally { setLoading(false); }
  };

  const info = data ? (STATUS_INFO[data.status] || STATUS_INFO.admitted) : null;

  return (
    <div style={{ minHeight:"100vh", background:"#F8FAFC" }}>
      <PageHeader title="📍 Track Patient" subtitle="Enter the code given by the hospital" back={onBack} />

      <div style={{ padding:"20px", maxWidth:500, margin:"0 auto" }}>

        {/* Search box */}
        <Card style={{ marginBottom:20 }}>
          <h3 style={{ margin:"0 0 4px", color:"#0D3B7A" }}>Family Tracking</h3>
          <p style={{ color:"#6B7280", fontSize:14, margin:"0 0 16px" }}>
            The hospital gives you a code like <b>MG-X7K2</b> when your family member is admitted.
            Enter it below to see their current status.
          </p>
          <Input
            label="Tracking Code"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. MG-X7K2"
          />
          <Button onClick={track} fullWidth disabled={loading}>
            {loading ? "Searching..." : "🔍 Track Patient"}
          </Button>
          <ErrorBox message={error} />
        </Card>

        {/* Result */}
        {loading && <Spinner />}

        {data && info && (
          <div>
            {/* Big status card */}
            <Card style={{ background: info.color, marginBottom:16, textAlign:"center" }}>
              <div style={{ fontSize:56, marginBottom:8 }}>{info.icon}</div>
              <div style={{ marginBottom:8 }}>
                <StatusBadge status={data.status} />
              </div>
              <p style={{ margin:"8px 0 0", fontSize:15, color:"#1F2937" }}>{info.msg}</p>
            </Card>

            {/* Details */}
            <Card style={{ marginBottom:16 }}>
              <h4 style={{ margin:"0 0 12px", color:"#0D3B7A" }}>Patient Details</h4>
              {[
                data.ward       && ["Ward",        data.ward],
                ["Admitted",     new Date(data.admitted_at).toLocaleString("en-IN")],
                data.diagnosis  && ["Note",         "Available only to staff"],
              ].filter(Boolean).map(([label, val]) => (
                <div key={label} style={{ display:"flex", justifyContent:"space-between",
                  padding:"7px 0", borderBottom:"1px solid #F3F4F6", fontSize:14 }}>
                  <span style={{ color:"#6B7280" }}>{label}</span>
                  <span style={{ fontWeight:600 }}>{val}</span>
                </div>
              ))}
            </Card>

            {/* Update timeline */}
            {data.updates?.length > 0 && (
              <Card>
                <h4 style={{ margin:"0 0 14px", color:"#0D3B7A" }}>Status Timeline</h4>
                <div style={{ position:"relative" }}>
                  {data.updates.map((u, i) => (
                    <div key={i} style={{ display:"flex", gap:12, marginBottom:16 }}>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                        <div style={{ width:12, height:12, borderRadius:"50%",
                          background: i===0 ? "#1A56A0" : "#D1D5DB", flexShrink:0, marginTop:3 }} />
                        {i < data.updates.length-1 && (
                          <div style={{ width:2, flex:1, background:"#E5E7EB", marginTop:4 }} />
                        )}
                      </div>
                      <div style={{ flex:1, paddingBottom:4 }}>
                        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                          <StatusBadge status={u.status} />
                          <span style={{ fontSize:11, color:"#9CA3AF" }}>
                            {new Date(u.time).toLocaleString("en-IN", {
                              day:"numeric", month:"short",
                              hour:"2-digit", minute:"2-digit"
                            })}
                          </span>
                        </div>
                        {u.message && (
                          <p style={{ margin:"4px 0 0", fontSize:13, color:"#4B5563" }}>{u.message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <button onClick={() => setData(null)} style={{
              display:"block", width:"100%", marginTop:12, padding:"10px",
              background:"none", border:"1px solid #E5E7EB", borderRadius:8,
              color:"#6B7280", cursor:"pointer", fontSize:14, fontFamily:"inherit",
            }}>Track a different patient</button>
          </div>
        )}
      </div>
    </div>
  );
}
