import React, { useEffect, useMemo, useState } from "react";

/*****************************************
 * Borrow-a-Skill — Skill Swap–style theme
 * - Poppins font + warmer palette
 * - Tabs: Browse · Add · Requests · Inbox · Profile
 * - Image uploads + local notifications
 * - Local persistence via localStorage
 *****************************************/

const THEME = {
  primary: "#FF7A1A",
  primarySoft: "#FFD9BF",
  ink: "#0F172A",
  sub: "#64748B",
  bg: "#FFF9F3",
  chipBg: "#FFF2E6",
  chipBorder: "#FFD4B5",
  surface: "#FFFFFF",
  line: "#E6E6E6",
  good: "#16A34A",
  warn: "#EAB308",
  info: "#0EA5E9",
};

const CATEGORIES = [
  "Arts & Crafts","Cooking & Food","DIY & Home","Fitness & Wellness",
  "Language","Music","Outdoors & Nature","STEM & Tech","Other",
];

/* ---------------- Utils ---------------- */
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

// localStorage hook
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

// file -> base64 data URL
function readFileAsDataURL(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

/* -------------- Notifications -------------- */
const Notifier = {
  hasCapacitor() {
    return typeof window !== "undefined" && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
  },
  async requestPermission() {
    try {
      if (this.hasCapacitor() && window.Capacitor.Plugins?.LocalNotifications) {
        const { LocalNotifications } = window.Capacitor.Plugins;
        const perm = await LocalNotifications.requestPermissions();
        return perm?.display === "granted";
      } else if ("Notification" in window) {
        if (Notification.permission === "granted") return true;
        if (Notification.permission !== "denied") {
          const p = await Notification.requestPermission();
          return p === "granted";
        }
      }
    } catch {}
    return false;
  },
  async notify({ title, body }) {
    try {
      if (this.hasCapacitor() && window.Capacitor.Plugins?.LocalNotifications) {
        const { LocalNotifications } = window.Capacitor.Plugins;
        await LocalNotifications.schedule({
          notifications: [{ id: Math.floor(Math.random() * 1e9), title, body, schedule: { at: new Date(Date.now() + 250) } }],
        });
      } else if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title || "Borrow-a-Skill", { body: body || "" });
      } else {
        alert(`${title}\n\n${body}`);
      }
    } catch {
      alert(`${title}\n\n${body}`);
    }
  },
};

/* ---------------- Avatar ---------------- */
function Avatar({ name, size = 44, src }) {
  if (src) {
    return <img src={src} alt={name || "avatar"} style={{ width: size, height: size, borderRadius: 12, objectFit: "cover", border: `2px solid ${THEME.primary}` }} />;
  }
  const initials = (name || "?").split(" ").filter(Boolean).map((x) => x[0]?.toUpperCase()).slice(0,2).join("");
  return (
    <div style={{ width: size, height: size, borderRadius: 12, background: THEME.primary, color: "#fff", display:"grid", placeItems:"center", fontWeight:800 }} aria-label={`${name} avatar`}>
      {initials || "?"}
    </div>
  );
}

/* ---------------- Map Preview ---------------- */
function MapPreview({ me, listings, radiusKm }) {
  const width = 560, height = 240;
  const center = me && isFinite(me.lat) && isFinite(me.lng) ? me : { lat: 0, lng: 0 };
  const toXY = (lat, lng) => [width / 2 + (lng - center.lng) * 6, height / 2 - (lat - center.lat) * 6];
  const hasRadius = radiusKm && radiusKm > 0;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: "#FFF3EA", borderRadius: 16, border: `1px solid ${THEME.line}` }}>
      <defs>
        <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#FFE7D4" />
          <stop offset="100%" stopColor="#FFF" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={width} height={height} fill="url(#grad)"/>
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
            <circle cx={x} cy={y} r={5} fill={THEME.info} />
            <text x={x + 8} y={y - 8} fontSize="11" fill={THEME.ink}>{p.name}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------- Thread helpers ---------------- */
function threadKey(meName, otherName) {
  return [meName || "You", otherName || "?"].sort().join(" ⇄ ");
}

/* ---------------- Completeness & badges ---------------- */
function profileCompleteness(p) {
  const checks = [!!p.name, !!p.city, !!p.bio, Array.isArray(p.offers)&&p.offers.length>0, Array.isArray(p.wants)&&p.wants.length>0, Array.isArray(p.tags)&&p.tags.length>0];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}
function badgesFor(p) {
  const out = [];
  if ((p.offers?.length || 0) >= 3) out.push("Generous Teacher");
  if ((p.tags?.length || 0) >= 5) out.push("Well-Rounded");
  if ((p.bio || "").length >= 120) out.push("Storyteller");
  return out;
}

/* ================= MAIN APP ================= */
export default function App() {
  const [profile, setProfile] = usePersistentState("bas_profile", {
    name: "You", city: "Regina, SK", lat: 50.445, lng: -104.618,
    offers: ["Computer basics help"], wants: ["Ceramics"], tags: ["tech","help"],
    bio: "Friendly neighbor keen to trade skills and meet locals.", photo: "", notify: false,
  });

  const [listings, setListings] = usePersistentState("bas_listings", [
    { id: 1, name: "Maya Lopez", city: "Saskatoon, SK", lat: 52.133, lng: -106.683, bio: "Ceramicist, patient teacher, tea hoarder.", offers: ["Wheel-thrown pottery", "Glazing 101"], wants: ["Basic web dev"], tags: ["art","crafts","ceramics"], photo: "" },
    { id: 2, name: "Devon Hart", city: "Winnipeg, MB", lat: 49.895, lng: -97.138, bio: "Ex-barista & acoustics nerd. Loves community projects.", offers: ["Latte art","Build a sound-dampening panel"], wants: ["Drone flying","Public speaking"], tags: ["coffee","diy","audio"], photo: "" },
    { id: 3, name: "Asha K.", city: "Calgary, AB", lat: 51.0486, lng: -114.0708, bio: "Birdwatcher who whistles back.", offers: ["Bird ID","Whistle like a bird"], wants: ["Sourdough rehab"], tags: ["nature","food"], photo: "" },
    { id: 4, name: "Kai", city: "—", bio: "Nomad with no fixed lat/lng yet.", offers: ["Bike maintenance"], wants: ["Sourdough starter"], tags: ["diy"], photo: "" },
  ]);

  const [requests, setRequests] = usePersistentState("bas_requests", [
    { id: 101, requester: "Asha K.", city:"Calgary, AB", category:"Cooking & Food", title:"Help reviving my sourdough starter", details:"My starter went sleepy. Looking for hands-on rehab tips and feeding schedule. I can trade birdwatching!", tags:["food","baking","sourdough"], createdAt: new Date().toISOString() },
    { id: 102, requester: "Devon Hart", city:"Winnipeg, MB", category:"STEM & Tech", title:"Basic drone flying 101", details:"I bought a small drone. Need a safe intro to controls & best practices.", tags:["tech","drone"], createdAt: new Date().toISOString() },
  ]);

  const [inbox, setInbox] = usePersistentState("bas_inbox", []);
  const [activeTab, setActiveTab] = useState("browse");
  const [activeThread, setActiveThread] = useState(null);

  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [nearby, setNearby] = useState(false);
  const [radiusKm, setRadiusKm] = useState(150);

  const enriched = useMemo(() => listings.map((l) => {
    const d = haversineKm(profile, l);
    return { ...l, distanceKm: isFinite(d) ? d : null };
  }), [listings, profile]);

  const filtered = useMemo(() => {
    let out = enriched.filter((l) =>
      JSON.stringify({ name: l.name, city: l.city, bio: l.bio, offers: l.offers, wants: l.wants, tags: l.tags })
        .toLowerCase().includes(q.toLowerCase())
    );
    if (tag) out = out.filter((l) => (l.tags || []).map((t) => t.toLowerCase()).includes(tag.toLowerCase()));
    if (nearby) out = out.filter((l) => l.distanceKm != null && l.distanceKm <= radiusKm);
    out.sort((a, b) => nearby ? (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) : 0);
    return out;
  }, [enriched, q, tag, nearby, radiusKm]);

  const allTags = useMemo(() => [...new Set(listings.flatMap((l) => l.tags || []))], [listings]);

  useEffect(() => { if (profile.notify) Notifier.requestPermission(); }, [profile.notify]);

  function sendMessage(toListingOrName, message, simulateReply = false) {
    const toName = typeof toListingOrName === "string" ? toListingOrName : toListingOrName.name;
    const summary = threadKey(profile.name, toName);
    const m = { id: Date.now()+Math.random(), from: profile.name, to: toName, listingId: typeof toListingOrName === "string" ? 0 : toListingOrName.id, createdAt: new Date().toISOString(), message, summary, status: "sent" };
    setInbox((prev) => [m, ...prev]);
    setActiveTab("inbox"); setActiveThread(summary);
    if (simulateReply) {
      setTimeout(() => {
        const reply = { id: Date.now()+Math.random(), from: toName, to: profile.name, listingId: m.listingId, createdAt: new Date().toISOString(), message: "Sounds good! When are you free?", summary, status: "received" };
        setInbox((prev) => [reply, ...prev]);
        if (profile.notify) Notifier.notify({ title: `New message from ${toName}`, body: reply.message });
      }, 1200);
    }
  }

  const threads = useMemo(() => {
    const grouped = new Map();
    for (const m of inbox) { if (!grouped.has(m.summary)) grouped.set(m.summary, []); grouped.get(m.summary).push(m); }
    for (const [, arr] of grouped) arr.sort((a,b)=> new Date(a.createdAt)-new Date(b.createdAt));
    return [...grouped.entries()].sort((a,b)=> new Date(b[1][b[1].length-1].createdAt)-new Date(a[1][a[1].length-1].createdAt));
  }, [inbox]);

  function addListing(form) {
    const id = Math.max(0, ...listings.map((l) => l.id || 0)) + 1;
    setListings([{ id, ...form }, ...listings]);
    setActiveTab("browse");
  }
  function addRequest(form) {
    const id = Math.max(100, ...requests.map((r) => r.id || 0)) + 1;
    setRequests([{ id, ...form, createdAt: new Date().toISOString() }, ...requests]);
  }

  const pageStyle = { background: THEME.bg, minHeight: "100svh", color: THEME.ink, paddingBottom: 64 };

  return (
    <div style={pageStyle}>
      <header style={{ position:"sticky", top:0, zIndex:2, background:THEME.surface, borderBottom:`1px solid ${THEME.line}`, padding:"12px 14px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:8, background:THEME.primary }} />
          <div style={{ fontWeight: 800 }}>Borrow-a-Skill</div>
        </div>
      </header>

      {activeTab === "browse" && (
        <BrowseTab
          profile={profile} filtered={filtered} allTags={allTags}
          q={q} setQ={setQ} tag={tag} setTag={setTag}
          nearby={nearby} setNearby={setNearby}
          radiusKm={radiusKm} setRadiusKm={setRadiusKm}
          proposeSwap={(l) => sendMessage(l, `Hey ${l.name}! I’m interested in swapping skills.`, true)}
        />
      )}

      {activeTab === "add" && <AddTab addListing={addListing} />}

      {activeTab === "requests" && (
        <RequestsTab
          profile={profile} requests={requests} addRequest={addRequest}
          onOffer={(req) => sendMessage(req.requester, `Hey ${req.requester}! I can help with: ${req.title}`, true)}
        />
      )}

      {activeTab === "inbox" && (
        <InboxTab
          me={profile.name} threads={threads}
          activeThread={activeThread} setActiveThread={setActiveThread}
          onSend={(threadSummary, text) => {
            const other = threadSummary.split(" ⇄ ").find((n) => n !== profile.name) || "?";
            sendMessage(other, text);
          }}
          notifyTest={() => Notifier.notify({ title: "Test notification", body: "Looks like it works! 🎉" })}
        />
      )}

      {activeTab === "profile" && <ProfileTab profile={profile} setProfile={setProfile} />}

      <BottomNav active={activeTab} setActive={setActiveTab} />
    </div>
  );
}

/* ---------------- Tabs ---------------- */

function BrowseTab({ profile, filtered, allTags, q, setQ, tag, setTag, nearby, setNearby, radiusKm, setRadiusKm, proposeSwap }) {
  return (
    <div style={{ padding: 12 }}>
      <div style={{ display:"grid", gap:8 }}>
        <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search skills, names, bios" style={inputStyle()} />
        <div style={{ display:"flex", gap:8 }}>
          <select value={tag} onChange={(e)=>setTag(e.target.value)} style={inputStyle()}>
            <option value="">Any tag</option>
            {allTags.map((t)=> <option key={t} value={t}>{t}</option>)}
          </select>
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
        {filtered.map((l) => <ListingCard key={l.id} listing={l} onSwap={() => proposeSwap(l)} />)}
        {!filtered.length && <EmptyState text="No matches. Try widening your radius or clearing filters." />}
      </div>
    </div>
  );
}

function AddTab({ addListing }) {
  const [form, setForm] = useState({ name:"", city:"", bio:"", photo:"" });
  const [offersText, setOffersText] = useState("");
  const [wantsText, setWantsText] = useState("");
  const [tagsText, setTagsText] = useState("");

  async function handleFile(e){ const f=e.target.files?.[0]; if(!f) return; const data=await readFileAsDataURL(f); setForm((p)=>({ ...p, photo:data })); }
  function handleSubmit(e){ e.preventDefault(); const offers=splitList(offersText); const wants=splitList(wantsText); const tags=splitList(tagsText); if(!form.name.trim()||(!offers.length&&!wants.length)) return; addListing({ ...form, offers, wants, tags }); setForm({ name:"", city:"", bio:"", photo:"" }); setOffersText(""); setWantsText(""); setTagsText(""); }

  return (
    <form onSubmit={handleSubmit} style={{ padding:12, display:"grid", gap:10 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <Avatar name={form.name || "New"} src={form.photo} />
        <label style={{ fontSize:12, color:THEME.primary, cursor:"pointer" }}>
          <input type="file" accept="image/*" onChange={handleFile} style={{ display:"none" }} /> Upload photo
        </label>
      </div>
      <input style={inputStyle()} placeholder="Name" value={form.name} onChange={(e)=>setForm({ ...form, name:e.target.value })} />
      <input style={inputStyle()} placeholder="City" value={form.city} onChange={(e)=>setForm({ ...form, city:e.target.value })} />
      <textarea style={inputStyle()} placeholder="Short bio" value={form.bio} onChange={(e)=>setForm({ ...form, bio:e.target.value })} />
      <input style={inputStyle()} placeholder="Offers (comma-separated) — e.g., Pottery basics, Glazing 101" value={offersText} onChange={(e)=>setOffersText(e.target.value)} />
      <input style={inputStyle()} placeholder="Wants (comma-separated) — e.g., Public speaking, Drone flying" value={wantsText} onChange={(e)=>setWantsText(e.target.value)} />
      <input style={inputStyle()} placeholder="Tags (comma-separated) — e.g., art, crafts, coffee" value={tagsText} onChange={(e)=>setTagsText(e.target.value)} />
      <PrimaryButton type="submit">Add listing</PrimaryButton>
    </form>
  );
}

function RequestsTab({ profile, requests, addRequest, onOffer }) {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [category, setCategory] = useState("Other");
  const [tagsText, setTagsText] = useState("");

  const [rq, setRq] = useState("");
  const [rCat, setRCat] = useState("");
  const [rTag, setRTag] = useState("");

  const allReqTags = useMemo(() => [...new Set(requests.flatMap((r) => r.tags || []))], [requests]);

  const filtered = useMemo(() => {
    let out = requests.slice();
    if (rq) {
      const q = rq.toLowerCase();
      out = out.filter((r) => (r.title + " " + r.details + " " + (r.requester || "") + " " + (r.city || "") + " " + (r.tags || []).join(" ")).toLowerCase().includes(q));
    }
    if (rCat) out = out.filter((r) => r.category === rCat);
    if (rTag) out = out.filter((r) => (r.tags || []).some((t) => t.toLowerCase() === rTag.toLowerCase()));
    return out;
  }, [requests, rq, rCat, rTag]);

  function handlePost(e) {
    e.preventDefault();
    if (!title.trim()) return;
    addRequest({ requester: profile.name, city: profile.city, category, title: title.trim(), details: details.trim(), tags: splitList(tagsText) });
    setTitle(""); setDetails(""); setCategory("Other"); setTagsText("");
  }

  return (
    <div style={{ padding: 12, display:"grid", gap:14 }}>
      <form onSubmit={handlePost} style={card()}>
        <div style={{ fontWeight:800 }}>Post a request</div>
        <input style={inputStyle()} placeholder="What do you want to learn? (title)" value={title} onChange={(e)=>setTitle(e.target.value)} />
        <textarea style={inputStyle()} placeholder="Describe what you need and what you can swap in return…" value={details} onChange={(e)=>setDetails(e.target.value)} />
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <select style={inputStyle()} value={category} onChange={(e)=>setCategory(e.target.value)}>
            {CATEGORIES.map((c)=> <option key={c} value={c}>{c}</option>)}
          </select>
          <input style={{ ...inputStyle(), flex:1 }} placeholder="Tags (comma-separated)" value={tagsText} onChange={(e)=>setTagsText(e.target.value)} />
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end" }}>
          <PrimaryButton type="submit">Post request</PrimaryButton>
        </div>
      </form>

      <div style={{ display:"grid", gap:8 }}>
        <input style={inputStyle()} placeholder="Search requests…" value={rq} onChange={(e)=>setRq(e.target.value)} />
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <select style={inputStyle()} value={rCat} onChange={(e)=>setRCat(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c)=> <option key={c} value={c}>{c}</option>)}
          </select>
          <select style={inputStyle()} value={rTag} onChange={(e)=>setRTag(e.target.value)}>
            <option value="">Any tag</option>
            {allReqTags.map((t)=> <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display:"grid", gap:10 }}>
        {filtered.map((r)=> <RequestCard key={r.id} data={r} onOffer={()=>onOffer(r)} />)}
        {!filtered.length && <EmptyState text="No requests yet. Post one above!" />}
      </div>
    </div>
  );
}

function InboxTab({ me, threads, activeThread, setActiveThread, onSend, notifyTest }) {
  const [draft, setDraft] = useState("");
  const [propose, setPropose] = useState({ date:"", time:"" });
  const current = threads.find(([summary]) => summary === activeThread);

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:0, height:"calc(100svh - 110px)" }}>
      <div style={{ borderBottom:`1px solid ${THEME.line}`, overflowX:"auto", whiteSpace:"nowrap" }}>
        {threads.map(([summary, msgs]) => {
          const other = summary.split(" ⇄ ").find((n)=> n !== me) || "?";
          const last = msgs[msgs.length - 1];
          return (
            <button key={summary} onClick={()=>setActiveThread(summary)} style={{ display:"inline-flex", flexDirection:"column", alignItems:"flex-start", gap:2, margin:6, padding:"8px 10px", borderRadius:12, border:`1px solid ${THEME.line}`, background: activeThread === summary ? "#FFF3EA" : THEME.surface }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Avatar name={other} size={32} />
                <div style={{ fontWeight:700 }}>{other}</div>
              </div>
              <div style={{ fontSize:12, color:THEME.sub, maxWidth:200, overflow:"hidden", textOverflow:"ellipsis" }}>{last?.message || "New conversation"}</div>
            </button>
          );
        })}
        {!threads.length && <div style={{ padding:12, color:THEME.sub }}>No messages yet.</div>}
      </div>

      <div style={{ display:"grid", gridTemplateRows:"1fr auto auto", height:"100%" }}>
        <div style={{ overflowY:"auto", padding:12 }}>
          {current ? current[1].map((m) => (
            <div key={m.id} style={{ margin:"6px 0", display:"flex", justifyContent: m.from === me ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth:"80%", padding:"8px 10px", borderRadius:12, border:`1px solid ${THEME.line}`, background: m.from === me ? THEME.chipBg : THEME.surface }}>
                <div style={{ fontSize:12, color:THEME.sub }}>{new Date(m.createdAt).toLocaleString()}</div>
                <div>{m.message}</div>
              </div>
            </div>
          )) : <div style={{ color:THEME.sub }}>Select a thread to view messages.</div>}
        </div>

        {current && (
          <form onSubmit={(e)=>{ e.preventDefault(); const when=[propose.date,propose.time].filter(Boolean).join(" "); if(!when) return; onSend(current[0], `Proposed time: ${when}`); setPropose({ date:"", time:"" }); }} style={{ display:"flex", gap:8, padding:8, borderTop:`1px solid ${THEME.line}`, background:THEME.surface }}>
            <input type="date" value={propose.date} onChange={(e)=>setPropose({ ...propose, date:e.target.value })} style={{ flex:1 }} />
            <input type="time" value={propose.time} onChange={(e)=>setPropose({ ...propose, time:e.target.value })} style={{ flex:1 }} />
            <SecondaryButton type="submit">Propose</SecondaryButton>
            <SecondaryButton type="button" onClick={notifyTest}>Test notification</SecondaryButton>
          </form>
        )}

        {current && (
          <form onSubmit={(e)=>{ e.preventDefault(); if(!draft.trim()) return; onSend(current[0], draft.trim()); setDraft(""); }} style={{ display:"flex", gap:8, padding:8, borderTop:`1px solid ${THEME.line}`, background:THEME.surface }}>
            <input value={draft} onChange={(e)=>setDraft(e.target.value)} placeholder="Type a message…" style={{ flex:1 }} />
            <SecondaryButton type="submit">Send</SecondaryButton>
          </form>
        )}
      </div>
    </div>
  );
}

function ProfileTab({ profile, setProfile }) {
  const safeValue = { name:"", city:"", bio:"", offers:[], wants:[], tags:[], photo:"", notify:false, ...profile };
  const [form, setForm] = useState({ ...safeValue });
  const [offersText, setOffersText] = useState((safeValue.offers||[]).join(", "));
  const [wantsText, setWantsText] = useState((safeValue.wants||[]).join(", "));
  const [tagsText, setTagsText] = useState((safeValue.tags||[]).join(", "));
  useEffect(()=>{
    setForm({ ...safeValue });
    setOffersText((safeValue.offers||[]).join(", "));
    setWantsText((safeValue.wants||[]).join(", "));
    setTagsText((safeValue.tags||[]).join(", "));
  }, [profile.name, profile.city, profile.bio, profile.offers, profile.wants, profile.tags, profile.photo, profile.notify]);

  const pct = profileCompleteness(form);
  const badgeList = badgesFor(form);

  async function handleFile(e){ const f=e.target.files?.[0]; if(!f) return; const data=await readFileAsDataURL(f); setForm((prev)=>({ ...prev, photo:data })); }
  async function takePhotoCapacitor(){ try{ const Cap=window.Capacitor; if(!Cap||!Cap.isNativePlatform||!Cap.isNativePlatform()||!Cap.Plugins?.Camera) return; const { Camera }=Cap.Plugins; const img=await Camera.getPhoto({ resultType:"dataUrl", quality:70, allowEditing:false, source:"PROMPT" }); if(img?.dataUrl) setForm((p)=>({ ...p, photo:img.dataUrl })); }catch{} }

  function handleSubmit(e){
    e.preventDefault();
    const next = { ...profile, ...form, offers: splitList(offersText), wants: splitList(wantsText), tags: splitList(tagsText) };
    setProfile(next);
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding:12, display:"grid", gap:12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <Avatar name={form.name || "You"} src={form.photo} />
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <label style={{ fontSize:12, color:THEME.primary, cursor:"pointer" }}>
            <input type="file" accept="image/*" onChange={handleFile} style={{ display:"none" }} /> Upload photo
          </label>
          <SecondaryButton type="button" onClick={takePhotoCapacitor}>Take photo</SecondaryButton>
        </div>
      </div>

      <div style={card()}>
        <div style={{ fontWeight:700, marginBottom:6 }}>Profile completeness</div>
        <div style={{ height:10, background:"#F1F5F9", borderRadius:999, overflow:"hidden" }}>
          <div style={{ width:`${pct}%`, height:"100%", background: pct>=80 ? THEME.good : THEME.warn }} />
        </div>
        <div style={{ fontSize:12, color:THEME.sub, marginTop:6 }}>{pct}% complete</div>
        {!!badgeList.length && (
          <div style={{ marginTop:8, display:"flex", gap:6, flexWrap:"wrap" }}>
            {badgeList.map((b)=> <span key={b} style={{ fontSize:12, padding:"2px 8px", borderRadius:999, border:`1px solid ${THEME.primary}`, background:THEME.chipBg, color:THEME.primary }}>{b}</span>)}
          </div>
        )}
      </div>

      <label style={{ display:"flex", alignItems:"center", gap:8 }}>
        <input type="checkbox" checked={!!form.notify} onChange={async (e)=>{
          const next={ ...form, notify:e.target.checked }; setForm(next);
          if (e.target.checked) await Notifier.requestPermission();
        }} />
        Enable notifications (messages & proposals)
      </label>

      <input style={inputStyle()} placeholder="Name" value={form.name} onChange={(e)=>setForm({ ...form, name:e.target.value })} />
      <input style={inputStyle()} placeholder="City" value={form.city} onChange={(e)=>setForm({ ...form, city:e.target.value })} />
      <textarea style={inputStyle()} placeholder="Bio" value={form.bio} onChange={(e)=>setForm({ ...form, bio:e.target.value })} />
      <input style={inputStyle()} placeholder="Offers (comma-separated)" value={offersText} onChange={(e)=>setOffersText(e.target.value)} />
      <input style={inputStyle()} placeholder="Wants (comma-separated)" value={wantsText} onChange={(e)=>setWantsText(e.target.value)} />
      <input style={inputStyle()} placeholder="Tags (comma-separated)" value={tagsText} onChange={(e)=>setTagsText(e.target.value)} />

      <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
        <SecondaryButton type="button" onClick={()=>{
          setForm({ ...profile });
          setOffersText((profile.offers||[]).join(", "));
          setWantsText((profile.wants||[]).join(", "));
          setTagsText((profile.tags||[]).join(", "));
        }}>Reset</SecondaryButton>
        <PrimaryButton type="submit">Save Profile</PrimaryButton>
      </div>
    </form>
  );
}

/* --------------- UI bits --------------- */
function card(){ return { border:`1px solid ${THEME.line}`, borderRadius:16, background:THEME.surface, padding:12 }; }
function inputStyle(){ return { padding:"12px 14px", borderRadius:12, border:`1px solid ${THEME.line}`, background:THEME.surface }; }

function PrimaryButton({ children, ...props }){
  return <button {...props} style={{ padding:"12px 14px", borderRadius:999, border:`1px solid ${THEME.primary}`, background:THEME.primary, color:"#fff", fontWeight:800 }}>{children}</button>;
}
function SecondaryButton({ children, ...props }){
  return <button {...props} style={{ padding:"10px 12px", borderRadius:999, border:`1px solid ${THEME.line}`, background:THEME.surface, color:THEME.primary, fontWeight:700 }}>{children}</button>;
}
function EmptyState({ text }){
  return <div style={{ border:`2px dashed ${THEME.line}`, padding:16, borderRadius:16, color:THEME.sub, textAlign:"center" }}>{text}</div>;
}

/* --------------- Listing & Request Cards --------------- */
function ListingCard({ listing, onSwap }) {
  const { name, city, bio, offers=[], wants=[], tags=[], distanceKm, photo } = listing;
  return (
    <div style={card()}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Avatar name={name} src={photo} />
          <div>
            <div style={{ fontWeight:800 }}>{name}</div>
            <div style={{ fontSize:12, color:THEME.sub }}>{city || "—"}</div>
          </div>
        </div>
        <div style={{ fontSize:12, padding:"6px 10px", borderRadius:999, border:`1px solid ${THEME.primary}`, color:THEME.primary, background:THEME.chipBg }}>
          {distanceKm != null ? `${Math.round(distanceKm)} km` : "distance unknown"}
        </div>
      </div>

      <p style={{ marginTop:8, color:THEME.ink }}>{bio}</p>

      <div style={{ marginTop:8 }}>
        <div style={{ fontSize:11, textTransform:"uppercase", color:THEME.sub, marginBottom:4 }}>Offers</div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {offers.map((t)=> <span key={t} style={{ fontSize:12, padding:"6px 10px", borderRadius:999, background:THEME.chipBg, border:`1px solid ${THEME.chipBorder}`, color:THEME.primary }}>{t}</span>)}
        </div>
      </div>

      <div style={{ marginTop:8 }}>
        <div style={{ fontSize:11, textTransform:"uppercase", color:THEME.sub, marginBottom:4 }}>Wants</div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {wants.map((t)=> <span key={t} style={{ fontSize:12, padding:"6px 10px", borderRadius:999, background:"#F1F5F9", border:`1px solid ${THEME.line}`, color:THEME.ink }}>{t}</span>)}
        </div>
      </div>

      <div style={{ marginTop:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {tags.map((t)=> <span key={t} style={{ fontSize:11, padding:"4px 10px", borderRadius:999, border:`1px solid ${THEME.primary}`, background:"#fff", color:THEME.primary }}>{t}</span>)}
        </div>
        <PrimaryButton onClick={onSwap}>Swap</PrimaryButton>
      </div>
    </div>
  );
}

function RequestCard({ data, onOffer }) {
  const { requester, city, category, title, details, tags=[], createdAt } = data;
  return (
    <div style={card()}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Avatar name={requester} />
          <div>
            <div style={{ fontWeight:800 }}>{requester}</div>
            <div style={{ fontSize:12, color:THEME.sub }}>{city || "—"}</div>
          </div>
        </div>
        <span style={{ fontSize:12, padding:"6px 10px", borderRadius:999, border:`1px solid ${THEME.primary}`, color:THEME.primary, background:THEME.chipBg }}>{category}</span>
      </div>

      <div style={{ marginTop:6, fontWeight:800 }}>{title}</div>
      <p style={{ marginTop:4, color:THEME.ink }}>{details}</p>

      {!!tags.length && (
        <div style={{ marginTop:6, display:"flex", gap:6, flexWrap:"wrap" }}>
          {tags.map((t)=> <span key={t} style={{ fontSize:11, padding:"4px 10px", borderRadius:999, border:`1px solid ${THEME.primary}`, background:"#fff", color:THEME.primary }}>{t}</span>)}
        </div>
      )}

      <div style={{ marginTop:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:12, color:THEME.sub }}>{new Date(createdAt).toLocaleString()}</div>
        <PrimaryButton onClick={onOffer}>Offer help</PrimaryButton>
      </div>
    </div>
  );
}

/* --------------- Bottom Nav --------------- */
function BottomNav({ active, setActive }){
  const items = [
    { key:"browse", label:"Browse", emoji:"🏠" },
    { key:"add", label:"Add", emoji:"➕" },
    { key:"requests", label:"Requests", emoji:"📝" },
    { key:"inbox", label:"Inbox", emoji:"💬" },
    { key:"profile", label:"Profile", emoji:"👤" },
  ];
  return (
    <nav style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:3, background:THEME.surface, borderTop:`1px solid ${THEME.line}` }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)" }}>
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
