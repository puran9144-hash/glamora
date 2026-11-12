"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { Bike, MapPin, PackageCheck, RefreshCw, LogIn, LogOut, Clock3, CheckCircle2, Navigation, AlertCircle, Phone } from "lucide-react";

type Delivery = {
  id: string; order_id: string;
  delivery_status: "pending" | "assigned" | "picked_up" | "delivered" | "failed" | "cancelled";
  assigned_at: string | null; picked_up_at: string | null; delivered_at: string | null;
  orders?: { id: string; order_number: string; grand_total: number; delivery_address: Record<string, any> | string; order_status: string } | null;
};
const money = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const addressText = (v: any) => !v ? "Address not available" : typeof v === "string" ? v : [v.full_name,v.phone,v.address_line||v.address,v.landmark,v.city,v.state,v.pincode].filter(Boolean).join(", ") || "Address not available";
const normalizePhone = (v: string) => { const d=v.replace(/\D/g,""); return d.length===10?`+91${d}`:d.startsWith("91")?`+${d}`:v.trim(); };

export default function GlamoraDeliveryPartnerApp() {
  const [session,setSession]=useState<any>(null);
  const [phone,setPhone]=useState(""); const [otp,setOtp]=useState(""); const [otpSent,setOtpSent]=useState(false); const [widgetReady,setWidgetReady]=useState(false);
  const [rows,setRows]=useState<Delivery[]>([]); const [loading,setLoading]=useState(true); const [busyId,setBusyId]=useState("");
  const [notice,setNotice]=useState(""); const [isPartner,setIsPartner]=useState(false);

  const loadDeliveries=useCallback(async(uid:string)=>{
    if(!supabase){setNotice("Database connection is not configured.");setLoading(false);return;}
    setLoading(true);
    const role=await supabase.from("user_roles").select("role").eq("user_id",uid).eq("role","delivery_partner").maybeSingle();
    if(role.error||!role.data){setIsPartner(false);setRows([]);setNotice("This mobile account is not registered as a GLAMORA delivery partner. Founder Admin must approve and assign delivery_partner access.");setLoading(false);return;}
    setIsPartner(true);
    const result=await supabase.from("deliveries").select("id,order_id,delivery_status,assigned_at,picked_up_at,delivered_at,orders!deliveries_order_id_fkey(id,order_number,grand_total,delivery_address,order_status)").eq("delivery_partner_id",uid).order("created_at",{ascending:false});
    if(result.error)setNotice(result.error.message);else{setRows((result.data||[]) as unknown as Delivery[]);setNotice("");}
    setLoading(false);
  },[]);

  useEffect(()=>{
    const widgetId = process.env.NEXT_PUBLIC_MSG91_WIDGET_ID;
    const tokenAuth = process.env.NEXT_PUBLIC_MSG91_WIDGET_TOKEN;
    if (!widgetId || !tokenAuth) { setNotice("MSG91 setup pending: add Widget ID and Widget Token in Vercel Environment Variables."); return; }
    const w = window as any;
    w.__glamoraMsg91Config = {
      widgetId, tokenAuth, identifier: "", exposeMethods: true,
      success: (_data: any) => {}, failure: (err: any) => setNotice(err?.message || "MSG91 verification failed. Please retry.")
    };
    const existing = document.querySelector('script[data-glamora-msg91="1"]') as HTMLScriptElement | null;
    const init = () => { try { w.initSendOTP(w.__glamoraMsg91Config); setWidgetReady(true); } catch { setNotice("MSG91 widget load nahi hua. Page refresh karein."); } };
    if (existing) { if (w.initSendOTP) init(); else existing.addEventListener("load", init, { once: true }); }
    else { const script=document.createElement("script"); script.src="https://verify.msg91.com/otp-provider.js"; script.async=true; script.dataset.glamoraMsg91="1"; script.onload=init; script.onerror=()=>setNotice("MSG91 SDK load nahi hua."); document.body.appendChild(script); }
  },[]);

  useEffect(()=>{
    if(!supabase){setNotice("Database connection is not configured.");setLoading(false);return;}
    let alive=true;
    supabase.auth.getSession().then(({data})=>{if(!alive)return;setSession(data.session);if(data.session?.user)void loadDeliveries(data.session.user.id);else setLoading(false);});
    const {data:listener}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);if(next?.user)void loadDeliveries(next.user.id);else{setRows([]);setIsPartner(false);setLoading(false);}});
    return()=>{alive=false;listener.subscription.unsubscribe();};
  },[loadDeliveries]);

  async function sendOtp(e:FormEvent){
    e.preventDefault(); const p=normalizePhone(phone);
    if(!/^\+[1-9]\d{7,14}$/.test(p)) return setNotice("Mobile number country code ke saath enter karein, e.g. +91XXXXXXXXXX.");
    const w=window as any; if(!widgetReady || typeof w.sendOtp!=="function") return setNotice("MSG91 widget abhi ready nahi hai. 5 seconds baad retry karein.");
    setBusyId("send");setNotice("");
    w.sendOtp(p.replace("+",""),()=>{setPhone(p);setOtpSent(true);setNotice("OTP sent. SMS mein aaya hua OTP enter karein.");},(err:any)=>setNotice(err?.message||"OTP send nahi hua. MSG91 settings check karein."));
    setBusyId("");
  }
  async function verifyOtp(e:FormEvent){
    e.preventDefault(); const w=window as any;
    if(typeof w.verifyOtp!=="function") return setNotice("MSG91 widget ready nahi hai. Page refresh karein.");
    setBusyId("verify");setNotice("");
    w.verifyOtp(otp.trim(),async(data:any)=>{
      const accessToken=data?.message||data?.accessToken||data?.access_token||data?.["access-token"]||data?.token;
      if(typeof accessToken!=="string") { setNotice("MSG91 ne access token return nahi kiya. Widget success response check karein.");setBusyId("");return; }
      try {
        const base=process.env.NEXT_PUBLIC_SUPABASE_URL; const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if(!base||!anon||!supabase) throw new Error("Supabase configuration missing.");
        const response=await fetch(`${base}/functions/v1/msg91-delivery-login`,{method:"POST",headers:{"Content-Type":"application/json",apikey:anon},body:JSON.stringify({accessToken})});
        const result=await response.json(); if(!response.ok) throw new Error(result.error||"Delivery Partner login failed.");
        const {error}=await supabase.auth.setSession({access_token:result.session.access_token,refresh_token:result.session.refresh_token});
        if(error) throw error;
      } catch(err:any) { setNotice(err?.message||"Login failed. Please retry."); }
      setBusyId("");
    },(err:any)=>{setNotice(err?.message||"Incorrect or expired OTP.");setBusyId("");});
  }
  async function updateStatus(row:Delivery,next:Delivery["delivery_status"]){if(!supabase||!session?.user)return;setBusyId(row.id);setNotice("");const now=new Date().toISOString();const patch:Record<string,any>={delivery_status:next,updated_at:now};if(next==="picked_up")patch.picked_up_at=now;if(next==="delivered")patch.delivered_at=now;const {error}=await supabase.from("deliveries").update(patch).eq("id",row.id).eq("delivery_partner_id",session.user.id);if(error)setNotice(error.message);else await loadDeliveries(session.user.id);setBusyId("");}
  async function signOut(){if(supabase)await supabase.auth.signOut();setOtpSent(false);setOtp("");}

  if(!session)return <main className="min-h-screen bg-[#f8f5f1] flex items-center justify-center p-5"><section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl border border-[#eadfda]"><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#701d3b] text-[#f4dcae]"><Bike size={32}/></div><p className="text-center text-xs tracking-[.28em] text-[#a07855]">GLAMORA • DELIVERY</p><h1 className="mt-2 text-center text-3xl font-semibold text-[#4c2035]">Partner Login</h1><p className="mt-2 text-center text-sm text-gray-500">Login securely with your registered mobile number.</p><form onSubmit={otpSent?verifyOtp:sendOtp} className="mt-7 space-y-4">{!otpSent?<><label className="block text-sm font-medium text-gray-700">Mobile number</label><div className="flex items-center gap-2 rounded-xl border p-3 focus-within:border-[#8b3154]"><Phone size={18} className="text-gray-400"/><input className="w-full outline-none" type="tel" inputMode="numeric" autoComplete="tel" required placeholder="+91 98765 43210" value={phone} onChange={e=>setPhone(e.target.value)}/></div><button disabled={busyId==="send"} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#701d3b] p-3 font-semibold text-white disabled:opacity-60"><LogIn size={18}/>{busyId==="send"?"Sending OTP…":"Send OTP"}</button></>:<><label className="block text-sm font-medium text-gray-700">6-digit OTP sent to {phone}</label><input className="w-full rounded-xl border p-3 text-center text-xl tracking-[.4em] outline-none focus:border-[#8b3154]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required placeholder="••••••" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))}/><button disabled={busyId==="verify"||otp.length!==6} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#701d3b] p-3 font-semibold text-white disabled:opacity-60">{busyId==="verify"?"Verifying…":"Verify & Login"}</button><button type="button" onClick={()=>{setOtpSent(false);setOtp("");setNotice("");}} className="w-full text-sm text-[#8b3154]">Change mobile number</button></>}</form>{notice&&<p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{notice}</p>}<p className="mt-6 text-center text-xs text-gray-400">MSG91 verified mobile + Founder-approved delivery partner access required.</p></section></main>;

  return <main className="min-h-screen bg-[#f8f5f1]"><header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-[#701d3b] p-2 text-[#f4dcae]"><Bike/></div><div><p className="text-xs tracking-[.2em] text-[#a07855]">GLAMORA</p><h1 className="text-lg font-semibold text-[#4c2035]">Delivery Partner</h1></div></div><div className="flex gap-2"><button onClick={()=>session.user&&loadDeliveries(session.user.id)} className="rounded-xl border p-2 text-gray-600" title="Refresh"><RefreshCw size={18}/></button><button onClick={signOut} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"><LogOut size={16}/> Logout</button></div></div></header><div className="mx-auto max-w-5xl px-4 py-7"><div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{[{label:"Assigned",value:rows.filter(x=>["pending","assigned"].includes(x.delivery_status)).length},{label:"Picked Up",value:rows.filter(x=>x.delivery_status==="picked_up").length},{label:"Delivered",value:rows.filter(x=>x.delivery_status==="delivered").length},{label:"Total Tasks",value:rows.length}].map(x=><div key={x.label} className="rounded-2xl border border-[#eadfda] bg-white p-4"><p className="text-xs text-gray-500">{x.label}</p><p className="mt-1 text-2xl font-semibold text-[#701d3b]">{x.value}</p></div>)}</div><div className="mb-5 flex items-center justify-between"><div><p className="text-xs tracking-[.2em] text-[#a07855]">YOUR WORK</p><h2 className="text-2xl font-semibold text-[#4c2035]">My Deliveries</h2></div><span className="rounded-full bg-[#f0e4e7] px-3 py-1 text-xs text-[#701d3b]">{isPartner?"Partner verified":"Checking access"}</span></div>{notice&&<div className="mb-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><AlertCircle size={18} className="shrink-0"/>{notice}</div>}{loading?<div className="rounded-2xl bg-white p-10 text-center text-gray-500">Loading assigned deliveries…</div>:rows.length===0?<div className="rounded-2xl border border-dashed border-[#d8c5ca] bg-white p-10 text-center"><PackageCheck className="mx-auto text-[#a07855]" size={36}/><h3 className="mt-3 text-lg font-semibold text-[#4c2035]">No deliveries assigned</h3><p className="mt-1 text-sm text-gray-500">New tasks assigned by GLAMORA Founder Admin will appear here.</p></div>:<div className="space-y-4">{rows.map(row=>{const order=row.orders;const addr=addressText(order?.delivery_address);const status=row.delivery_status;return <article key={row.id} className="rounded-2xl border border-[#eadfda] bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-gray-400">ORDER</p><h3 className="text-xl font-semibold text-[#4c2035]">{order?.order_number||row.order_id.slice(0,8)}</h3><p className="mt-1 text-sm text-gray-500">{money(order?.grand_total||0)}</p></div><span className="rounded-full bg-[#f5edf0] px-3 py-1 text-xs font-semibold capitalize text-[#701d3b]">{status.replaceAll("_"," ")}</span></div><div className="mt-4 flex gap-3 rounded-xl bg-[#faf7f4] p-3"><MapPin className="mt-1 shrink-0 text-[#8b3154]" size={19}/><div className="min-w-0"><p className="text-xs text-gray-500">DELIVERY ADDRESS</p><p className="mt-1 text-sm text-gray-800">{addr}</p><a className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[#8b3154]" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`}><Navigation size={14}/> Open in Maps</a></div></div><div className="mt-4 flex flex-wrap gap-2">{(["pending","assigned"].includes(status))&&<button disabled={busyId===row.id} onClick={()=>updateStatus(row,"picked_up")} className="rounded-xl bg-[#701d3b] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busyId===row.id?"Updating…":"Mark Picked Up"}</button>}{status==="picked_up"&&<button disabled={busyId===row.id} onClick={()=>updateStatus(row,"delivered")} className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white"><CheckCircle2 size={17}/>{busyId===row.id?"Updating…":"Mark Delivered"}</button>}{status==="delivered"&&<span className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800"><CheckCircle2 size={17}/> Delivery completed</span>}{status==="failed"&&<span className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">Contact Founder Admin for next action</span>}{status==="cancelled"&&<span className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm text-gray-600">Order cancelled</span>}</div><p className="mt-3 flex items-center gap-1 text-xs text-gray-400"><Clock3 size={13}/> Assigned {row.assigned_at?new Date(row.assigned_at).toLocaleString("en-IN"):"time not recorded"}</p></article>;})}</div>}<p className="mt-8 text-center text-xs text-gray-400">GLAMORA Delivery • Customer address is shown only for your assigned orders.</p></div></main>;
}
