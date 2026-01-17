// src/frontend/src/hooks/useDashboardReports.js
import { useState } from "react";
import { apiFetch } from "../../api/client";
import { downloadCsv, runWithConcurrency, todayIsoLocal } from "./dashboardUtils";

// helpers מקומיים לדוח
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

export default function useDashboardReports() {
  const [reportBusy, setReportBusy] = useState(false);
  const [reportMsg, setReportMsg] = useState("");

  // ===== volunteer reports =====
  async function exportVolunteerDonationsCsv() {
    if (reportBusy) return;
    setReportBusy(true);
    setReportMsg("");

    try {
      const raw = await apiFetch("/api/donations/");
      const list = asList(raw).map(mapDonation);

      const headers = ["donation_id", "org_name", "amount", "currency", "status", "created_at"];
      const rows = list.map((d) => ({
        donation_id: d.id,
        org_name: d.org_name || "",
        amount: d.amount,
        currency: d.currency,
        status: d.status,
        created_at: d.date,
      }));

      downloadCsv(`my_donations_${todayIsoLocal()}.csv`, headers, rows);
      setReportMsg("✅ דוח תרומות ירד בהצלחה");
    } catch (e) {
      setReportMsg(e?.message || "שגיאה בייצוא דוח תרומות");
    } finally {
      setReportBusy(false);
    }
  }

  async function exportVolunteerEventsHistoryCsv() {
    if (reportBusy) return;
    setReportBusy(true);
    setReportMsg("");

    try {
      const raw = await apiFetch("/api/events/?status=history");
      const list = asList(raw).map(mapActivity);

      const headers = [
        "event_id",
        "event_title",
        "event_date",
        "event_location",
        "event_category",
        "organization",
        "my_rating",
      ];

      const rows = list.map((e) => ({
        event_id: e.id,
        event_title: e.title,
        event_date: e.date,
        event_location: e.location,
        event_category: e.category,
        organization: e.org_name || "",
        my_rating:
          e.my_rating !== null && e.my_rating !== undefined && e.my_rating !== "" ? e.my_rating : "",
      }));

      downloadCsv(`my_events_history_${todayIsoLocal()}.csv`, headers, rows);
      setReportMsg("✅ דוח אירועים + דירוג ירד בהצלחה");
    } catch (e) {
      setReportMsg(e?.message || "שגיאה בייצוא דוח אירועים");
    } finally {
      setReportBusy(false);
    }
  }

  // ===== org reports =====
  async function exportOrgDonationsCsv() {
    if (reportBusy) return;
    setReportBusy(true);
    setReportMsg("");

    try {
      const raw = await apiFetch("/api/donations/");
      const list = asList(raw).map(mapDonation);

      const headers = [
        "donation_id",
        "amount",
        "currency",
        "donor_name",
        "donor_email",
        "status",
        "created_at",
      ];

      const rows = list.map((d) => ({
        donation_id: d.id,
        amount: d.amount,
        currency: d.currency,
        donor_name: d.donor_name,
        donor_email: d.donor_email,
        status: d.status,
        created_at: d.date,
      }));

      downloadCsv(`donations_report_${todayIsoLocal()}.csv`, headers, rows);
      setReportMsg("✅ דוח תרומות ירד בהצלחה");
    } catch (e) {
      setReportMsg(e?.message || "שגיאה בייצוא דוח תרומות");
    } finally {
      setReportBusy(false);
    }
  }

  async function exportOrgEventsAndSignupsCsv() {
    if (reportBusy) return;
    setReportBusy(true);
    setReportMsg("");

    try {
      const evRaw = await apiFetch("/api/events/");
      const events = asList(evRaw).map(mapActivity);

      const signupsByEvent = await runWithConcurrency(events, 4, async (ev) => {
        try {
          const s = await apiFetch(`/api/events/${ev.id}/signups/`);
          return { eventId: ev.id, signups: asList(s) };
        } catch {
          return { eventId: ev.id, signups: [] };
        }
      });

      const byId = new Map(signupsByEvent.map((x) => [x.eventId, x.signups]));

      const headers = [
        "event_id",
        "event_title",
        "event_date",
        "event_time",
        "event_location",
        "event_category",
        "needed_volunteers",
        "signups_count",
        "volunteer_name",
        "signup_created_at",
      ];

      const rows = [];
      for (const ev of events) {
        const signups = byId.get(ev.id) || [];
        const signupCount =
          ev.signups_count !== "" && ev.signups_count !== null && ev.signups_count !== undefined
            ? ev.signups_count
            : signups.length;

        if (!signups.length) {
          rows.push({
            event_id: ev.id,
            event_title: ev.title,
            event_date: ev.date,
            event_time: ev.time,
            event_location: ev.location,
            event_category: ev.category,
            needed_volunteers: ev.needed_volunteers,
            signups_count: signupCount,
            volunteer_name: "",
            signup_created_at: "",
          });
        } else {
          for (const s of signups) {
            rows.push({
              event_id: ev.id,
              event_title: ev.title,
              event_date: ev.date,
              event_time: ev.time,
              event_location: ev.location,
              event_category: ev.category,
              needed_volunteers: ev.needed_volunteers,
              signups_count: signupCount,
              volunteer_name: s.volunteer_name ?? s.name ?? "",
              signup_created_at: s.created_at ?? "",
            });
          }
        }
      }

      downloadCsv(`events_and_signups_report_${todayIsoLocal()}.csv`, headers, rows);
      setReportMsg("✅ דוח אירועים + נרשמים ירד בהצלחה");
    } catch (e) {
      setReportMsg(e?.message || "שגיאה בייצוא דוח אירועים");
    } finally {
      setReportBusy(false);
    }
  }

  return {
    reportBusy,
    reportMsg,
    exportVolunteerDonationsCsv,
    exportVolunteerEventsHistoryCsv,
    exportOrgDonationsCsv,
    exportOrgEventsAndSignupsCsv,
  };
}
