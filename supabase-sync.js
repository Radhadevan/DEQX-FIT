/* ===== DEQX FIT — Supabase cloud sync ===== */
const SUPABASE_URL = 'https://flypceipibvrkzzkurdg.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_h-0Bq665oVwud24ZHXDe8g_aib-YVT0';
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
}) : null;

let cloudUser = null, cloudSyncing = false, cloudTimer = null, localDirty = false;

function cloudEl(id) { return document.getElementById(id); }

function cloudStatus(state, text) {
  const dot = cloudEl('cloudDot'), label = cloudEl('cloudStatusText');
  if (!dot || !label) return;
  dot.className = 'cloudDot ' + (state || '');
  label.textContent = text || '';
}

function cloudMessage(text) {
  const e = cloudEl('authMsg');
  const ce = cloudEl('cloudError');
  if (e) e.textContent = text || '';
  if (ce) ce.textContent = text || '';
}

function cloudTime() {
  const e = cloudEl('cloudSyncTime');
  if (e) e.textContent = 'Synced ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function cloudSetUI() {
  const logged = !!cloudUser;
  const auth = cloudEl('authPanel'), li = cloudEl('cloudLoggedIn'), pill = cloudEl('cloudUserPill');
  if (auth) auth.style.display = logged ? 'none' : 'grid';
  if (li) li.style.display = logged ? 'block' : 'none';
  if (pill) { pill.textContent = logged ? (cloudUser.email || 'Signed in') : 'Offline mode'; }
  if (logged) cloudStatus('online', 'Cloud account connected');
  else cloudStatus('', 'Local data only');
}

function cloudDailyPayload() {
  const iso = isoDate(new Date()),
    p = d.foods.reduce((a, x) => a + (Number(x.p) || 0), 0),
    c = d.foods.reduce((a, x) => a + (Number(x.c) || 0), 0),
    burn = (typeof v9 !== 'undefined' && Number(v9.burned)) || 0,
    completed = !!d.workoutHistory[today()]?.completed;
  const completion = Math.round(([
    p / Math.max(1, d.proteinTarget),
    d.water / Math.max(0.1, d.waterTarget),
    c / Math.max(1, d.calorieTarget),
    burn / 500,
    completed ? 1 : 0
  ].map(x => Math.min(1, Math.max(0, x))).reduce((a, x) => a + x, 0) / 5) * 100);
  return {
    user_id: cloudUser.id,
    log_date: iso,
    weight: Number(d.weight) || null,
    protein: Math.round(p * 10) / 10,
    calories: Math.round(c),
    water: Number(d.water) || 0,
    calories_burned: burn,
    workout_completed: completed,
    daily_completion: completion,
    updated_at: new Date().toISOString()
  };
}

async function cloudSyncNow() {
  if (!supabaseClient || !cloudUser || cloudSyncing) return false;
  cloudSyncing = true;
  cloudStatus('syncing', 'Syncing cloud data…');
  try {
    const daily = cloudDailyPayload();
    const { error: pe } = await supabaseClient.from('profiles').upsert({
      id: cloudUser.id,
      name: cloudUser.email?.split('@')[0] || 'DEQX FIT',
      goal_weight: Number(d.goalWeight),
      current_weight: Number(d.weight),
      protein_target: Number(d.proteinTarget),
      water_target: Number(d.waterTarget),
      calorie_target: Number(d.calorieTarget),
      budget_target: Number(d.budgetTarget),
      xp: Number(d.xp) || 0,
      level: levelInfo().level,
      updated_at: new Date().toISOString()
    });
    if (pe) throw Object.assign(new Error(pe.message || 'Profiles sync failed'), { code: pe.code, details: pe.details, hint: pe.hint, stage: 'profiles' });

    const { error: de } = await supabaseClient.from('daily_logs').upsert(daily, { onConflict: 'user_id,log_date' });
    if (de) throw Object.assign(new Error(de.message || 'Daily logs sync failed'), { code: de.code, details: de.details, hint: de.hint, stage: 'daily_logs' });

    const iso = daily.log_date;
    let r = await supabaseClient.from('food_logs').delete().eq('user_id', cloudUser.id).eq('log_date', iso);
    if (r.error) throw Object.assign(new Error(r.error.message || 'Food log cleanup failed'), { code: r.error.code, details: r.error.details, hint: r.error.hint, stage: 'food_logs' });

    if (d.foods.length) {
      r = await supabaseClient.from('food_logs').insert(d.foods.map(x => ({
        user_id: cloudUser.id,
        log_date: iso,
        food_name: String(x.n),
        quantity: 1,
        protein: Number(x.p) || 0,
        calories: Number(x.c) || 0
      })));
      if (r.error) throw Object.assign(new Error(r.error.message || 'Food log insert failed'), { code: r.error.code, details: r.error.details, hint: r.error.hint, stage: 'food_logs' });
    }

    r = await supabaseClient.from('activity_logs').delete().eq('user_id', cloudUser.id).eq('log_date', iso);
    if (r.error) throw r.error;
    if (typeof v9 !== 'undefined' && v9.activity) {
      r = await supabaseClient.from('activity_logs').insert({
        user_id: cloudUser.id,
        log_date: iso,
        activity: v9.activity,
        duration: Number(document.getElementById('activityMinutes')?.value) || 0,
        intensity: document.getElementById('activityIntensity')?.value || 'moderate',
        calories_burned: Number(v9.burned) || 0
      });
      if (r.error) throw r.error;
    }

    r = await supabaseClient.from('workout_logs').delete().eq('user_id', cloudUser.id).eq('workout_date', iso);
    if (r.error) throw r.error;
    const wh = d.workoutHistory[today()];
    if (wh) {
      r = await supabaseClient.from('workout_logs').insert({
        user_id: cloudUser.id,
        workout_date: iso,
        workout_type: String(wh.scheduled || d.workout || 'Workout'),
        completed: !!wh.completed,
        xp_earned: wh.completed ? 50 : 0
      });
      if (r.error) throw r.error;
    }

    const todayWeight = [...d.history].reverse().find(x => x.date === today());
    if (todayWeight) {
      const q = await supabaseClient.from('weight_history').select('id').eq('user_id', cloudUser.id).eq('recorded_date', iso).maybeSingle();
      if (q.error) throw q.error;
      if (q.data) {
        r = await supabaseClient.from('weight_history').update({ weight: Number(todayWeight.weight) }).eq('id', q.data.id);
      } else {
        r = await supabaseClient.from('weight_history').insert({ user_id: cloudUser.id, recorded_date: iso, weight: Number(todayWeight.weight) });
      }
      if (r?.error) throw r.error;
    }

    localStorage.setItem(KEY, JSON.stringify(d));
    localDirty = false;
    render();
    renderV9();
    cloudTime();
    cloudStatus('online', 'Cloud sync complete');
    cloudMessage('');
    return true;
  } catch (err) {
    console.error('DEQX FIT cloudSync error', err);
    cloudStatus('error', 'Sync failed — local data is still safe');
    const detail = [err?.stage, err?.message, err?.code, err?.hint].filter(Boolean).join(' • ');
    cloudMessage(detail || 'Could not sync. Check your Supabase tables and internet connection.');
    return false;
  } finally {
    cloudSyncing = false;
  }
}

function cloudQueueSync() {
  if (!cloudUser) return;
  clearTimeout(cloudTimer);
  cloudTimer = setTimeout(async () => {
    if (cloudSyncing) {
      cloudQueueSync();
      return;
    }
    await cloudSyncNow();
  }, 900);
}

async function cloudLoad() {
  if (!supabaseClient || !cloudUser) return;
  if (localDirty) {
    cloudStatus('syncing', 'Saving local changes to cloud…');
    await cloudSyncNow();
    return;
  }
  cloudStatus('syncing', 'Loading your cloud data…');
  cloudMessage('');
  try {
    const { data: p, error: pe } = await supabaseClient.from('profiles').select('*').eq('id', cloudUser.id).maybeSingle();
    if (pe) throw Object.assign(new Error(pe.message || 'Profiles query failed'), { code: pe.code, details: pe.details, hint: pe.hint, stage: 'profiles' });
    const iso = isoDate(new Date());
    const { data: dl, error: de } = await supabaseClient.from('daily_logs').select('*').eq('user_id', cloudUser.id).eq('log_date', iso).maybeSingle();
    if (de) throw Object.assign(new Error(de.message || 'Daily logs query failed'), { code: de.code, details: de.details, hint: de.hint, stage: 'daily_logs' });
    const { data: foods, error: fe } = await supabaseClient.from('food_logs').select('*').eq('user_id', cloudUser.id).eq('log_date', iso).order('id');
    if (fe) throw Object.assign(new Error(fe.message || 'Food logs query failed'), { code: fe.code, details: fe.details, hint: fe.hint, stage: 'food_logs' });
    const { data: acts, error: ae } = await supabaseClient.from('activity_logs').select('*').eq('user_id', cloudUser.id).eq('log_date', iso).order('id', { ascending: false }).limit(1);
    if (ae) throw Object.assign(new Error(ae.message || 'Activity logs query failed'), { code: ae.code, details: ae.details, hint: ae.hint, stage: 'activity_logs' });
    const { data: whs, error: we } = await supabaseClient.from('workout_logs').select('*').eq('user_id', cloudUser.id).order('workout_date', { ascending: false }).limit(120);
    if (we) throw Object.assign(new Error(we.message || 'Workout logs query failed'), { code: we.code, details: we.details, hint: we.hint, stage: 'workout_logs' });
    const { data: weights, error: he } = await supabaseClient.from('weight_history').select('*').eq('user_id', cloudUser.id).order('recorded_date', { ascending: true });
    if (he) throw Object.assign(new Error(he.message || 'Weight history query failed'), { code: he.code, details: he.details, hint: he.hint, stage: 'weight_history' });

    if (localDirty) {
      cloudStatus('online', 'Local changes kept safe');
      cloudMessage('Local changes were detected and kept on this device. Syncing them now…');
      await cloudSyncNow();
      return;
    }

    if (p) {
      d.goalWeight = Number(p.goal_weight) || d.goalWeight;
      d.weight = Number(p.current_weight) || d.weight;
      d.proteinTarget = Number(p.protein_target) || d.proteinTarget;
      d.waterTarget = Number(p.water_target) || d.waterTarget;
      d.calorieTarget = Number(p.calorie_target) || d.calorieTarget;
      d.budgetTarget = Number(p.budget_target) >= 0 ? Number(p.budget_target) : d.budgetTarget;
      d.xp = Number(p.xp) || 0;
    }
    if (dl) {
      d.weight = Number(dl.weight) || d.weight;
      d.water = Number(dl.water) || 0;
      d.date = today();
    }
    d.foods = (foods || []).map(x => ({ n: x.food_name, p: Number(x.protein) || 0, c: Number(x.calories) || 0 }));
    if (weights?.length) d.history = weights.map(x => ({ date: new Date(x.recorded_date + 'T00:00:00').toLocaleDateString('en-IN'), weight: Number(x.weight) }));
    if (!d.history.length) d.history = [{ date: today(), weight: d.weight }];
    d.workoutHistory = {};
    (whs || []).forEach(x => {
      const local = new Date(x.workout_date + 'T00:00:00').toLocaleDateString('en-IN');
      d.workoutHistory[local] = { scheduled: x.workout_type, completed: !!x.completed, actual: x.workout_type };
    });
    if (dl && dl.workout_completed && !d.workoutHistory[today()]) {
      d.workoutHistory[today()] = { scheduled: scheduleForDate(new Date()) || 'Workout', completed: true, actual: 'Workout' };
    }
    if (typeof v9 !== 'undefined') {
      const a = acts?.[0];
      v9.activity = a?.activity || null;
      v9.burned = Number(a?.calories_burned) || 0;
      v9.lastActivityDate = a ? today() : v9.lastActivityDate;
      v9.xp = Number(p?.xp) || v9.xp;
      v9.level = Number(p?.level) || v9.level;
      saveV9();
    }
    localStorage.setItem(KEY, JSON.stringify(d));
    render();
    renderV9();
    cloudTime();
    cloudStatus('online', 'Cloud data loaded');
  } catch (err) {
    console.error('DEQX FIT cloudLoad error', err);
    cloudStatus('error', 'Cloud load failed');
    const detail = [err?.stage, err?.message, err?.code, err?.hint].filter(Boolean).join(' • ');
    cloudMessage(detail || 'Cloud data could not be loaded. Local mode is still available.');
  }
}

async function cloudSignIn() {
  if (!supabaseClient) return;
  const email = cloudEl('authEmail')?.value.trim(), password = cloudEl('authPassword')?.value;
  if (!email || !password) { cloudMessage('Enter your email and password.'); return; }
  cloudStatus('syncing', 'Signing in…');
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) { cloudStatus('error', 'Sign in failed'); cloudMessage(error.message); return; }
  cloudUser = data.user;
  cloudSetUI();
  await cloudLoad();
  cloudMessage('Signed in successfully.');
}

async function cloudSignUp() {
  if (!supabaseClient) return;
  const email = cloudEl('authEmail')?.value.trim(), password = cloudEl('authPassword')?.value;
  if (!email || password.length < 6) { cloudMessage('Use a valid email and a password with at least 6 characters.'); return; }
  cloudStatus('syncing', 'Creating account…');
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) { cloudStatus('error', 'Sign up failed'); cloudMessage(error.message); return; }
  if (data.session) {
    cloudUser = data.user;
    cloudSetUI();
    await cloudSyncNow();
    cloudMessage('Account created and synced.');
  } else {
    cloudStatus('', 'Check your email to confirm your account');
    cloudMessage('Supabase may require email confirmation. Open the confirmation email, then sign in here.');
  }
}

async function cloudSignOut() {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  cloudUser = null;
  cloudSetUI();
  cloudStatus('', 'Signed out — local data remains on this device');
  cloudMessage('');
}

if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange((event, session) => {
    cloudUser = session?.user || null;
    cloudSetUI();
    if (session && event !== 'INITIAL_SESSION') setTimeout(() => cloudLoad(), 0);
  });
  (async () => {
    const { data } = await supabaseClient.auth.getSession();
    cloudUser = data?.session?.user || null;
    cloudSetUI();
    if (cloudUser) await cloudLoad();
  })();
}

window.addEventListener('online', () => { if (cloudUser) cloudSyncNow(); });
