"use client";

import { useEffect, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type Partner = {
  user_id: string;
  city_id: string | null;
  vehicle_type: string | null;
  vehicle_number: string | null;
  verification_status: string;
  availability_status: string;
  joined_at: string;
  profiles?: { full_name?: string; phone?: string } | null;
  cities?: { name?: string } | null;
};

const supabase: SupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DeliveryPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ full_name: "", phone: "", city_id: "", vehicle_type: "bike", vehicle_number: "" });

  async function callAdmin(payload: Record<string, unknown>) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Founder login required. Please sign in again.");
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/founder-delivery-partners`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Request failed");
    return result;
  }

  async function load() {
    setError("");
    setLoading(true);
    try {
      const [list, cityResult] = await Promise.all([
        callAdmin({ action: "list" }),
        supabase.from("cities").select("id,name").eq("is_active", true).order("name")
      ]);
      setPartners(list.partners || []);
      if (cityResult.error) throw cityResult.error;
      setCities(cityResult.data || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load partners"); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function addPartner(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      await callAdmin({ action: "create", ...form, city_id: form.city_id || null });
      setForm({ full_name: "", phone: "", city_id: "", vehicle_type: "bike", vehicle_number: "" });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not add partner"); }
    finally { setSaving(false); }
  }

  async function updatePartner(user_id: string, patch: Record<string, unknown>) {
    setError("");
    try { await callAdmin({ action: "update", user_id, ...patch }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Update failed"); }
  }

  const input = "w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-700";
  const button = "rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50";

  return (
    <main className="min-h-screen bg-stone-50 p-4 text-stone-900 md:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[.25em] text-amber-800">GLAMORA Founder Panel</p><h1 className="mt-1 text-3xl font-bold">Delivery Partners</h1><p className="mt-1 text-sm text-stone-500">Add, approve and manage delivery staff.</p></div>
          <button className={button} onClick={() => void load()}>Refresh</button>
        </header>

        {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

        <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">Add Delivery Partner</h2>
          <form onSubmit={addPartner} className="grid gap-3 md:grid-cols-3">
            <input className={input} placeholder="Full name" required minLength={2} value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/>
            <input className={input} placeholder="Mobile number" required inputMode="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
            <select className={input} value={form.city_id} onChange={e=>setForm({...form,city_id:e.target.value})}><option value="">Select city</option>{cities.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <select className={input} value={form.vehicle_type} onChange={e=>setForm({...form,vehicle_type:e.target.value})}><option value="bike">Bike</option><option value="scooter">Scooter</option><option value="bicycle">Bicycle</option><option value="car">Car</option><option value="other">Other</option></select>
            <input className={input} placeholder="Vehicle number (optional)" value={form.vehicle_number} onChange={e=>setForm({...form,vehicle_number:e.target.value})}/>
            <button className={button} disabled={saving}>{saving ? "Adding..." : "Add Partner"}</button>
          </form>
          <p className="mt-3 text-xs text-stone-500">Partner account is created with pending verification. Mobile OTP login is completed separately through MSG91.</p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-200 p-5"><h2 className="text-lg font-bold">Partner Directory <span className="ml-2 rounded-full bg-stone-100 px-2 py-1 text-xs">{partners.length}</span></h2></div>
          {loading ? <p className="p-6 text-sm text-stone-500">Loading partners...</p> : partners.length===0 ? <p className="p-6 text-sm text-stone-500">No delivery partners added yet.</p> :
            <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-stone-100 text-xs uppercase text-stone-600"><tr><th className="p-4">Partner</th><th className="p-4">City / Vehicle</th><th className="p-4">Verification</th><th className="p-4">Availability</th><th className="p-4">Actions</th></tr></thead><tbody>
              {partners.map(p=><tr key={p.user_id} className="border-t border-stone-100"><td className="p-4"><div className="font-semibold">{p.profiles?.full_name || "Unnamed"}</div><div className="text-xs text-stone-500">{p.profiles?.phone || "No phone"}</div></td><td className="p-4">{p.cities?.name || "Unassigned"}<div className="text-xs text-stone-500">{p.vehicle_type || "Vehicle not set"} {p.vehicle_number ? `· ${p.vehicle_number}` : ""}</div></td><td className="p-4"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold capitalize text-amber-800">{p.verification_status}</span></td><td className="p-4 capitalize">{p.availability_status.replace("_"," ")}</td><td className="p-4"><div className="flex flex-wrap gap-2">{p.verification_status!=="approved" && <button className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white" onClick={()=>void updatePartner(p.user_id,{verification_status:"approved"})}>Approve</button>}<button className="rounded-lg border border-stone-300 px-3 py-2 text-xs" onClick={()=>void updatePartner(p.user_id,{availability_status:p.availability_status==="offline"?"online":"offline"})}>{p.availability_status==="offline"?"Set Online":"Set Offline"}</button><button className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-700" onClick={()=>void updatePartner(p.user_id,{verification_status:"suspended",account_status:"suspended",availability_status:"offline"})}>Suspend</button></div></td></tr>)}
            </tbody></table></div>}
        </section>
      </div>
    </main>
  );
}
