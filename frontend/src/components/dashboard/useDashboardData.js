import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../api/client";

// ===== helpers =====
function asList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload?.results && Array.isArray(payload.results)) return payload.results;
  return [];
}

function mapActivity(a) {
  return {
    id: a.id ?? a.pk,
    title: a.title ?? a.name ?? a.activity_name ?? "ללא כותרת",
    org_name: a.org_name ?? a.organization_name ?? a.org?.name ?? "",
    location: a.location ?? a.city ?? a.address ?? "",
    category: a.category ?? a.category_name ?? a.type ?? "",
    date: a.date ?? a.start_date ?? a.starts_at ?? "",
    time: a.time ?? a.start_time ?? "",
    needed_volunteers: a.needed_volunteers ?? a.needed ?? a.capacity ?? "",
    signups_count: a.signups_count ?? a.signup_count ?? "",
    my_rating: a.my_rating ?? a.rating ?? null,
  };
}

function mapDonation(d) {
  return {
    id: d.id ?? d.pk,
    org_name:
      d.org_name ??
      d.organization_name ??
      d.organization?.org_name ??
      d.organization?.name ??
      d.org?.name ??
      "",
    amount: d.amount ?? d.sum ?? d.total ?? "",
    currency: d.currency ?? d.curr ?? "",
    donor_name: d.donor_name ?? d.name ?? "",
    donor_email: d.donor_email ?? d.email ?? "",
    status: d.status ?? d.payment_status ?? "",
    date: d.date ?? d.created_at ?? "",
  };
}

function getRole(profile) {
  const raw = profile?.role ?? profile?.user?.role ?? profile?.account?.role ?? "";
  return String(raw || "").toUpperCase();
}

function todayIsoLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function useDashboardData() {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [profile, setProfile] = useState(null);

  // volunteer
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [history, setHistory] = useState([]);
  const [donations, setDonations] = useState([]);

  // org
  const [orgUpcoming, setOrgUpcoming] = useState([]);
  const [orgHistory, setOrgHistory] = useState([]);
  const [orgDonations, setOrgDonations] = useState([]);

  // cancel
  const [cancelBusyId, setCancelBusyId] = useState(null);

  const demo = useMemo(
    () => ({
      profile: { full_name: "אדיר משה", role: "VOLUNTEER" },
      stats: { reliability_score: 0, activities_count: 0, hours_total: 0 },
      upcoming: [],
      history: [],
      donations: [],
      orgUpcoming: [],
      orgHistory: [],
      orgDonations: [],
    }),
    []
  );

  async function cancelSignup(eventId) {
    if (!eventId || cancelBusyId) return;

    const ok = window.confirm("לבטל הרשמה לאירוע?");
    if (!ok) return;

    setCancelBusyId(eventId);
    setErr("");

    try {
      await apiFetch(`/api/events/${eventId}/signup/`, { method: "DELETE" });
      setUpcoming((prev) => prev.filter((e) => e.id !== eventId));
    } catch (e) {
      setErr(e?.message || "לא הצלחתי לבטל הרשמה");
    } finally {
      setCancelBusyId(null);
    }
  }

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr("");

      try {
        const me = await apiFetch("/api/me/");
        if (!alive) return;

        const role = getRole(me);
        const isVolunteer = role === "VOLUNTEER";
        const isOrg = role === "ORG" || role === "ADMIN";

        const [evUpRaw, evHistRaw, st, donsRaw] = await Promise.all([
          apiFetch("/api/events/?status=upcoming"),
          apiFetch("/api/events/?status=history"),
          isVolunteer ? apiFetch("/api/dashboard/stats/") : Promise.resolve(null),
          isVolunteer || isOrg ? apiFetch("/api/donations/") : Promise.resolve([]),
        ]);

        if (!alive) return;

        setProfile(me);

        const today = todayIsoLocal();

        if (isVolunteer) {
          const up = asList(evUpRaw)
            .map(mapActivity)
            .filter((e) => String(e?.date || "") >= today)
            .sort((a, b) => String(a?.date || "").localeCompare(String(b?.date || "")));

          const hist = asList(evHistRaw)
            .map(mapActivity)
            .filter((e) => String(e?.date || "") < today)
            .sort((a, b) => String(b?.date || "").localeCompare(String(a?.date || "")));

          setUpcoming(up);
          setHistory(hist);
          setStats(st);
          setDonations(asList(donsRaw).map(mapDonation));
          setActiveTab("upcoming");
        } else if (isOrg) {
          const up = asList(evUpRaw)
            .map(mapActivity)
            .filter((e) => String(e?.date || "") >= today)
            .sort((a, b) => String(a?.date || "").localeCompare(String(b?.date || "")));

          const hist = asList(evHistRaw)
            .map(mapActivity)
            .filter((e) => String(e?.date || "") < today)
            .sort((a, b) => String(b?.date || "").localeCompare(String(a?.date || "")));

          setOrgUpcoming(up);
          setOrgHistory(hist);
          setOrgDonations(asList(donsRaw).map(mapDonation));
          setActiveTab("orgUpcoming");
        } else {
          setUpcoming(asList(evUpRaw).map(mapActivity));
          setHistory(asList(evHistRaw).map(mapActivity));
          setActiveTab("upcoming");
        }
      } catch (e) {
        if (!alive) return;

        setErr(e?.message || "שגיאה בטעינת נתונים");
        setProfile(demo.profile);
        setStats(demo.stats);
        setUpcoming(demo.upcoming);
        setHistory(demo.history);
        setDonations(demo.donations);
        setOrgUpcoming(demo.orgUpcoming);
        setOrgHistory(demo.orgHistory);
        setOrgDonations(demo.orgDonations);
        setActiveTab("upcoming");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [demo]);

  return {
    activeTab,
    setActiveTab,
    loading,
    err,
    profile,

    stats,
    upcoming,
    history,
    donations,

    orgUpcoming,
    orgHistory,
    orgDonations,

    cancelBusyId,
    cancelSignup,
  };
}
