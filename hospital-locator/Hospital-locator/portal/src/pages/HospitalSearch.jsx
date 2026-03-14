// portal/src/pages/HospitalSearch.jsx
// Hospital discovery — GPS nearby search + map + filters
// Dev 3 owns this file.

import { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { hospitalAPI } from "../services/api";
import { Spinner, Badge, ErrorBox, StarRating, EmptyState } from "../components/UI";

// Fix Leaflet default icon (Vite issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom red marker for emergency hospitals
const emergencyIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const FILTERS = [
  { label:"All",            specialty:null, emergency:null },
  { label:"🚨 Emergency",   specialty:null, emergency:true },
  { label:"🫀 Cardiology",  specialty:"Cardiology" },
  { label:"🦴 Orthopaedics",specialty:"Orthopaedics" },
  { label:"🧠 Neurology",   specialty:"Neurology" },
  { label:"👶 Paediatrics", specialty:"Paediatrics" },
  { label:"🌸 Gynaecology", specialty:"Gynaecology" },
  { label:"🔪 Surgery",     specialty:"General Surgery" },
  { label:"👁️ Ophthalmology",specialty:"Ophthalmology" },
  { label:"🦷 Dentistry",   specialty:"Dentistry" },
];

// Recenter map when hospitals load
function MapController({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, 12); }, [center]);
  return null;
}

export default function HospitalSearch({ onSelectHospital }) {
  const [hospitals,   setHospitals]   = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [location,    setLocation]    = useState(null);
  const [locStatus,   setLocStatus]   = useState("idle");
  const [filterIdx,   setFilterIdx]   = useState(0);
  const [searchText,  setSearchText]  = useState("");
  const [radius,      setRadius]      = useState(10);
  const [selected,    setSelected]    = useState(null);

  const getLocation = () => {
    setLocStatus("loading");
    navigator.geolocation?.getCurrentPosition(
      pos => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocStatus("ok"); },
      ()  => { setLocation({ lat: 13.0827, lng: 80.2707 }); setLocStatus("denied"); }
    ) || setLocation({ lat: 13.0827, lng: 80.2707 });
  };

  const searchNearby = useCallback(async (idx = filterIdx, loc = location, r = radius) => {
    if (!loc) return;
    setLoading(true); setError("");
    const f = FILTERS[idx];
    try {
      const res = await hospitalAPI.nearby(loc.lat, loc.lng, r, f.specialty, f.emergency);
      setHospitals(res.hospitals || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [filterIdx, location, radius]);

  const searchByName = async () => {
    if (!searchText.trim()) return;
    setLoading(true); setError("");
    try {
      const res = await hospitalAPI.search(searchText);
      setHospitals(res.hospitals || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { getLocation(); }, []);
  useEffect(() => { if (location) searchNearby(0, location, radius); }, [location]);

  const mapCenter = location ? [location.lat, location.lng] : [13.0827, 80.2707];

  return (
    <div style={{ fontFamily:"Segoe UI, sans-serif", display:"flex", flexDirection:"column", height:"calc(100vh - 52px)" }}>

      {/* Search bar */}
      <div style={{ background:"#1A56A0", padding:"12px 16px" }}>
        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
          <input value={searchText} onChange={e=>setSearchText(e.target.value)}
            onKeyDown={e=>e.key==="Enter" && searchByName()}
            placeholder="Search hospital by name..."
            style={{ flex:1, padding:"9px 14px", borderRadius:8, border:"none", fontSize:14, outline:"none" }}
          />
          <button onClick={searchByName}
            style={{ padding:"9px 18px", background:"#FCD34D", color:"#1F2937",
              border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", fontSize:14 }}>
            Search
          </button>
          <button onClick={() => { setSearchText(""); searchNearby(); }}
            style={{ padding:"9px 14px", background:"#DBEAFE", color:"#0D3B7A",
              border:"none", borderRadius:8, fontWeight:600, cursor:"pointer", fontSize:13 }}>
            📍 Near Me
          </button>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, color:"#BFDBFE", fontSize:13 }}>
          <span>Radius:</span>
          <input type="range" min={1} max={50} value={radius}
            onChange={e=>setRadius(Number(e.target.value))}
            onMouseUp={() => searchNearby()}
            style={{ flex:1, accentColor:"#FCD34D" }}
          />
          <b style={{ color:"#FCD34D", minWidth:40 }}>{radius} km</b>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display:"flex", gap:6, padding:"10px 14px", overflowX:"auto",
        background:"#fff", borderBottom:"1px solid #E5E7EB" }}>
        {FILTERS.map((f,i) => (
          <button key={i} onClick={() => { setFilterIdx(i); searchNearby(i); }}
            style={{
              padding:"5px 13px", borderRadius:20, fontSize:12, fontWeight:600,
              cursor:"pointer", whiteSpace:"nowrap", border:"2px solid",
              borderColor: filterIdx===i?"#1A56A0":"#E5E7EB",
              background:  filterIdx===i?"#DBEAFE":"#fff",
              color:       filterIdx===i?"#0D3B7A":"#4B5563",
              fontFamily:"inherit",
            }}>{f.label}</button>
        ))}
      </div>

      {locStatus==="denied" && (
        <div style={{ background:"#FEF3C7", borderLeft:"4px solid #D97706",
          padding:"8px 16px", fontSize:13, color:"#92400E" }}>
          ⚠️ Location denied — showing Chennai. <button onClick={getLocation}
            style={{ color:"#1A56A0", background:"none", border:"none", cursor:"pointer", fontWeight:600, fontFamily:"inherit" }}>
            Retry
          </button>
        </div>
      )}

      {/* Main layout */}
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* Left: results list */}
        <div style={{ width:360, overflowY:"auto", borderRight:"1px solid #E5E7EB", background:"#fff" }}>
          {loading && <Spinner />}
          <ErrorBox message={error} />
          {!loading && !error && hospitals.length===0 && (
            <EmptyState icon="🏥" title="No hospitals found" message="Try increasing the radius or changing filters." />
          )}
          {!loading && hospitals.map(h => (
            <HospitalCard key={h.id} hospital={h}
              isSelected={selected?.id===h.id}
              onClick={() => setSelected(h)}
              onViewDetail={() => onSelectHospital?.(h.id)}
            />
          ))}
        </div>

        {/* Right: map */}
        <div style={{ flex:1 }}>
          <MapContainer center={mapCenter} zoom={12} style={{ height:"100%", width:"100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="© OpenStreetMap contributors" />
            {location && <MapController center={mapCenter} />}
            {location && (
              <Circle center={[location.lat, location.lng]} radius={radius*1000}
                pathOptions={{ color:"#1A56A0", fillColor:"#DBEAFE", fillOpacity:0.12 }} />
            )}
            {hospitals.filter(h=>h.latitude&&h.longitude).map(h=>(
              <Marker key={h.id} position={[h.latitude,h.longitude]}
                icon={h.emergency_available ? emergencyIcon : new L.Icon.Default()}
                eventHandlers={{ click:()=>setSelected(h) }}>
                <Popup>
                  <div style={{ minWidth:180 }}>
                    <b style={{ color:"#0D3B7A" }}>{h.name}</b><br/>
                    <span style={{ fontSize:12, color:"#6B7280" }}>{h.city}</span><br/>
                    {h.google_rating && <StarRating rating={h.google_rating} reviews={h.total_reviews} />}
                    {h.emergency_available && <> <Badge label="🚨 24/7 Emergency" color="red" /></>}
                    {h.distance_km && <div style={{ marginTop:4, color:"#059669", fontSize:12 }}>📍 {h.distance_km} km</div>}
                    {onSelectHospital && (
                      <button onClick={()=>onSelectHospital(h.id)}
                        style={{ marginTop:8, width:"100%", background:"#1A56A0", color:"#fff",
                          border:"none", borderRadius:6, padding:"6px", cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>
                        View Details →
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

function HospitalCard({ hospital:h, isSelected, onClick, onViewDetail }) {
  return (
    <div onClick={onClick} style={{
      padding:"13px 16px", borderBottom:"1px solid #F3F4F6", cursor:"pointer",
      background: isSelected ? "#EFF6FF" : "#fff",
      borderLeft: `4px solid ${isSelected?"#1A56A0":"transparent"}`,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div style={{ fontWeight:700, color:"#0D3B7A", fontSize:14, flex:1 }}>{h.name}</div>
        {h.emergency_available && <Badge label="🚨 24/7" color="red" />}
      </div>
      <div style={{ color:"#6B7280", fontSize:12, marginTop:3 }}>📍 {h.address}</div>
      <div style={{ display:"flex", gap:12, marginTop:7, flexWrap:"wrap" }}>
        <StarRating rating={h.google_rating} reviews={h.total_reviews} />
        {h.distance_km && <span style={{ fontSize:12, color:"#059669", fontWeight:600 }}>📍 {h.distance_km} km</span>}
        {h.total_beds>0 && <span style={{ fontSize:12, color:"#6B7280" }}>🛏 {h.total_beds}</span>}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
        {h.phone && (
          <a href={`tel:${h.phone}`} onClick={e=>e.stopPropagation()}
            style={{ fontSize:12, color:"#1A56A0", textDecoration:"none", fontWeight:600 }}>
            📞 {h.phone}
          </a>
        )}
        {onViewDetail && (
          <button onClick={e=>{e.stopPropagation(); onViewDetail();}}
            style={{ fontSize:12, background:"#F0F9FF", color:"#1A56A0", border:"1px solid #BFDBFE",
              borderRadius:6, padding:"4px 10px", cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>
            Details →
          </button>
        )}
      </div>
    </div>
  );
}
