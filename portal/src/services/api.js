// portal/src/services/api.js
// Central API client — ALL backend calls go through here.
// Import specific APIs in your pages: import { hospitalAPI } from "../services/api"

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getToken() {
  return localStorage.getItem("mg_token");
}

async function request(method, path, body = null) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (res.status === 401) {
    localStorage.removeItem("mg_token");
    localStorage.removeItem("mg_user");
    window.location.href = "/login";
    return;
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

// ── Auth ──────────────────────────────────────────────────
export const authAPI = {
  sendOTP:   (phone)      => request("POST",  "/api/auth/send-otp",   { phone }),
  verifyOTP: (phone, otp) => request("POST",  "/api/auth/verify-otp", { phone, otp }),
  getMe:     ()           => request("GET",   "/api/auth/me"),
  updateMe:  (data)       => request("PATCH", "/api/auth/me", data),
};

// ── Hospitals ─────────────────────────────────────────────
export const hospitalAPI = {
  nearby: (lat, lng, radius, specialty, emergency) => {
    const p = new URLSearchParams({ lat, lng, radius, limit: 30 });
    if (specialty) p.set("specialty", specialty);
    if (emergency) p.set("emergency", "true");
    return request("GET", `/api/hospitals/nearby?${p}`);
  },
  search:      (q, city) => request("GET", `/api/hospitals/search?q=${encodeURIComponent(q)}${city ? `&city=${city}` : ""}`),
  detail:      (id)      => request("GET", `/api/hospitals/${id}`),
  specialties: ()        => request("GET", "/api/hospitals/specialties/all"),
  fetchGoogle: (city)    => request("POST", `/api/hospitals/fetch-google?city=${encodeURIComponent(city)}`),
};

// ── Appointments ──────────────────────────────────────────
export const appointmentAPI = {
  slots:          (doctorId, date) => request("GET",  `/api/appointments/slots?doctor_id=${doctorId}${date ? `&date=${date}` : ""}`),
  book:           (data)           => request("POST", "/api/appointments/", data),
  myAppointments: ()               => request("GET",  "/api/appointments/my"),
  updateStatus:   (id, status)     => request("PATCH",`/api/appointments/${id}/status?status=${status}`),
  generateSlots:  (doctorId, date, startHour=9, endHour=17) =>
    request("POST", `/api/appointments/slots/generate-day?doctor_id=${doctorId}&date=${date}&start_hour=${startHour}&end_hour=${endHour}`),
};

// ── Monitoring ────────────────────────────────────────────
export const monitoringAPI = {
  admit:        (data)       => request("POST",  "/api/monitoring/admit", data),
  track:        (code)       => request("GET",   `/api/monitoring/track/${code}`),
  updateStatus: (id, data)   => request("PATCH", `/api/monitoring/${id}/status`, data),
  listPatients: (hospitalId) => request("GET",   `/api/monitoring/hospital/${hospitalId}`),
};

// ── Blood Bank ────────────────────────────────────────────
export const bloodAPI = {
  nearby: (group, lat, lng, radius=20) =>
    request("GET", `/api/blood/nearby?blood_group=${encodeURIComponent(group)}&lat=${lat}&lng=${lng}&radius=${radius}`),
  get:    (hospitalId)       => request("GET",   `/api/blood/${hospitalId}`),
  update: (hospitalId, data) => request("PATCH", `/api/blood/${hospitalId}`, data),
};
