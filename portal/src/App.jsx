// portal/src/App.jsx
// Root component — manages navigation between all pages.
// Replace your existing App.jsx with this file.

import { useState } from "react";
import { AuthProvider, useAuth } from "./services/AuthContext";
import Navbar          from "./components/Navbar";
import Login           from "./pages/Login";
import HospitalSearch  from "./pages/HospitalSearch";
import HospitalDetail  from "./pages/HospitalDetail";
import BookAppointment from "./pages/BookAppointment";
import MyAppointments  from "./pages/MyAppointments";
import TrackPatient    from "./pages/TrackPatient";
import BloodBank       from "./pages/BloodBank";
import StaffPanel      from "./pages/StaffPanel";

function AppInner() {
  const { isLoggedIn, isStaff } = useAuth();

  // Navigation state
  const [page,             setPage]             = useState("hospitals");
  const [selectedHospital, setSelectedHospital] = useState(null); // hospital id
  const [bookingHospital,  setBookingHospital]  = useState(null); // full hospital obj
  const [bookingDoctor,    setBookingDoctor]    = useState(null); // preselected doctor

  const goTo = (p) => {
    setPage(p);
    setSelectedHospital(null);
    setBookingHospital(null);
    setBookingDoctor(null);
  };

  const openHospital = (id) => {
    setSelectedHospital(id);
    setPage("hospital-detail");
  };

  const openBooking = (hospital, doctor = null) => {
    if (!isLoggedIn) { setPage("login"); return; }
    setBookingHospital(hospital);
    setBookingDoctor(doctor);
    setPage("book");
  };

  // ── Page rendering ─────────────────────────────────────
  const renderPage = () => {
    switch (page) {

      case "login":
        return <Login onSuccess={() => goTo("hospitals")} />;

      case "hospitals":
        return <HospitalSearch onSelectHospital={openHospital} />;

      case "hospital-detail":
        return (
          <HospitalDetail
            hospitalId={selectedHospital}
            onBack={() => goTo("hospitals")}
            onBook={openBooking}
          />
        );

      case "book":
        return (
          <BookAppointment
            hospital={bookingHospital}
            preselectedDoctor={bookingDoctor}
            onBack={() => setPage("hospital-detail")}
            onSuccess={() => goTo("appointments")}
          />
        );

      case "appointments":
        return <MyAppointments onBack={() => goTo("hospitals")} />;

      case "track":
        return <TrackPatient onBack={() => goTo("hospitals")} />;

      case "blood":
        return <BloodBank onBack={() => goTo("hospitals")} />;

      case "staff":
        if (!isStaff) { goTo("hospitals"); return null; }
        return <StaffPanel onBack={() => goTo("hospitals")} />;

      default:
        return <HospitalSearch onSelectHospital={openHospital} />;
    }
  };

  // Pages that show the navbar
  const showNavbar = !["login"].includes(page);

  return (
    <div style={{ fontFamily:"Segoe UI, system-ui, sans-serif" }}>
      {showNavbar && <Navbar page={page} setPage={goTo} />}
      {renderPage()}
    </div>
  );
}

// Wrap with AuthProvider so every page can use useAuth()
export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
