import React, { useEffect, useMemo, useState } from "react";
import seedrandom from "seedrandom";
import { sha256 } from "js-sha256";

// ---- THEMES (10 rounds, >=20 words per round total) ----
const THEMES = [
  { label:"Flowers vs Grasses",
    crew:["rose","tulip","jasmine","daisy","lily","orchid","lavender","hibiscus","iris","lotus","daffodil","peony","poppy","sunflower","marigold"],
    impostor:["bamboo","zoysia","bentgrass","fescue","bluegrass","bermuda","ryegrass","pampas","reed","switchgrass"] },
  { label:"Fruits vs Vegetables",
    crew:["apple","banana","orange","mango","grape","pineapple","papaya","strawberry","watermelon","kiwi","pear","peach","cherry","plum","apricot"],
    impostor:["carrot","potato","tomato","cucumber","lettuce","spinach","broccoli","cabbage","eggplant","pumpkin"] },
  { label:"Mammals vs Birds",
    crew:["lion","tiger","elephant","giraffe","zebra","kangaroo","whale","bear","wolf","fox","deer","rabbit","horse","camel","panda"],
    impostor:["eagle","sparrow","pigeon","parrot","owl","flamingo","penguin","swan","goose","peacock"] },
  { label:"Sea vs Freshwater Animals",
    crew:["shark","tuna","mackerel","sardine","swordfish","crab","lobster","shrimp","jellyfish","starfish","seahorse","manta ray","clam","oyster","mussel","scallop"],
    impostor:["carp","catfish","tilapia","trout","pike","perch","bass","goldfish","eel","crayfish"] },
  { label:"Kitchen Utensils vs Kitchen Electronics",
    crew:["spatula","whisk","ladle","tongs","peeler","grater","colander","rolling pin","can opener","measuring cup","sieve","zester","skimmer","pizza cutter","pastry brush","garlic press"],
    impostor:["blender","toaster","microwave","mixer","food processor","air fryer","rice cooker","kettle","coffee maker","oven"] },
  { label:"Clothing vs Accessories",
    crew:["shirt","pants","dress","skirt","jacket","coat","sweater","t-shirt","jeans","shorts","blouse","hoodie","suit","socks","cardigan","leggings"],
    impostor:["belt","tie","scarf","hat","cap","gloves","earrings","necklace","bracelet","watch"] },
  { label:"Vehicles vs Household Items",
    crew:["sedan","suv","hatchback","coupe","convertible","pickup","limousine","minivan","wagon","sports car","roadster","crossover","jeep","truck"],
    impostor:["sofa","lamp","vacuum","mirror","chair","table","bookshelf","cabinet","bed","dresser"] },
  { label:"String vs Percussion Instruments",
    crew:["guitar","violin","viola","cello","double bass","harp","banjo","mandolin","ukulele","sitar","lute","zither","lyre","erhu"],
    impostor:["drum","snare","cymbal","tambourine","maracas","triangle","xylophone","bongos","conga","timpani"] },
  { label:"Desserts vs Fast Food",
    crew:["cake","pie","ice cream","pudding","brownie","cupcake","tart","cheesecake","donut","cookie","trifle","mousse","custard","flan","gelato"],
    impostor:["burger","fries","pizza","hotdog","fried chicken","taco","kebab","shawarma","nuggets","sandwich"] },
  { label:"Office Items vs School Supplies",
    crew:["stapler","paperclip","binder","folder","notepad","printer","scanner","shredder","whiteboard","marker","highlighter","ruler","tape dispenser","envelope","calculator","desk lamp"],
    impostor:["pencil","pen","eraser","notebook","backpack","glue","scissors","protractor","compass","worksheet"] }
];
const ROUNDS = 10;

const norm = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");
const choose = (rng, list) => list[Math.floor(rng() * list.length)];
const hashHex = (name, seed, round) => sha256(norm(name) + "|" + seed + "|" + round);
const hexToInt = (hex, digits=12) => parseInt(hex.slice(0, digits), 16);

// Deterministic role based on roster ordering (requires roster), but NO per-round payload.
// We keep a constant "room link" and players just refresh to advance local round.
function assignAll(roster, seed, round, impostorCount){
  // enforce constraints
  let k = Math.max(1, Math.min(2, impostorCount || 1));
  if (roster.length < 2) k = 0;               // no impostor if less than 2 players
  if (roster.length === 2) k = 1;             // exactly 1 impostor for 2 players
  if (roster.length === 3) k = Math.min(k, 2);// cap by 2
  if (roster.length > 3) k = Math.min(k, 2);  // cap by 2

  const items = roster.map(name => ({ name, h: hashHex(name, seed, round), v: hexToInt(hashHex(name, seed, round)) }));
  items.sort((a,b)=> a.v - b.v);
  const impostorSet = new Set(items.slice(0, k).map(x=>x.name));

  const theme = THEMES[(round - 1) % ROUNDS];
  const rng = seedrandom(`${seed}|${round}|words`);
  return items.map(({name}) => {
    const role = impostorSet.has(name) ? "IMPOSTOR" : "CREW";
    const pool = role === "IMPOSTOR" ? theme.impostor : theme.crew;
    const word = choose(rng, pool);
    return { name, role, word };
  });
}

function useQuery(){
  const p = new URLSearchParams(window.location.search);
  return {
    mode: p.get("mode") || "admin",
    room: p.get("room") || "",
    auto: p.get("auto") === "1"
  };
}

export default function App(){
  const q = useQuery();
  const [mode, setMode] = useState(q.mode === "player" ? "player" : "admin");
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl p-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Among Us – English Club (Fixed 6)</h1>
          <nav className="flex gap-2">
            <a href="?mode=admin" className={`px-3 py-1.5 rounded-full text-sm ${mode==="admin"?"bg-indigo-600 text-white":"bg-white border"}`}>Admin</a>
            <a href="?mode=player" className={`px-3 py-1.5 rounded-full text-sm ${mode==="player"?"bg-indigo-600 text-white":"bg-white border"}`}>Player</a>
          </nav>
        </header>
        {mode === "player" ? <PlayerView /> : <AdminView />}
      </div>
    </div>
  );
}

function AdminView(){
  const q = useQuery();
  const initialRoom = q.room || randomRoomCode();
  const [room, setRoom] = useState(initialRoom);
  const [round, setRound] = useState(1);
  const [impostorCount, setImpostorCount] = useState(1);
  const [nameInput, setNameInput] = useState("");
  const [roster, setRoster] = useState([]);

  const tooFew = roster.length < 2;
  const tooMany = roster.length > 20;

  const assignments = useMemo(()=>assignAll(roster, room, round, impostorCount), [roster, room, round, impostorCount]);
  const theme = THEMES[(round-1) % ROUNDS];

  function addName(){
    const n = norm(nameInput);
    if(!n) return;
    if(roster.includes(n)) return;
    if(roster.length >= 20) return;
    setRoster([...roster, n]);
    setNameInput("");
  }
  function removeName(n){ setRoster(roster.filter(x=>x!==n)); }
  function clearRoster(){ if(confirm("Clear roster?")) setRoster([]); }
  function nextRound(){ setRound(r => Math.min(ROUNDS, r+1)); }
  function prevRound(){ setRound(r => Math.max(1, r-1)); }

  const playerLink = (()=>{
    const u = new URL(window.location.origin + window.location.pathname);
    u.searchParams.set("mode","player");
    u.searchParams.set("room", room);
    u.searchParams.set("auto","1"); // players refresh once per round
    return u.toString();
  })();

  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-4">
        {(tooFew || tooMany) && (
          <div className="bg-amber-100 border border-amber-300 text-amber-900 rounded-xl p-3 text-sm">
            {tooFew && <div>⚠️ Minimal 2 pemain untuk memulai ronde.</div>}
            {tooMany && <div>⚠️ Maksimal 20 pemain per ronde.</div>}
          </div>
        )}
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="font-semibold text-lg mb-3">Room & Round</h2>
          <label className="block text-sm font-medium">Room Code</label>
          <div className="flex gap-2 mt-1">
            <input value={room} onChange={e=>setRoom(norm(e.target.value))} className="flex-1 rounded-xl border px-3 py-2"/>
            <button onClick={()=>setRoom(randomRoomCode())} className="px-3 py-2 rounded-xl bg-indigo-600 text-white">New</button>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium">Round (1–10)</label>
              <div className="flex items-center gap-2 mt-1">
                <button onClick={prevRound} className="px-2 py-1 rounded-lg border">-</button>
                <input value={round} onChange={e=>setRound(Math.max(1, Math.min(ROUNDS, Number(e.target.value)||1)))} className="w-20 text-center rounded-lg border px-2 py-1"/>
                <button onClick={nextRound} className="px-2 py-1 rounded-lg border">+</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Impostors</label>
              <select value={impostorCount} onChange={e=>setImpostorCount(Math.max(1, Math.min(2, Number(e.target.value))))} className="w-full mt-1 rounded-lg border px-2 py-2">
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="font-semibold text-lg mb-2">Roster (min 2, max 20)</h2>
          <div className="flex gap-2">
            <input value={nameInput} onChange={e=>setNameInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") addName(); }} placeholder="Type player name…" className="flex-1 rounded-xl border px-3 py-2"/>
            <button onClick={addName} className="px-3 py-2 rounded-xl bg-indigo-600 text-white">Add</button>
            <button onClick={clearRoster} className="px-3 py-2 rounded-xl border">Clear</button>
          </div>
          <div className="mt-3 max-h-48 overflow-auto border rounded-xl p-2 text-sm">
            {roster.length === 0 && <p className="text-slate-500">No players yet.</p>}
            {roster.map(n => (
              <div key={n} className="flex items-center justify-between py-1 px-2 rounded hover:bg-slate-50">
                <span>{n}</span>
                <button onClick={()=>removeName(n)} className="text-red-600 text-xs">remove</button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="font-semibold text-lg mb-2">Share Player Link</h2>
          <p className="text-sm text-slate-600">Bagikan link ini sekali saja. Saat Admin pindah ronde, pemain cukup <b>refresh</b> halaman Player.</p>
          <div className="mt-2 text-xs break-all bg-slate-100 rounded-xl p-2 border">{playerLink}</div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="font-semibold text-lg mb-2">Assignments (Theme: {theme.label})</h2>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">#</th><th className="py-2 pr-3">Player</th><th className="py-2 pr-3">Word</th><th className="py-2 pr-3">Role</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a,idx)=>(
                <tr key={a.name} className="border-b last:border-0">
                  <td className="py-2 pr-3 text-slate-500">{idx+1}</td>
                  <td className="py-2 pr-3 font-medium">{a.name}</td>
                  <td className="py-2 pr-3"><span className="font-semibold">{a.word}</span></td>
                  <td className="py-2 pr-3">{a.role === "IMPOSTOR" ? <span className="px-2 py-1 rounded-full text-xs bg-rose-600 text-white">Impostor</span> : <span className="px-2 py-1 rounded-full text-xs bg-emerald-600 text-white">Crew</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {assignments.length === 0 && (<p className="text-slate-500 text-sm">Add player names to generate words & roles.</p>)}
        </div>
      </div>
    </div>
  );
}

function PlayerView(){
  const q = useQuery();
  const room = q.room || "englishclub";
  const auto = q.auto === true || q.auto === "1";
  const key = `au6_round_${room}`;
  const [name, setName] = useState("");
  const [round, setRound] = useState(()=>{
    const saved = Number(localStorage.getItem(key) || 1);
    return Math.max(1, Math.min(ROUNDS, saved));
  });

  // Auto-advance local round by 1 on each load when ?auto=1 is present.
  useEffect(()=>{
    if(auto){
      const next = Math.min(ROUNDS, round + 1);
      localStorage.setItem(key, String(next));
      setRound(next);
    }
  }, []); // run once

  const [impostorCount, setImpostorCount] = useState(1); // players don't set this; info only
  const [rosterInput, setRosterInput] = useState(""); // to validate names locally if desired
  const roster = useMemo(()=>{
    const lines = rosterInput.split(/\n+/).map(s=>norm(s)).filter(Boolean);
    return Array.from(new Set(lines)).slice(0,20);
  }, [rosterInput]);

  const [result, setResult] = useState(null);
  const theme = THEMES[(round-1) % ROUNDS];

  function getMyWord(){
    if(!name.trim()){ alert("Isi nama terlebih dahulu."); return; }
    if(roster.length < 2){ alert("Roster minimal 2 pemain (diisi oleh Admin di Player atau abaikan jika Admin memandu secara lisan)."); return; }
    // Impostor selection needs roster; Players can paste roster once (or Admin announces). This avoids per-round payload.
    const assign = assignAll(roster, room, round, impostorCount);
    const me = assign.find(a => a.name === norm(name));
    if(!me){ alert("Nama tidak ditemukan di roster. Pastikan ejaan sama persis."); return; }
    setResult(me);
  }

  function resetLocal(){
    localStorage.removeItem(key);
    setRound(1);
    setResult(null);
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-6">
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="font-semibold text-lg mb-1">Player</h2>
        <p className="text-sm text-slate-600">Room: <b>{room}</b> · Round: <b>{round}</b> · Theme: <b>{theme.label}</b></p>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Your Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} className="w-full rounded-xl border px-3 py-2" placeholder="e.g., Asma"/>
          </div>
          <div>
            <label className="block text-sm font-medium">Impostors (set by Admin)</label>
            <select value={impostorCount} onChange={e=>setImpostorCount(Math.max(1, Math.min(2, Number(e.target.value))))} className="w-full rounded-xl border px-3 py-2">
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Roster (paste once, min 2, max 20)</label>
            <textarea value={rosterInput} onChange={e=>setRosterInput(e.target.value)} rows={4} className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="Satu nama per baris sesuai roster Admin"/>
            <p className="text-xs text-slate-500 mt-1">Tips: Admin bisa bagikan daftar nama sekali di awal. Tidak perlu payload per ronde.</p>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button onClick={getMyWord} className="px-3 py-2 rounded-xl bg-indigo-600 text-white">Get My Word</button>
          <button onClick={()=>window.location.reload()} className="px-3 py-2 rounded-xl border">Refresh</button>
          <button onClick={resetLocal} className="px-3 py-2 rounded-xl border">Reset Round</button>
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-2xl shadow p-6 text-center">
          <p className="text-slate-500 text-sm">Round <b>{round}</b> · Theme: <b>{theme.label}</b></p>
          <div className="mt-4">
            <div className="inline-block bg-slate-900 text-white rounded-2xl px-6 py-4 text-3xl font-black tracking-wide select-all">{result.word}</div>
          </div>
          <div className="mt-3">
            <span className={`px-3 py-1 rounded-full text-xs ${result.role==="IMPOSTOR"?"bg-rose-600 text-white":"bg-emerald-600 text-white"}`}>{result.role}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function randomRoomCode(){
  const words = ["amber","basil","cobalt","dawn","ember","flint","glint","hazel","indigo","jade","kepler","lumen","magma","nectar","onyx","poppy","quartz","raven","saffron","topaz","ultra","velvet","willow","xenon","yarrow","zephyr"];
  const rng = seedrandom(String(Date.now()));
  const w = words[Math.floor(rng()*words.length)];
  const n = Math.floor(100 + rng()*900);
  return `${w}-${n}`;
}
