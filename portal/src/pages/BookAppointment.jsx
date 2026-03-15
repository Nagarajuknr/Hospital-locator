// portal/src/pages/BookAppointment.jsx
// Patient selects a doctor, picks a date, picks a slot, confirms booking.

import { useState, useEffect } from "react";
import { appointmentAPI } from "../services/api";
import { Button, Card, Spinner, ErrorBox, Badge, PageHeader } from "../components/UI";

export default function BookAppointment({ hospital, preselectedDoctor, onBack, onSuccess }) {
  const [step,     setStep]     = useState(preselectedDoctor ? "slots" : "doctor");
  const [doctor,   setDoctor]   = useState(preselectedDoctor || null);
  const [date,     setDate]     = useState(today());
  const [slots,    setSlots]    = useState([]);
  const [slot,     setSlot]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [reason,   setReason]   = useState("");
  const [booked,   setBooked]   = useState(null);

  function today() {
    return new Date().toISOString().split("T")[0];
  }

  const loadSlots = async (doc, d) => {
    setLoading(true); setError(""); setSlots([]); setSlot(null);
    try {
      const res = await appointmentAPI.slots(doc.id, d);
      setSlots(res.slots || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const selectDoctor = (d) => {
    setDoctor(d); setStep("slots");
    loadSlots(d, date);
  };

  const changeDate = (d) => {
    setDate(d);
    if (doctor) loadSlots(doctor, d);
  };

  const confirmBooking = async () => {
    setLoading(true); setError("");
    try {
      const res = await appointmentAPI.book({
        hospital_id: hospital.id,
        doctor_id:   doctor.id,
        slot_id:     slot?.id,
        reason,
      });
      setBooked(res);
      setStep("done");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  // ── Success screen ─────────────────────────────────────
  if (step === "done" && booked) {
    return (
      <div style={{ minHeight:"100vh", background:"#F8FAFC" }}>
        <PageHeader title="Appointment Booked!" back={onBack} />
        <div style={{ padding:20, maxWidth:500, margin:"0 auto" }}>
          <Card style={{ textAlign:"center" }}>
            <div style={{ fontSize:60, marginBottom:16 }}>✅</div>
            <h2 style={{ color:"#166534", margin:"0 0 8px" }}>Booking Confirmed</h2>
            <div style={{ background:"#DCFCE7", borderRadius:10, padding:16, margin:"16px 0" }}>
              {booked.token_no && (
                <div style={{ marginBottom:8 }}>
                  <div style={{ fontSize:12, color:"#6B7280" }}>YOUR TOKEN NUMBER</div>
                  <div style={{ fontSize:48, fontWeight:900, color:"#166534" }}>#{booked.token_no}</div>
                </div>
              )}
              <div style={{ fontSize:14, color:"#374151" }}>
                <b>Hospital:</b> {hospital.name}<br/>
                <b>Doctor:</b> {doctor.name}<br/>
                {slot && <><b>Time:</b> {slot.start_time} – {slot.end_time} on {date}<br/></>}
                <b>Status:</b> <Badge label="Booked" color="blue" />
              </div>
            </div>
            <p style={{ color:"#6B7280", fontSize:13 }}>
              Please arrive 10 minutes before your slot. Bring a photo ID.
            </p>
            <Button onClick={onSuccess || onBack} fullWidth>Go to My Appointments</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#F8FAFC" }}>
      <PageHeader
        title="Book Appointment"
        subtitle={hospital?.name}
        back={step==="slots" && !preselectedDoctor ? () => setStep("doctor") : onBack}
      />

      {/* Steps indicator */}
      <div style={{ display:"flex", background:"#fff", borderBottom:"1px solid #E5E7EB", padding:"8px 20px", gap:20 }}>
        {[["doctor","1. Select Doctor"],["slots","2. Pick Slot"],["confirm","3. Confirm"]].map(([s,label])=>(
          <div key={s} style={{
            fontSize:13, fontWeight: step===s ? 700 : 400,
            color: step===s ? "#1A56A0" : "#9CA3AF",
          }}>{label}</div>
        ))}
      </div>

      <div style={{ padding:"16px 20px", maxWidth:600, margin:"0 auto" }}>
        <ErrorBox message={error} />

        {/* ── STEP 1: Pick Doctor ── */}
        {step === "doctor" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <h3 style={{ margin:"0 0 4px", color:"#0D3B7A" }}>Choose a Doctor</h3>
            {hospital.doctors?.length === 0 && (
              <p style={{ color:"#6B7280" }}>No doctors available at this hospital yet.</p>
            )}
            {hospital.doctors?.map(d => (
              <Card key={d.id} onClick={() => d.is_available && selectDoctor(d)}
                style={{ opacity: d.is_available ? 1 : 0.5, cursor: d.is_available ? "pointer" : "not-allowed" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontWeight:700, color:"#0D3B7A" }}>{d.name}</div>
                    <div style={{ fontSize:13, color:"#6B7280" }}>{d.qualification}</div>
                    <div style={{ display:"flex", gap:8, marginTop:6 }}>
                      <Badge label={`${d.experience_years} yrs`} color="blue" />
                      <Badge label={`₹${d.consultation_fee}`}    color="green" />
                      {d.available_days && <Badge label={d.available_days} color="purple" />}
                    </div>
                  </div>
                  <Badge label={d.is_available ? "Available →" : "Unavailable"}
                    color={d.is_available ? "green" : "red"} />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── STEP 2: Pick Slot ── */}
        {step === "slots" && doctor && (
          <div>
            <Card style={{ marginBottom:16 }}>
              <b style={{ color:"#0D3B7A" }}>👨‍⚕️ {doctor.name}</b>
              <span style={{ color:"#6B7280", fontSize:13, marginLeft:8 }}>{doctor.qualification}</span>
              <div style={{ marginTop:12 }}>
                <label style={{ fontSize:13, fontWeight:600, color:"#374151" }}>Select Date:</label>
                <input type="date" value={date} min={today()}
                  onChange={e => changeDate(e.target.value)}
                  style={{ marginLeft:10, padding:"6px 10px", borderRadius:6,
                    border:"1px solid #D1D5DB", fontSize:14, fontFamily:"inherit" }}
                />
              </div>
            </Card>

            {loading && <Spinner />}
            {!loading && slots.length === 0 && (
              <div style={{ textAlign:"center", padding:30, color:"#6B7280" }}>
                <div style={{ fontSize:36, marginBottom:8 }}>📅</div>
                No slots available for this date.<br/>
                <span style={{ fontSize:13 }}>Try a different date or ask staff to add slots.</span>
              </div>
            )}
            {!loading && slots.length > 0 && (
              <>
                <h4 style={{ margin:"0 0 10px", color:"#374151" }}>Available Slots ({slots.length})</h4>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16 }}>
                  {slots.map(s => (
                    <button key={s.id} onClick={() => { setSlot(s); setStep("confirm"); }}
                      style={{
                        padding:"12px 8px", borderRadius:8, textAlign:"center",
                        border: "2px solid #BFDBFE", background:"#F0F9FF",
                        cursor:"pointer", fontFamily:"inherit",
                        transition:"all 0.15s",
                      }}>
                      <div style={{ fontWeight:700, color:"#0D3B7A", fontSize:14 }}>{s.start_time}</div>
                      {s.token_no && <div style={{ fontSize:11, color:"#6B7280" }}>Token #{s.token_no}</div>}
                    </button>
                  ))}
                </div>
                <Button variant="ghost" onClick={() => { setSlot(null); setStep("confirm"); }}>
                  Continue without selecting a slot
                </Button>
              </>
            )}
          </div>
        )}

        {/* ── STEP 3: Confirm ── */}
        {step === "confirm" && (
          <Card>
            <h3 style={{ margin:"0 0 16px", color:"#0D3B7A" }}>Confirm Booking</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
              {[
                ["Hospital", hospital.name],
                ["Doctor",   doctor.name],
                ["Date",     date],
                ["Time",     slot ? `${slot.start_time} – ${slot.end_time}` : "Walk-in"],
                ["Fee",      `₹${doctor.consultation_fee}`],
                slot?.token_no && ["Token", `#${slot.token_no}`],
              ].filter(Boolean).map(([label, val]) => (
                <div key={label} style={{ display:"flex", justifyContent:"space-between",
                  padding:"8px 0", borderBottom:"1px solid #F3F4F6" }}>
                  <span style={{ color:"#6B7280", fontSize:14 }}>{label}</span>
                  <span style={{ fontWeight:600, color:"#1F2937", fontSize:14 }}>{val}</span>
                </div>
              ))}
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:13, fontWeight:600, color:"#374151" }}>Reason for visit (optional):</label>
              <textarea value={reason} onChange={e=>setReason(e.target.value)}
                placeholder="e.g. chest pain, follow-up checkup..."
                rows={3}
                style={{ width:"100%", marginTop:6, padding:"8px 12px", borderRadius:8,
                  border:"1px solid #D1D5DB", fontSize:14, resize:"vertical",
                  fontFamily:"inherit", boxSizing:"border-box" }}
              />
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <Button variant="secondary" onClick={() => setStep("slots")}>← Back</Button>
              <Button onClick={confirmBooking} disabled={loading} fullWidth>
                {loading ? "Booking..." : "✅ Confirm Appointment"}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
