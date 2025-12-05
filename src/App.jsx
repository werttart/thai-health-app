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

// --- 1. การตั้งค่า Firebase (ใช้ค่านี้แน่นอน 100%) ---
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

// *** สำคัญ: ล็อคชื่อห้องเก็บข้อมูลให้ตรงกับ Database ของคุณ ***
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

// --- Components (Premium Design) ---

const StatCard = ({ title, value, unit, icon: Icon, color, onClick, statusType, rawValue, fontSize }) => (
  <div onClick={onClick} className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 flex-1 min-w-[100px] cursor-pointer hover:shadow-md transition-all active:scale-95 relative overflow-hidden group">
    <div className="flex items-center gap-3 mb-3">
      <div className={`p-2.5 rounded-2xl ${color} shadow-sm text-white`}><Icon size={fontSize === 'large' ? 24 : 18} /></div>
      {statusType && rawValue && (<div className={`absolute top-5 right-5 w-3 h-3 rounded-full shadow-sm ${(statusType === 'sys' && rawValue > 140) || (statusType === 'sugar' && rawValue > 125) ? 'bg-red-500 animate-pulse' : (statusType === 'sys' && rawValue > 120) ? 'bg-yellow-400' : 'bg-green-500'}`}></div>)}
    </div>
    <div className="flex flex-col">
        <span className={`text-slate-400 font-medium mb-1 ${fontSize === 'large' ? 'text-sm' : 'text-[10px]'} uppercase tracking-wide`}>{title}</span>
        <div className="flex items-baseline gap-1">
            <span className={`font-bold text-slate-800 ${fontSize === 'large' ? 'text-2xl' : 'text-xl'}`}>{value || '-'}</span>
            <span className="text-slate-400 text-[10px]">{unit}</span>
        </div>
    </div>
  </div>
);

const MedicineItem = ({ med, isTaken, onToggle, onDelete, onEdit, fontSize }) => (
  <div className={`group flex items-center justify-between p-4 rounded-3xl mb-3 border transition-all duration-300 ${isTaken ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-slate-100 hover:border-blue-100 hover:shadow-sm'}`}>
    <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={onToggle}>
      <div className={`p-3 rounded-2xl transition-colors ${isTaken ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-500 group-hover:bg-blue-100'}`}><Pill size={fontSize === 'large' ? 26 : 22} /></div>
      <div>
          <h3 className={`font-bold transition-colors ${isTaken ? 'text-emerald-800' : 'text-slate-700'} ${fontSize === 'large' ? 'text-lg' : 'text-base'}`}>{med.name}</h3>
          <p className={`text-slate-400 ${fontSize === 'large' ? 'text-sm' : 'text-xs'}`}>{med.dose || '1 หน่วย'} • {med.time}</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
        <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${isTaken ? 'bg-emerald-500 border-emerald-500 scale-100 shadow-md shadow-emerald-200' : 'border-slate-200 bg-white hover:border-blue-300'}`}>{isTaken && <Check size={18} className="text-white font-bold"/>}</button>
        {(onEdit || onDelete) && (
            <div className="flex gap-1 pl-2 border-l border-slate-100">
                {onEdit && <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="text-slate-300 hover:text-blue-500 p-2 rounded-full hover:bg-blue-50"><Edit2 size={16}/></button>}
                {onDelete && <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-slate-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50"><Trash2 size={16}/></button>}
            </div>
        )}
    </div>
  </div>
);

// --- Auth Screen (Redesigned) ---
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
        } catch (err) { setError("รหัสผ่านผิด หรืออีเมลนี้มีปัญหา (ต้องมี @ และ .com)"); } 
        finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 animate-fade-in relative overflow-hidden">
            <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[50%] bg-blue-100 rounded-full blur-[100px] opacity-50 pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[40%] bg-indigo-100 rounded-full blur-[80px] opacity-50 pointer-events-none"></div>

            <div className="bg-white/80 backdrop-blur-xl w-full max-w-sm p-8 rounded-[40px] shadow-2xl border border-white/50 relative z-10">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-indigo-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200 transform rotate-[-5deg]">
                        <Heart size={40} fill="currentColor" className="transform rotate-[5deg]"/>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-1">ThaiHealth</h1>
                    <p className="text-slate-500 text-sm font-medium">ดูแลสุขภาพคนที่คุณรัก</p>
                </div>
                <form onSubmit={handleAuth} className="space-y-5">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 ml-3 uppercase tracking-wider">อีเมล</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-3.5 text-slate-400" size={20}/>
                            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-12 p-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all font-medium text-slate-700" placeholder="name@email.com" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 ml-3 uppercase tracking-wider">รหัสผ่าน</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-3.5 text-slate-400" size={20}/>
                            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-12 p-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all font-medium text-slate-700" placeholder="••••••••" />
                        </div>
                    </div>
                    {error && <div className="bg-red-50 text-red-500 text-xs p-3 rounded-xl flex items-center gap-2"><AlertTriangle size={14}/> {error}</div>}
                    <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex justify-center items-center">
                        {loading ? <Loader2 className="animate-spin"/> : (isRegister ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ')}
                    </button>
                </form>
                <div className="mt-8 text-center">
                    <p className="text-sm text-slate-400">
                        {isRegister ? 'มีบัญชีแล้ว?' : 'ยังไม่มีบัญชี?'} 
                        <button onClick={() => setIsRegister(!isRegister)} className="text-blue-600 font-bold ml-1 hover:underline">
                            {isRegister ? 'เข้าสู่ระบบ' : 'สมัครใหม่'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

// --- Role Selector (Redesigned & Fix) ---
const RoleSelector = ({ onSelect }) => (
    <div className="h-screen bg-slate-50 flex flex-col items-center justify-center p-6 animate-fade-in relative">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-white rounded-b-[50px] shadow-sm z-0"></div>
        <div className="relative z-10 w-full max-w-sm">
            <div className="mb-10 text-center">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce"><Users size={32}/></div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">คุณคือใคร?</h1>
                <p className="text-slate-500">เลือกสถานะเพื่อเริ่มใช้งานระบบ</p>
            </div>
            <div className="space-y-4">
                <button onClick={() => onSelect('patient')} className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-1 rounded-[32px] shadow-xl shadow-blue-200 active:scale-95 transition-transform group">
                    <div className="bg-white/10 backdrop-blur-sm p-6 rounded-[28px] flex items-center gap-5 border border-white/20">
                        <div className="bg-white p-4 rounded-full text-blue-600 shadow-md group-hover:scale-110 transition-transform"><User size={32}/></div>
                        <div className="text-left">
                            <h3 className="font-bold text-xl mb-1">ผู้สูงอายุ / ผู้ป่วย</h3>
                            <p className="text-xs text-blue-100 opacity-90">ต้องการจดบันทึกสุขภาพ</p>
                        </div>
                    </div>
                </button>
                <button onClick={() => onSelect('caregiver')} className="w-full bg-white text-slate-700 p-1 rounded-[32px] shadow-sm border border-slate-100 active:scale-95 transition-transform group hover:border-blue-200">
                    <div className="p-6 rounded-[28px] flex items-center gap-5">
                        <div className="bg-slate-50 p-4 rounded-full text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors"><Users size={32}/></div>
                        <div className="text-left">
                            <h3 className="font-bold text-xl mb-1 text-slate-800">ลูกหลาน / ผู้ดูแล</h3>
                            <p className="text-xs text-slate-400">ติดตามและดูแลครอบครัว</p>
                        </div>
                    </div>
                </button>
            </div>
            <button onClick={() => signOut(auth)} className="mt-12 w-full text-center text-slate-400 text-sm flex items-center justify-center gap-2 hover:text-red-500 transition-colors">
                <LogOut size={16}/> ออกจากระบบ (เปลี่ยนบัญชี)
            </button>
        </div>
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
    
    const [fontSize, setFontSize] = useState('normal'); 
    const [gpsLocation, setGpsLocation] = useState(null);
    const [todayTip, setTodayTip] = useState(HEALTH_TIPS[0]);

    const [showDoctorMode, setShowDoctorMode] = useState(false);
    const [showInputModal, setShowInputModal] = useState(false);
    const [inputType, setInputType] = useState('bp');
    const [formHealth, setFormHealth] = useState({ sys: '', dia: '', sugar: '', weight: '', hba1c: '', lipid: '', egfr: '' });
    
    const [bpData, setBpData] = useState([]);
    const [sugarData, setSugarData] = useState([]);
    const [weightData, setWeightData] = useState([]);
    const [statType, setStatType] = useState('bp');

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
                
                // Self-Healing for missing public ID
                if (currentUserRole === 'patient' && data.shortId) {
                    const publicIdsRef = collection(db, 'artifacts', APP_COLLECTION, 'public_smart_ids');
                    const qSmart = query(publicIdsRef, where("smartId", "==", data.shortId));
                    const snap = await getDocs(qSmart);
                    if(snap.empty) await addDoc(publicIdsRef, { smartId: data.shortId, uid: targetUid, createdAt: serverTimestamp() });
                }
            } else {
                // If profile is missing (white screen fix), create it!
                if(currentUserRole === 'patient') {
                    const sid = generateSmartId();
                    await setDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'profile', 'main'), { name: "ผู้ใช้งานใหม่", shortId: sid, created: serverTimestamp() });
                    await addDoc(collection(db, 'artifacts', APP_COLLECTION, 'public_smart_ids'), { smartId: sid, uid: targetUid, createdAt: serverTimestamp() });
                }
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
    
    const handleSaveMed = async () => { const c = collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'medications'); if(editMedId) await updateDoc(doc(c, editMedId), formMed); else await addDoc(c, formMed); setShowMedModal(false); };
    const handleSaveAppt = async () => { const c = collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'appointments'); if(editApptId) await updateDoc(doc(c, editApptId), formAppt); else await addDoc(c, formAppt); setShowApptModal(false); };
    const handleSaveFamily = async () => { const c = collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'family_members'); if(editFamilyId) await updateDoc(doc(c, editFamilyId), formFamily); else await addDoc(c, formFamily); setShowFamilyModal(false); };
    const handleUpdateProfile = async () => { await updateDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'profile', 'main'), formProfile); setShowEditProfile(false); };
    
    const fetchLocation = () => { if (navigator.geolocation) { navigator.geolocation.getCurrentPosition((p) => setGpsLocation(`${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)}`)); } else setGpsLocation("อุปกรณ์ไม่รองรับ"); };
    const handleBackupData = () => { const data = { profile, medications: meds, appointments, logs: healthLogs, exportDate: new Date().toISOString() }; const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data)); const a = document.createElement('a'); a.href = dataStr; a.download = `backup_${getTodayStr()}.json`; a.click(); };

    if (loading) return <div className="h-screen flex flex-col gap-4 items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={48}/><p className="text-slate-400 text-sm font-medium animate-pulse">กำลังโหลดข้อมูล...</p></div>;

    const latestBP = healthLogs.filter(x => x.type === 'bp').pop();
    const latestSugar = healthLogs.filter(x => x.type === 'sugar').pop();
    const latestWeight = healthLogs.filter(x => x.type === 'weight').pop();

    return (
        <div className="pb-24 animate-fade-in relative font-sans bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="bg-white p-5 pt-8 pb-4 sticky top-0 z-30 shadow-sm flex justify-between items-center rounded-b-[32px]">
                <div className="flex items-center gap-4">
                    {currentUserRole === 'caregiver' && <button onClick={onBack} className="bg-slate-100 p-3 rounded-2xl hover:bg-slate-200 transition-colors"><ChevronLeft className="text-slate-600"/></button>}
                    <div>
                        <h1 className={`font-bold text-slate-800 ${fontSize === 'large' ? 'text-2xl' : 'text-xl'}`}>{profile?.name || '...'}</h1>
                        <p className="text-slate-400 text-xs font-medium">{currentUserRole === 'caregiver' ? 'โหมดผู้ดูแล (View Mode)' : 'ดูแลสุขภาพตัวเอง'}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowDoctorMode(true)} className="bg-white text-indigo-600 p-3 rounded-2xl border border-slate-100 shadow-sm hover:bg-indigo-50 transition-colors"><Stethoscope size={22}/></button>
                    {currentUserRole === 'patient' && <div onClick={() => setActiveTab('profile')} className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 cursor-pointer active:scale-95 transition-transform"><User size={24}/></div>}
                </div>
            </div>

            {/* Content */}
            {activeTab === 'home' && (
                <div className="px-5 mt-4 space-y-6">
                    <div className="bg-indigo-600 text-white p-4 text-xs flex items-start justify-center gap-3 rounded-2xl shadow-lg shadow-indigo-200">
                        <div className="bg-white/20 p-1.5 rounded-lg"><Lightbulb size={16} className="text-yellow-300"/></div>
                        <span className="mt-0.5 leading-relaxed font-medium">{todayTip}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <StatCard title="ความดัน" value={latestBP ? `${latestBP.sys}/${latestBP.dia}` : '-'} rawValue={latestBP?.sys} statusType="sys" unit="mmHg" icon={Heart} color="bg-gradient-to-br from-pink-400 to-pink-600" onClick={() => {}} fontSize={fontSize}/>
                        <StatCard title="น้ำตาล" value={latestSugar ? latestSugar.sugar : '-'} rawValue={latestSugar?.sugar} statusType="sugar" unit="mg/dL" icon={Droplet} color="bg-gradient-to-br from-emerald-400 to-emerald-600" onClick={() => {}} fontSize={fontSize}/>
                        <StatCard title="น้ำหนัก" value={latestWeight ? latestWeight.weight : '-'} unit="kg" icon={Scale} color="bg-gradient-to-br from-orange-400 to-orange-600" onClick={() => {}} fontSize={fontSize}/>
                    </div>
                    <div>
                        <div className="flex justify-between items-end mb-4 px-1">
                            <h2 className={`font-bold text-slate-700 flex items-center gap-2 ${fontSize === 'large' ? 'text-xl' : 'text-lg'}`}><Pill size={20} className="text-blue-500"/> ยาของฉัน</h2>
                            <button onClick={() => { setFormMed({name:'', time:'หลังอาหารเช้า', dose:''}); setEditMedId(null); setShowMedModal(true); }} className="text-blue-600 text-xs font-bold bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors">+ เพิ่มยา</button>
                        </div>
                        {meds.length === 0 ? <div className="text-center text-slate-400 text-sm py-10 bg-white rounded-3xl border border-dashed border-slate-200">ยังไม่มีรายการยา</div> : 
                            meds.map(med => {
                                const isTaken = (medHistory[getTodayStr()]?.takenMeds || []).includes(med.id);
                                return <MedicineItem key={med.id} med={med} isTaken={isTaken} onToggle={() => toggleMedToday(med.id)} onDelete={() => requestDelete('medications', med.id, med.name)} onEdit={() => { setFormMed(med); setEditMedId(med.id); setShowMedModal(true); }} fontSize={fontSize} />;
                            })
                        }
                    </div>
                </div>
            )}

            {activeTab === 'stats' && (
                <div className="p-5">
                    <div className="flex bg-white p-1.5 rounded-2xl mb-6 shadow-sm border border-slate-100 overflow-x-auto"><button onClick={() => setStatType('bp')} className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${statType === 'bp' ? 'bg-pink-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>ความดัน</button><button onClick={() => setStatType('sugar')} className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${statType === 'sugar' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>น้ำตาล</button><button onClick={() => setStatType('lab')} className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${statType === 'lab' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>ผลเลือด</button></div>
                    {statType === 'lab' ? (
                        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">{labLogs.slice(-3).map((l, i) => <div key={i} className="mb-4 border-b border-slate-50 pb-4 last:border-0"><span className="text-slate-400 text-xs font-bold bg-slate-50 px-2 py-1 rounded-lg mb-2 inline-block">{l.dateStr}</span><div className="grid grid-cols-3 gap-2 mt-1"><div className="bg-indigo-50 p-3 rounded-2xl text-center"><p className="text-[10px] text-indigo-400 mb-1">HbA1c</p><p className="font-bold text-indigo-700">{l.hba1c}</p></div><div className="bg-orange-50 p-3 rounded-2xl text-center"><p className="text-[10px] text-orange-400 mb-1">ไขมัน</p><p className="font-bold text-orange-700">{l.lipid}</p></div><div className="bg-blue-50 p-3 rounded-2xl text-center"><p className="text-[10px] text-blue-400 mb-1">ไต</p><p className="font-bold text-blue-700">{l.egfr}</p></div></div></div>)}</div>
                    ) : (
                        <div className="bg-white p-4 rounded-[32px] shadow-sm border border-slate-100 h-80"><ResponsiveContainer width="100%" height="100%">{statType === 'bp' ? <LineChart data={bpData}><CartesianGrid stroke="#f1f5f9" vertical={false}/><XAxis dataKey="day" tick={{fontSize:10, fill:'#94a3b8'}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{borderRadius:'16px', border:'none', boxShadow:'0 10px 15px -3px rgb(0 0 0 / 0.1)'}}/><Line type="monotone" dataKey="sys" stroke="#ec4899" strokeWidth={3} dot={{r:4, fill:'#ec4899', strokeWidth:2, stroke:'#fff'}}/><Line type="monotone" dataKey="dia" stroke="#3b82f6" strokeWidth={3} dot={{r:4, fill:'#3b82f6', strokeWidth:2, stroke:'#fff'}}/></LineChart> : <LineChart data={sugarData}><CartesianGrid stroke="#f1f5f9" vertical={false}/><XAxis dataKey="day" tick={{fontSize:10, fill:'#94a3b8'}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{borderRadius:'16px', border:'none', boxShadow:'0 10px 15px -3px rgb(0 0 0 / 0.1)'}}/><Line type="monotone" dataKey="sugar" stroke="#10b981" strokeWidth={3} dot={{r:4, fill:'#10b981', strokeWidth:2, stroke:'#fff'}}/></LineChart>}</ResponsiveContainer></div>
                    )}
                </div>
            )}

            {activeTab === 'care' && (
                <div className="p-5">
                    <div className="flex justify-between items-center mb-4"><h1 className={`font-bold text-slate-800 ${fontSize === 'large' ? 'text-2xl' : 'text-xl'}`}>ใบนัดหมอ</h1><button onClick={() => { setFormAppt({date:'',time:'',location:'',dept:''}); setEditApptId(null); setShowApptModal(true); }} className="bg-orange-50 text-orange-600 px-4 py-2 text-xs rounded-xl font-bold hover:bg-orange-100 transition-colors">+ เพิ่มนัด</button></div>
                    <div className="space-y-3">{appointments.map(a => (<div key={a.id} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex justify-between items-center hover:shadow-md transition-all"><div><div className="flex items-center gap-2 mb-1"><span className="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-lg text-xs font-bold">{formatDateThai(a.date)}</span><span className="text-slate-400 text-xs font-medium flex items-center gap-1"><Clock size={12}/> {a.time}</span></div><h3 className="font-bold text-slate-800 text-lg">{a.location}</h3><p className="text-xs text-slate-500">{a.dept}</p></div><div className="flex items-center gap-1"><button onClick={() => { setFormAppt(a); setEditApptId(a.id); setShowApptModal(true); }} className="p-2 text-slate-300 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-colors"><Edit2 size={18}/></button><button onClick={() => requestDelete('appointments', a.id, 'นัดหมาย')} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={18}/></button></div></div>))}</div>
                </div>
            )}

            {activeTab === 'profile' && currentUserRole === 'patient' && (
                <div className="p-5">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-8 rounded-[32px] shadow-xl shadow-blue-200 mb-6 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 opacity-10 transform translate-x-10 -translate-y-10"><Shield size={200} /></div>
                        <p className="text-blue-200 text-sm mb-2 font-medium tracking-wide uppercase">Smart ID ของฉัน</p><h1 className="text-6xl font-bold tracking-widest mb-4 drop-shadow-sm">{profile?.shortId || '------'}</h1><p className="text-xs text-blue-100 bg-white/10 inline-block px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10">บอกรหัสนี้ให้ลูกหลานเพื่อเชื่อมต่อข้อมูล</p>
                    </div>
                    <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm mb-4">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><User size={18} className="text-blue-500"/> ข้อมูลส่วนตัว</h3>
                        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl mb-3 border border-slate-100"><div><p className="text-xs text-slate-400 font-bold uppercase">ชื่อ-สกุล</p><p className="font-bold text-slate-700 text-lg">{profile?.name}</p></div><button onClick={() => { setFormProfile(profile); setShowEditProfile(true); }} className="bg-white p-2 rounded-xl shadow-sm text-slate-400 hover:text-blue-500 transition-colors"><Edit2 size={18}/></button></div>
                        <div className="flex justify-between items-center bg-red-50 p-4 rounded-2xl cursor-pointer active:scale-95 transition-all border border-red-100 hover:bg-red-100" onClick={fetchLocation}><div className="flex items-center gap-4"><div className="bg-red-100 p-3 rounded-full text-red-600 border-4 border-white shadow-sm"><Phone size={24}/></div><div><h3 className="font-bold text-red-800">1669 ฉุกเฉิน</h3><p className="text-xs text-red-500 font-medium mt-0.5">{gpsLocation ? `พิกัด: ${gpsLocation}` : 'แตะเพื่อดูพิกัด GPS'}</p></div></div></div>
                    </div>
                    <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm"><div className="flex items-center gap-3"><div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Type size={20}/></div><span className="text-sm font-bold text-slate-700">ขนาดตัวอักษร</span></div><div className="flex gap-1 bg-slate-100 p-1 rounded-xl"><button onClick={() => setFontSize('normal')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${fontSize === 'normal' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>ปกติ</button><button onClick={() => setFontSize('large')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${fontSize === 'large' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>ใหญ่</button></div></div>
                    <div className="mb-4"><div className="flex justify-between items-center mb-3"><h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Users size={18} className="text-indigo-500"/> ลูกหลาน ({family.length})</h3><button onClick={() => { setFormFamily({name:'',phone:'',relation:'ลูก'}); setEditFamilyId(null); setShowFamilyModal(true); }} className="text-indigo-600 text-xs font-bold bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">+ เพิ่ม</button></div>{family.map(f => <div key={f.id} className="flex justify-between items-center p-4 bg-white rounded-2xl mb-2 border border-slate-100 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">{f.name.charAt(0)}</div><span className="text-sm font-bold text-slate-700">{f.name} <span className="text-slate-400 font-normal text-xs">({f.relation})</span></span></div><div className="flex gap-2"><button onClick={() => { setFormFamily(f); setEditFamilyId(f.id); setShowFamilyModal(true); }} className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"><Edit2 size={16}/></button><button onClick={() => requestDelete('family_members', f.id, f.name)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={16}/></button></div></div>)}</div>
                    <button onClick={handleBackupData} className="w-full bg-slate-100 text-slate-600 p-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold mb-4 hover:bg-slate-200 transition-colors"><Download size={18}/> สำรองข้อมูล (Backup)</button>
                    <button onClick={() => signOut(auth)} className="w-full text-center text-red-400 text-sm p-3 rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2"><LogOut size={16}/> ออกจากระบบ</button>
                </div>
            )}

            {/* Navigation (Glassmorphism) */}
            <div className="fixed bottom-0 w-full max-w-md bg-white/90 backdrop-blur-md border-t border-slate-100 pb-6 pt-2 px-6 flex justify-between items-center z-40 rounded-t-[32px] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                <button onClick={() => setActiveTab('home')} className={`p-2 transition-all ${activeTab === 'home' ? 'text-blue-600 scale-110' : 'text-slate-300'}`}><Home size={28} strokeWidth={activeTab === 'home' ? 2.5 : 2}/></button>
                <button onClick={() => setActiveTab('stats')} className={`p-2 transition-all ${activeTab === 'stats' ? 'text-blue-600 scale-110' : 'text-slate-300'}`}><Activity size={28} strokeWidth={activeTab === 'stats' ? 2.5 : 2}/></button>
                <div className="relative -top-8">
                    <button onClick={() => setShowInputModal(true)} className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-5 rounded-full shadow-xl shadow-blue-300 active:scale-95 transition-transform border-[6px] border-slate-50"><Plus size={32} strokeWidth={3}/></button>
                </div>
                <button onClick={() => setActiveTab('care')} className={`p-2 transition-all ${activeTab === 'care' ? 'text-blue-600 scale-110' : 'text-slate-300'}`}><CalendarIcon size={28} strokeWidth={activeTab === 'care' ? 2.5 : 2}/></button>
                <button onClick={() => setActiveTab('profile')} className={`p-2 transition-all ${activeTab === 'profile' ? 'text-blue-600 scale-110' : 'text-slate-300'}`}><User size={28} strokeWidth={activeTab === 'profile' ? 2.5 : 2}/></button>
            </div>

            {/* Modals */}
            {showInputModal && (
                <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[32px] p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                        <h2 className="text-xl font-bold text-slate-800 mb-6 text-center mt-2">บันทึกข้อมูลสุขภาพ</h2>
                        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
                            {['bp','sugar','weight','lab'].map(t => (
                                <button key={t} onClick={() => setInputType(t)} className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all whitespace-nowrap ${inputType === t ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-sm' : 'border-slate-100 text-slate-400'}`}>{t === 'bp' ? 'ความดัน' : t === 'sugar' ? 'น้ำตาล' : t === 'weight' ? 'น้ำหนัก' : 'ผลเลือด'}</button>
                            ))}
                        </div>
                        <div className="space-y-4 mb-8">
                            {inputType === 'bp' && <div className="flex gap-4"><div className="flex-1"><label className="text-xs text-slate-400 font-bold ml-2 mb-1 block">SYS (บน)</label><input type="number" className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl text-center text-2xl font-bold text-slate-700 focus:border-blue-500 focus:bg-white outline-none transition-all" placeholder="120" autoFocus onChange={e => setFormHealth({...formHealth, sys: e.target.value})}/></div><div className="flex-1"><label className="text-xs text-slate-400 font-bold ml-2 mb-1 block">DIA (ล่าง)</label><input type="number" className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl text-center text-2xl font-bold text-slate-700 focus:border-blue-500 focus:bg-white outline-none transition-all" placeholder="80" onChange={e => setFormHealth({...formHealth, dia: e.target.value})}/></div></div>}
                            {inputType === 'sugar' && <div><label className="text-xs text-slate-400 font-bold ml-2 mb-1 block">ระดับน้ำตาล (mg/dL)</label><input type="number" className="w-full p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl text-center text-3xl font-bold text-emerald-700 focus:border-emerald-500 focus:bg-white outline-none transition-all" placeholder="100" autoFocus onChange={e => setFormHealth({...formHealth, sugar: e.target.value})}/></div>}
                            {inputType === 'weight' && <div><label className="text-xs text-slate-400 font-bold ml-2 mb-1 block">น้ำหนัก (kg)</label><input type="number" className="w-full p-4 bg-orange-50 border-2 border-orange-100 rounded-2xl text-center text-3xl font-bold text-orange-700 focus:border-orange-500 focus:bg-white outline-none transition-all" placeholder="60.5" autoFocus onChange={e => setFormHealth({...formHealth, weight: e.target.value})}/></div>}
                            {inputType === 'lab' && <div className="space-y-3"><input type="number" placeholder="HbA1c (น้ำตาลสะสม)" className="w-full p-3.5 bg-slate-50 border rounded-2xl" onChange={e => setFormHealth({...formHealth, hba1c: e.target.value})}/><input type="number" placeholder="Cholesterol (ไขมัน)" className="w-full p-3.5 bg-slate-50 border rounded-2xl" onChange={e => setFormHealth({...formHealth, lipid: e.target.value})}/></div>}
                        </div>
                        <div className="flex gap-3"><button onClick={() => setShowInputModal(false)} className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors">ยกเลิก</button><button onClick={handleAddHealth} className="flex-1 py-3.5 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors">บันทึก</button></div>
                    </div>
                </div>
            )}
            
            {deleteConfirm.isOpen && <div className="absolute inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"><div className="bg-white w-full max-w-xs p-6 rounded-[32px] text-center shadow-2xl"><div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 animate-bounce"><AlertTriangle size={32}/></div><h3 className="font-bold text-lg text-slate-800 mb-2">ยืนยันการลบ?</h3><p className="text-sm text-slate-500 mb-6 leading-relaxed">คุณต้องการลบ "{deleteConfirm.title}" <br/>ข้อมูลจะหายไปถาวร</p><div className="flex gap-3"><button onClick={() => setDeleteConfirm({...deleteConfirm, isOpen: false})} className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm">ยกเลิก</button><button onClick={confirmDeleteAction} className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-200">ลบ</button></div></div></div>}
            
            {/* ... Other Modals (Med, Appt, EditProfile, DoctorMode) ... */}
            {showDoctorMode && (
                <div className="fixed inset-0 bg-white z-[70] overflow-y-auto animate-fade-in p-6">
                    <div className="flex justify-between items-center mb-6"><h1 className="text-xl font-bold text-slate-800">สรุปประวัติสุขภาพ</h1><button onClick={() => setShowDoctorMode(false)} className="bg-slate-100 p-2 rounded-full"><X/></button></div>
                    <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 mb-6">
                        <h2 className="font-bold text-slate-800 text-lg mb-2">ผู้ป่วย: {profile?.name}</h2>
                        <div className="text-sm space-y-1 text-slate-600">
                            <p>อายุ: {profile?.age} | เลือด: {profile?.bloodType}</p>
                            <p>โรคประจำตัว: {profile?.diseases?.join(', ')}</p>
                            <p className="text-red-600 font-bold">แพ้ยา: {profile?.allergies}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-pink-50 p-4 rounded-3xl border border-pink-100 text-center"><p className="text-xs text-pink-500 font-bold uppercase tracking-wider mb-1">ความดันเฉลี่ย</p><p className="font-bold text-2xl text-slate-800">{calculateAverage(healthLogs.filter(l=>l.type==='bp'), 'sys')}/{calculateAverage(healthLogs.filter(l=>l.type==='bp'), 'dia')}</p></div>
                        <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100 text-center"><p className="text-xs text-emerald-500 font-bold uppercase tracking-wider mb-1">น้ำตาลเฉลี่ย</p><p className="font-bold text-2xl text-slate-800">{calculateAverage(healthLogs.filter(l=>l.type==='sugar'), 'sugar')}</p></div>
                    </div>
                    <h3 className="font-bold text-slate-800 mb-3 ml-1">รายการยาปัจจุบัน</h3>
                    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden mb-8">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold"><tr><th className="p-4">ชื่อยา</th><th className="p-4">ขนาด</th><th className="p-4">เวลา</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">{meds.map(m => (<tr key={m.id}><td className="p-4 font-medium text-slate-700">{m.name}</td><td className="p-4 text-slate-500">{m.dose}</td><td className="p-4 text-slate-500">{m.time}</td></tr>))}</tbody>
                        </table>
                    </div>
                    <button onClick={() => window.print()} className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 flex justify-center gap-2 hover:bg-indigo-700 transition-colors"><Printer/> พิมพ์รายงาน</button>
                </div>
            )}
            
            {showMedModal && <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"><div className="bg-white p-6 rounded-[32px] w-full max-w-sm shadow-2xl"><h3 className="font-bold text-xl text-slate-800 mb-6 text-center">{editMedId ? 'แก้ไขยา' : 'เพิ่มยาใหม่'}</h3><input className="w-full p-4 mb-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all" placeholder="ชื่อยา" value={formMed.name || ''} onChange={e => setFormMed({...formMed, name: e.target.value})}/><input className="w-full p-4 mb-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all" placeholder="ขนาด (เช่น 1 เม็ด)" value={formMed.dose || ''} onChange={e => setFormMed({...formMed, dose: e.target.value})}/><select className="w-full mb-6 p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all" value={formMed.time} onChange={e => setFormMed({...formMed, time: e.target.value})}><option>ก่อนอาหารเช้า</option><option>หลังอาหารเช้า</option><option>หลังอาหารเที่ยง</option><option>หลังอาหารเย็น</option><option>ก่อนนอน</option></select><div className="flex gap-3"><button onClick={() => setShowMedModal(false)} className="flex-1 py-3.5 bg-slate-100 rounded-2xl font-bold text-slate-600">ยกเลิก</button><button onClick={handleSaveMed} className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold shadow-lg">บันทึก</button></div></div></div>}
            
            {showApptModal && <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"><div className="bg-white p-6 rounded-[32px] w-full max-w-sm shadow-2xl"><h3 className="font-bold text-xl text-slate-800 mb-6 text-center">{editApptId ? 'แก้ไขนัด' : 'เพิ่มนัดหมอ'}</h3><input type="date" className="w-full p-4 mb-3 bg-slate-50 rounded-2xl outline-none" value={formAppt.date || ''} onChange={e => setFormAppt({...formAppt, date: e.target.value})}/><input className="w-full p-4 mb-3 bg-slate-50 rounded-2xl outline-none" placeholder="สถานที่" value={formAppt.location || ''} onChange={e => setFormAppt({...formAppt, location: e.target.value})}/><input type="time" className="w-full p-4 mb-6 bg-slate-50 rounded-2xl outline-none" value={formAppt.time || ''} onChange={e => setFormAppt({...formAppt, time: e.target.value})}/><div className="flex gap-3"><button onClick={() => setShowApptModal(false)} className="flex-1 py-3.5 bg-slate-100 rounded-2xl font-bold text-slate-600">ยกเลิก</button><button onClick={handleSaveAppt} className="flex-1 py-3.5 bg-orange-500 text-white rounded-2xl font-bold shadow-lg">บันทึก</button></div></div></div>}
            
            {showFamilyModal && <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"><div className="bg-white p-6 rounded-[32px] w-full max-w-sm shadow-2xl"><h3 className="font-bold text-xl text-slate-800 mb-6 text-center">{editFamilyId ? 'แก้ไขข้อมูล' : 'เพิ่มลูกหลาน'}</h3><input className="w-full p-4 mb-3 bg-slate-50 rounded-2xl outline-none" placeholder="ชื่อ" value={formFamily.name || ''} onChange={e => setFormFamily({...formFamily, name: e.target.value})}/><input className="w-full p-4 mb-3 bg-slate-50 rounded-2xl outline-none" placeholder="เบอร์โทร" value={formFamily.phone || ''} onChange={e => setFormFamily({...formFamily, phone: e.target.value})}/><select className="w-full mb-6 p-4 bg-slate-50 rounded-2xl outline-none" value={formFamily.relation} onChange={e => setFormFamily({...formFamily, relation: e.target.value})}><option>ลูก</option><option>หลาน</option><option>ผู้ดูแล</option></select><div className="flex gap-3"><button onClick={() => setShowFamilyModal(false)} className="flex-1 py-3.5 bg-slate-100 rounded-2xl font-bold text-slate-600">ยกเลิก</button><button onClick={handleSaveFamily} className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg">บันทึก</button></div></div></div>}
            
            {showEditProfile && <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"><div className="bg-white p-6 rounded-[32px] w-full max-w-sm max-h-[80vh] overflow-y-auto shadow-2xl"><h3 className="font-bold text-xl text-slate-800 mb-6 text-center">แก้ไขข้อมูลส่วนตัว</h3><div className="space-y-3"><input className="w-full p-4 bg-slate-50 rounded-2xl outline-none" placeholder="ชื่อ" value={formProfile.name || ''} onChange={e => setFormProfile({...formProfile, name: e.target.value})}/><input type="number" className="w-full p-4 bg-slate-50 rounded-2xl outline-none" placeholder="อายุ" value={formProfile.age || ''} onChange={e => setFormProfile({...formProfile, age: e.target.value})}/><input className="w-full p-4 bg-slate-50 rounded-2xl outline-none" placeholder="โรคประจำตัว (คั่นด้วยคอมม่า)" value={Array.isArray(formProfile.diseases) ? formProfile.diseases.join(',') : formProfile.diseases || ''} onChange={e => setFormProfile({...formProfile, diseases: e.target.value.split(',')})}/><input className="w-full p-4 bg-slate-50 rounded-2xl outline-none" placeholder="แพ้ยา" value={formProfile.allergies || ''} onChange={e => setFormProfile({...formProfile, allergies: e.target.value})}/></div><div className="flex gap-3 mt-6"><button onClick={() => setShowEditProfile(false)} className="flex-1 py-3.5 bg-slate-100 rounded-2xl font-bold text-slate-600">ยกเลิก</button><button onClick={handleUpdateProfile} className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold shadow-lg">บันทึก</button></div></div></div>}
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
        
        // Use a known public collection for lookup
        const publicIdsRef = collection(db, 'artifacts', APP_COLLECTION, 'public_smart_ids');
        const qSmart = query(publicIdsRef, where("smartId", "==", addId));
        const querySnapshot = await getDocs(qSmart);

        if (!querySnapshot.empty) {
            const targetDoc = querySnapshot.docs[0];
            const targetUid = targetDoc.data().uid;
            
            const profileSnap = await getDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'profile', 'main'));
            const patientName = profileSnap.exists() ? profileSnap.data().name : `คนไข้ (${addId})`;

            await setDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', user.uid, 'watching', targetUid), {
                name: patientName,
                addedAt: serverTimestamp()
            });
            setShowAddModal(false); setAddId('');
        } else {
            setErrorMsg('ไม่พบรหัส Smart ID นี้ในระบบ');
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen p-5 animate-fade-in relative">
            <div className="absolute top-[-10%] right-[-20%] w-[300px] h-[300px] bg-blue-100 rounded-full blur-[80px] opacity-60"></div>
            
            <div className="relative z-10 pt-6">
                <div className="flex justify-between items-center mb-8">
                    <div><h1 className="text-3xl font-bold text-slate-800">ดูแลครอบครัว</h1><p className="text-slate-500">เลือกคนไข้เพื่อติดตามสุขภาพ</p></div>
                    <div className="bg-white p-3 rounded-full shadow-sm"><Users className="text-blue-600"/></div>
                </div>

                <div className="grid gap-4">
                    {patients.map(p => (
                        <div key={p.uid} onClick={() => onSelectPatient(p.uid)} className="bg-white p-5 rounded-[28px] shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer active:scale-95 transition-all hover:border-blue-200 hover:shadow-md group">
                            <div className="flex items-center gap-5"><div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-200">{p.name.charAt(0)}</div><div><h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{p.name}</h3><p className="text-sm text-slate-400">คนไข้</p></div></div>
                            <div className="bg-slate-50 p-2 rounded-full group-hover:bg-blue-50 transition-colors"><ChevronRight className="text-slate-300 group-hover:text-blue-500"/></div>
                        </div>
                    ))}
                    <button onClick={() => setShowAddModal(true)} className="bg-white p-5 rounded-[28px] border-2 border-dashed border-slate-200 flex items-center justify-center gap-3 text-slate-400 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-500 transition-all font-bold"><Plus/> เพิ่มคนไข้ใหม่</button>
                </div>

                <button onClick={() => signOut(auth)} className="mt-12 w-full text-center text-slate-400 text-sm flex items-center justify-center gap-2 hover:text-red-500 transition-colors"><LogOut size={16}/> ออกจากระบบ</button>
            </div>
            
            {showAddModal && (
                <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white p-8 rounded-[40px] w-full max-w-sm shadow-2xl">
                        <div className="text-center mb-6"><div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><Users size={32}/></div><h3 className="font-bold text-xl text-slate-800 mb-1">เชื่อมต่อคนไข้</h3><p className="text-xs text-slate-500">กรอกรหัส Smart ID 6 หลักจากเครื่องคนไข้</p></div>
                        <input value={addId} onChange={e => setAddId(e.target.value)} className="w-full text-center text-4xl font-bold p-5 bg-slate-50 rounded-2xl mb-4 tracking-[0.2em] border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all text-slate-800" placeholder="000000" maxLength={6} autoFocus/>
                        {errorMsg && <div className="bg-red-50 text-red-500 text-xs p-3 rounded-xl mb-4 flex items-center justify-center gap-2"><AlertTriangle size={14}/> {errorMsg}</div>}
                        <div className="flex gap-3"><button onClick={() => setShowAddModal(false)} className="flex-1 py-3.5 bg-slate-100 rounded-2xl font-bold text-slate-600 hover:bg-slate-200">ยกเลิก</button><button onClick={handleAddPatient} className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700">เชื่อมต่อ</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- MAIN CONTROLLER ---
export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPatientUid, setSelectedPatientUid] = useState(null);

  useEffect(() => {
    // onAuthStateChanged fires on load and on sign-in/out
    return onAuthStateChanged(auth, async (u) => { 
        setUser(u); 
        if(u) {
            try {
                // Try to get role from user doc
                const snap = await getDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', u.uid));
                if(snap.exists() && snap.data().role) {
                    setRole(snap.data().role);
                } else {
                    // No role yet (new user or data issue), let them select role
                    setRole(null);
                }
            } catch (error) {
                console.error("Error fetching role:", error);
                setRole(null); // Fallback to selector on error
            }
        } else {
            setRole(null);
        }
        setLoading(false); 
    });
  }, []);

  const handleRoleSelect = async (selectedRole) => {
      if(!user) return;
      setLoading(true);
      try {
          const userData = { role: selectedRole, setupAt: serverTimestamp() };
          
          if(selectedRole === 'patient') {
              const shortId = generateSmartId();
              userData.shortId = shortId;
              await setDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', user.uid, 'profile', 'main'), { name: "ผู้สูงอายุ", shortId }, { merge: true });
              await addDoc(collection(db, 'artifacts', APP_COLLECTION, 'public_smart_ids'), { smartId: shortId, uid: user.uid, createdAt: serverTimestamp() });
          }
          await setDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', user.uid), userData, { merge: true });
          setRole(selectedRole);
      } catch (error) {
          alert("เกิดข้อผิดพลาดในการบันทึกสถานะ: " + error.message);
      } finally {
          setLoading(false);
      }
  };

  if (loading) return <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4"><div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div><p className="text-slate-400 text-sm font-bold animate-pulse">กำลังโหลด...</p></div>;
  if (!user) return <AuthScreen />;
  if (!role) return <RoleSelector onSelect={handleRoleSelect} />;

  if (role === 'caregiver') {
      if (selectedPatientUid) return <PatientDashboard targetUid={selectedPatientUid} currentUserRole="caregiver" onBack={() => setSelectedPatientUid(null)} />;
      return <CaregiverHome user={user} onSelectPatient={setSelectedPatientUid} />;
  }

  return <PatientDashboard targetUid={user?.uid} currentUserRole="patient" />;
}
