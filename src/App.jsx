import React, { useState, useEffect, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { 
  Heart, Pill, Activity, User, Plus, Phone, AlertCircle, 
  Home, MessageCircle, FileText, Shield, Stethoscope, 
  Send, QrCode, MapPin, Loader2, Scale, Droplet,
  Calendar as CalendarIcon, Clock, Users, Trash2, ChevronLeft, ChevronRight,
  Share2, Check, Edit2, X, AlertTriangle, Download, Type, Navigation, LogOut, Lock, Mail, Printer, Lightbulb
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, signInWithCustomToken, signInAnonymously
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, 
  serverTimestamp, setDoc, deleteDoc, query, orderBy, getDoc, where, getDocs
} from 'firebase/firestore';

// --- 1. การตั้งค่า Firebase (ใช้ Key ของคุณ) ---
const firebaseConfig = {
  apiKey: "AIzaSyBILcG2lnb_dhsENlPtYboFrGj_gP3D3d8",
  authDomain: "thaihealth-fcd28.firebaseapp.com",
  projectId: "thaihealth-fcd28",
  storageBucket: "thaihealth-fcd28.firebasestorage.app",
  messagingSenderId: "250288902410",
  appId: "1:250288902410:web:6747e94b114b6425232af3",
  measurementId: "G-FB72B6NB2Q"
};

// เริ่มต้นระบบ
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// *** สำคัญ: ชื่อนี้ต้องตรงกับใน Database ของคุณ ***
const APP_COLLECTION = "thai-health-production-v1"; 

// --- Helpers ---
const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const formatDateThai = (dateStr) => {
    if(!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
};
const generateSmartId = () => Math.floor(100000 + Math.random() * 900000).toString();
const calculateAverage = (data, key) => {
    if (!data || data.length === 0) return '-';
    const sum = data.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);
    return Math.round(sum / data.length);
};

// --- Static Data ---
const HEALTH_TIPS = [
    "ดื่มน้ำวันละ 8 แก้ว ช่วยให้เลือดไหลเวียนดีนะ", "ระวังพื้นห้องน้ำลื่น ควรมีราวจับช่วยพยุง",
    "กินปลาดีกว่ากินเนื้อแดง ย่อยง่าย", "แกว่งแขนวันละ 20 นาที ช่วยลดพุง",
    "ลดเค็ม ลดโรค ปรุงรสน้อยลงหน่อยนะ", "นอนหลับให้เพียงพอ ตื่นมาจะสดชื่น"
];

// --- Components ---

const StatCard = ({ title, value, unit, icon: Icon, color, onClick, statusType, rawValue, fontSize }) => (
  <div onClick={onClick} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex-1 min-w-[100px] cursor-pointer hover:bg-gray-50 transition-all active:scale-95 relative overflow-hidden group">
    <div className="flex items-center gap-2 mb-2">
      <div className={`p-2 rounded-lg ${color} shadow-sm text-white`}><Icon size={fontSize === 'large' ? 24 : 18} /></div>
      {statusType && rawValue && (<div className={`absolute top-4 right-4 w-3 h-3 rounded-full shadow-sm ${(statusType === 'sys' && rawValue > 140) || (statusType === 'sugar' && rawValue > 125) ? 'bg-red-500 animate-pulse' : (statusType === 'sys' && rawValue > 120) ? 'bg-yellow-400' : 'bg-green-500'}`}></div>)}
    </div>
    <div className="flex flex-col"><span className={`text-gray-500 mb-1 font-medium ${fontSize === 'large' ? 'text-sm' : 'text-xs'}`}>{title}</span><span className={`font-bold text-gray-800 ${fontSize === 'large' ? 'text-2xl' : 'text-xl'}`}>{value || '-'}</span><span className="text-gray-400 text-[10px]">{unit}</span></div>
  </div>
);

const MedicineItem = ({ med, isTaken, onToggle, onDelete, onEdit, fontSize }) => (
  <div className={`flex items-center justify-between p-4 rounded-2xl mb-3 border transition-all ${isTaken ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100 hover:border-blue-200'}`}>
    <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={onToggle}>
      <div className={`p-2.5 rounded-full ${isTaken ? 'bg-emerald-200 text-emerald-700' : 'bg-blue-50 text-blue-500'}`}><Pill size={fontSize === 'large' ? 24 : 20} /></div>
      <div><h3 className={`font-bold ${isTaken ? 'text-emerald-800' : 'text-gray-800'} ${fontSize === 'large' ? 'text-lg' : 'text-base'}`}>{med.name}</h3><p className={`text-gray-500 ${fontSize === 'large' ? 'text-sm' : 'text-xs'}`}>{med.dose || '1 หน่วย'} • {med.time}</p></div>
    </div>
    <div className="flex items-center gap-2">
        <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isTaken ? 'bg-emerald-500 border-emerald-500 scale-110' : 'border-gray-300 bg-white'}`}>{isTaken && <span className="text-white font-bold text-sm">✓</span>}</button>
        {onEdit && <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="text-gray-400 hover:text-blue-500 p-1.5"><Edit2 size={16}/></button>}
        {onDelete && <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-gray-400 hover:text-red-500 p-1.5"><Trash2 size={16}/></button>}
    </div>
  </div>
);

// --- Auth Screen ---
const AuthScreen = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAuth = async (e) => {
        e.preventDefault(); setLoading(true); setError('');
        try {
            if (isRegister) await createUserWithEmailAndPassword(auth, email, password);
            else await signInWithEmailAndPassword(auth, email, password);
        } catch (err) { setError("รหัสผ่านไม่ถูกต้อง หรืออีเมลมีปัญหา: " + err.message); } 
        finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-white w-full max-w-sm p-8 rounded-3xl shadow-xl">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm"><Heart size={40} fill="currentColor" /></div>
                    <h1 className="text-2xl font-bold text-gray-800">ThaiHealth</h1><p className="text-gray-500 text-sm">ดูแลสุขภาพครอบครัว</p>
                </div>
                <form onSubmit={handleAuth} className="space-y-4">
                    <div><label className="text-xs font-bold text-gray-500 ml-1">อีเมล</label><div className="relative"><Mail className="absolute left-3 top-3 text-gray-400" size={20}/><input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-10 p-3 bg-gray-50 rounded-xl border focus:border-blue-500 outline-none" placeholder="email@example.com" /></div></div>
                    <div><label className="text-xs font-bold text-gray-500 ml-1">รหัสผ่าน</label><div className="relative"><Lock className="absolute left-3 top-3 text-gray-400" size={20}/><input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 p-3 bg-gray-50 rounded-xl border focus:border-blue-500 outline-none" placeholder="******" /></div></div>
                    {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                    <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all flex justify-center items-center">{loading ? <Loader2 className="animate-spin"/> : (isRegister ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ')}</button>
                </form>
                <div className="mt-6 text-center"><p className="text-xs text-gray-400">{isRegister ? 'มีบัญชีแล้ว?' : 'ยังไม่มีบัญชี?'} <button onClick={() => setIsRegister(!isRegister)} className="text-blue-600 font-bold ml-1 hover:underline">{isRegister ? 'เข้าสู่ระบบ' : 'สมัครใหม่'}</button></p></div>
            </div>
        </div>
    );
};

// --- Role Selector ---
const RoleSelector = ({ onSelect }) => (
    <div className="h-screen bg-white flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="mb-8 text-center"><h1 className="text-2xl font-bold text-gray-800 mb-2">เลือกสถานะของคุณ</h1><p className="text-gray-500 text-sm">เพื่อให้แอพทำงานได้เหมาะสม</p></div>
        <div className="space-y-4 w-full max-w-xs">
            <button onClick={() => onSelect('patient')} className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-3xl shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center gap-4"><div className="bg-white/20 p-3 rounded-2xl"><User size={32}/></div><div className="text-left"><h3 className="font-bold text-xl">ผู้สูงอายุ / ผู้ป่วย</h3><p className="text-xs text-blue-100 opacity-90">จดบันทึกสุขภาพ</p></div></button>
            <button onClick={() => onSelect('caregiver')} className="w-full bg-white border-2 border-gray-100 text-gray-700 p-6 rounded-3xl active:scale-95 transition-all flex items-center gap-4 hover:border-gray-300"><div className="bg-gray-100 p-3 rounded-2xl"><Users size={32}/></div><div className="text-left"><h3 className="font-bold text-xl">ลูกหลาน / ผู้ดูแล</h3><p className="text-xs text-gray-400">ติดตามพ่อแม่</p></div></button>
        </div>
        <button onClick={() => signOut(auth)} className="mt-8 text-gray-400 text-sm underline">ออกจากระบบ</button>
    </div>
);

// --- PATIENT DASHBOARD ---
const PatientDashboard = ({ targetUid, currentUserRole, onBack }) => {
    const [activeTab, setActiveTab] = useState('home');
    const [healthLogs, setHealthLogs] = useState([]);
    const [labLogs, setLabLogs] = useState([]);
    const [meds, setMeds] = useState([]);
    const [medHistory, setMedHistory] = useState({});
    const [appointments, setAppointments] = useState([]);
    const [family, setFamily] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Settings
    const [fontSize, setFontSize] = useState('normal'); 
    const [gpsLocation, setGpsLocation] = useState(null);
    const [todayTip, setTodayTip] = useState(HEALTH_TIPS[0]);

    // UI & Forms
    const [showDoctorMode, setShowDoctorMode] = useState(false);
    const [showInputModal, setShowInputModal] = useState(false);
    const [inputType, setInputType] = useState('bp');
    const [formHealth, setFormHealth] = useState({ sys: '', dia: '', sugar: '', weight: '', hba1c: '', lipid: '', egfr: '' });
    
    // Charts Data
    const [bpData, setBpData] = useState([]);
    const [sugarData, setSugarData] = useState([]);
    const [weightData, setWeightData] = useState([]);
    const [statType, setStatType] = useState('bp');

    // Modals
    const [showMedModal, setShowMedModal] = useState(false); const [editMedId, setEditMedId] = useState(null); const [formMed, setFormMed] = useState({});
    const [showApptModal, setShowApptModal] = useState(false); const [editApptId, setEditApptId] = useState(null); const [formAppt, setFormAppt] = useState({});
    const [showFamilyModal, setShowFamilyModal] = useState(false); const [editFamilyId, setEditFamilyId] = useState(null); const [formFamily, setFormFamily] = useState({});
    const [showEditProfile, setShowEditProfile] = useState(false); const [formProfile, setFormProfile] = useState({});
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, collection: null, id: null, title: '' });

    useEffect(() => {
        if (!targetUid) return;
        setTodayTip(HEALTH_TIPS[Math.floor(Math.random() * HEALTH_TIPS.length)]);
        
        const unsubMeds = onSnapshot(collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'medications'), s => setMeds(s.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubHistory = onSnapshot(collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'daily_logs'), s => { const h = {}; s.docs.forEach(d => h[d.id] = d.data()); setMedHistory(h); });
        const unsubAppts = onSnapshot(query(collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'appointments'), orderBy('date')), s => setAppointments(s.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubFamily = onSnapshot(collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'family_members'), s => setFamily(s.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubProfile = onSnapshot(doc(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'profile', 'main'), async (s) => { 
            if(s.exists()) { 
                const data = s.data();
                setProfile(data); 
                setFormProfile(data); 
                
                // --- SELF-HEALING: ตรวจสอบและซ่อมแซม Smart ID ถ้าหาไม่เจอ ---
                if (currentUserRole === 'patient' && data.shortId) {
                    const publicIdsRef = collection(db, 'artifacts', APP_COLLECTION, 'public_smart_ids');
                    const qSmart = query(publicIdsRef, where("smartId", "==", data.shortId));
                    const snap = await getDocs(qSmart);
                    if(snap.empty) {
                        console.log("Fixing missing Public ID...");
                        await addDoc(publicIdsRef, { smartId: data.shortId, uid: targetUid, createdAt: serverTimestamp() });
                    }
                }
                // -----------------------------------------------------------
            }
        });
        const unsubHealth = onSnapshot(query(collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'health_logs'), orderBy('timestamp')), s => {
             const logs = s.docs.map(d => ({id: d.id, ...d.data()}));
             setHealthLogs(logs); setLabLogs(logs.filter(l => l.type === 'lab'));
             setBpData(logs.filter(l => l.type === 'bp').slice(-14).map(l => ({ day: l.dateStr, sys: l.sys, dia: l.dia })));
             setSugarData(logs.filter(l => l.type === 'sugar').slice(-14).map(l => ({ day: l.dateStr, sugar: l.sugar })));
             setWeightData(logs.filter(l => l.type === 'weight').slice(-14).map(l => ({ day: l.dateStr, weight: l.weight })));
             setLoading(false);
        });
        return () => { unsubMeds(); unsubHistory(); unsubAppts(); unsubFamily(); unsubProfile(); unsubHealth(); };
    }, [targetUid, currentUserRole]);

    // Handlers
    const handleAddHealth = async () => { 
        let data = { type: inputType, dateStr: getTodayStr(), timestamp: serverTimestamp() }; 
        if(inputType === 'bp') data = { ...data, sys: parseInt(formHealth.sys), dia: parseInt(formHealth.dia) }; 
        else if(inputType === 'sugar') data = { ...data, sugar: parseInt(formHealth.sugar) }; 
        else if(inputType === 'weight') data = { ...data, weight: parseFloat(formHealth.weight) };
        else if(inputType === 'lab') data = { ...data, hba1c: formHealth.hba1c, lipid: formHealth.lipid, egfr: formHealth.egfr };
        await addDoc(collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'health_logs'), data); 
        setShowInputModal(false); setFormHealth({ sys: '', dia: '', sugar: '', weight: '', hba1c: '', lipid: '', egfr: '' });
    };
    const toggleMedToday = async (medId) => { 
        const today = getTodayStr(); 
        const ref = doc(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'daily_logs', today); 
        const current = medHistory[today]?.takenMeds || []; 
        const newTaken = current.includes(medId) ? current.filter(id => id !== medId) : [...current, medId]; 
        await setDoc(ref, { takenMeds: newTaken, takenCount: newTaken.length }, { merge: true }); 
    };
    const requestDelete = (col, id, title) => setDeleteConfirm({ isOpen: true, collection: col, id: id, title: title });
    const confirmDeleteAction = async () => { await deleteDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', targetUid, deleteConfirm.collection, deleteConfirm.id)); setDeleteConfirm({ isOpen: false, collection: null, id: null, title: '' }); };
    
    // CRUD wrappers
    const handleSaveMed = async () => { const c = collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'medications'); if(editMedId) await updateDoc(doc(c, editMedId), formMed); else await addDoc(c, formMed); setShowMedModal(false); };
    const handleSaveAppt = async () => { const c = collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'appointments'); if(editApptId) await updateDoc(doc(c, editApptId), formAppt); else await addDoc(c, formAppt); setShowApptModal(false); };
    const handleSaveFamily = async () => { const c = collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'family_members'); if(editFamilyId) await updateDoc(doc(c, editFamilyId), formFamily); else await addDoc(c, formFamily); setShowFamilyModal(false); };
    const handleUpdateProfile = async () => { await updateDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'profile', 'main'), formProfile); setShowEditProfile(false); };
    
    const fetchLocation = () => { if (navigator.geolocation) { navigator.geolocation.getCurrentPosition((p) => setGpsLocation(`${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)}`)); } else setGpsLocation("อุปกรณ์ไม่รองรับ"); };
    const handleBackupData = () => { const data = { profile, medications: meds, appointments, logs: healthLogs, exportDate: new Date().toISOString() }; const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data)); const a = document.createElement('a'); a.href = dataStr; a.download = `backup_${getTodayStr()}.json`; a.click(); };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>;

    const latestBP = healthLogs.filter(x => x.type === 'bp').pop();
    const latestSugar = healthLogs.filter(x => x.type === 'sugar').pop();
    const latestWeight = healthLogs.filter(x => x.type === 'weight').pop();

    return (
        <div className="pb-24 animate-fade-in relative font-sans bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="bg-white p-5 pt-8 pb-4 sticky top-0 z-30 shadow-sm flex justify-between items-center rounded-b-3xl">
                <div className="flex items-center gap-3">
                    {currentUserRole === 'caregiver' && <button onClick={onBack} className="bg-gray-100 p-2 rounded-full"><ChevronLeft/></button>}
                    <div><h1 className={`font-bold text-gray-800 ${fontSize === 'large' ? 'text-xl' : 'text-lg'}`}>{profile?.name || '...'}</h1><p className="text-gray-500 text-xs">{currentUserRole === 'caregiver' ? 'โหมดผู้ดูแล' : 'ดูแลสุขภาพตัวเอง'}</p></div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowDoctorMode(true)} className="bg-indigo-50 text-indigo-600 p-2 rounded-full border border-indigo-100 shadow-sm"><Stethoscope size={20}/></button>
                    {currentUserRole === 'patient' && <div onClick={() => setActiveTab('profile')} className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 cursor-pointer"><User size={20}/></div>}
                </div>
            </div>

            {/* Content Switcher */}
            {activeTab === 'home' && (
                <div className="px-5 mt-4 space-y-6">
                    <div className="bg-indigo-600 text-white p-3 text-xs flex items-center justify-center gap-2 rounded-xl shadow-md"><Lightbulb size={16} className="text-yellow-300"/><span>{todayTip}</span></div>
                    <div className="grid grid-cols-3 gap-3">
                        <StatCard title="ความดัน" value={latestBP ? `${latestBP.sys}/${latestBP.dia}` : '-'} rawValue={latestBP?.sys} statusType="sys" unit="mmHg" icon={Heart} color="bg-gradient-to-br from-pink-400 to-pink-600" onClick={() => {}} fontSize={fontSize}/>
                        <StatCard title="น้ำตาล" value={latestSugar ? latestSugar.sugar : '-'} rawValue={latestSugar?.sugar} statusType="sugar" unit="mg/dL" icon={Droplet} color="bg-gradient-to-br from-emerald-400 to-emerald-600" onClick={() => {}} fontSize={fontSize}/>
                        <StatCard title="น้ำหนัก" value={latestWeight ? latestWeight.weight : '-'} unit="kg" icon={Scale} color="bg-gradient-to-br from-orange-400 to-orange-600" onClick={() => {}} fontSize={fontSize}/>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-3"><h2 className="font-bold text-gray-800 text-sm flex items-center gap-2"><Pill size={16} className="text-blue-500"/> ยาของฉัน</h2><button onClick={() => { setFormMed({name:'', time:'หลังอาหารเช้า', dose:''}); setEditMedId(null); setShowMedModal(true); }} className="text-blue-600 text-xs font-bold bg-blue-50 px-3 py-1 rounded-lg">+ เพิ่ม</button></div>
                        {meds.map(med => {
                            const isTaken = (medHistory[getTodayStr()]?.takenMeds || []).includes(med.id);
                            return <MedicineItem key={med.id} med={med} isTaken={isTaken} onToggle={() => toggleMedToday(med.id)} onDelete={() => requestDelete('medications', med.id, med.name)} onEdit={() => { setFormMed(med); setEditMedId(med.id); setShowMedModal(true); }} fontSize={fontSize} />;
                        })}
                    </div>
                </div>
            )}

            {activeTab === 'stats' && (
                <div className="p-5">
                    <div className="flex bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto"><button onClick={() => setStatType('bp')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${statType === 'bp' ? 'bg-white shadow text-pink-600' : 'text-gray-400'}`}>ความดัน</button><button onClick={() => setStatType('sugar')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${statType === 'sugar' ? 'bg-white shadow text-emerald-600' : 'text-gray-400'}`}>น้ำตาล</button><button onClick={() => setStatType('lab')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${statType === 'lab' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>ผลเลือด</button></div>
                    {statType === 'lab' ? (
                        <div className="bg-white p-4 rounded-2xl shadow-sm border">{labLogs.slice(-3).map((l, i) => <div key={i} className="mb-2 border-b pb-2 text-sm"><span className="text-gray-400 text-xs">{l.dateStr}</span><div className="flex justify-between mt-1"><span>HbA1c: <b>{l.hba1c}</b></span><span>Lipid: <b>{l.lipid}</b></span></div></div>)}</div>
                    ) : (
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 h-64"><ResponsiveContainer width="100%" height="100%">{statType === 'bp' ? <LineChart data={bpData}><CartesianGrid stroke="#f5f5f5"/><XAxis dataKey="day"/><Tooltip/><Line type="monotone" dataKey="sys" stroke="#EC4899" strokeWidth={3} dot={{r:3}}/></LineChart> : <LineChart data={sugarData}><CartesianGrid stroke="#f5f5f5"/><XAxis dataKey="day"/><Tooltip/><Line type="monotone" dataKey="sugar" stroke="#10B981" strokeWidth={3} dot={{r:3}}/></LineChart>}</ResponsiveContainer></div>
                    )}
                </div>
            )}

            {activeTab === 'care' && (
                <div className="p-5">
                    <div className="flex justify-between items-center mb-4"><h1 className="text-xl font-bold">ใบนัดหมอ</h1><button onClick={() => { setFormAppt({date:'',time:'',location:'',dept:''}); setEditApptId(null); setShowApptModal(true); }} className="bg-orange-50 text-orange-600 px-3 py-1 text-xs rounded-lg font-bold">+ เพิ่มนัด</button></div>
                    <div className="space-y-3">{appointments.map(a => (<div key={a.id} className="bg-white p-4 rounded-xl border-l-4 border-orange-500 shadow-sm flex justify-between"><div><div className="flex gap-2 text-xs text-orange-600 font-bold mb-1"><span>{formatDateThai(a.date)}</span><span>{a.time}</span></div><h3 className="font-bold text-sm">{a.location}</h3><p className="text-xs text-gray-500">{a.dept}</p></div><div className="flex items-center gap-2"><button onClick={() => { setFormAppt(a); setEditApptId(a.id); setShowApptModal(true); }} className="text-gray-400"><Edit2 size={16}/></button><button onClick={() => requestDelete('appointments', a.id, 'นัดหมาย')} className="text-gray-300"><Trash2 size={16}/></button></div></div>))}</div>
                </div>
            )}

            {activeTab === 'profile' && currentUserRole === 'patient' && (
                <div className="p-5">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 rounded-3xl shadow-lg mb-6 text-center">
                        <p className="text-blue-200 text-sm mb-2">Smart ID ของฉัน</p><h1 className="text-5xl font-bold tracking-widest mb-4">{profile?.shortId || '------'}</h1><p className="text-xs opacity-80">บอกรหัสนี้ให้ลูกหลานเพื่อเชื่อมต่อข้อมูล</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-4">
                        <h3 className="font-bold text-gray-800 mb-2">ข้อมูลส่วนตัว</h3>
                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl mb-2"><div><p className="text-xs text-gray-500">ชื่อ</p><p className="font-bold">{profile?.name}</p></div><button onClick={() => { setFormProfile(profile); setShowEditProfile(true); }}><Edit2 size={16} className="text-gray-400"/></button></div>
                        <div className="flex justify-between items-center bg-red-50 p-3 rounded-xl cursor-pointer active:scale-95 transition-all" onClick={fetchLocation}><div className="flex items-center gap-3"><div className="bg-red-100 p-2 rounded-full text-red-600"><Phone size={20}/></div><div><h3 className="font-bold text-red-800 text-sm">1669 ฉุกเฉิน</h3><p className="text-[10px] text-red-400">{gpsLocation ? `พิกัด: ${gpsLocation}` : 'แตะเพื่อดูพิกัด GPS'}</p></div></div></div>
                    </div>
                    <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm"><div className="flex items-center gap-2"><Type className="text-gray-500" size={20}/><span className="text-sm font-bold text-gray-700">ขนาดตัวอักษร</span></div><div className="flex gap-1 bg-gray-100 p-1 rounded-lg"><button onClick={() => setFontSize('normal')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${fontSize === 'normal' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>ปกติ</button><button onClick={() => setFontSize('large')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${fontSize === 'large' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>ใหญ่</button></div></div>
                    <div className="mb-4"><div className="flex justify-between items-center mb-2"><h3 className="font-bold text-gray-800 text-sm">ลูกหลาน ({family.length})</h3><button onClick={() => { setFormFamily({name:'',phone:'',relation:'ลูก'}); setEditFamilyId(null); setShowFamilyModal(true); }} className="text-indigo-600 text-xs font-bold">+ เพิ่ม</button></div>{family.map(f => <div key={f.id} className="flex justify-between p-3 bg-white rounded-xl mb-2"><span className="text-sm">{f.name} ({f.relation})</span><div className="flex gap-2"><Edit2 size={16} className="text-gray-300" onClick={() => { setFormFamily(f); setEditFamilyId(f.id); setShowFamilyModal(true); }}/><Trash2 size={16} className="text-gray-300" onClick={() => requestDelete('family_members', f.id, f.name)}/></div></div>)}</div>
                    <button onClick={handleBackupData} className="w-full bg-gray-100 text-gray-600 p-3 rounded-xl flex items-center justify-center gap-2 text-sm mb-4"><Download size={16}/> สำรองข้อมูล</button>
                    <button onClick={() => signOut(auth)} className="w-full text-center text-red-400 text-sm p-2 underline">ออกจากระบบ</button>
                </div>
            )}

            {/* Navigation */}
            <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-100 pb-6 pt-2 px-2 flex justify-between items-center z-40 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
                <button onClick={() => setActiveTab('home')} className={`flex-1 p-2 flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-blue-600' : 'text-gray-400'}`}><Home size={24}/><span className="text-[10px]">หน้าหลัก</span></button>
                <button onClick={() => setActiveTab('stats')} className={`flex-1 p-2 flex flex-col items-center gap-1 ${activeTab === 'stats' ? 'text-blue-600' : 'text-gray-400'}`}><Activity size={24}/><span className="text-[10px]">กราฟ</span></button>
                <div className="relative -top-8 mx-2"><button onClick={() => setShowInputModal(true)} className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-4 rounded-full shadow-xl active:scale-95 transition-transform border-4 border-slate-50"><Plus size={32} strokeWidth={3} /></button></div>
                <button onClick={() => setActiveTab('care')} className={`flex-1 p-2 flex flex-col items-center gap-1 ${activeTab === 'care' ? 'text-blue-600' : 'text-gray-400'}`}><CalendarIcon size={24}/><span className="text-[10px]">ตาราง</span></button>
                <button onClick={() => setActiveTab('profile')} className={`flex-1 p-2 flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-blue-600' : 'text-gray-400'}`}><User size={24}/><span className="text-[10px]">ฉัน</span></button>
            </div>

            {/* Doctor Mode Modal */}
            {showDoctorMode && (
                <div className="fixed inset-0 bg-white z-[70] overflow-y-auto animate-fade-in p-6">
                    <div className="flex justify-between items-center mb-6"><h1 className="text-xl font-bold">สรุปประวัติสุขภาพ</h1><button onClick={() => setShowDoctorMode(false)}><X/></button></div>
                    <div className="bg-gray-50 p-4 rounded-xl border mb-4">
                        <h2 className="font-bold text-gray-700">ผู้ป่วย: {profile?.name}</h2>
                        <div className="text-sm mt-2">
                            <p>อายุ: {profile?.age} | เลือด: {profile?.bloodType}</p>
                            <p>โรคประจำตัว: {profile?.diseases?.join(', ')}</p>
                            <p className="text-red-600">แพ้ยา: {profile?.allergies}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-pink-50 p-3 rounded-xl border border-pink-100 text-center"><p className="text-xs text-pink-500">ความดันเฉลี่ย</p><p className="font-bold text-lg">{calculateAverage(healthLogs.filter(l=>l.type==='bp'), 'sys')}/{calculateAverage(healthLogs.filter(l=>l.type==='bp'), 'dia')}</p></div>
                        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center"><p className="text-xs text-emerald-500">น้ำตาลเฉลี่ย</p><p className="font-bold text-lg">{calculateAverage(healthLogs.filter(l=>l.type==='sugar'), 'sugar')}</p></div>
                    </div>
                    <h3 className="font-bold mb-2">รายการยาปัจจุบัน</h3>
                    <ul className="list-disc pl-5 text-sm space-y-1 mb-6">{meds.map(m => <li key={m.id}>{m.name} ({m.dose}) - {m.time}</li>)}</ul>
                    <button onClick={() => window.print()} className="w-full bg-indigo-600 text-white p-3 rounded-xl mt-auto flex justify-center gap-2"><Printer/> พิมพ์รายงาน</button>
                </div>
            )}
            
            {/* Input Modal */}
            {showInputModal && (
                <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">บันทึกข้อมูล</h2>
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                            {['bp','sugar','weight','lab'].map(t => (
                                <button key={t} onClick={() => setInputType(t)} className={`px-3 py-2 rounded-lg text-xs font-bold border ${inputType === t ? 'bg-blue-50 border-blue-500 text-blue-600' : 'border-gray-200'}`}>{t.toUpperCase()}</button>
                            ))}
                        </div>
                        <div className="space-y-4 mb-6">
                            {inputType === 'bp' && <div className="flex gap-4"><input type="number" placeholder="บน (120)" className="w-full p-3 border rounded-xl text-center text-2xl" onChange={e => setFormHealth({...formHealth, sys: e.target.value})}/><input type="number" placeholder="ล่าง (80)" className="w-full p-3 border rounded-xl text-center text-2xl" onChange={e => setFormHealth({...formHealth, dia: e.target.value})}/></div>}
                            {inputType === 'sugar' && <input type="number" placeholder="น้ำตาล (mg/dL)" className="w-full p-3 border rounded-xl text-center text-2xl" onChange={e => setFormHealth({...formHealth, sugar: e.target.value})}/>}
                            {inputType === 'weight' && <input type="number" placeholder="น้ำหนัก (kg)" className="w-full p-3 border rounded-xl text-center text-2xl" onChange={e => setFormHealth({...formHealth, weight: e.target.value})}/>}
                            {inputType === 'lab' && <div className="space-y-2"><input type="number" placeholder="HbA1c" className="w-full p-3 border rounded-xl" onChange={e => setFormHealth({...formHealth, hba1c: e.target.value})}/><input type="number" placeholder="Cholesterol" className="w-full p-3 border rounded-xl" onChange={e => setFormHealth({...formHealth, lipid: e.target.value})}/></div>}
                        </div>
                        <div className="flex gap-3"><button onClick={() => setShowInputModal(false)} className="flex-1 py-3 rounded-xl bg-gray-100">ยกเลิก</button><button onClick={handleAddHealth} className="flex-1 py-3 rounded-xl bg-blue-600 text-white">บันทึก</button></div>
                    </div>
                </div>
            )}
            
            {/* Delete Confirmation */}
            {deleteConfirm.isOpen && <div className="absolute inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"><div className="bg-white w-full max-w-xs p-6 rounded-2xl text-center shadow-2xl"><h3 className="font-bold text-lg mb-2">ลบรายการนี้?</h3><p className="text-sm text-gray-500 mb-4">"{deleteConfirm.title}"</p><div className="flex gap-3"><button onClick={() => setDeleteConfirm({...deleteConfirm, isOpen: false})} className="flex-1 py-2 bg-gray-100 rounded-xl">ยกเลิก</button><button onClick={confirmDeleteAction} className="flex-1 py-2 bg-red-500 text-white rounded-xl">ลบ</button></div></div></div>}
            
            {/* Edit/Add Med Modal */}
            {showMedModal && <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4"><div className="bg-white p-6 rounded-3xl w-full max-w-sm"><h3 className="font-bold mb-4">{editMedId ? 'แก้ไขยา' : 'เพิ่มยา'}</h3><input className="w-full p-3 mb-3 bg-gray-50 rounded-xl" placeholder="ชื่อยา" value={formMed.name || ''} onChange={e => setFormMed({...formMed, name: e.target.value})}/><input className="w-full p-3 mb-3 bg-gray-50 rounded-xl" placeholder="ขนาด (เช่น 1 เม็ด)" value={formMed.dose || ''} onChange={e => setFormMed({...formMed, dose: e.target.value})}/><select className="w-full mb-4 p-3 bg-gray-50 rounded-xl" value={formMed.time} onChange={e => setFormMed({...formMed, time: e.target.value})}><option>หลังอาหารเช้า</option><option>หลังอาหารเย็น</option><option>ก่อนนอน</option></select><div className="flex gap-3"><button onClick={() => setShowMedModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl">ยกเลิก</button><button onClick={handleSaveMed} className="flex-1 py-3 bg-blue-600 text-white rounded-xl">บันทึก</button></div></div></div>}
            
            {/* Edit/Add Family Modal */}
            {showFamilyModal && <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4"><div className="bg-white p-6 rounded-3xl w-full max-w-sm"><h3 className="font-bold mb-4">{editFamilyId ? 'แก้ไขคน' : 'เพิ่มลูกหลาน'}</h3><input className="w-full p-3 mb-3 bg-gray-50 rounded-xl" placeholder="ชื่อ" value={formFamily.name || ''} onChange={e => setFormFamily({...formFamily, name: e.target.value})}/><input className="w-full p-3 mb-3 bg-gray-50 rounded-xl" placeholder="เบอร์โทร" value={formFamily.phone || ''} onChange={e => setFormFamily({...formFamily, phone: e.target.value})}/><select className="w-full mb-4 p-3 bg-gray-50 rounded-xl" value={formFamily.relation} onChange={e => setFormFamily({...formFamily, relation: e.target.value})}><option>ลูก</option><option>หลาน</option><option>ผู้ดูแล</option></select><div className="flex gap-3"><button onClick={() => setShowFamilyModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl">ยกเลิก</button><button onClick={handleSaveFamily} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl">บันทึก</button></div></div></div>}
            
            {/* Appt Modal */}
            {showApptModal && <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4"><div className="bg-white p-6 rounded-3xl w-full max-w-sm"><h3 className="font-bold mb-4">{editApptId ? 'แก้ไขนัด' : 'เพิ่มนัด'}</h3><input type="date" className="w-full p-3 mb-3 bg-gray-50 rounded-xl" value={formAppt.date || ''} onChange={e => setFormAppt({...formAppt, date: e.target.value})}/><input className="w-full p-3 mb-3 bg-gray-50 rounded-xl" placeholder="สถานที่" value={formAppt.location || ''} onChange={e => setFormAppt({...formAppt, location: e.target.value})}/><div className="flex gap-3"><button onClick={() => setShowApptModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl">ยกเลิก</button><button onClick={handleSaveAppt} className="flex-1 py-3 bg-orange-500 text-white rounded-xl">บันทึก</button></div></div></div>}
            
            {/* Edit Profile Modal */}
            {showEditProfile && <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4"><div className="bg-white p-6 rounded-3xl w-full max-w-sm max-h-[80vh] overflow-y-auto"><h3 className="font-bold mb-4">แก้ไขข้อมูลส่วนตัว</h3><div className="space-y-3"><input className="w-full p-3 bg-gray-50 rounded-xl" placeholder="ชื่อ" value={formProfile.name || ''} onChange={e => setFormProfile({...formProfile, name: e.target.value})}/><input type="number" className="w-full p-3 bg-gray-50 rounded-xl" placeholder="อายุ" value={formProfile.age || ''} onChange={e => setFormProfile({...formProfile, age: e.target.value})}/><input className="w-full p-3 bg-gray-50 rounded-xl" placeholder="โรคประจำตัว (คั่นด้วยคอมม่า)" value={Array.isArray(formProfile.diseases) ? formProfile.diseases.join(',') : formProfile.diseases || ''} onChange={e => setFormProfile({...formProfile, diseases: e.target.value.split(',')})}/><input className="w-full p-3 bg-gray-50 rounded-xl" placeholder="แพ้ยา" value={formProfile.allergies || ''} onChange={e => setFormProfile({...formProfile, allergies: e.target.value})}/></div><div className="flex gap-3 mt-4"><button onClick={() => setShowEditProfile(false)} className="flex-1 py-3 bg-gray-100 rounded-xl">ยกเลิก</button><button onClick={handleUpdateProfile} className="flex-1 py-3 bg-blue-600 text-white rounded-xl">บันทึก</button></div></div></div>}
        </div>
    );
};

// --- CAREGIVER HOME ---
const CaregiverHome = ({ user, onSelectPatient }) => {
    const [patients, setPatients] = useState([]);
    const [addId, setAddId] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'artifacts', APP_COLLECTION, 'users', user.uid, 'watching'), (snap) => {
            setPatients(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [user]);

    const handleAddPatient = async () => {
        if(addId.length !== 6) return;
        setErrorMsg('');
        
        // ค้นหาคนไข้จากรหัส Smart ID
        const publicIdsRef = collection(db, 'artifacts', APP_COLLECTION, 'public_smart_ids');
        const qSmart = query(publicIdsRef, where("smartId", "==", addId));
        const querySnapshot = await getDocs(qSmart);

        if (!querySnapshot.empty) {
            const targetDoc = querySnapshot.docs[0];
            const targetUid = targetDoc.data().uid;
            
            // ดึงชื่อคนไข้มาแสดง
            const profileSnap = await getDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'profile', 'main'));
            const patientName = profileSnap.exists() ? profileSnap.data().name : `คนไข้ (${addId})`;

            // เพิ่มลงในรายการดูแลของเรา
            await setDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', user.uid, 'watching', targetUid), {
                name: patientName,
                addedAt: serverTimestamp()
            });
            setShowAddModal(false); setAddId('');
        } else {
            setErrorMsg('ไม่พบรหัส Smart ID นี้ในระบบ กรุณาตรวจสอบอีกครั้ง');
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen p-5 animate-fade-in">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 mt-4">ดูแลครอบครัว</h1>
            <div className="grid gap-3">
                {patients.map(p => (
                    <div key={p.uid} onClick={() => onSelectPatient(p.uid)} className="bg-white p-4 rounded-2xl shadow-sm border flex justify-between items-center cursor-pointer active:scale-95 transition-all hover:border-blue-300">
                        <div className="flex items-center gap-4"><div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">{p.name.charAt(0)}</div><h3 className="font-bold text-gray-800">{p.name}</h3></div>
                        <ChevronRight className="text-gray-300"/>
                    </div>
                ))}
                <button onClick={() => setShowAddModal(true)} className="bg-white p-4 rounded-2xl border-2 border-dashed flex justify-center items-center gap-2 text-gray-400 hover:bg-gray-50"><Plus/> เพิ่มคนไข้ใหม่</button>
            </div>
            <button onClick={() => signOut(auth)} className="mt-8 w-full text-center text-red-400 underline">ออกจากระบบ</button>
            
            {showAddModal && (
                <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl">
                        <h3 className="font-bold text-center mb-2">ใส่รหัส Smart ID (6 หลัก)</h3>
                        <p className="text-xs text-center text-gray-500 mb-4">รหัสนี้อยู่ที่หน้า "ฉัน" ของเครื่องคนไข้</p>
                        <input value={addId} onChange={e => setAddId(e.target.value)} className="w-full text-center text-3xl font-bold p-4 bg-gray-50 rounded-xl mb-2 tracking-widest border focus:border-blue-500 outline-none" placeholder="000000" maxLength={6}/>
                        {errorMsg && <p className="text-red-500 text-xs text-center mb-4">{errorMsg}</p>}
                        <div className="flex gap-3"><button onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl">ยกเลิก</button><button onClick={handleAddPatient} className="flex-1 py-3 bg-blue-600 text-white rounded-xl">ค้นหา</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPatientUid, setSelectedPatientUid] = useState(null);

  useEffect(() => {
    const init = async () => { }; init();
    return onAuthStateChanged(auth, async (u) => { 
        setUser(u); 
        if(u) {
            const snap = await getDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', u.uid));
            if(snap.exists() && snap.data().role) setRole(snap.data().role);
        }
        setLoading(false); 
    });
  }, []);

  const handleRoleSelect = async (selectedRole) => {
      if(!user) return;
      const userData = { role: selectedRole, setupAt: serverTimestamp() };
      
      if(selectedRole === 'patient') {
          const shortId = generateSmartId();
          userData.shortId = shortId;
          await setDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', user.uid, 'profile', 'main'), { name: "ผู้สูงอายุ", shortId }, { merge: true });
          // Public Mapping for ID lookup
          await addDoc(collection(db, 'artifacts', APP_COLLECTION, 'public_smart_ids'), { smartId: shortId, uid: user.uid, createdAt: serverTimestamp() });
      }
      await setDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', user.uid), userData, { merge: true });
      setRole(selectedRole);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={40}/></div>;
  if (!user) return <AuthScreen />;
  if (!role) return <RoleSelector onSelect={handleRoleSelect} />;

  if (role === 'caregiver') {
      if (selectedPatientUid) return <PatientDashboard targetUid={selectedPatientUid} currentUserRole="caregiver" onBack={() => setSelectedPatientUid(null)} />;
      return <CaregiverHome user={user} onSelectPatient={setSelectedPatientUid} />;
  }

  return <PatientDashboard targetUid={user?.uid} currentUserRole="patient" />;
}
