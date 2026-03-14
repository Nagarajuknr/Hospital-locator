// portal/src/pages/StaffPanel.jsx
// Hospital staff dashboard — admit patients, update status, manage blood bank
// Only visible to users with role: doctor, nurse, receptionist, admin

import { useState, useEffect } from "react";
import { monitoringAPI, appointmentAPI, bloodAPI } from "../services/api";
import { useAuth } from "../services/AuthContext";
import { Button, Card, Input, Spinner, ErrorBox, StatusBadge, Badge, PageHeader } from "../components/UI";

const PATIENT_STATUSES = [
  "admitted","stable","critical","in_surgery","in_icu","recovering","discharged"
];
const BLOOD_GROUPS = ["a_pos","a_neg","b_pos","b_neg","ab_pos","ab_neg","o_pos","o_neg"];
const BLOOD_LABELS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

export default function StaffPanel({ onBack }) {
  const { user } = useAuth();
  const [tab, setTab] = useState("patients"); // patients | admit | blood | slots

  // We need the hospital ID — in a real app this comes from user.hospital_id
  const hospitalId = user?.hospital_id;

  return (
    <div style={{ minHeight:"100vh", background:"#F8FAFC" }}>
      <PageHeader
        title="🏨 Staff Panel"
        subtitle={`Logged in as ${user?.name || user?.phone} · ${user?.role}`}
        back={onBack}
      />

      {!hospitalId && (
        <div style={{ padding:20 }}>
          <div style={{ background:"#FEF3C7", border:"1px solid #FCD34D",
            borderRadius:8, padding:16, color:"#92400E" }}>
            ⚠️ Your account is not linked to a hospital yet.
            Ask the admin to set your hospital in the Django admin panel.
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display:"flex", background:"#fff", borderBottom:"1px solid #E5E7EB", overflowX:"auto" }}>
        {[["patients","👥 Patients"],["admit","🏥 Admit"],["blood","🩸 Blood"],["slots","📅 Slots"]].map(([t,label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:"10px 18px", border:"none", background:"none",
            fontWeight: tab===t ? 700 : 400,
            color: tab===t ? "#1A56A0" : "#6B7280",
            borderBottom: tab===t ? "2px solid #1A56A0" : "2px solid transparent",
            cursor:"pointer", fontSize:14, whiteSpace:"nowrap", fontFamily:"inherit",
          }}>{label}</button>
        ))}
      </div>

      <div style={{ padding:"16px 20px", maxWidth:700, margin:"0 auto" }}>
        {tab === "patients" && hospitalId && <PatientsTab hospitalId={hospitalId} />}
        {tab === "admit"    && hospitalId && <AdmitTab    hospitalId={hospitalId} />}
        {tab === "blood"    && hospitalId && <BloodTab    hospitalId={hospitalId} />}
        {tab === "slots"    &&               <SlotsTab />}
      </div>
    </div>
  );
}

// ── Active Patients ────────────────────────────────────────
function PatientsTab({ hospitalId }) {
  const [patients, setPatients] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [updating, setUpdating] = useState(null);
  const [error,    setError]    = useState("");

  const load = () => {
    setLoading(true);
    monitoringAPI.listPatients(hospitalId)
      .then(res => setPatients(res.patients || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, [hospitalId]);

  const updateStatus = async (id, status, message) => {
    setUpdating(id);
    try {
      await monitoringAPI.updateStatus(id, { status, message });
      load();
    } catch (e) { setError(e.message); }
    finally { setUpdating(null); }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <h3 style={{ margin:0, color:"#0D3B7A" }}>Active Patients ({patients.length})</h3>
        <Button size="sm" variant="secondary" onClick={load}>↻ Refresh</Button>
      </div>
      <ErrorBox message={error} />
      {patients.length === 0 && (
        <div style={{ textAlign:"center", padding:40, color:"#6B7280" }}>
          No active patients right now.
        </div>
      )}
      {patients.map(p => (
        <Card key={p.id} style={{ marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <div>
              <div style={{ fontWeight:700, color:"#0D3B7A" }}>
                Ward: {p.ward || "—"} · Bed: {p.bed_number || "—"}
              </div>
              <div style={{ fontSize:13, color:"#6B7280" }}>
                Admitted: {new Date(p.admitted_at).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
              </div>
              {p.diagnosis && <div style={{ fontSize:13, color:"#4B5563", marginTop:2 }}>📋 {p.diagnosis}</div>}
            </div>
            <div style={{ textAlign:"right" }}>
              <StatusBadge status={p.status} />
              <div style={{ fontSize:11, color:"#9CA3AF", marginTop:4 }}>Code: <b>{p.family_code}</b></div>
            </div>
          </div>

          {/* Quick status update buttons */}
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
            {PATIENT_STATUSES.filter(s => s !== p.status).map(s => (
              <button key={s} disabled={updating===p.id}
                onClick={() => updateStatus(p.id, s, `Status updated to ${s}`)}
                style={{
                  padding:"4px 10px", borderRadius:6, border:"1px solid #E5E7EB",
                  background:"#F9FAFB", color:"#374151", cursor:"pointer",
                  fontSize:12, fontFamily:"inherit",
                  opacity: updating===p.id ? 0.5 : 1,
                }}>→ {s}</button>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── Admit Patient ──────────────────────────────────────────
function AdmitTab({ hospitalId }) {
  const [form,    setForm]    = useState({ patient_phone:"", ward:"", bed_number:"", diagnosis:"" });
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState("");

  const admit = async () => {
    if (!form.patient_phone) { setError("Enter patient phone number"); return; }
    setLoading(true); setError("");
    try {
      const res = await monitoringAPI.admit({ ...form, hospital_id: hospitalId });
      setResult(res);
      setForm({ patient_phone:"", ward:"", bed_number:"", diagnosis:"" });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Card>
      <h3 style={{ margin:"0 0 16px", color:"#0D3B7A" }}>Admit New Patient</h3>
      <ErrorBox message={error} />

      {result && (
        <div style={{ background:"#DCFCE7", border:"1px solid #86EFAC",
          borderRadius:8, padding:16, marginBottom:16, textAlign:"center" }}>
          <div style={{ fontWeight:700, color:"#166534", fontSize:16 }}>✅ Patient Admitted!</div>
          <div style={{ marginTop:8 }}>
            <div style={{ fontSize:13, color:"#374151" }}>Family Tracking Code:</div>
            <div style={{ fontSize:36, fontWeight:900, color:"#166534", letterSpacing:4 }}>
              {result.family_code}
            </div>
            <div style={{ fontSize:12, color:"#6B7280" }}>Share this code with the family</div>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setResult(null)} style={{ marginTop:10 }}>
            Admit Another Patient
          </Button>
        </div>
      )}

      {!result && (
        <>
          <Input label="Patient Phone Number *" value={form.patient_phone}
            onChange={e=>setForm({...form,patient_phone:e.target.value})}
            placeholder="9876543210" type="tel" />
          <Input label="Ward" value={form.ward}
            onChange={e=>setForm({...form,ward:e.target.value})}
            placeholder="e.g. Cardiology Ward A" />
          <Input label="Bed Number" value={form.bed_number}
            onChange={e=>setForm({...form,bed_number:e.target.value})}
            placeholder="e.g. B-12" />
          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>
              Initial Diagnosis / Notes
            </label>
            <textarea value={form.diagnosis}
              onChange={e=>setForm({...form,diagnosis:e.target.value})}
              rows={3} placeholder="Brief diagnosis or reason for admission..."
              style={{ width:"100%", padding:"8px 12px", borderRadius:8,
                border:"1px solid #D1D5DB", fontSize:14, resize:"vertical",
                fontFamily:"inherit", boxSizing:"border-box" }} />
          </div>
          <Button onClick={admit} fullWidth disabled={loading}>
            {loading ? "Admitting..." : "🏥 Admit Patient"}
          </Button>
        </>
      )}
    </Card>
  );
}

// ── Blood Bank Update ──────────────────────────────────────
function BloodTab({ hospitalId }) {
  const [units,   setUnits]   = useState({ a_pos:0,a_neg:0,b_pos:0,b_neg:0,ab_pos:0,ab_neg:0,o_pos:0,o_neg:0 });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    bloodAPI.get(hospitalId)
      .then(res => {
        setUnits({
          a_pos:res["A+"]||0, a_neg:res["A-"]||0,
          b_pos:res["B+"]||0, b_neg:res["B-"]||0,
          ab_pos:res["AB+"]||0, ab_neg:res["AB-"]||0,
          o_pos:res["O+"]||0, o_neg:res["O-"]||0,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hospitalId]);

  const save = async () => {
    setSaving(true); setError("");
    try {
      await bloodAPI.update(hospitalId, units);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <Spinner />;

  return (
    <Card>
      <h3 style={{ margin:"0 0 4px", color:"#0D3B7A" }}>🩸 Update Blood Availability</h3>
      <p style={{ color:"#6B7280", fontSize:13, marginTop:0, marginBottom:16 }}>
        Enter current units available. Set to 0 if empty.
      </p>
      <ErrorBox message={error} />
      {saved && (
        <div style={{ background:"#DCFCE7", borderRadius:8, padding:"10px 16px",
          marginBottom:12, color:"#166534", fontWeight:600 }}>
          ✅ Blood availability updated successfully!
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10, marginBottom:16 }}>
        {BLOOD_GROUPS.map((key, i) => (
          <div key={key} style={{ display:"flex", alignItems:"center", gap:10,
            background:"#FFF7F7", borderRadius:8, padding:"10px 14px" }}>
            <span style={{ fontWeight:800, color:"#DC2626", fontSize:18, minWidth:36 }}>
              {BLOOD_LABELS[i]}
            </span>
            <input type="number" min={0} value={units[key]}
              onChange={e => setUnits({ ...units, [key]: parseInt(e.target.value)||0 })}
              style={{ width:70, padding:"6px 10px", borderRadius:6,
                border:"1px solid #D1D5DB", fontSize:16, fontWeight:700,
                textAlign:"center", fontFamily:"inherit" }}
            />
            <span style={{ fontSize:13, color:"#6B7280" }}>units</span>
          </div>
        ))}
      </div>
      <Button onClick={save} fullWidth disabled={saving}>
        {saving ? "Saving..." : "💾 Save Blood Availability"}
      </Button>
    </Card>
  );
}

// ── Appointment Slots ──────────────────────────────────────
function SlotsTab() {
  const [doctorId, setDoctorId] = useState("");
  const [date,     setDate]     = useState(new Date().toISOString().split("T")[0]);
  const [start,    setStart]    = useState(9);
  const [end,      setEnd]      = useState(17);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState("");

  const generate = async () => {
    if (!doctorId) { setError("Enter a Doctor ID"); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await appointmentAPI.generateSlots(doctorId, date, start, end);
      setResult(res);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Card>
      <h3 style={{ margin:"0 0 4px", color:"#0D3B7A" }}>📅 Generate Doctor Slots</h3>
      <p style={{ color:"#6B7280", fontSize:13, margin:"0 0 16px" }}>
        Auto-create appointment slots for a doctor for a full day.
        Get the Doctor ID from the Hospitals page or Django admin.
      </p>
      <ErrorBox message={error} />
      {result && (
        <div style={{ background:"#DCFCE7", borderRadius:8, padding:12,
          marginBottom:12, color:"#166534", fontWeight:600 }}>
          ✅ {result.message}
        </div>
      )}
      <Input label="Doctor ID" value={doctorId}
        onChange={e => setDoctorId(e.target.value)}
        placeholder="Paste doctor UUID from database" />
      <div style={{ marginBottom:12 }}>
        <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Date</label>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)}
          style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #D1D5DB",
            fontSize:14, fontFamily:"inherit" }} />
      </div>
      <div style={{ display:"flex", gap:10, marginBottom:16 }}>
        <div style={{ flex:1 }}>
          <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Start Hour</label>
          <input type="number" min={0} max={23} value={start} onChange={e=>setStart(Number(e.target.value))}
            style={{ width:"100%", padding:"8px", borderRadius:8, border:"1px solid #D1D5DB",
              fontSize:14, fontFamily:"inherit", boxSizing:"border-box" }} />
        </div>
        <div style={{ flex:1 }}>
          <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>End Hour</label>
          <input type="number" min={0} max={23} value={end} onChange={e=>setEnd(Number(e.target.value))}
            style={{ width:"100%", padding:"8px", borderRadius:8, border:"1px solid #D1D5DB",
              fontSize:14, fontFamily:"inherit", boxSizing:"border-box" }} />
        </div>
      </div>
      <Button onClick={generate} fullWidth disabled={loading}>
        {loading ? "Generating..." : "⚡ Generate Slots (15 min each)"}
      </Button>
    </Card>
  );
}
