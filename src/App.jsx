import React, { useEffect, useMemo, useState } from "react";

/*****************************************
 * Borrow-a-Skill — Login + Autofill (rollback baseline)
 *****************************************/

const THEME = {
  primary: "#FF7A1A",
  ink: "#0F172A",
  sub: "#64748B",
  bg: "#FFF9F3",
  line: "#E6E6E6",
  chipBg: "#FFF2E6",
  chipBorder: "#FFD4B5",
  surface: "#FFFFFF",
};

const splitList = (s) => (s || "").split(",").map((x) => x.trim()).filter(Boolean);

function haversineKm(a, b) {
  if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) return Infinity;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
}

/* City → coords (subset) */
const CITY = {
  "Saskatoon, SK": { lat: 52.1332, lng: -106.6700 },
  "Regina, SK": { lat: 50.4452, lng: -104.6189 },
  "Winnipeg, MB": { lat: 49.8951, lng: -97.1384 },
  "Calgary, AB": { lat: 51.0486, lng: -114.0708 },
  "Toronto, ON": { lat: 43.6532, lng: -79.3832 },
  "Seattle, WA": { lat: 47.6062, lng: -122.3321 },
  "San Francisco, CA": { lat: 37.7749, lng: -122.4194 },
  "Chicago, IL": { lat: 41.8781, lng: -87.6298 },
};
function coordsForCity(city) { return CITY[city] || null; }

function MapPreview({ me, listings, radiusKm }) {
  const width = 560, height = 220;
  const center = me && isFinite(me.lat) && isFinite(me.lng) ? me : { lat: 0, lng: 0 };
  const toXY = (lat, lng) => [width / 2 + (lng - center.lng) * 6, height / 2 - (lat - center.lat) * 6];
  const hasRadius = radiusKm && radiusKm > 0;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: "#FFF3EA", borderRadius: 16, border: `1px solid ${THEME.line}` }}>
      <g>
        <circle cx={width / 2} cy={height / 2} r={7} fill={THEME.primary} />
        <text x={width / 2 + 10} y={height / 2 - 10} fontSize="12" fill={THEME.ink} style={{fontWeight:600}}>You</text>
      </g>
      {hasRadius && <circle cx={width / 2} cy={height / 2} r={radiusKm * 0.7} fill="#FF7A1A22" stroke={THEME.primary} />}
      {listings.map((p) => {
        if (!isFinite(p.lat) || !isFinite(p.lng)) return null;
        const [x, y] = toXY(p.lat, p.lng);
        return (
          <g key={p.id}>
            <circle cx={x} cy={y} r={5} fill="#0EA5E9" />
            <text x={x + 8} y={y - 8} fontSize="11" fill={THEME.ink}>{p.name}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function App() {
  const [profile, setProfile] = usePersistentState("bas_profile", {
    name:"You", city:"Saskatoon, SK", lat:52.1332, lng:-106.6700,
    offers:["computer skills"], wants:["pottery","photography"], tags:["tech","art"],
    bio:"Testing features"
  });
  const [session, setSession] = usePersistentState("bas_session", { loggedIn:false });
  const [listings, setListings] = usePersistentState("bas_listings", [
    { id: 2, name: "Maya Lopez", city: "Saskatoon, SK", ...(coordsForCity("Saskatoon, SK")||{}), bio: "Ceramicist, patient teacher, tea hoarder.", offers: ["Wheel-thrown pottery", "Glazing 101"], wants: ["Basic web dev"], tags: ["art","crafts","ceramics"] },
    { id: 3, name: "Devon Hart", city: "Winnipeg, MB", ...(coordsForCity("Winnipeg, MB")||{}), bio: "Ex-barista & acoustics nerd.", offers: ["Latte art","Build a sound-dampening panel"], wants: ["Drone flying","Public speaking"], tags: ["coffee","diy","audio"] },
    { id: 4, name: "Asha K.", city: "Calgary, AB", ...(coordsForCity("Calgary, AB")||{}), bio: "Birdwatcher who whistles back.", offers: ["Bird ID","Whistle like a bird"], wants: ["Sourdough rehab"], tags: ["nature","food"] },
  ]);
  const [inbox, setInbox] = usePersistentState("bas_inbox", []);

  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [nearby, setNearby] = useState(false);
  const [radiusKm, setRadiusKm] = useState(150);
  const [activeTab, setActiveTab] = useState("browse");
  const [showLogin, setShowLogin] = useState(false);

  const enriched = useMemo(() => listings.map((l) => {
    const d = haversineKm(profile, l);
    return { ...l, distanceKm: isFinite(d) ? d : null };
  }), [listings, profile]);

  const filtered = useMemo(() => {
    let out = enriched.filter((l) =>
      JSON.stringify({ name:l.name, city:l.city, bio:l.bio, offers:l.offers, wants:l.wants, tags:l.tags })
      .toLowerCase().includes(q.toLowerCase())
    );
    if (tag) out = out.filter((l) => (l.tags || []).map((t) => t.toLowerCase()).includes(tag.toLowerCase()));
    if (nearby) out = out.filter((l) => l.distanceKm != null && l.distanceKm <= radiusKm);
    out.sort((a, b) => nearby ? (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) : 0);
    return out;
  }, [enriched, q, tag, nearby, radiusKm]);

  function addListing(form) {
    const id = Math.max(0, ...listings.map((l) => l.id || 0)) + 1;
    const coords = coordsForCity(form.city) || {};
    setListings([{ id, ...form, ...coords }, ...listings]);
  }

  function sendMessage(toListing, message) {
    const m = { id: Date.now()+Math.random(), from: profile.name, to: toListing.name, listingId: toListing.id, createdAt: new Date().toISOString(), message, summary: `${profile.name} ⇄ ${toListing.name}`, status: "sent" };
    setInbox([m, ...inbox]);
    setActiveTab("inbox");
  }

  return (
    <div style={{ background:THEME.bg, minHeight:"100svh", color:THEME.ink, paddingBottom:64 }}>
      <header style={{ position:"sticky", top:0, zIndex:10, background:THEME.surface, borderBottom:`1px solid ${THEME.line}`, padding:"12px 14px" }}>
        <div className="container" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:THEME.primary }} />
            <div style={{ fontWeight:800 }}>Borrow-a-Skill</div>
          </div>
          <div>
            {session.loggedIn ? (
              <button onClick={()=>setSession({ loggedIn:false })} style={{ padding:"10px 12px", borderRadius:999, border:`1px solid ${THEME.line}` }}>Logout</button>
            ) : (
              <button onClick={()=>setShowLogin(true)} style={{ padding:"10px 12px", borderRadius:999, border:`1px solid ${THEME.line}`, background:THEME.primary, color:"#fff", fontWeight:800 }}>Login</button>
            )}
          </div>
        </div>
      </header>

      {activeTab === "browse" && (
        <div className="container" style={{ paddingTop:12 }}>
          <div style={{ display:"grid", gap:8 }}>
            <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search skills, names, bios" style={inp()} />
            <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
              <select value={tag} onChange={(e)=>setTag(e.target.value)} style={inp()}>
                <option value="">Any tag</option>
                {[...new Set(listings.flatMap(l=>l.tags||[]))].map((t)=> <option key={t} value={t}>{t}</option>)}
              </select>
              {tag && <button onClick={()=>setTag("")} style={{ border:"none", background:"transparent", color:THEME.primary, textDecoration:"underline" }}>Clear tag</button>}
              <label style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", borderRadius:12, border:`1px solid ${THEME.line}`, background:THEME.surface }}>
                <input type="checkbox" checked={nearby} onChange={(e)=>setNearby(e.target.checked)} /> Nearby
                {nearby && (<><input type="range" min={5} max={300} step={5} value={radiusKm} onChange={(e)=>setRadiusKm(parseInt(e.target.value))} /><span style={{ fontSize:12, color:THEME.sub }}>{radiusKm} km</span></>)}
              </label>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <MapPreview me={profile} listings={filtered} radiusKm={nearby ? radiusKm : 0} />
          </div>

          <div style={{ marginTop: 10, display:"grid", gap:10 }}>
            {filtered.map((l) => (
              <div key={l.id} style={{ border:`1px solid ${THEME.line}`, borderRadius:16, background:THEME.surface, padding:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontWeight:800 }}>{l.name}</div>
                    <div style={{ fontSize:12, color:THEME.sub }}>{l.city || "—"}{l.distanceKm != null ? ` • ${Math.round(l.distanceKm)} km` : " • distance unknown"}</div>
                  </div>
                  <div>
                    <button onClick={() => sendMessage(l, `Hey ${l.name}! I’m interested in swapping skills.`)} style={{ padding:"10px 12px", borderRadius:999, border:`1px solid ${THEME.line}`, background:THEME.primary, color:"#fff", fontWeight:800 }}>Swap</button>
                  </div>
                </div>
                <p style={{ marginTop: 8 }}>{l.bio}</p>
                <div style={{ marginTop: 8, fontSize: 12, color: THEME.sub }}>
                  <strong>Offers:</strong> {(l.offers || []).join(", ") || "—"} • <strong>Wants:</strong> {(l.wants || []).join(", ") || "—"} • <strong>Tags:</strong> {(l.tags || []).join(", ") || "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "add" && (
        session.loggedIn
          ? <AddTab addListing={addListing} profile={profile} />
          : <PleaseLogin onLogin={()=>setShowLogin(true)} />
      )}

      {activeTab === "inbox" && (<InboxTab inbox={inbox} />)}

      {activeTab === "profile" && (<ProfileTab profile={profile} setProfile={setProfile} />)}

      <BottomNav active={activeTab} setActive={setActiveTab} />

      {showLogin && (<LoginSheet profile={profile} setProfile={setProfile} onClose={()=>setShowLogin(false)} onLoggedIn={()=>{ setSession({ loggedIn:true }); setShowLogin(false); }} />)}
    </div>
  );
}

function AddTab({ addListing, profile }) {
  const [form, setForm] = useState({ name:"", city:"", bio:"" });
  const [offersText, setOffersText] = useState("");
  const [wantsText, setWantsText] = useState("");
  const [tagsText, setTagsText] = useState("");

  useEffect(() => {
    setForm({ name: profile?.name || "", city: profile?.city || "", bio: profile?.bio || "" });
    setOffersText((profile?.offers || []).join(", "));
    setWantsText((profile?.wants || []).join(", "));
    setTagsText((profile?.tags || []).join(", "));
  }, [profile?.name, profile?.city, profile?.bio, profile?.offers, profile?.wants, profile?.tags]);

  function handleSubmit(e){
    e.preventDefault();
    const offers=splitList(offersText);
    const wants=splitList(wantsText);
    const tags=splitList(tagsText);
    if(!form.name.trim()||(!offers.length&&!wants.length)) return;
    addListing({ ...form, offers, wants, tags });
    setForm({ name:"", city:"", bio:"" }); setOffersText(""); setWantsText(""); setTagsText("");
  }

  return (
    <form onSubmit={handleSubmit} className="container" style={{ paddingTop:12, display:"grid", gap:10 }}>
      <input style={inp()} placeholder="Name" value={form.name} onChange={(e)=>setForm({ ...form, name:e.target.value })} />
      <input style={inp()} placeholder="City (e.g., Saskatoon, SK)" value={form.city} onChange={(e)=>setForm({ ...form, city:e.target.value })} />
      <textarea style={inp()} placeholder="Short bio" value={form.bio} onChange={(e)=>setForm({ ...form, bio:e.target.value })} />
      <input style={inp()} placeholder="Offers (comma-separated)" value={offersText} onChange={(e)=>setOffersText(e.target.value)} />
      <input style={inp()} placeholder="Wants (comma-separated)" value={wantsText} onChange={(e)=>setWantsText(e.target.value)} />
      <input style={inp()} placeholder="Tags (comma-separated)" value={tagsText} onChange={(e)=>setTagsText(e.target.value)} />
      <button type="submit" style={{ padding:"12px 14px", borderRadius:999, border:`1px solid ${THEME.line}`, background:THEME.primary, color:"#fff", fontWeight:800 }}>Add listing</button>
    </form>
  );
}

function InboxTab({ inbox }){
  return (
    <div className="container" style={{ paddingTop:12 }}>
      <div style={{ fontWeight:800, marginBottom:8 }}>Inbox</div>
      {inbox.length ? inbox.map((m)=>(
        <div key={m.id} style={{ background:"#fff", border:`1px solid ${THEME.line}`, borderRadius:12, padding:12, margin:"8px 0" }}>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <div style={{ fontWeight:600 }}>{m.summary}</div>
            <span style={{ fontSize:12, border:`1px solid ${THEME.line}`, borderRadius:999, padding:"2px 6px" }}>{m.status}</span>
          </div>
          <div style={{ fontSize:12, color:THEME.sub }}>{new Date(m.createdAt).toLocaleString()}</div>
          <p style={{ marginTop:6, whiteSpace:"pre-wrap", fontSize:14 }}>{m.message}</p>
        </div>
      )) : (
        <div style={{ border:"1px dashed #cbd5e1", borderRadius:12, padding:16, color:THEME.sub }}>
          No messages yet. Propose a swap from the cards above!
        </div>
      )}
    </div>
  );
}

function ProfileTab({ profile, setProfile }){
  const safeValue = { name:"", city:"", bio:"", offers:[], wants:[], tags:[], ...profile };
  const [form, setForm] = useState({ ...safeValue });
  const [offersText, setOffersText] = useState((safeValue.offers||[]).join(", "));
  const [wantsText, setWantsText] = useState((safeValue.wants||[]).join(", "));
  const [tagsText, setTagsText] = useState((safeValue.tags||[]).join(", "));
  useEffect(()=>{
    setForm({ ...safeValue });
    setOffersText((safeValue.offers||[]).join(", "));
    setWantsText((safeValue.wants||[]).join(", "));
    setTagsText((safeValue.tags||[]).join(", "));
  }, [profile.name, profile.city, profile.bio, profile.offers, profile.wants, profile.tags]);

  function handleSubmit(e){
    e.preventDefault();
    const next = { ...profile, ...form, offers: splitList(offersText), wants: splitList(wantsText), tags: splitList(tagsText) };
    setProfile(next);
    alert("Profile saved!");
  }

  return (
    <form onSubmit={handleSubmit} className="container" style={{ paddingTop:12, display:"grid", gap:10 }}>
      <input style={inp()} placeholder="Name" value={form.name} onChange={(e)=>setForm({ ...form, name:e.target.value })} />
      <input style={inp()} placeholder="City (e.g., Saskatoon, SK)" value={form.city} onChange={(e)=>setForm({ ...form, city:e.target.value })} />
      <textarea style={inp()} placeholder="Bio" value={form.bio} onChange={(e)=>setForm({ ...form, bio:e.target.value })} />
      <input style={inp()} placeholder="Offers (comma-separated)" value={offersText} onChange={(e)=>setOffersText(e.target.value)} />
      <input style={inp()} placeholder="Wants (comma-separated)" value={wantsText} onChange={(e)=>setWantsText(e.target.value)} />
      <input style={inp()} placeholder="Tags (comma-separated)" value={tagsText} onChange={(e)=>setTagsText(e.target.value)} />
      <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
        <button type="reset" onClick={()=>{
          setForm({ ...profile });
          setOffersText((profile.offers||[]).join(", "));
          setWantsText((profile.wants||[]).join(", "));
          setTagsText((profile.tags||[]).join(", "));
        }} style={{ padding:"10px 12px", borderRadius:999, border:`1px solid ${THEME.line}` }}>Reset</button>
        <button type="submit" style={{ padding:"10px 12px", borderRadius:999, border:`1px solid ${THEME.line}`, background:THEME.primary, color:"#fff", fontWeight:800 }}>Save Profile</button>
      </div>
    </form>
  );
}

function LoginSheet({ profile, setProfile, onClose, onLoggedIn }) {
  const [name, setName] = useState(profile?.name || "");
  const [city, setCity] = useState(profile?.city || "");
  const [bio, setBio] = useState(profile?.bio || "");

  function submit(e) {
    e.preventDefault();
    const coords = coordsForCity(city) || {};
    setProfile({ ...profile, name: name.trim(), city: city.trim(), bio: bio, ...coords });
    onLoggedIn();
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", display:"grid", placeItems:"center", zIndex:50 }}>
      <form onSubmit={submit} style={{ width:"min(560px, 92vw)", border:`1px solid ${THEME.line}`, borderRadius:16, background:"#fff", padding:12, boxShadow:"0 12px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <div style={{ fontWeight:800 }}>Login</div>
          <button type="button" onClick={onClose} style={{ border:"none", background:"transparent", fontSize:18, cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ color:THEME.sub, marginBottom:8 }}>
          No password needed — this links your local profile so the **Add Listing** form autofills.
        </div>
        <input style={inp()} placeholder="Your name" value={name} onChange={(e)=>setName(e.target.value)} />
        <input style={inp()} placeholder="City (e.g., Regina, SK)" value={city} onChange={(e)=>setCity(e.target.value)} />
        <textarea style={inp()} placeholder="Short bio (optional)" value={bio} onChange={(e)=>setBio(e.target.value)} />
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:8 }}>
          <button type="button" onClick={onClose} style={{ padding:"10px 12px", borderRadius:999, border:`1px solid ${THEME.line}` }}>Cancel</button>
          <button type="submit" style={{ padding:"10px 12px", borderRadius:999, border:`1px solid ${THEME.line}`, background:THEME.primary, color:"#fff", fontWeight:800 }}>Continue</button>
        </div>
      </form>
    </div>
  );
}

function BottomNav({ active, setActive }){
  const items = [
    { key:"browse", label:"Browse", emoji:"🏠" },
    { key:"add", label:"Add", emoji:"➕" },
    { key:"inbox", label:"Inbox", emoji:"💬" },
    { key:"profile", label:"Profile", emoji:"👤" },
  ];
  return (
    <nav style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:3, background:THEME.surface, borderTop:`1px solid ${THEME.line}` }}>
      <div className="container" style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)" }}>
        {items.map((it)=> (
          <button key={it.key} onClick={()=>setActive(it.key)} style={{
            padding:"10px 6px",
            color: active===it.key ? THEME.primary : THEME.ink,
            background:"transparent", border:"none",
            borderBottom: active===it.key ? `3px solid ${THEME.primary}` : "3px solid transparent",
            display:"grid", gap:2, placeItems:"center"
          }}>
            <div style={{ fontSize:18 }} aria-hidden>{it.emoji}</div>
            <div style={{ fontSize:12, fontWeight: active===it.key ? 800 : 600 }}>{it.label}</div>
          </button>
        ))}
      </div>
    </nav>
  );
}

function inp(){ return { padding:"12px 14px", borderRadius:12, border:`1px solid ${THEME.line}`, background:THEME.surface }; }
