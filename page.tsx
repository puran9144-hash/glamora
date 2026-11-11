"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage(){
 const [ready,setReady]=useState(false),[hasSession,setHasSession]=useState(false),[password,setPassword]=useState(""),[confirm,setConfirm]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[success,setSuccess]=useState(false);
 useEffect(()=>{if(!supabase){setMessage("Supabase configuration missing.");setReady(true);return;}
  let active=true;
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{if(!active)return;if(session&&(event==="PASSWORD_RECOVERY"||event==="SIGNED_IN")){setHasSession(true);setReady(true);}});
  void supabase.auth.getSession().then(({data,error})=>{if(!active)return;if(error)setMessage(error.message);setHasSession(!!data.session);setReady(true);});
  return()=>{active=false;subscription.unsubscribe();};
 },[]);
 async function update(e:React.FormEvent){e.preventDefault();if(!supabase)return;setMessage("");if(password.length<8){setMessage("Password कम से कम 8 characters का रखें।");return;}if(password!==confirm){setMessage("दोनों passwords match नहीं कर रहे।");return;}setBusy(true);const {error}=await supabase.auth.updateUser({password});if(error)setMessage(error.message);else{setSuccess(true);setMessage("Password सफलतापूर्वक बदल दिया गया। अब Founder Login पर जाएँ।");}setBusy(false);}
 return <main className="login-wrap"><section className="login-card"><div className="brand"><div className="brand-mark">◆</div><div><div className="brand-name">GLAMORA</div><div className="brand-sub">FOUNDER CONTROL</div></div></div><h1>Set New Password</h1><p className="muted">अपने GLAMORA Founder account के लिए नया password सेट करें।</p>{!ready?<p className="muted">Reset link verify हो रहा है…</p>:success?<div className="notice">{message}</div>:!hasSession?<div className="error">{message||"यह reset link invalid या expired है। Founder Login पर जाकर नया reset link मँगाएँ।"}<p><Link href="/" className="text-link">Back to Founder Login</Link></p></div>:<form onSubmit={update}><div className="field"><label>New password</label><input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/></div><div className="field"><label>Confirm new password</label><input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Enter password again"/></div>{message&&<div className="error">{message}</div>}<button className="primary" disabled={busy}>{busy?"Updating…":"Update Password"}</button></form>}{success&&<Link href="/" className="text-link">Go to Founder Login</Link>}<div className="hint">अपना password किसी के साथ साझा न करें।</div></section></main>;
}
