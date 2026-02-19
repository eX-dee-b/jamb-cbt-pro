import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const SC = { English:'#ff5a36', Physics:'#4d9fff', Chemistry:'#3dcc7e', Mathematics:'#ffb340' }

const QUESTIONS = [
  {q:"Synonym of DILIGENT:",opts:["Lazy","Hardworking","Careless","Slow"],ans:1,subject:"English",exp:"DILIGENT = hardworking."},
  {q:"Antonym of EXPAND:",opts:["Contract","Extend","Enlarge","Spread"],ans:0,subject:"English",exp:"EXPAND opposite = CONTRACT."},
  {q:"Plural of 'Crisis':",opts:["Crisises","Crises","Crisis","Crisiss"],ans:1,subject:"English",exp:"Crisis → Crises (Greek)."},
  {q:"Correct sentence:",opts:["He don't like it","He doesn't like it","He don't likes","He doesn't likes"],ans:1,subject:"English",exp:"Third person singular uses doesn't."},
  {q:"'Break the ice' means:",opts:["Destroy ice","Start conversation","Fail","Escape"],ans:1,subject:"English",exp:"Idiom: start a conversation comfortably."},
  {q:"SI unit of force:",opts:["Joule","Newton","Watt","Pascal"],ans:1,subject:"Physics",exp:"Force unit = Newton (N)."},
  {q:"SI unit of energy:",opts:["Joule","Newton","Watt","Pascal"],ans:0,subject:"Physics",exp:"Energy unit = Joule (J)."},
  {q:"F=ma. m=5kg,a=4m/s². F=",opts:["5N","9N","20N","25N"],ans:2,subject:"Physics",exp:"F=5×4=20N."},
  {q:"Kinetic energy =",opts:["mgh","½mv²","Fd","½mv"],ans:1,subject:"Physics",exp:"KE=½mv²."},
  {q:"Velocity =",opts:["Distance/time","Displacement/time","Speed×time","Acc×mass"],ans:1,subject:"Physics",exp:"Velocity=displacement/time."},
  {q:"Atomic number Z = number of:",opts:["Neutrons","Protons","Nucleons","Electrons"],ans:1,subject:"Chemistry",exp:"Z = protons."},
  {q:"Group 1 elements called:",opts:["Noble gases","Halogens","Alkali metals","Alkaline earth"],ans:2,subject:"Chemistry",exp:"Group 1 = Alkali metals."},
  {q:"NaCl has ___ bond:",opts:["Covalent","Ionic","Metallic","Hydrogen"],ans:1,subject:"Chemistry",exp:"NaCl = ionic bond."},
  {q:"pH < 7 means:",opts:["Basic","Neutral","Acidic","Salt"],ans:2,subject:"Chemistry",exp:"pH<7 = acidic."},
  {q:"Oxidation = ___ of electrons:",opts:["Gain","Loss","Transfer","Share"],ans:1,subject:"Chemistry",exp:"OIL: Oxidation Is Loss."},
  {q:"3x+5=20. x=",opts:["3","5","7","10"],ans:1,subject:"Mathematics",exp:"3x=15 → x=5."},
  {q:"Area rectangle l=8,w=5:",opts:["13","26","40","80"],ans:2,subject:"Mathematics",exp:"8×5=40."},
  {q:"Mean of 2,4,6,8,10:",opts:["4","5","6","8"],ans:2,subject:"Mathematics",exp:"30/5=6."},
  {q:"Factorize x²+5x+6:",opts:["(x+2)(x+3)","(x+1)(x+6)","(x-2)(x-3)","(x+5)(x+1)"],ans:0,subject:"Mathematics",exp:"(x+2)(x+3)."},
  {q:"Sum angles triangle:",opts:["90°","180°","270°","360°"],ans:1,subject:"Mathematics",exp:"Triangle = 180°."},
]

function fmt(s){const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60;return`${h}:${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`}

export default function Home() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('home')
  const [authTab, setAuthTab] = useState('login')
  const [authMethod, setAuthMethod] = useState('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['','','','','',''])
  const [otpStep, setOtpStep] = useState(false)
  const [authErr, setAuthErr] = useState('')
  const [authMsg, setAuthMsg] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [qs, setQs] = useState([...QUESTIONS])
  const [cur, setCur] = useState(0)
  const [answers, setAnswers] = useState({})
  const [flagged, setFlagged] = useState(new Set())
  const [tLeft, setTLeft] = useState(7200)
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState(null)
  const [toast, setToast] = useState('')
  const [pqs, setPqs] = useState([])
  const [showCalc, setShowCalc] = useState(false)
  const [calcVal, setCalcVal] = useState('0')
  const [calcExpr, setCalcExpr] = useState('')
  const [calcFresh, setCalcFresh] = useState(true)
  const fileRef = useRef()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (view !== 'exam' || submitted) return
    if (tLeft <= 0) { doSubmit(); return }
    const t = setInterval(() => setTLeft(p => p - 1), 1000)
    return () => clearInterval(t)
  }, [view, submitted, tLeft])

  const toast2 = (m) => { setToast(m); setTimeout(() => setToast(''), 3500) }
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Student'

  // AUTH
  const doLogin = async () => {
    if (!email || !password) { setAuthErr('Enter email and password'); return }
    setAuthBusy(true); setAuthErr('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setAuthBusy(false)
    if (error) setAuthErr(error.message)
  }

  const doSignup = async () => {
    if (!name) { setAuthErr('Enter your name'); return }
    if (!email || password.length < 6) { setAuthErr('Enter email and 6+ char password'); return }
    setAuthBusy(true); setAuthErr('')
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
    setAuthBusy(false)
    if (error) { setAuthErr(error.message); return }
    setAuthMsg('✅ Check your email to confirm, then log in!')
  }

  const doGoogle = async () => {
    setAuthBusy(true); setAuthErr('')
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } })
    if (error) { setAuthErr(error.message); setAuthBusy(false) }
  }

  const doPhoneSend = async () => {
    if (phone.length < 7) { setAuthErr('Enter valid phone number'); return }
    setAuthBusy(true); setAuthErr('')
    const full = '+234' + phone.replace(/^0/, '')
    const { error } = await supabase.auth.signInWithOtp({ phone: full })
    setAuthBusy(false)
    if (error) { setAuthErr(error.message); return }
    setOtpStep(true); setAuthMsg(`Code sent to ${full}`)
  }

  const doOtpVerify = async () => {
    const code = otp.join('')
    if (code.length < 6) { setAuthErr('Enter all 6 digits'); return }
    setAuthBusy(true); setAuthErr('')
    const full = '+234' + phone.replace(/^0/, '')
    const { error } = await supabase.auth.verifyOtp({ phone: full, token: code, type: 'sms' })
    setAuthBusy(false)
    if (error) setAuthErr(error.message)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setView('home'); setAnswers({}); setFlagged(new Set()); setTLeft(7200); setSubmitted(false)
  }

  // EXAM
  const doSubmit = () => {
    let correct = 0; const subs = {}
    qs.forEach((q, i) => {
      const ok = answers[i] === q.ans; if (ok) correct++
      if (!subs[q.subject]) subs[q.subject] = { correct: 0, total: 0 }
      subs[q.subject].total++; if (ok) subs[q.subject].correct++
    })
    const score = Math.round((correct / qs.length) * 400)
    setResults({ score, correct, total: qs.length, acc: Math.round(correct / qs.length * 100), subs, time: fmt(7200 - tLeft) })
    setSubmitted(true); setView('results')
  }

  // AI EXTRACTION — calls our secure backend API route
  const handleFiles = async (files) => {
    const imgs = [...files].filter(f => f.type.startsWith('image/'))
    if (!imgs.length) { toast2('Please upload image files'); return }
    const subj = document.getElementById('defsubj')?.value || 'English'
    for (const f of imgs) {
      const id = Date.now() + Math.random()
      setPqs(p => [...p, { id, url: URL.createObjectURL(f), name: f.name, status: 'loading', extracted: [] }])
      try {
        const b64 = await new Promise((res, rej) => {
          const r = new FileReader()
          r.onload = () => res(r.result.split(',')[1])
          r.onerror = () => rej(new Error('Read failed'))
          r.readAsDataURL(f)
        })
        // Call OUR backend — API key is safe on server
        const resp = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ imageBase64: b64, mediaType: f.type || 'image/jpeg', subject: subj })
        })
        const data = await resp.json()
        if (!resp.ok) throw new Error(data.error || 'Server error')
        const extracted = data.questions || []
        if (extracted.length > 0) {
          setQs(prev => [...prev, ...extracted])
          setPqs(p => p.map(x => x.id === id ? { ...x, status: 'done', extracted } : x))
          toast2(`✓ ${extracted.length} questions extracted!`)
        } else {
          setPqs(p => p.map(x => x.id === id ? { ...x, status: 'none' } : x))
          toast2('No questions found — try a clearer photo')
        }
      } catch (err) {
        setPqs(p => p.map(x => x.id === id ? { ...x, status: 'error', err: err.message } : x))
        toast2(`✗ ${err.message}`)
      }
    }
  }

  // CALCULATOR
  const calcPress = (v) => {
    if (v === 'C') { setCalcVal('0'); setCalcExpr(''); setCalcFresh(true); return }
    if (v === '⌫') { setCalcVal(d => d.length > 1 ? d.slice(0, -1) : '0'); return }
    if (v === '=') {
      try {
        const e = calcExpr + calcVal
        const r = Function('"use strict";return(' + e + ')')()
        setCalcExpr(e + ' ='); setCalcVal(isFinite(r) ? String(parseFloat(r.toFixed(10))) : 'Error'); setCalcFresh(true)
      } catch { setCalcVal('Error'); setCalcFresh(true) }
      return
    }
    if (['+', '-', '×', '÷', '%'].includes(v)) {
      setCalcExpr(calcExpr + calcVal + (v === '×' ? '*' : v === '÷' ? '/' : v)); setCalcFresh(true); return
    }
    if (calcFresh) { setCalcVal(v === '.' ? '0.' : v); setCalcFresh(false) }
    else { if (v === '.' && calcVal.includes('.')) return; setCalcVal(d => (d === '0' && v !== '.') ? v : d + v) }
  }

  const q = qs[cur] || qs[0]
  const answered = Object.keys(answers).length
  const isWarn = tLeft <= 300

  if (loading) return (
    <div style={S.center}>
      <div style={S.spinner} />
    </div>
  )

  // ── AUTH ──
  if (!user) return (
    <div style={S.authWrap}>
      <div style={S.authCard}>
        <div style={S.logo}>JAMB <span style={{ color: '#ff5a36' }}>CBT</span> Pro</div>
        <div style={S.authSub}>Engineering Practice Exam</div>

        <div style={S.tabs}>
          {['login', 'signup'].map(t => (
            <button key={t} style={{ ...S.tab, ...(authTab === t ? S.tabOn : {}) }}
              onClick={() => { setAuthTab(t); setAuthErr(''); setAuthMsg('') }}>
              {t === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {authErr && <div style={S.err}>⚠ {authErr}</div>}
        {authMsg && !authErr && <div style={S.ok}>{authMsg}</div>}

        {otpStep ? (
          <>
            <div style={S.label}>Enter 6-digit code</div>
            <div style={S.otpRow}>
              {otp.map((v, i) => (
                <input key={i} style={S.otpBox} maxLength={1} value={v} inputMode="numeric"
                  onChange={e => { const d = [...otp]; d[i] = e.target.value.slice(-1); setOtp(d) }} />
              ))}
            </div>
            <button style={S.btnMain} onClick={doOtpVerify} disabled={authBusy}>
              {authBusy ? 'Verifying…' : 'Verify & Log In'}
            </button>
          </>
        ) : authMethod === 'phone' ? (
          <>
            <div style={S.label}>Phone Number</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <select style={S.cc}><option value="+234">🇳🇬 +234</option></select>
              <input style={{ ...S.input, flex: 1 }} placeholder="08012345678" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <button style={S.btnMain} onClick={doPhoneSend} disabled={authBusy}>
              {authBusy ? 'Sending…' : 'Send OTP →'}
            </button>
            <button style={S.btnAlt} onClick={() => { setAuthMethod('email'); setAuthErr('') }}>✉ Use Email Instead</button>
          </>
        ) : (
          <>
            {authTab === 'signup' && (
              <>
                <div style={S.label}>Full Name</div>
                <input style={S.input} placeholder="e.g. Chidi Okeke" value={name} onChange={e => setName(e.target.value)} />
              </>
            )}
            <div style={S.label}>Email</div>
            <input style={S.input} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            <div style={S.label}>Password</div>
            <input style={S.input} type="password" placeholder={authTab === 'signup' ? 'Min 6 characters' : 'Your password'} value={password} onChange={e => setPassword(e.target.value)} />
            <button style={S.btnMain} onClick={authTab === 'login' ? doLogin : doSignup} disabled={authBusy}>
              {authBusy ? '…' : authTab === 'login' ? 'Log In →' : 'Create Account →'}
            </button>
            <button style={{ ...S.btnAlt, background: '#fff', color: '#333', border: '1.5px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={doGoogle}>
              <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/></svg>
              Continue with Google
            </button>
            <button style={{ ...S.btnAlt, background: '#4d9fff18', color: '#4d9fff', border: '1.5px solid #4d9fff' }} onClick={() => { setAuthMethod('phone'); setAuthErr('') }}>
              📱 Use Phone (OTP)
            </button>
          </>
        )}

        <div style={S.switchRow}>
          {authTab === 'login'
            ? <><span style={{ color: '#888' }}>No account? </span><button style={S.switchBtn} onClick={() => setAuthTab('signup')}>Sign up free</button></>
            : <><span style={{ color: '#888' }}>Have account? </span><button style={S.switchBtn} onClick={() => setAuthTab('login')}>Log in</button></>
          }
        </div>
      </div>
    </div>
  )

  // ── TOPBAR ──
  const TopBar = () => (
    <div style={S.topbar}>
      <div style={S.brand}>JAMB <span style={{ color: '#ff5a36' }}>CBT</span> Pro</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={S.avatar}>{(displayName[0] || 'S').toUpperCase()}</div>
        <span style={{ fontSize: 13, fontWeight: 600, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
        <button style={S.signoutBtn} onClick={signOut}>Sign Out</button>
      </div>
    </div>
  )

  // ── HOME ──
  if (view === 'home') return (
    <div style={{ background: '#0e0e12', minHeight: '100vh', color: '#f0eee8', fontFamily: 'system-ui,sans-serif' }}>
      <TopBar />
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ background: '#3dcc7e14', border: '1.5px solid #3dcc7e', borderRadius: 12, padding: '0.9rem 1.1rem', marginBottom: '1.5rem', fontSize: 15 }}>
          👋 Welcome back, <strong style={{ color: '#3dcc7e' }}>{displayName}</strong>!
        </div>
        <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 'clamp(2rem,7vw,3.5rem)', lineHeight: 1.1, marginBottom: 8 }}>
          Engineering <span style={{ color: '#ff5a36' }}>Practice Exam</span>
        </h1>
        <p style={{ color: '#8884a0', marginBottom: '2rem', lineHeight: 1.7 }}>Full CBT simulation · AI extraction · Calculator · Solutions</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: '1.5rem' }}>
          {[['60', 'English', '#ff5a36'], ['20', 'Physics', '#4d9fff'], ['20', 'Chemistry', '#3dcc7e'], ['20', 'Maths', '#ffb340']].map(([n, l, c]) => (
            <div key={l} style={{ background: '#16161d', border: '1.5px solid #2a2a38', borderRadius: 12, padding: '0.9rem 0.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: c }}>{n}</div>
              <div style={{ fontSize: 11, color: '#8884a0', marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: '2rem' }}>
          <button style={S.btnStart} onClick={() => { setView('exam'); setCur(0); setAnswers({}); setFlagged(new Set()); setTLeft(7200); setSubmitted(false) }}>
            Start Exam →
          </button>
          <button style={S.btnOutline} onClick={() => document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' })}>
            📤 Upload Past Questions
          </button>
        </div>

        {/* UPLOAD SECTION */}
        <div id="upload" style={{ background: '#16161d', border: '1.5px solid #2a2a38', borderRadius: 14, padding: '1.4rem' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>📸 AI Past Question Extractor</div>
          <p style={{ fontSize: 13, color: '#8884a0', marginBottom: '1rem', lineHeight: 1.6 }}>
            Upload a photo of any JAMB past question paper. AI reads it and adds the questions automatically.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#8884a0' }}>Subject:</span>
            <select id="defsubj" style={{ background: '#1e1e28', border: '1.5px solid #2a2a38', borderRadius: 8, color: '#f0eee8', padding: '6px 10px', fontSize: 13 }}>
              {['English', 'Physics', 'Chemistry', 'Mathematics'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ border: '2px dashed #3a3a50', borderRadius: 10, padding: '1.6rem', textAlign: 'center', cursor: 'pointer' }}
            onClick={() => fileRef.current?.click()}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>📄</div>
            <div style={{ fontSize: 13, color: '#8884a0' }}><strong style={{ color: '#f0eee8' }}>Tap to choose</strong> a photo · JPG/PNG/WEBP</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />

          {pqs.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#1e1e28', border: '1.5px solid #2a2a38', borderRadius: 10, padding: '8px 12px', marginTop: 8 }}>
              <img src={p.url} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} alt="" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: '#8884a0', marginTop: 2 }}>
                  {p.status === 'loading' ? '⏳ Extracting…' : p.status === 'done' ? `✓ ${p.extracted.length} questions added` : p.status === 'none' ? '⚠ No questions found' : `✗ ${p.err}`}
                </div>
              </div>
            </div>
          ))}
          {qs.length > QUESTIONS.length && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: '#3dcc7e14', border: '1.5px solid #3dcc7e', borderRadius: 8, fontSize: 13, color: '#3dcc7e' }}>
              ✓ {qs.length - QUESTIONS.length} extra questions added from your uploads
            </div>
          )}
        </div>
      </div>
      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  )

  // ── EXAM ──
  if (view === 'exam') return (
    <div style={{ background: '#0e0e12', minHeight: '100vh', color: '#f0eee8', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: '#16161d', borderBottom: '1.5px solid #2a2a38', padding: '10px 16px', position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700 }}>JAMB <span style={{ color: '#ff5a36' }}>CBT</span></div>
        <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, padding: '4px 12px', background: '#1e1e28', border: `1.5px solid ${isWarn ? '#ff5a36' : '#2a2a38'}`, borderRadius: 8, color: isWarn ? '#ff5a36' : '#f0eee8' }}>{fmt(tLeft)}</div>
        <div style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, color: '#8884a0' }}>{answered}/{qs.length} answered</div>
        <button style={{ background: '#1e1e28', border: '1.5px solid #2a2a38', borderRadius: 8, color: '#f0eee8', padding: '6px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }} onClick={() => setShowCalc(c => !c)}>🧮</button>
        <button style={{ background: '#ff5a36', border: 'none', borderRadius: 8, color: '#fff', padding: '6px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }} onClick={() => { if (confirm(`Submit?\nAnswered: ${answered}/${qs.length}`)) doSubmit() }}>Submit</button>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '1.2rem 1rem' }}>
        <div style={{ background: '#16161d', border: '1.5px solid #2a2a38', borderRadius: 14, padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, border: `1.5px solid ${SC[q.subject]}`, color: SC[q.subject], background: SC[q.subject] + '18' }}>{q.subject}</span>
              <span style={{ fontSize: 12, color: '#8884a0', fontFamily: 'monospace' }}>Q{cur + 1}/{qs.length}</span>
            </div>
            <button style={{ padding: '5px 14px', borderRadius: 8, border: `1.5px solid ${flagged.has(cur) ? '#ffb340' : '#2a2a38'}`, background: flagged.has(cur) ? '#ffb34018' : 'transparent', color: flagged.has(cur) ? '#ffb340' : '#8884a0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              onClick={() => { const f = new Set(flagged); f.has(cur) ? f.delete(cur) : f.add(cur); setFlagged(f) }}>
              {flagged.has(cur) ? '🚩 Flagged' : '🏳 Flag'}
            </button>
          </div>

          <div style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.65, marginBottom: '1.5rem' }}>{q.q}</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(q.opts || []).map((o, i) => (
              <button key={i} style={{ width: '100%', padding: '14px 16px', borderRadius: 10, border: `2px solid ${answers[cur] === i ? '#4d9fff' : '#2a2a38'}`, background: answers[cur] === i ? '#4d9fff14' : '#1e1e28', color: '#f0eee8', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
                onClick={() => setAnswers({ ...answers, [cur]: i })}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, background: answers[cur] === i ? '#4d9fff' : '#3a3a50', color: answers[cur] === i ? '#fff' : '#8884a0' }}>{String.fromCharCode(65 + i)}</span>
                {o}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1.5px solid #2a2a38' }}>
            <button style={{ ...S.navBtn, opacity: cur === 0 ? 0.3 : 1 }} disabled={cur === 0} onClick={() => setCur(p => p - 1)}>← Prev</button>
            <button style={{ ...S.navBtn, background: '#4d9fff', border: 'none', color: '#fff', opacity: cur === qs.length - 1 ? 0.3 : 1 }} disabled={cur === qs.length - 1} onClick={() => setCur(p => p + 1)}>Next →</button>
          </div>
        </div>

        {/* Question grid */}
        <div style={{ background: '#16161d', border: '1.5px solid #2a2a38', borderRadius: 12, padding: '1rem', marginTop: '1rem' }}>
          <div style={{ fontSize: 11, color: '#8884a0', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Navigator</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 5 }}>
            {qs.map((_, i) => {
              let bg = '#3a3a50', color = '#8884a0'
              if (i === cur) { bg = '#f0eee8'; color = '#0e0e12' }
              else if (flagged.has(i)) { bg = '#ffb340'; color = '#fff' }
              else if (answers[i] !== undefined) { bg = '#3dcc7e'; color = '#fff' }
              return <button key={i} style={{ aspectRatio: '1', borderRadius: 6, border: 'none', background: bg, color, fontSize: 10, fontWeight: 700, cursor: 'pointer' }} onClick={() => setCur(i)}>{i + 1}</button>
            })}
          </div>
        </div>
      </div>

      {showCalc && (
        <div style={S.calcWrap}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: '#8884a0', fontFamily: 'monospace', textTransform: 'uppercase' }}>Calculator</span>
            <button style={{ background: 'none', border: 'none', color: '#8884a0', cursor: 'pointer', fontSize: 16 }} onClick={() => setShowCalc(false)}>✕</button>
          </div>
          <div style={{ background: '#1e1e28', border: '1.5px solid #2a2a38', borderRadius: 8, padding: '8px 12px', textAlign: 'right', marginBottom: 8, minHeight: 52 }}>
            <div style={{ fontSize: 11, color: '#8884a0', fontFamily: 'monospace' }}>{calcExpr}</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace' }}>{calcVal}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 }}>
            {[['C','⌫','%','÷'],['7','8','9','×'],['4','5','6','-'],['1','2','3','+'],['±','0','.','=']].flat().map((b, i) => (
              <button key={i} style={{ padding: '10px 4px', borderRadius: 7, border: 'none', fontFamily: 'monospace', fontSize: 14, fontWeight: 700, cursor: 'pointer', background: b === '=' ? '#ff5a36' : ['+','-','×','÷','%'].includes(b) ? '#3a3a50' : ['C','⌫','±'].includes(b) ? '#2a2a38' : '#1e1e28', color: b === '=' ? '#fff' : ['+','-','×','÷','%'].includes(b) ? '#ffb340' : '#f0eee8' }}
                onClick={() => calcPress(b)}>{b}</button>
            ))}
          </div>
        </div>
      )}
      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  )

  // ── RESULTS ──
  if (view === 'results' && results) {
    const gr = results.score >= 320 ? { g: 'A', c: '#3dcc7e' } : results.score >= 260 ? { g: 'B', c: '#4d9fff' } : results.score >= 200 ? { g: 'C', c: '#ffb340' } : { g: 'D', c: '#ff5a36' }
    return (
      <div style={{ background: '#0e0e12', minHeight: '100vh', color: '#f0eee8', fontFamily: 'system-ui,sans-serif' }}>
        <TopBar />
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1rem' }}>
          <div style={{ background: '#16161d', border: '1.5px solid #2a2a38', borderRadius: 16, padding: '2rem', textAlign: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: 13, color: '#8884a0', marginBottom: 4 }}>Your Score</div>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: 72, fontWeight: 700, color: gr.c, lineHeight: 1 }}>{results.score}<span style={{ fontSize: 28, color: '#8884a0' }}>/400</span></div>
            <div style={{ display: 'inline-block', padding: '6px 18px', borderRadius: 999, border: `1.5px solid ${gr.c}`, color: gr.c, fontSize: 14, fontWeight: 700, margin: '12px 0 20px' }}>Grade {gr.g}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[[results.correct + '/' + results.total, 'Correct', '#3dcc7e'], [results.acc + '%', 'Accuracy', '#4d9fff'], [results.time, 'Time', '#ffb340']].map(([v, l, c]) => (
                <div key={l} style={{ background: '#1e1e28', borderRadius: 10, padding: '12px 8px' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: c, fontFamily: 'monospace' }}>{v}</div>
                  <div style={{ fontSize: 11, color: '#8884a0', marginTop: 3 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: '#16161d', border: '1.5px solid #2a2a38', borderRadius: 14, padding: '1.4rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: 12, color: '#8884a0', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Subject Breakdown</div>
            {Object.entries(results.subs).map(([s, d]) => {
              const pct = Math.round(d.correct / d.total * 100)
              return <div key={s} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                  <span style={{ color: SC[s], fontWeight: 700 }}>{s}</span>
                  <span style={{ color: '#8884a0', fontFamily: 'monospace', fontSize: 12 }}>{d.correct}/{d.total} ({pct}%)</span>
                </div>
                <div style={{ height: 7, background: '#1e1e28', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: pct + '%', background: SC[s], borderRadius: 999, transition: 'width 0.8s ease' }} />
                </div>
              </div>
            })}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button style={{ ...S.btnStart, fontSize: 14 }} onClick={() => { setView('review'); setCur(0) }}>📖 Review Solutions</button>
            <button style={S.btnOutline} onClick={() => { setAnswers({}); setFlagged(new Set()); setTLeft(7200); setSubmitted(false); setCur(0); setView('exam') }}>🔁 Retake</button>
            <button style={S.btnOutline} onClick={() => setView('home')}>🏠 Home</button>
          </div>
        </div>
      </div>
    )
  }

  // ── REVIEW ──
  if (view === 'review') {
    const rq = qs[cur]; const rua = answers[cur]; const rok = rua === rq?.ans
    return (
      <div style={{ background: '#0e0e12', minHeight: '100vh', color: '#f0eee8', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ background: '#4d9fff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ color: '#fff', fontWeight: 700 }}>📖 Solutions — {results?.correct}/{qs.length} correct</div>
          <button style={{ background: 'rgba(255,255,255,.2)', border: '1.5px solid rgba(255,255,255,.4)', color: '#fff', borderRadius: 8, padding: '5px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }} onClick={() => setView('results')}>← Results</button>
        </div>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '1.2rem 1rem' }}>
          <div style={{ background: '#16161d', border: '1.5px solid #2a2a38', borderRadius: 14, padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <span style={{ padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, border: `1.5px solid ${SC[rq.subject]}`, color: SC[rq.subject], background: SC[rq.subject] + '18' }}>{rq.subject} — Q{cur + 1}</span>
              <span style={{ padding: '5px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: rok ? '#3dcc7e18' : rua !== undefined ? '#ff5a3618' : '#1e1e28', color: rok ? '#3dcc7e' : rua !== undefined ? '#ff5a36' : '#8884a0' }}>
                {rok ? '✓ Correct' : rua !== undefined ? '✗ Wrong' : '— Skipped'}
              </span>
            </div>
            <div style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.65, marginBottom: '1.5rem' }}>{rq.q}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.2rem' }}>
              {(rq.opts || []).map((o, i) => {
                const isC = rq.ans === i; const isU = rua === i
                return <div key={i} style={{ padding: '12px 16px', borderRadius: 10, border: `2px solid ${isC ? '#3dcc7e' : isU && !rok ? '#ff5a36' : '#2a2a38'}`, background: isC ? '#3dcc7e14' : isU && !rok ? '#ff5a3614' : '#1e1e28', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, background: isC ? '#3dcc7e' : isU && !rok ? '#ff5a36' : '#3a3a50', color: (isC || (isU && !rok)) ? '#fff' : '#8884a0' }}>{String.fromCharCode(65 + i)}</span>
                  <span style={{ flex: 1, fontSize: 14 }}>{o}</span>
                  {isC && <span style={{ fontSize: 12, color: '#3dcc7e', fontWeight: 700, flexShrink: 0 }}>✓ Correct</span>}
                  {isU && !rok && <span style={{ fontSize: 12, color: '#ff5a36', fontWeight: 700, flexShrink: 0 }}>✗ Yours</span>}
                </div>
              })}
            </div>
            {rq.exp && <div style={{ background: '#4d9fff14', border: '1.5px solid #4d9fff', borderRadius: 10, padding: '1rem 1.2rem' }}>
              <div style={{ fontSize: 11, color: '#4d9fff', fontWeight: 700, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>📚 Explanation</div>
              <div style={{ fontSize: 14, lineHeight: 1.65 }}>{rq.exp}</div>
            </div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1.5px solid #2a2a38' }}>
              <button style={{ ...S.navBtn, opacity: cur === 0 ? 0.3 : 1 }} disabled={cur === 0} onClick={() => setCur(p => p - 1)}>← Prev</button>
              <button style={{ ...S.navBtn, background: '#4d9fff', border: 'none', color: '#fff', opacity: cur === qs.length - 1 ? 0.3 : 1 }} disabled={cur === qs.length - 1} onClick={() => setCur(p => p + 1)}>Next →</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

// Styles
const S = {
  center: { minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0e0e12' },
  spinner: { width: 36, height: 36, border: '3px solid #2a2a38', borderTop: '3px solid #ff5a36', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  authWrap: { minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0e0e12', padding: '1.5rem', fontFamily: 'system-ui,sans-serif' },
  authCard: { background: '#16161d', border: '1.5px solid #2a2a38', borderRadius: 18, padding: '2rem 1.8rem', width: '100%', maxWidth: 400, color: '#f0eee8' },
  logo: { fontFamily: 'Georgia,serif', fontSize: 26, textAlign: 'center', marginBottom: 4 },
  authSub: { textAlign: 'center', fontSize: 13, color: '#8884a0', marginBottom: '1.5rem' },
  tabs: { display: 'flex', background: '#1e1e28', borderRadius: 10, padding: 3, marginBottom: '1.2rem', gap: 3 },
  tab: { flex: 1, padding: '8px', border: 'none', borderRadius: 8, background: 'transparent', color: '#8884a0', fontFamily: 'system-ui,sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  tabOn: { background: '#2a2a38', color: '#f0eee8' },
  err: { background: '#ff5a3618', border: '1.5px solid #ff5a36', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#ff5a36', marginBottom: 14 },
  ok: { background: '#3dcc7e14', border: '1.5px solid #3dcc7e', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#3dcc7e', marginBottom: 14 },
  label: { fontSize: 12, fontWeight: 700, color: '#8884a0', marginBottom: 6, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.06em' },
  input: { width: '100%', background: '#1e1e28', border: '1.5px solid #2a2a38', borderRadius: 9, color: '#f0eee8', padding: '11px 14px', fontFamily: 'system-ui,sans-serif', fontSize: 15, outline: 'none', marginBottom: 12, boxSizing: 'border-box' },
  cc: { width: 90, background: '#1e1e28', border: '1.5px solid #2a2a38', borderRadius: 9, color: '#f0eee8', padding: '11px 8px', fontSize: 14, outline: 'none' },
  otpRow: { display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8, marginBottom: 14 },
  otpBox: { aspectRatio: '1', background: '#1e1e28', border: '2px solid #2a2a38', borderRadius: 9, color: '#f0eee8', fontFamily: 'monospace', fontSize: 20, fontWeight: 700, textAlign: 'center', outline: 'none' },
  btnMain: { width: '100%', padding: '13px', border: 'none', borderRadius: 10, background: '#ff5a36', color: '#fff', fontFamily: 'system-ui,sans-serif', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 10 },
  btnAlt: { width: '100%', padding: '11px', borderRadius: 10, background: '#1e1e28', color: '#f0eee8', border: '1.5px solid #2a2a38', fontFamily: 'system-ui,sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 10 },
  switchRow: { textAlign: 'center', fontSize: 13, marginTop: '1rem' },
  switchBtn: { background: 'none', border: 'none', color: '#4d9fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' },
  topbar: { background: '#16161d', borderBottom: '1.5px solid #2a2a38', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 200 },
  brand: { fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 16 },
  avatar: { width: 30, height: 30, borderRadius: '50%', background: '#ff5a36', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 },
  signoutBtn: { background: '#1e1e28', border: '1.5px solid #2a2a38', borderRadius: 8, color: '#8884a0', fontSize: 11, fontWeight: 700, padding: '4px 10px', cursor: 'pointer' },
  btnStart: { background: '#ff5a36', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px #ff5a3640' },
  btnOutline: { background: 'transparent', color: '#f0eee8', border: '1.5px solid #2a2a38', borderRadius: 10, padding: '12px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  navBtn: { padding: '10px 22px', borderRadius: 9, border: '1.5px solid #2a2a38', background: '#1e1e28', color: '#f0eee8', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  calcWrap: { position: 'fixed', bottom: 20, right: 16, background: '#16161d', border: '1.5px solid #2a2a38', borderRadius: 14, padding: '1rem', width: 220, boxShadow: '0 8px 32px rgba(0,0,0,.7)', zIndex: 500 },
  toast: { position: 'fixed', top: 70, right: 16, background: '#1e1e28', border: '1.5px solid #2a2a38', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600, zIndex: 999, boxShadow: '0 4px 16px rgba(0,0,0,.5)', maxWidth: 260 },
}
