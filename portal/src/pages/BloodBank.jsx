// portal/src/pages/BloodBank.jsx
// Find hospitals near you that have a specific blood group available

import { useState, useEffect } from "react";
import { bloodAPI } from "../services/api";
import { Button, Card, Spinner, ErrorBox, EmptyState, PageHeader, StarRating } from "../components/UI";

const BLOOD_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

export default function BloodBank({ onBack }) {
  const [group,     setGroup]    = useState("O+");
  const [hospitals, setHospitals]= useState([]);
  const [loading,   setLoading]  = useState(false);
  const [error,     setError]    = useState("");
  const [location,  setLocation] = useState(null);
  const [searched,  setSearched] = useState(false);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()  => setLocation({ lat: 13.0827, lng: 80.2707 })  // default Chennai
    );
  }, []);

  const search = async () => {
    const loc = location || { lat: 13.0827, lng: 80.2707 };
    setLoading(true); setError(""); setSearched(true);
    try {
      const res = await bloodAPI.nearby(group, loc.lat, loc.lng, 30);
      setHospitals(res.hospitals || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#F8FAFC" }}>
      <PageHeader title="🩸 Blood Bank Finder" subtitle="Find hospitals with your blood group nearby" back={onBack} />

      <div style={{ padding:"20px", maxWidth:600, margin:"0 auto" }}>

        {/* Blood group selector */}
        <Card style={{ marginBottom:20 }}>
          <h3 style={{ margin:"0 0 14px", color:"#0D3B7A" }}>Select Blood Group</h3>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:16 }}>
            {BLOOD_GROUPS.map(g => (
              <button key={g} onClick={() => setGroup(g)}
                style={{
                  padding:"12px 8px", borderRadius:8, border:"2px solid",
                  borderColor: group===g ? "#DC2626" : "#E5E7EB",
                  background:  group===g ? "#FEE2E2" : "#fff",
                  color:       group===g ? "#991B1B" : "#4B5563",
                  fontWeight: 800, fontSize:16, cursor:"pointer", fontFamily:"inherit",
                  transition:"all 0.15s",
                }}>{g}</button>
            ))}
          </div>
          <Button onClick={search} fullWidth disabled={loading} size="lg">
            {loading ? "Searching..." : `🔍 Find ${group} Blood Near Me`}
          </Button>
        </Card>

        <ErrorBox message={error} />
        {loading && <Spinner />}

        {!loading && searched && hospitals.length === 0 && (
          <EmptyState icon="🩸" title={`No ${group} blood found nearby`}
            message="Try expanding your search radius or try nearby cities." />
        )}

        {!loading && hospitals.map(h => (
          <Card key={h.id} style={{ marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontWeight:700, color:"#0D3B7A", fontSize:15 }}>{h.name}</div>
                <div style={{ fontSize:13, color:"#6B7280", marginTop:2 }}>{h.address}</div>
                <div style={{ display:"flex", gap:12, marginTop:8 }}>
                  {h.distance_km && (
                    <span style={{ fontSize:13, color:"#059669", fontWeight:600 }}>
                      📍 {h.distance_km} km
                    </span>
                  )}
                  {h.phone && (
                    <a href={`tel:${h.phone}`}
                      style={{ fontSize:13, color:"#1A56A0", textDecoration:"none", fontWeight:600 }}>
                      📞 {h.phone}
                    </a>
                  )}
                </div>
              </div>

              {/* Units available */}
              <div style={{ textAlign:"center", background:"#FEE2E2",
                borderRadius:10, padding:"10px 16px", minWidth:70, flexShrink:0 }}>
                <div style={{ fontSize:10, color:"#991B1B", fontWeight:700 }}>{group} UNITS</div>
                <div style={{ fontSize:32, fontWeight:900, color:"#DC2626" }}>
                  {h.units_available}
                </div>
              </div>
            </div>
          </Card>
        ))}

        {!searched && !loading && (
          <div style={{ textAlign:"center", color:"#6B7280", padding:40 }}>
            <div style={{ fontSize:60, marginBottom:12 }}>🩸</div>
            <p>Select a blood group and search to find hospitals with available blood near you.</p>
          </div>
        )}
      </div>
    </div>
  );
}
