// Lightweight client-side store for parking/rental gate sessions ("lượt").
// Backend endpoints for gate scanning do not exist yet, so we persist the
// staff workflow locally to keep the in/out flow demoable end-to-end.

export type GateSession = {
  id: string;
  plate: string;
  vehicleType: string;
  note?: string;
  timeIn: string;
  timeOut?: string;
  status: "in" | "out";
};

const STORAGE_KEY = "staff_gate_sessions";

function read(): GateSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GateSession[]) : [];
  } catch {
    return [];
  }
}

function write(sessions: GateSession[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export const normalizePlate = (plate: string) =>
  plate.replace(/\s+/g, "").toUpperCase();

export function getSessions(): GateSession[] {
  return read();
}

export function getActiveSession(plate: string): GateSession | undefined {
  const normalized = normalizePlate(plate);
  return read().find(
    (s) => normalizePlate(s.plate) === normalized && s.status === "in"
  );
}

export function createSession(
  input: Omit<GateSession, "id" | "status" | "timeIn"> & { timeIn?: string }
): GateSession {
  const session: GateSession = {
    id: `LUOT-${Date.now()}`,
    plate: normalizePlate(input.plate),
    vehicleType: input.vehicleType,
    note: input.note,
    timeIn: input.timeIn ?? new Date().toISOString(),
    status: "in",
  };
  write([session, ...read()]);
  return session;
}

export function checkoutSession(id: string): GateSession | undefined {
  const sessions = read();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx === -1) return undefined;
  sessions[idx] = {
    ...sessions[idx],
    status: "out",
    timeOut: new Date().toISOString(),
  };
  write(sessions);
  return sessions[idx];
}
