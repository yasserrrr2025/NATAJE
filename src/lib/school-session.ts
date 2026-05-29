export function getCurrentSchoolId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("school_id");
}

export function clearSchoolSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("school_id");
  window.localStorage.removeItem("school_name");
}
