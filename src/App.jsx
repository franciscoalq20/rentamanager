import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ucbsblteymfclaeewxkk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjYnNibHRleW1mY2xhZWV3eGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MzQwODgsImV4cCI6MjA4ODQxMDA4OH0.LBwcBvzFYiY7NGqEj7fT1HqEBJ-wut-LlL06fR2pygs";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("es-AR", { style:"currency", currency:"ARS", maximumFractionDigits:0 }).format(n);
const dateStr = (d) => d.toISOString().slice(0,10);
const addDays = (s, n) => { const d = new Date(s); d.setDate(d.getDate()+n); return dateStr(d); };
const diffDays = (a, b) => Math.round((new Date(b)-new Date(a))/(86400000));
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const uid = () => crypto.randomUUID();

function getDaysInMonth(year, month) {
  return new Date(year, month+1, 0).getDate();
}

// Map Supabase snake_case to camelCase
function mapRes(r) {
  return { id: r.id, propId: r.prop_id, guest: r.guest, phone: r.phone||"", checkIn: r.check_in, checkOut: r.check_out, price: r.price||0, commission: r.commission||0.15, cleaning: r.cleaning||0, notes: r.notes||"" };
}
function mapProp(p) {
  return { id: p.id, name: p.name, type: p.type, color: p.color, address: p.address||"", notes: p.notes||"" };
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
      <div style={{background:"#1e2433",borderRadius:"1rem",width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 25px 60px rgba(0,0,0,.5)"}}>
        <div style={{padding:"1.25rem 1.5rem",borderBottom:"1px solid #2d3548",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h2 style={{margin:0,fontSize:"1.1rem",color:"#f0f4ff"}}>{title}</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#8896b3",cursor:"pointer",fontSize:"1.4rem",lineHeight:1}}>×</button>
        </div>
        <div style={{padding:"1.5rem"}}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{marginBottom:"1rem"}}>
      <label style={{display:"block",fontSize:".78rem",color:"#8896b3",marginBottom:".35rem",textTransform:"uppercase",letterSpacing:".05em"}}>{label}</label>
      {children}
    </div>
  );
}
const inputStyle = { width:"100%", padding:".55rem .75rem", background:"#252d3f", border:"1px solid #2d3548", borderRadius:".5rem", color:"#f0f4ff", fontSize:".9rem", boxSizing:"border-box" };

// ─── RESERVATION FORM ─────────────────────────────────────────────────────────
function ReservationForm({ properties, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { id:uid(), propId: properties[0]?.id||"", guest:"", phone:"", checkIn: dateStr(new Date()), checkOut: addDays(dateStr(new Date()),2), price:"", commission:0.15, cleaning:"", notes:"" });
  const nights = form.checkIn && form.checkOut ? Math.max(0, diffDays(form.checkIn, form.checkOut)) : 0;
  const set = (k,v) => setForm(p => ({...p, [k]:v}));
  return (
    <div>
      <Field label="Propiedad">
        <select style={inputStyle} value={form.propId} onChange={e=>set("propId",e.target.value)}>
          {properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
        <Field label="Entrada"><input type="date" style={inputStyle} value={form.checkIn} onChange={e=>set("checkIn",e.target.value)}/></Field>
        <Field label="Salida"><input type="date" style={inputStyle} value={form.checkOut} onChange={e=>set("checkOut",e.target.value)}/></Field>
      </div>
      <div style={{background:"#252d3f",borderRadius:".5rem",padding:".6rem 1rem",marginBottom:"1rem",color:"#64d5a0",fontSize:".88rem"}}>
        🌙 {nights} noche{nights!==1?"s":""}
      </div>
      <Field label="Nombre del huésped"><input style={inputStyle} value={form.guest} onChange={e=>set("guest",e.target.value)} placeholder="Nombre completo"/></Field>
      <Field label="Teléfono"><input style={inputStyle} value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="+54 ..."/></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
        <Field label="Precio Total ($)"><input type="number" style={inputStyle} value={form.price} onChange={e=>set("price",e.target.value)} placeholder="0"/></Field>
        <Field label="Limpieza ($)"><input type="number" style={inputStyle} value={form.cleaning} onChange={e=>set("cleaning",e.target.value)} placeholder="0"/></Field>
      </div>
      <Field label="Comisión (%)">
        <input type="number" style={inputStyle} step="0.01" min="0" max="1" value={form.commission} onChange={e=>set("commission",parseFloat(e.target.value)||0)} placeholder="0.15"/>
      </Field>
      {form.price>0 && (
        <div style={{background:"#1a2235",border:"1px solid #2d3548",borderRadius:".5rem",padding:".75rem 1rem",marginBottom:"1rem",fontSize:".85rem",lineHeight:1.8}}>
          <div style={{color:"#8896b3"}}>Comisión: <span style={{color:"#f87171"}}>{fmt(form.price*form.commission)}</span></div>
          <div style={{color:"#8896b3"}}>Neto (sin limpieza): <span style={{color:"#64d5a0"}}>{fmt(form.price*(1-form.commission))}</span></div>
          <div style={{color:"#8896b3"}}>Ingreso neto total: <span style={{color:"#64d5a0",fontWeight:700}}>{fmt(form.price*(1-form.commission) - (parseFloat(form.cleaning)||0))}</span></div>
        </div>
      )}
      <Field label="Observaciones"><textarea style={{...inputStyle,height:70,resize:"vertical"}} value={form.notes} onChange={e=>set("notes",e.target.value)}/></Field>
      <div style={{display:"flex",gap:".75rem",justifyContent:"flex-end",marginTop:".5rem"}}>
        <button onClick={onClose} style={{padding:".6rem 1.2rem",background:"#252d3f",border:"1px solid #2d3548",borderRadius:".5rem",color:"#8896b3",cursor:"pointer"}}>Cancelar</button>
        <button onClick={()=>onSave({...form, price:parseFloat(form.price)||0, cleaning:parseFloat(form.cleaning)||0})}
          style={{padding:".6rem 1.4rem",background:"#3b82f6",border:"none",borderRadius:".5rem",color:"#fff",cursor:"pointer",fontWeight:600}}>
          Guardar reserva
        </button>
      </div>
    </div>
  );
}

// ─── PROPERTY FORM ────────────────────────────────────────────────────────────
const COLORS = ["#e07b39","#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#ec4899","#84cc16","#f97316"];
function PropertyForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { id:uid(), name:"", type:"Casa", color:COLORS[0], address:"", notes:"" });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  return (
    <div>
      <Field label="Nombre de la propiedad"><input style={inputStyle} value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Casa del lago, Dpto 3B..."/></Field>
      <Field label="Tipo">
        <select style={inputStyle} value={form.type} onChange={e=>set("type",e.target.value)}>
          {["Casa","Departamento","Cabaña","Villa","Loft","Otro"].map(t=><option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Dirección"><input style={inputStyle} value={form.address} onChange={e=>set("address",e.target.value)} placeholder="Calle, número, ciudad..."/></Field>
      <Field label="Color identificador">
        <div style={{display:"flex",gap:".5rem",flexWrap:"wrap"}}>
          {COLORS.map(c=>(
            <button key={c} onClick={()=>set("color",c)} style={{width:32,height:32,borderRadius:"50%",background:c,border:form.color===c?"3px solid #fff":"3px solid transparent",cursor:"pointer"}}/>
          ))}
        </div>
      </Field>
      <Field label="Notas"><textarea style={{...inputStyle,height:60,resize:"vertical"}} value={form.notes} onChange={e=>set("notes",e.target.value)}/></Field>
      <div style={{display:"flex",gap:".75rem",justifyContent:"flex-end",marginTop:".5rem"}}>
        <button onClick={onClose} style={{padding:".6rem 1.2rem",background:"#252d3f",border:"1px solid #2d3548",borderRadius:".5rem",color:"#8896b3",cursor:"pointer"}}>Cancelar</button>
        <button onClick={()=>onSave(form)} style={{padding:".6rem 1.4rem",background:"#3b82f6",border:"none",borderRadius:".5rem",color:"#fff",cursor:"pointer",fontWeight:600}}>Guardar</button>
      </div>
    </div>
  );
}

// ─── CALENDAR VIEW ────────────────────────────────────────────────────────────
function CalendarView({ properties, reservations, onAddRes }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [filterProp, setFilterProp] = useState("all");

  const visProps = filterProp === "all" ? properties : properties.filter(p=>p.id===filterProp);
  const days = getDaysInMonth(year, month);

  function getResForDay(propId, day) {
    const dateS = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return reservations.find(r => r.propId === propId && r.checkIn <= dateS && r.checkOut > dateS);
  }

  const prevMonth = () => { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); };
  const cellW = Math.max(28, Math.floor((window.innerWidth > 900 ? 800 : window.innerWidth - 80) / days));

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:"1rem",marginBottom:"1.5rem",flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:".5rem"}}>
          <button onClick={prevMonth} style={{background:"#252d3f",border:"1px solid #2d3548",borderRadius:".5rem",color:"#f0f4ff",padding:".4rem .75rem",cursor:"pointer",fontSize:"1rem"}}>‹</button>
          <span style={{fontSize:"1.2rem",fontWeight:700,color:"#f0f4ff",minWidth:180,textAlign:"center"}}>{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} style={{background:"#252d3f",border:"1px solid #2d3548",borderRadius:".5rem",color:"#f0f4ff",padding:".4rem .75rem",cursor:"pointer",fontSize:"1rem"}}>›</button>
        </div>
        <select style={{...inputStyle,width:"auto"}} value={filterProp} onChange={e=>setFilterProp(e.target.value)}>
          <option value="all">Todas las propiedades</option>
          {properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={()=>onAddRes()} style={{marginLeft:"auto",padding:".5rem 1.1rem",background:"#3b82f6",border:"none",borderRadius:".5rem",color:"#fff",cursor:"pointer",fontWeight:600,fontSize:".9rem"}}>
          + Nueva reserva
        </button>
      </div>
      <div style={{overflowX:"auto"}}>
        <div style={{minWidth: 200 + days * cellW}}>
          <div style={{display:"flex",marginBottom:4}}>
            <div style={{width:160,flexShrink:0}}/>
            {Array.from({length:days},(_,i)=>{
              const d = new Date(year,month,i+1);
              const isToday = dateStr(d)===dateStr(today);
              const dow = ["D","L","M","X","J","V","S"][d.getDay()];
              return (
                <div key={i} style={{width:cellW,flexShrink:0,textAlign:"center",fontSize:".65rem",color: isToday?"#3b82f6":"#8896b3",fontWeight: isToday?700:400}}>
                  <div>{dow}</div>
                  <div style={{fontSize:".75rem",color: isToday?"#3b82f6":"#a0aec0"}}>{i+1}</div>
                </div>
              );
            })}
          </div>
          {visProps.map(prop => (
            <div key={prop.id} style={{display:"flex",marginBottom:6,alignItems:"stretch"}}>
              <div style={{width:160,flexShrink:0,display:"flex",alignItems:"center",gap:".5rem",paddingRight:".75rem"}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:prop.color,flexShrink:0}}/>
                <span style={{fontSize:".8rem",color:"#d0d8f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{prop.name}</span>
              </div>
              {Array.from({length:days},(_,i)=>{
                const day = i+1;
                const dateS = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                const res = getResForDay(prop.id, day);
                const isToday = dateS===dateStr(today);
                const isCheckIn = res?.checkIn === dateS;
                const isCheckOut = !res && reservations.find(r=>r.propId===prop.id && r.checkOut===dateS);
                return (
                  <div key={i} title={res ? `${res.guest}\n${res.checkIn} → ${res.checkOut}` : "Libre"}
                    style={{width:cellW,flexShrink:0,height:32,borderRadius:isCheckIn?"6px 0 0 6px":"0",
                      background:res?prop.color+"cc":isToday?"#252d3f":"#181f2e",
                      border:isToday?"1px solid #3b82f6":"1px solid #252d3f",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      cursor:res?"pointer":"default",position:"relative",overflow:"hidden"}}>
                    {isCheckIn && <span style={{fontSize:".6rem",color:"#fff",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:cellW*3,paddingLeft:3,zIndex:1}}>{res.guest.split(" ")[0]}</span>}
                    {isCheckOut && !res && <div style={{width:"50%",height:"100%",background:"#8896b322",marginLeft:"auto",borderLeft:"2px dashed #8896b3"}}/>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div style={{marginTop:"1rem",display:"flex",gap:"1.5rem",flexWrap:"wrap"}}>
        {visProps.map(p=>(
          <div key={p.id} style={{display:"flex",alignItems:"center",gap:".4rem",fontSize:".8rem",color:"#8896b3"}}>
            <div style={{width:12,height:12,borderRadius:3,background:p.color}}/>
            {p.name}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ properties, reservations }) {
  const now = new Date();
  // Evitar duplicar reservas "Ambos" (aparecen dos veces, una por propiedad)
  const seen = new Set();
  const uniqueRes = reservations.filter(r => {
    const key = `${r.guest}-${r.checkIn}-${r.checkOut}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const totalIncome = uniqueRes.reduce((a,r)=>a+r.price,0);
  const totalNet = uniqueRes.reduce((a,r)=>a+(r.price*(1-r.commission)-(r.cleaning||0)),0);
  const totalNights = uniqueRes.reduce((a,r)=>a+diffDays(r.checkIn,r.checkOut),0);
  const upcoming = reservations.filter(r=>r.checkIn>dateStr(now)).sort((a,b)=>a.checkIn.localeCompare(b.checkIn)).slice(0,5);
  const active = reservations.filter(r=>r.checkIn<=dateStr(now)&&r.checkOut>dateStr(now));

  const stats = [
    { label:"Ingresos totales", value: fmt(totalIncome), color:"#3b82f6", icon:"💰" },
    { label:"Ingreso neto", value: fmt(totalNet), color:"#10b981", icon:"📈" },
    { label:"Total noches", value: totalNights, color:"#8b5cf6", icon:"🌙" },
    { label:"Reservas totales", value: uniqueRes.length, color:"#f59e0b", icon:"📋" },
    { label:"Propiedades", value: properties.length, color:"#e07b39", icon:"🏠" },
    { label:"Ocupadas ahora", value: active.length, color:"#ef4444", icon:"🔴" },
  ];

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"1rem",marginBottom:"2rem"}}>
        {stats.map(s=>(
          <div key={s.label} style={{background:"#1e2433",borderRadius:".75rem",padding:"1.25rem",border:"1px solid #2d3548"}}>
            <div style={{fontSize:"1.5rem",marginBottom:".5rem"}}>{s.icon}</div>
            <div style={{fontSize:"1.4rem",fontWeight:800,color:s.color}}>{s.value}</div>
            <div style={{fontSize:".78rem",color:"#8896b3",marginTop:".25rem"}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{background:"#1e2433",borderRadius:".75rem",padding:"1.25rem",border:"1px solid #2d3548",marginBottom:"1.5rem"}}>
        <h3 style={{margin:"0 0 1rem",color:"#f0f4ff",fontSize:"1rem"}}>Por propiedad</h3>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:".85rem"}}>
            <thead>
              <tr style={{borderBottom:"1px solid #2d3548"}}>
                {["Propiedad","Reservas","Noches","Ingresos","Comisiones","Limpieza","Neto"].map(h=>(
                  <th key={h} style={{textAlign:"left",padding:".5rem",color:"#8896b3",fontWeight:600}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {properties.map(p=>{
                const pRes = reservations.filter(r=>r.propId===p.id);
                const nights = pRes.reduce((a,r)=>a+diffDays(r.checkIn,r.checkOut),0);
                const income = pRes.reduce((a,r)=>a+r.price,0);
                const comm = pRes.reduce((a,r)=>a+r.price*r.commission,0);
                const clean = pRes.reduce((a,r)=>a+(r.cleaning||0),0);
                const net = income - comm - clean;
                return (
                  <tr key={p.id} style={{borderBottom:"1px solid #1a2235"}}>
                    <td style={{padding:".5rem",color:"#f0f4ff"}}>
                      <span style={{display:"inline-flex",alignItems:"center",gap:".4rem"}}>
                        <span style={{width:8,height:8,borderRadius:"50%",background:p.color,display:"inline-block"}}/>
                        {p.name}
                      </span>
                    </td>
                    <td style={{padding:".5rem",color:"#a0aec0"}}>{pRes.length}</td>
                    <td style={{padding:".5rem",color:"#a0aec0"}}>{nights}</td>
                    <td style={{padding:".5rem",color:"#3b82f6"}}>{fmt(income)}</td>
                    <td style={{padding:".5rem",color:"#f87171"}}>{fmt(comm)}</td>
                    <td style={{padding:".5rem",color:"#f59e0b"}}>{fmt(clean)}</td>
                    <td style={{padding:".5rem",color:"#10b981",fontWeight:700}}>{fmt(net)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {upcoming.length > 0 && (
        <div style={{background:"#1e2433",borderRadius:".75rem",padding:"1.25rem",border:"1px solid #2d3548"}}>
          <h3 style={{margin:"0 0 1rem",color:"#f0f4ff",fontSize:"1rem"}}>Próximas entradas</h3>
          {upcoming.map(r=>{
            const prop = properties.find(p=>p.id===r.propId);
            return (
              <div key={r.id} style={{display:"flex",alignItems:"center",gap:"1rem",padding:".6rem 0",borderBottom:"1px solid #1a2235"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:prop?.color||"#8896b3",flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{color:"#f0f4ff",fontSize:".9rem"}}>{r.guest}</div>
                  <div style={{color:"#8896b3",fontSize:".78rem"}}>{prop?.name}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{color:"#64d5a0",fontSize:".85rem"}}>{r.checkIn} → {r.checkOut}</div>
                  <div style={{color:"#3b82f6",fontSize:".8rem"}}>{fmt(r.price)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── RESERVATIONS LIST ────────────────────────────────────────────────────────
function ReservationsList({ properties, reservations, onEdit, onDelete, onAdd }) {
  const [search, setSearch] = useState("");
  const [filterProp, setFilterProp] = useState("all");
  const [sort, setSort] = useState("checkIn-desc");

  let filtered = reservations.filter(r => {
    const q = search.toLowerCase();
    const matchText = r.guest.toLowerCase().includes(q) || r.notes.toLowerCase().includes(q) || r.phone.includes(q);
    const matchProp = filterProp==="all" || r.propId===filterProp;
    return matchText && matchProp;
  });

  const [sortKey, sortDir] = sort.split("-");
  filtered = [...filtered].sort((a,b) => {
    const v = sortKey === "price" ? a.price - b.price : a[sortKey]?.localeCompare(b[sortKey]);
    return sortDir === "asc" ? v : -v;
  });

  return (
    <div>
      <div style={{display:"flex",gap:".75rem",marginBottom:"1.25rem",flexWrap:"wrap",alignItems:"center"}}>
        <input style={{...inputStyle,flex:1,minWidth:180}} placeholder="Buscar huésped, notas..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <select style={{...inputStyle,width:"auto"}} value={filterProp} onChange={e=>setFilterProp(e.target.value)}>
          <option value="all">Todas</option>
          {properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select style={{...inputStyle,width:"auto"}} value={sort} onChange={e=>setSort(e.target.value)}>
          <option value="checkIn-desc">Más reciente primero</option>
          <option value="checkIn-asc">Más antiguo primero</option>
          <option value="price-desc">Mayor precio</option>
          <option value="guest-asc">Huésped A-Z</option>
        </select>
        <button onClick={onAdd} style={{padding:".5rem 1.1rem",background:"#3b82f6",border:"none",borderRadius:".5rem",color:"#fff",cursor:"pointer",fontWeight:600,fontSize:".9rem",whiteSpace:"nowrap"}}>
          + Nueva reserva
        </button>
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:".85rem"}}>
          <thead>
            <tr style={{borderBottom:"1px solid #2d3548"}}>
              {["Propiedad","Huésped","Entrada","Salida","Noches","Precio","Neto",""].map(h=>(
                <th key={h} style={{textAlign:"left",padding:".6rem .5rem",color:"#8896b3",fontWeight:600,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r=>{
              const prop = properties.find(p=>p.id===r.propId);
              const nights = diffDays(r.checkIn, r.checkOut);
              const net = r.price*(1-r.commission)-(r.cleaning||0);
              const now = dateStr(new Date());
              const status = r.checkOut <= now ? "past" : r.checkIn <= now ? "active" : "future";
              return (
                <tr key={r.id} style={{borderBottom:"1px solid #1a2235",opacity:status==="past"?.7:1}}>
                  <td style={{padding:".6rem .5rem"}}>
                    <span style={{display:"inline-flex",alignItems:"center",gap:".4rem",color:"#d0d8f0"}}>
                      <span style={{width:8,height:8,borderRadius:"50%",background:prop?.color||"#8896b3",display:"inline-block"}}/>
                      {prop?.name||"?"}
                    </span>
                  </td>
                  <td style={{padding:".6rem .5rem",color:"#f0f4ff"}}>
                    <div>{r.guest}</div>
                    {r.phone&&<div style={{color:"#8896b3",fontSize:".75rem"}}>{r.phone}</div>}
                  </td>
                  <td style={{padding:".6rem .5rem",color:"#a0aec0",whiteSpace:"nowrap"}}>{r.checkIn}</td>
                  <td style={{padding:".6rem .5rem",color:"#a0aec0",whiteSpace:"nowrap"}}>{r.checkOut}</td>
                  <td style={{padding:".6rem .5rem",color:"#a0aec0",textAlign:"center"}}>{nights}</td>
                  <td style={{padding:".6rem .5rem",color:"#3b82f6",whiteSpace:"nowrap"}}>{fmt(r.price)}</td>
                  <td style={{padding:".6rem .5rem",color:"#10b981",fontWeight:700,whiteSpace:"nowrap"}}>{fmt(net)}</td>
                  <td style={{padding:".6rem .5rem"}}>
                    <span style={{display:"flex",gap:".4rem"}}>
                      <button onClick={()=>onEdit(r)} style={{padding:".3rem .6rem",background:"#252d3f",border:"1px solid #2d3548",borderRadius:".4rem",color:"#8896b3",cursor:"pointer",fontSize:".75rem"}}>✏️</button>
                      <button onClick={()=>onDelete(r.id)} style={{padding:".3rem .6rem",background:"#2d1f1f",border:"1px solid #5b2e2e",borderRadius:".4rem",color:"#f87171",cursor:"pointer",fontSize:".75rem"}}>🗑</button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length===0&&<div style={{padding:"2rem",textAlign:"center",color:"#8896b3"}}>Sin resultados</div>}
      </div>
    </div>
  );
}

// ─── PROPERTIES VIEW ──────────────────────────────────────────────────────────
function PropertiesView({ properties, reservations, onAdd, onEdit, onDelete }) {
  return (
    <div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"1.25rem"}}>
        <button onClick={onAdd} style={{padding:".5rem 1.1rem",background:"#3b82f6",border:"none",borderRadius:".5rem",color:"#fff",cursor:"pointer",fontWeight:600,fontSize:".9rem"}}>
          + Agregar propiedad
        </button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"1rem"}}>
        {properties.map(p=>{
          const pRes = reservations.filter(r=>r.propId===p.id);
          const income = pRes.reduce((a,r)=>a+r.price,0);
          const now = dateStr(new Date());
          const activeRes = pRes.find(r=>r.checkIn<=now&&r.checkOut>now);
          return (
            <div key={p.id} style={{background:"#1e2433",borderRadius:".75rem",border:`1px solid ${p.color}44`,overflow:"hidden"}}>
              <div style={{height:6,background:p.color}}/>
              <div style={{padding:"1.25rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:".75rem"}}>
                  <div>
                    <h3 style={{margin:0,color:"#f0f4ff",fontSize:"1rem"}}>{p.name}</h3>
                    <span style={{fontSize:".78rem",color:"#8896b3"}}>{p.type}</span>
                    {p.address&&<div style={{fontSize:".75rem",color:"#8896b3",marginTop:".2rem"}}>📍 {p.address}</div>}
                  </div>
                  <div style={{display:"flex",gap:".4rem"}}>
                    <button onClick={()=>onEdit(p)} style={{padding:".3rem .6rem",background:"#252d3f",border:"1px solid #2d3548",borderRadius:".4rem",color:"#8896b3",cursor:"pointer",fontSize:".75rem"}}>✏️</button>
                    <button onClick={()=>onDelete(p.id)} style={{padding:".3rem .6rem",background:"#2d1f1f",border:"1px solid #5b2e2e",borderRadius:".4rem",color:"#f87171",cursor:"pointer",fontSize:".75rem"}}>🗑</button>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem",fontSize:".82rem"}}>
                  <div style={{background:"#252d3f",borderRadius:".5rem",padding:".6rem"}}>
                    <div style={{color:"#8896b3"}}>Reservas</div>
                    <div style={{color:"#f0f4ff",fontWeight:700}}>{pRes.length}</div>
                  </div>
                  <div style={{background:"#252d3f",borderRadius:".5rem",padding:".6rem"}}>
                    <div style={{color:"#8896b3"}}>Ingresos</div>
                    <div style={{color:"#3b82f6",fontWeight:700}}>{fmt(income)}</div>
                  </div>
                </div>
                {activeRes && (
                  <div style={{marginTop:".75rem",padding:".5rem .75rem",background:"#10b98122",borderRadius:".5rem",border:"1px solid #10b98144",fontSize:".8rem",color:"#10b981"}}>
                    🏃 Ocupada: {activeRes.guest} hasta {activeRes.checkOut}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [properties, setProperties] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: props, error: e1 } = await supabase.from("properties").select("*").order("created_at");
        const { data: res, error: e2 } = await supabase.from("reservations").select("*").order("check_in");
        if (e1 || e2) throw e1 || e2;
        setProperties((props||[]).map(mapProp));
        setReservations((res||[]).map(mapRes));
      } catch(e) {
        setError(e.message);
      }
      setLoaded(true);
    })();
  }, []);

  const handleSaveProp = async (prop) => {
    const dbProp = { id: prop.id, name: prop.name, type: prop.type, color: prop.color, address: prop.address, notes: prop.notes };
    const exists = properties.find(p=>p.id===prop.id);
    if (exists) {
      await supabase.from("properties").update(dbProp).eq("id", prop.id);
      setProperties(properties.map(p=>p.id===prop.id?prop:p));
    } else {
      await supabase.from("properties").insert(dbProp);
      setProperties([...properties, prop]);
    }
    setModal(null);
  };

  const handleDeleteProp = async (id) => {
    if (!confirm("¿Eliminar esta propiedad?")) return;
    await supabase.from("properties").delete().eq("id", id);
    setProperties(properties.filter(p=>p.id!==id));
  };

  const handleSaveRes = async (res) => {
    const dbRes = { id: res.id, prop_id: res.propId, guest: res.guest, phone: res.phone, check_in: res.checkIn, check_out: res.checkOut, price: res.price, commission: res.commission, cleaning: res.cleaning, notes: res.notes };
    const exists = reservations.find(r=>r.id===res.id);
    if (exists) {
      await supabase.from("reservations").update(dbRes).eq("id", res.id);
      setReservations(reservations.map(r=>r.id===res.id?res:r));
    } else {
      await supabase.from("reservations").insert(dbRes);
      setReservations([...reservations, res]);
    }
    setModal(null);
  };

  const handleDeleteRes = async (id) => {
    if (!confirm("¿Eliminar esta reserva?")) return;
    await supabase.from("reservations").delete().eq("id", id);
    setReservations(reservations.filter(r=>r.id!==id));
  };

  if (!loaded) return (
    <div style={{minHeight:"100vh",background:"#111827",display:"flex",alignItems:"center",justifyContent:"center",color:"#8896b3",fontFamily:"system-ui"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:"2rem",marginBottom:"1rem"}}>🏡</div>
        <div>Cargando RentaManager...</div>
      </div>
    </div>
  );

  if (error) return (
    <div style={{minHeight:"100vh",background:"#111827",display:"flex",alignItems:"center",justifyContent:"center",color:"#f87171",fontFamily:"system-ui",padding:"2rem",textAlign:"center"}}>
      <div>
        <div style={{fontSize:"2rem",marginBottom:"1rem"}}>⚠️</div>
        <div style={{marginBottom:".5rem",fontWeight:700}}>Error de conexión con Supabase</div>
        <div style={{fontSize:".85rem",color:"#8896b3"}}>{error}</div>
      </div>
    </div>
  );

  const TABS = [
    { id:"dashboard", label:"Tablero", icon:"📊" },
    { id:"calendar",  label:"Calendario", icon:"📅" },
    { id:"reservations", label:"Reservas", icon:"📋" },
    { id:"properties", label:"Propiedades", icon:"🏠" },
  ];

  return (
    <div style={{minHeight:"100vh",background:"#111827",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",color:"#f0f4ff"}}>
      <div style={{background:"#0d1117",borderBottom:"1px solid #1e2433",padding:".75rem 1.5rem",display:"flex",alignItems:"center",gap:"1rem",flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:".6rem",marginRight:"auto"}}>
          <span style={{fontSize:"1.3rem"}}>🏡</span>
          <span style={{fontWeight:800,fontSize:"1rem",color:"#f0f4ff"}}>RentaManager</span>
          <span style={{fontSize:".7rem",background:"#3b82f622",color:"#3b82f6",padding:".2rem .5rem",borderRadius:"999px",border:"1px solid #3b82f644"}}>
            {properties.length} propiedades
          </span>
        </div>
        <nav style={{display:"flex",gap:".25rem",flexWrap:"wrap"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:".45rem .9rem",borderRadius:".5rem",border:"none",cursor:"pointer",fontSize:".85rem",fontWeight:600,
                background:tab===t.id?"#3b82f6":"transparent",
                color:tab===t.id?"#fff":"#8896b3"}}>
              {t.icon} {t.label}
            </button>
          ))}
        </nav>
      </div>
      <main style={{padding:"1.5rem",maxWidth:1200,margin:"0 auto"}}>
        {tab==="dashboard"    && <Dashboard properties={properties} reservations={reservations}/>}
        {tab==="calendar"     && <CalendarView properties={properties} reservations={reservations} onAddRes={()=>setModal({type:"res",data:null})}/>}
        {tab==="reservations" && <ReservationsList properties={properties} reservations={reservations} onEdit={r=>setModal({type:"res",data:r})} onDelete={handleDeleteRes} onAdd={()=>setModal({type:"res",data:null})}/>}
        {tab==="properties"   && <PropertiesView properties={properties} reservations={reservations} onAdd={()=>setModal({type:"prop",data:null})} onEdit={p=>setModal({type:"prop",data:p})} onDelete={handleDeleteProp}/>}
      </main>
      {modal?.type==="res" && (
        <Modal title={modal.data ? "Editar reserva" : "Nueva reserva"} onClose={()=>setModal(null)}>
          <ReservationForm properties={properties} initial={modal.data} onSave={handleSaveRes} onClose={()=>setModal(null)}/>
        </Modal>
      )}
      {modal?.type==="prop" && (
        <Modal title={modal.data ? "Editar propiedad" : "Nueva propiedad"} onClose={()=>setModal(null)}>
          <PropertyForm initial={modal.data} onSave={handleSaveProp} onClose={()=>setModal(null)}/>
        </Modal>
      )}
    </div>
  );
}
