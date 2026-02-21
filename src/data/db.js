
import { createClient } from "@supabase/supabase-js";
var URL  = import.meta.env.VITE_SUPABASE_URL  || "";
var ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
export var supabase = createClient(URL, ANON);
var _c = {};

async function rows(table, orderBy) {
  var q = supabase.from(table).select("*").order(orderBy || "created_at", { ascending: false });
  var { data, error } = await q;
  if (error) { console.error("[DB]", table, error.message); return _c[table] || []; }
  return (_c[table] = data || []);
}

var DB = {
  list: function(table, orderBy) { return rows(table, orderBy); },

  save: async function(table, row) {
    var cached = _c[table] || [];
    var exists = cached.find(function(r) { return r.id === row.id; });
    if (exists) { _c[table] = cached.map(function(r) { return r.id === row.id ? row : r; }); }
    else { _c[table] = [row].concat(cached); }
    var { error } = await supabase.from(table).upsert(row, { onConflict: "id" });
    if (error) console.error("[DB save]", table, error.message);
  },

  remove: async function(table, id) {
    _c[table] = (_c[table] || []).filter(function(r) { return r.id !== id; });
    var { error } = await supabase.from(table).delete().eq("id", id);
    if (error) console.error("[DB remove]", table, error.message);
  },

  getSetting: async function(key) {
    if (_c["_s_" + key] !== undefined) return _c["_s_" + key];
    var { data, error } = await supabase.from("settings").select("value").eq("key", key).single();
    if (error) return null;
    _c["_s_" + key] = data.value;
    return data.value;
  },

  setSetting: async function(key, value) {
    _c["_s_" + key] = value;
    var { error } = await supabase.from("settings").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) console.error("[DB setting]", key, error.message);
  },

  signIn:    function(email, password) { return supabase.auth.signInWithPassword({ email, password }); },
  signOut:   function() { _c = {}; return supabase.auth.signOut(); },
  getSession:function() { return supabase.auth.getSession().then(function(r) { return r.data.session; }); },
  onAuthChange: function(cb) {
    var { data: { subscription } } = supabase.auth.onAuthStateChange(cb);
    return function() { subscription.unsubscribe(); };
  },

  uploadPhoto: async function(file, path) {
    var { error } = await supabase.storage.from("order-photos").upload(path, file, { upsert: true });
    if (error) { console.error("[Storage]", error.message); return null; }
    var { data } = supabase.storage.from("order-photos").getPublicUrl(path);
    return data.publicUrl;
  },

  clearCache: function(table) { if (table) delete _c[table]; else _c = {}; },
};
export default DB;
