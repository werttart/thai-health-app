import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label, AreaChart, Area
} from 'recharts';
import { 
  Heart, Pill, Activity, User, Plus, Phone, AlertCircle, 
  Home, MessageCircle, FileText, Shield, Stethoscope, 
  Send, QrCode, MapPin, Loader2, Scale, Droplet,
  Calendar as CalendarIcon, Clock, Users, Trash2, ChevronLeft, ChevronRight,
  Share2, Check, Edit2, X, AlertTriangle, Download, Type, LogOut, Lock, Mail, Printer, Lightbulb,
  XCircle, CheckCircle, Sun, Moon, Sunrise, Sunset, Smartphone, Map, History,
  CalendarDays, CalendarRange, Infinity as InfinityIcon, ChevronDown, Share, Navigation, TestTube,
  FileDigit, List, Thermometer
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, 
  serverTimestamp, setDoc, deleteDoc, query, orderBy, getDoc, where, getDocs, limit 
} from 'firebase/firestore';

// --- 1. การตั้งค่า Firebase ---
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

const APP_COLLECTION = "thai-health-production-v2-pro"; 

// --- Helpers & Utilities ---
const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getPast7Days = () => {
    const days = [];
    for(let i=0; i<7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    return days;
};

const formatDateThai = (dateStr) => {
    if(!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
};

const formatFullDateThai = (date) => {
    return date.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const generateSmartId = () => Math.floor(100000 + Math.random() * 900000).toString();

// Logic การประเมินสุขภาพ (Smart Health Analysis)
const analyzeBP = (sys, dia) => {
    if (!sys || !dia) return { label: 'รอข้อมูล', color: 'text-slate-400', bg: 'bg-slate-50', icon: Activity };
    const s = Number(sys);
    const d = Number(dia);
    if (s >= 140 || d >= 90) return { label: 'สูง (อันตราย)', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: AlertTriangle, status: 'danger' };
    if (s >= 120 || d >= 80) return { label: 'ค่อนข้างสูง', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', icon: Activity, status: 'warning' };
    return { label: 'ปกติ', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle, status: 'normal' };
};

const analyzeSugar = (sugar) => {
    if (!sugar) return { label: 'รอข้อมูล', color: 'text-slate-400', bg: 'bg-slate-50', icon: Activity };
    const s = Number(sugar);
    if (s >= 126) return { label: 'เสี่ยงเบาหวาน', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: AlertTriangle, status: 'danger' };
    if (s >= 100) return { label: 'เสี่ยงเล็กน้อย', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', icon: Activity, status: 'warning' };
    return { label: 'ปกติ', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle, status: 'normal' };
};

const isMedActiveToday = (med) => {
    const today = getTodayStr();
    if (med.startDate && today < med.startDate) return false;
    if (!med.isForever && med.endDate && today > med.endDate) return false;
    return true;
};

const groupMedsByPeriod = (meds) => {
    const groups = { 'เช้า': [], 'กลางวัน': [], 'เย็น': [], 'ก่อนนอน': [], 'อื่นๆ': [] };
    const activeMeds = meds.filter(isMedActiveToday);
    activeMeds.forEach(med => {
        const p = med.period || 'อื่นๆ';
        if (groups[p]) groups[p].push(med);
        else {
             if (med.time && med.time.includes('เช้า')) groups['เช้า'].push(med);
             else if (med.time && med.time.includes('เที่ยง')) groups['กลางวัน'].push(med);
             else if (med.time && med.time.includes('เย็น')) groups['เย็น'].push(med);
             else if (med.time && med.time.includes('นอน')) groups['ก่อนนอน'].push(med);
             else groups['อื่นๆ'].push(med);
        }
    });
    return groups;
};

// --- Styles Injection for Font ---
const FontStyles = () => (
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap');
        body { font-family: 'Prompt', sans-serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fade-in-down { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-down { animation: fade-in-down 0.2s ease-out; }
        @keyframes pulse-red { 0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 50% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } }
        .animate-pulse-red { animation: pulse-red 2s infinite; }
    `}</style>
);

// --- Components ---

const Toast = ({ message, type, onClose }) => {
    useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, [onClose]);
    return (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl transition-all animate-fade-in-down ${type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-600 text-white'}`}>
            {type === 'error' ? <XCircle size={24}/> : <CheckCircle size={24}/>}
            <span className="font-medium text-base">{message}</span>
        </div>
    );
};

const CurrentTimeWidget = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => { const timer = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(timer); }, []);
    return (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-6 rounded-[32px] shadow-lg shadow-emerald-200 mb-6 relative overflow-hidden">
            <div className="absolute right-[-20px] top-[-20px] opacity-10"><Clock size={150} /></div>
            <p className="text-emerald-100 text-sm mb-1">{formatFullDateThai(time)}</p>
            <h2 className="text-5xl font-bold tracking-tight">{time.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}<span className="text-lg font-normal ml-2">น.</span></h2>
        </div>
    );
};

const StatCard = ({ title, value, unit, icon: Icon, colorClass, onClick, analysis, isActive }) => (
  <div onClick={onClick} className={`p-5 rounded-[24px] shadow-sm border flex-1 min-w-[100px] cursor-pointer hover:shadow-md transition-all active:scale-95 relative overflow-hidden group ${isActive ? 'ring-4 ring-emerald-200 border-emerald-500 bg-emerald-50' : (analysis ? analysis.bg : 'bg-white border-slate-100')}`}>
    <div className="flex justify-between items-start mb-2">
        <div className={`p-2.5 rounded-2xl w-fit ${colorClass} bg-opacity-10 text-opacity-100`}>
            <Icon size={20} className={colorClass.replace('bg-', 'text-').replace('/10', '')} />
        </div>
        {analysis && (
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full bg-white/80 backdrop-blur-sm border border-white/50 ${analysis.color}`}>
                {analysis.label}
            </span>
        )}
    </div>
    <div className="flex flex-col">
        <span className="text-slate-500 font-medium text-xs uppercase tracking-wide mb-1 opacity-80">{title}</span>
        <div className="flex items-baseline gap-1">
            <span className="font-bold text-slate-800 text-xl md:text-2xl">{value || '-'}</span>
            <span className="text-slate-500 text-[10px] font-medium">{unit}</span>
        </div>
    </div>
  </div>
);

const MedicineGroup = ({ title, icon: Icon, meds, medHistory, toggleMed, canEdit, onEdit, onDelete }) => {
    if (meds.length === 0) return null;
    return (
        <div className="mb-4">
            <div className="flex items-center gap-2 mb-3 px-2"><Icon size={18} className="text-emerald-600"/><h3 className="font-bold text-slate-700">{title}</h3></div>
            <div className="space-y-3">
                {meds.map(med => {
                    const isTaken = (medHistory[getTodayStr()]?.takenMeds || []).includes(med.id);
                    return (
                        <div key={med.id} onClick={() => canEdit && toggleMed(med.id)} className={`flex items-center justify-between p-4 rounded-3xl border transition-all duration-300 cursor-pointer ${isTaken ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100 shadow-sm hover:shadow-md'}`}>
                            <div className="flex items-center gap-4 flex-1">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isTaken ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}><Pill size={24}/></div>
                                <div><h4 className={`font-bold text-lg ${isTaken ? 'text-emerald-800 line-through opacity-70' : 'text-slate-700'}`}>{med.name}</h4><p className="text-xs text-slate-400">{med.dose || '1 หน่วย'} • {med.detail || 'ก่อนอาหาร'}</p></div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isTaken ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'}`}>{isTaken && <Check size={16} className="text-white" strokeWidth={4}/>}</div>
                                {canEdit && !isTaken && (onEdit || onDelete) && (
                                    <div className="flex gap-1 ml-2 border-l pl-2 border-slate-100">
                                        <button onClick={(e) => { e.stopPropagation(); onEdit(med); }} className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-full"><Edit2 size={16}/></button>
                                        <button onClick={(e) => { e.stopPropagation(); onDelete(med.id, med.name); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={16}/></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- Patient Card Component for Caregiver ---
const PatientCard = ({ patientUid, info, onClick, onUnlink }) => {
    const [latestLog, setLatestLog] = useState(null);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const unsubLog = onSnapshot(query(collection(db, 'artifacts', APP_COLLECTION, 'users', patientUid, 'health_logs'), orderBy('timestamp', 'desc'), limit(1)), s => {
            if(!s.empty) setLatestLog(s.docs[0].data());
        });
        const unsubProfile = onSnapshot(doc(db, 'artifacts', APP_COLLECTION, 'users', patientUid, 'profile', 'main'), s => {
            if(s.exists()) setProfile(s.data());
        });
        return () => { unsubLog(); unsubProfile(); };
    }, [patientUid]);

    const bpAnalysis = latestLog?.type === 'bp' ? analyzeBP(latestLog.sys, latestLog.dia) : null;
    const isDanger = bpAnalysis?.status === 'danger';

    return (
        <div onClick={onClick} className={`relative bg-white p-6 rounded-[32px] shadow-sm border transition-all cursor-pointer group hover:shadow-lg ${isDanger ? 'border-red-300 animate-pulse-red' : 'border-slate-100 hover:border-emerald-200'}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-[24px] flex items-center justify-center text-white font-bold text-2xl shadow-lg ${isDanger ? 'bg-red-500' : 'bg-gradient-to-br from-emerald-400 to-teal-500'}`}>
                        {profile?.name ? profile.name.charAt(0) : (info?.name?.charAt(0) || '?')}
                    </div>
                    <div>
                        <h3 className="font-bold text-xl text-slate-800 group-hover:text-emerald-600 transition-colors">{profile?.name || info.name}</h3>
                        <p className="text-sm text-slate-400">
                            {profile?.age ? `อายุ ${profile.age} ปี` : ''} 
                            {profile?.diseases ? ` • ${profile.diseases}` : ''}
                        </p>
                    </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onUnlink(); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={20}/></button>
            </div>
            
            {/* Real-time Vitals Preview */}
            <div className="flex gap-2">
                <div className={`flex-1 p-3 rounded-2xl ${isDanger ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-600'}`}>
                    <div className="flex items-center gap-2 mb-1">
                        <Heart size={14} className={isDanger ? 'text-red-500' : 'text-slate-400'}/>
                        <span className="text-[10px] font-bold uppercase opacity-70">ความดันล่าสุด</span>
                    </div>
                    <p className="font-bold text-lg">{latestLog && latestLog.type === 'bp' ? `${latestLog.sys}/${latestLog.dia}` : '-'}</p>
                </div>
                <div className="flex-1 p-3 rounded-2xl bg-slate-50 text-slate-600">
                    <div className="flex items-center gap-2 mb-1">
                        <Clock size={14} className="text-slate-400"/>
                        <span className="text-[10px] font-bold uppercase opacity-70">อัปเดตเมื่อ</span>
                    </div>
                    <p className="font-bold text-sm">{latestLog ? formatDateThai(latestLog.dateStr) : '-'}</p>
                </div>
            </div>
        </div>
    );
};

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
        } catch (err) { 
            if (err.code === 'auth/email-already-in-use') setError('อีเมลนี้ถูกใช้งานแล้ว');
            else if (err.code === 'auth/invalid-email') setError('รูปแบบอีเมลไม่ถูกต้อง');
            else if (err.code === 'auth/weak-password') setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
            else setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-6 font-sans relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[50%] bg-emerald-100 rounded-full blur-[100px] opacity-60 pointer-events-none"></div>
            <div className="bg-white/90 backdrop-blur-xl w-full max-w-sm p-8 rounded-[40px] shadow-2xl border border-white relative z-10">
                <div className="text-center mb-8">
                    <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-inset">
                        <Heart size={48} fill="currentColor" className="animate-pulse"/>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-1">ThaiHealth</h1>
                    <p className="text-slate-500 font-medium">ดูแลสุขภาพคนไทย ใส่ใจครอบครัว</p>
                </div>
                <form onSubmit={handleAuth} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 ml-4 uppercase">อีเมล</label>
                        <div className="relative">
                            <Mail className="absolute left-5 top-4 text-slate-400" size={20}/>
                            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-14 p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all font-medium text-slate-700" placeholder="hello@email.com" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 ml-4 uppercase">รหัสผ่าน</label>
                        <div className="relative">
                            <Lock className="absolute left-5 top-4 text-slate-400" size={20}/>
                            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-14 p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all font-medium text-slate-700" placeholder="••••••••" />
                        </div>
                    </div>
                    {error && <div className="bg-red-50 text-red-500 text-xs p-4 rounded-2xl flex items-center gap-2"><AlertTriangle size={16}/> {error}</div>}
                    <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-[0.98] transition-all flex justify-center items-center mt-4">
                        {loading ? <Loader2 className="animate-spin"/> : (isRegister ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ')}
                    </button>
                </form>
                <div className="mt-8 text-center">
                    <button onClick={() => { setIsRegister(!isRegister); setError(''); }} className="text-slate-400 text-sm hover:text-emerald-600 font-medium transition-colors">
                        {isRegister ? 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สมัครสมาชิก'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Role Selector ---
const RoleSelector = ({ onSelect, isProcessing }) => (
    <div className="h-screen bg-emerald-50 flex flex-col items-center justify-center p-6 font-sans relative">
        <div className="bg-white p-8 rounded-[40px] w-full max-w-sm shadow-xl text-center">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">เลือกสถานะ</h1>
            <p className="text-slate-500 mb-8">เพื่อให้ระบบทำงานได้เหมาะสมกับคุณ</p>
            
            {isProcessing ? (
                 <div className="py-10"><Loader2 className="animate-spin text-emerald-600 mx-auto" size={48} /><p className="mt-4 text-slate-400">กำลังตั้งค่าระบบ...</p></div>
            ) : (
                <div className="space-y-4">
                    <button onClick={() => onSelect('patient')} className="w-full p-1 rounded-[32px] border-2 border-emerald-100 hover:border-emerald-500 transition-all group bg-white hover:bg-emerald-50">
                        <div className="p-6 flex items-center gap-4">
                            <div className="bg-emerald-100 p-4 rounded-full text-emerald-600 group-hover:scale-110 transition-transform"><User size={32}/></div>
                            <div className="text-left">
                                <h3 className="font-bold text-xl text-slate-800">ผู้ใช้งานทั่วไป</h3>
                                <p className="text-xs text-slate-400">ผู้สูงอายุ / ผู้ดูแลสุขภาพตนเอง</p>
                            </div>
                        </div>
                    </button>
                    <button onClick={() => onSelect('caregiver')} className="w-full p-1 rounded-[32px] border-2 border-slate-100 hover:border-blue-500 transition-all group bg-white hover:bg-blue-50">
                        <div className="p-6 flex items-center gap-4">
                            <div className="bg-blue-100 p-4 rounded-full text-blue-600 group-hover:scale-110 transition-transform"><Users size={32}/></div>
                            <div className="text-left">
                                <h3 className="font-bold text-xl text-slate-800">ผู้ดูแล / ลูกหลาน</h3>
                                <p className="text-xs text-slate-400">ติดตามและดูแลครอบครัว</p>
                            </div>
                        </div>
                    </button>
                </div>
            )}
             {!isProcessing && (
                <button onClick={() => signOut(auth)} className="mt-8 text-slate-400 text-sm flex items-center justify-center gap-2 hover:text-red-500 transition-colors">
                    <LogOut size={16}/> เปลี่ยนบัญชี
                </button>
            )}
        </div>
    </div>
);

// --- PATIENT DASHBOARD ---
const PatientDashboard = ({ targetUid, currentUserRole, onBack }) => {
    const [activeTab, setActiveTab] = useState('home');
    const [healthLogs, setHealthLogs] = useState([]);
    const [meds, setMeds] = useState([]);
    const [medHistory, setMedHistory] = useState({});
    const [appointments, setAppointments] = useState([]);
    const [family, setFamily] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Stats Dashboard State
    const [selectedStat, setSelectedStat] = useState('bp');

    // UI State
    const [todayTip, setTodayTip] = useState(HEALTH_TIPS[0]);
    const [notification, setNotification] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, collection: null, id: null, title: '' });
    const [showDetailDropdown, setShowDetailDropdown] = useState(false);

    // Forms
    const [showInputModal, setShowInputModal] = useState(false);
    const [formHealth, setFormHealth] = useState({ sys: '', dia: '', sugar: '', weight: '', hba1c: '', lipid: '', egfr: '', note: '' });
    
    const [showMedModal, setShowMedModal] = useState(false); 
    const [editMedId, setEditMedId] = useState(null); 
    const [formMed, setFormMed] = useState({
        name: '', dose: '', detail: 'หลังอาหาร', period: 'เช้า', 
        isForever: true, startDate: getTodayStr(), endDate: ''
    });

    const [showApptModal, setShowApptModal] = useState(false); const [editApptId, setEditApptId] = useState(null); const [formAppt, setFormAppt] = useState({});
    const [showFamilyModal, setShowFamilyModal] = useState(false); const [editFamilyId, setEditFamilyId] = useState(null); const [formFamily, setFormFamily] = useState({});
    const [showEditProfile, setShowEditProfile] = useState(false); const [formProfile, setFormProfile] = useState({});
    
    const canEdit = currentUserRole === 'patient' || currentUserRole === 'caregiver';
    const showToast = (msg, type = 'success') => setNotification({ message: msg, type });

    useEffect(() => {
        if (!targetUid) return;
        setTodayTip(HEALTH_TIPS[Math.floor(Math.random() * HEALTH_TIPS.length)]);
        
        const unsubMeds = onSnapshot(collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'medications'), s => setMeds(s.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubHistory = onSnapshot(collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'daily_logs'), s => { const h = {}; s.docs.forEach(d => h[d.id] = d.data()); setMedHistory(h); });
        const unsubAppts = onSnapshot(query(collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'appointments'), orderBy('date')), s => setAppointments(s.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubFamily = onSnapshot(collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'family_members'), s => setFamily(s.docs.map(d => ({id: d.id, ...d.data()}))));
        
        const unsubProfile = onSnapshot(doc(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'profile', 'main'), async (s) => { 
            if(s.exists()) { 
                const data = s.data(); setProfile(data); setFormProfile(data); 
                if (currentUserRole === 'patient' && data.shortId) {
                   const q = query(collection(db, 'artifacts', APP_COLLECTION, 'public_smart_ids'), where("smartId", "==", data.shortId));
                   const snap = await getDocs(q);
                   if(snap.empty) await addDoc(collection(db, 'artifacts', APP_COLLECTION, 'public_smart_ids'), { smartId: data.shortId, uid: targetUid });
                }
            } else {
                if(currentUserRole === 'patient') {
                    const sid = generateSmartId();
                    await setDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'profile', 'main'), { name: "ผู้ใช้งาน", shortId: sid, created: serverTimestamp() });
                    await addDoc(collection(db, 'artifacts', APP_COLLECTION, 'public_smart_ids'), { smartId: sid, uid: targetUid });
                }
            }
        });
        
        const unsubHealth = onSnapshot(query(collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'health_logs'), orderBy('timestamp')), s => {
             setHealthLogs(s.docs.map(d => ({id: d.id, ...d.data()}))); 
             setLoading(false);
        });
        
        return () => { unsubMeds(); unsubHistory(); unsubAppts(); unsubFamily(); unsubProfile(); unsubHealth(); };
    }, [targetUid, currentUserRole]);

    const handleAddHealth = async () => { 
        setSubmitting(true);
        try {
            const commonData = { dateStr: getTodayStr(), timestamp: serverTimestamp(), note: formHealth.note || '' };
            const promises = [];

            if (formHealth.sys && formHealth.dia) promises.push(addDoc(collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'health_logs'), { ...commonData, type: 'bp', sys: Number(formHealth.sys), dia: Number(formHealth.dia) }));
            if (formHealth.sugar) promises.push(addDoc(collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'health_logs'), { ...commonData, type: 'sugar', sugar: Number(formHealth.sugar) }));
            if (formHealth.weight) promises.push(addDoc(collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'health_logs'), { ...commonData, type: 'weight', weight: Number(formHealth.weight) }));
            if (formHealth.hba1c || formHealth.lipid || formHealth.egfr) promises.push(addDoc(collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'health_logs'), { ...commonData, type: 'lab', hba1c: formHealth.hba1c, lipid: formHealth.lipid, egfr: formHealth.egfr }));
            if (promises.length === 0 && formHealth.note) promises.push(addDoc(collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'health_logs'), { ...commonData, type: 'note' }));

            await Promise.all(promises);
            setShowInputModal(false); 
            setFormHealth({ sys: '', dia: '', sugar: '', weight: '', hba1c: '', lipid: '', egfr: '', note: '' });
            showToast('บันทึกข้อมูลเรียบร้อย');
        } catch(e) { console.error(e); showToast('เกิดข้อผิดพลาด', 'error'); } finally { setSubmitting(false); }
    };
    
    const toggleMedToday = async (medId) => { 
        if(!canEdit) return;
        const today = getTodayStr(); 
        const ref = doc(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'daily_logs', today); 
        const current = medHistory[today]?.takenMeds || []; 
        const newTaken = current.includes(medId) ? current.filter(id => id !== medId) : [...current, medId]; 
        await setDoc(ref, { takenMeds: newTaken }, { merge: true }); 
    };

    const confirmDelete = async () => { 
        await deleteDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', targetUid, deleteConfirm.collection, deleteConfirm.id)); 
        setDeleteConfirm({ isOpen: false, collection: null, id: null, title: '' }); 
        showToast('ลบข้อมูลเรียบร้อย');
    };
    
    const handleSave = async (fn) => { setSubmitting(true); try { await fn(); showToast('บันทึกสำเร็จ'); } catch(e) { showToast("เกิดข้อผิดพลาด", 'error'); } setSubmitting(false); };
    
    const handleShareToLine = () => {
        const todayStr = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
        const taken = medHistory[getTodayStr()]?.takenMeds?.length || 0;
        const total = meds.filter(isMedActiveToday).length;
        let message = `📅 รายงานสุขภาพ ${todayStr}\nคุณ ${profile?.name || 'ผู้ใช้งาน'}\n\n`;
        if (latestBP) message += `❤️ ความดัน: ${latestBP.sys}/${latestBP.dia} mmHg (${analyzeBP(latestBP.sys, latestBP.dia).label})\n`;
        if (latestSugar) message += `🩸 น้ำตาล: ${latestSugar.sugar} mg/dL (${analyzeSugar(latestSugar.sugar).label})\n`;
        message += `💊 กินยาแล้ว: ${taken}/${total} รายการ\n`;
        message += `\nดูแลโดย ThaiHealth App`;
        window.open(`https://line.me/R/msg/text/?${encodeURIComponent(message)}`, '_blank');
    };

    const latestBP = healthLogs.filter(x => x.type === 'bp').pop();
    const latestSugar = healthLogs.filter(x => x.type === 'sugar').pop();
    const latestWeight = healthLogs.filter(x => x.type === 'weight').pop();
    const latestLab = healthLogs.filter(x => x.type === 'lab').pop();
    const medGroups = groupMedsByPeriod(meds);
    const nextAppt = appointments.filter(a => new Date(a.date) >= new Date().setHours(0,0,0,0))[0];
    const past7Days = getPast7Days();
    const activeMedsToday = meds.filter(isMedActiveToday);
    const totalMeds = activeMedsToday.length;
    const takenMedsTodayCount = (medHistory[getTodayStr()]?.takenMeds || []).filter(id => activeMedsToday.some(m => m.id === id)).length;
    const progressPercent = totalMeds > 0 ? (takenMedsTodayCount / totalMeds) * 100 : 0;

    if (loading) return <div className="h-screen flex flex-col gap-4 items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-emerald-600" size={48}/><p className="text-slate-400 font-medium">กำลังโหลดข้อมูล...</p></div>;

    return (
        <div className="pb-28 animate-fade-in font-sans bg-slate-50 min-h-screen">
            <FontStyles />
            {notification && <Toast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}

            {/* HEADER */}
            <div className="bg-white/90 backdrop-blur-md p-6 pt-10 sticky top-0 z-30 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    {currentUserRole === 'caregiver' && <button onClick={onBack} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200"><ChevronLeft className="text-slate-600"/></button>}
                    <div><h1 className="font-bold text-slate-800 text-xl">{profile?.name || 'สวัสดีครับ'}</h1><p className="text-slate-400 text-xs">{currentUserRole === 'caregiver' ? 'โหมดผู้ดูแล' : 'ขอให้สุขภาพแข็งแรงนะครับ'}</p></div>
                </div>
                <div className="flex gap-2">
                    {canEdit && <div onClick={() => setActiveTab('profile')} className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 cursor-pointer border-2 border-white shadow-sm"><User size={20}/></div>}
                </div>
            </div>

            {/* CONTENT */}
            <div className="p-5">
                {activeTab === 'home' && (
                    <div className="space-y-6">
                        <CurrentTimeWidget />
                        <button onClick={handleShareToLine} className="w-full bg-[#06C755] text-white p-3 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-md hover:bg-[#05b64d] transition-all mb-2"><Share2 size={20}/> แชร์สรุปวันนี้เข้า LINE</button>
                        <div className="grid grid-cols-3 gap-3">
                             <StatCard title="ความดัน" value={latestBP ? `${latestBP.sys}/${latestBP.dia}` : '-'} unit="mmHg" icon={Heart} colorClass="bg-red-500" onClick={() => setActiveTab('stats')} analysis={analyzeBP(latestBP?.sys, latestBP?.dia)}/>
                             <StatCard title="น้ำตาล" value={latestSugar ? latestSugar.sugar : '-'} unit="mg/dL" icon={Droplet} colorClass="bg-orange-500" onClick={() => setActiveTab('stats')} analysis={analyzeSugar(latestSugar?.sugar)}/>
                             <StatCard title="น้ำหนัก" value={latestWeight ? latestWeight.weight : '-'} unit="kg" icon={Scale} colorClass="bg-blue-500" onClick={() => setActiveTab('stats')}/>
                        </div>
                        {totalMeds > 0 && (
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-slate-500">ความคืบหน้าการกินยาวันนี้</span><span className="text-xs font-bold text-emerald-600">{takenMedsTodayCount} / {totalMeds} ตัว</span></div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-500 ease-out" style={{width: `${progressPercent}%`}}></div></div>
                            </div>
                        )}
                        {nextAppt && (
                            <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition-all" onClick={() => setActiveTab('care')}>
                                <div className="bg-orange-100 text-orange-600 p-4 rounded-2xl flex flex-col items-center min-w-[70px]">
                                    <span className="text-xs font-bold uppercase">{new Date(nextAppt.date).toLocaleString('th-TH', { month: 'short' })}</span>
                                    <span className="text-2xl font-bold">{new Date(nextAppt.date).getDate()}</span>
                                </div>
                                <div><p className="text-xs text-orange-500 font-bold uppercase mb-1">นัดหมายเร็วๆ นี้</p><h3 className="font-bold text-slate-800">{nextAppt.location}</h3><p className="text-sm text-slate-400">{nextAppt.time} น. • {nextAppt.dept || 'ตรวจทั่วไป'}</p></div>
                            </div>
                        )}
                        <div>
                            <div className="flex justify-between items-end mb-4 px-1">
                                <h2 className="font-bold text-slate-700 text-xl flex items-center gap-2"><Pill className="text-emerald-500"/> ยาของฉัน</h2>
                                {canEdit && <button onClick={() => { setFormMed({name:'', dose:'', detail:'หลังอาหาร', period:'เช้า', isForever: true, startDate: getTodayStr(), endDate: ''}); setEditMedId(null); setShowMedModal(true); setShowDetailDropdown(false); }} className="text-emerald-600 text-sm font-bold bg-emerald-50 px-3 py-1.5 rounded-xl hover:bg-emerald-100">+ เพิ่มยา</button>}
                            </div>
                            {meds.length === 0 ? (
                                <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50"><Pill className="mx-auto text-slate-300 mb-2" size={32}/><p className="text-slate-400 text-sm">ยังไม่มีรายการยา</p></div>
                            ) : (
                                <>
                                    <MedicineGroup title="ช่วงเช้า (06:00 - 11:00)" icon={Sunrise} meds={medGroups['เช้า']} medHistory={medHistory} toggleMed={toggleMedToday} canEdit={canEdit} onEdit={(m) => {setFormMed(m); setEditMedId(m.id); setShowMedModal(true); setShowDetailDropdown(false);}} onDelete={(id,n) => setDeleteConfirm({isOpen:true, collection:'medications', id, title:n})} />
                                    <MedicineGroup title="ช่วงกลางวัน (11:00 - 15:00)" icon={Sun} meds={medGroups['กลางวัน']} medHistory={medHistory} toggleMed={toggleMedToday} canEdit={canEdit} onEdit={(m) => {setFormMed(m); setEditMedId(m.id); setShowMedModal(true); setShowDetailDropdown(false);}} onDelete={(id,n) => setDeleteConfirm({isOpen:true, collection:'medications', id, title:n})} />
                                    <MedicineGroup title="ช่วงเย็น (16:00 - 20:00)" icon={Sunset} meds={medGroups['เย็น']} medHistory={medHistory} toggleMed={toggleMedToday} canEdit={canEdit} onEdit={(m) => {setFormMed(m); setEditMedId(m.id); setShowMedModal(true); setShowDetailDropdown(false);}} onDelete={(id,n) => setDeleteConfirm({isOpen:true, collection:'medications', id, title:n})} />
                                    <MedicineGroup title="ก่อนนอน" icon={Moon} meds={medGroups['ก่อนนอน']} medHistory={medHistory} toggleMed={toggleMedToday} canEdit={canEdit} onEdit={(m) => {setFormMed(m); setEditMedId(m.id); setShowMedModal(true); setShowDetailDropdown(false);}} onDelete={(id,n) => setDeleteConfirm({isOpen:true, collection:'medications', id, title:n})} />
                                    {medGroups['อื่นๆ'].length > 0 && <MedicineGroup title="อื่นๆ / ทั่วไป" icon={Pill} meds={medGroups['อื่นๆ']} medHistory={medHistory} toggleMed={toggleMedToday} canEdit={canEdit} onEdit={(m) => {setFormMed(m); setEditMedId(m.id); setShowMedModal(true); setShowDetailDropdown(false);}} onDelete={(id,n) => setDeleteConfirm({isOpen:true, collection:'medications', id, title:n})} />}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'care' && (
                    <div className="space-y-6">
                        <div>
                             <div className="flex justify-between items-center mb-4">
                                 <h1 className="text-2xl font-bold text-slate-800">ปฏิทินหมอนัด</h1>
                                 {canEdit && <button onClick={() => { setFormAppt({date:'',time:'',location:'',dept:''}); setEditApptId(null); setShowApptModal(true); }} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all">+ เพิ่มนัด</button>}
                             </div>
                             {appointments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-slate-400 bg-white rounded-[32px] border border-slate-100"><CalendarIcon size={32} className="mb-2 text-slate-200"/><p className="text-sm">ไม่มีนัดหมายเร็วๆ นี้</p></div>
                             ) : (
                                <div className="space-y-4">
                                    {appointments.map(a => {
                                        const isPast = new Date(a.date) < new Date().setHours(0,0,0,0);
                                        return (
                                            <div key={a.id} className={`p-6 rounded-[32px] border ${isPast ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100 shadow-sm hover:shadow-md transition-all'}`}>
                                                <div className="flex gap-4">
                                                    <div className={`flex flex-col items-center justify-center p-3 rounded-2xl min-w-[70px] h-[80px] ${isPast ? 'bg-slate-200 text-slate-500' : 'bg-orange-50 text-orange-600'}`}><span className="text-xs font-bold uppercase">{new Date(a.date).toLocaleString('th-TH', { month: 'short' })}</span><span className="text-2xl font-bold">{new Date(a.date).getDate()}</span></div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start"><h3 className="font-bold text-lg text-slate-800">{a.location}</h3>{canEdit && (<div className="flex gap-2"><button onClick={() => { setFormAppt(a); setEditApptId(a.id); setShowApptModal(true); }}><Edit2 size={16} className="text-slate-300 hover:text-emerald-500"/></button><button onClick={() => setDeleteConfirm({isOpen:true, collection:'appointments', id:a.id, title:'นัดหมาย'})}><Trash2 size={16} className="text-slate-300 hover:text-red-500"/></button></div>)}</div>
                                                        <p className="text-slate-500 text-sm mb-2">{a.dept}</p>
                                                        <div className="flex flex-wrap gap-2 text-xs font-medium"><span className="bg-slate-100 px-2 py-1 rounded-lg text-slate-500 flex items-center gap-1"><Clock size={12}/> {a.time} น.</span>{a.doctor && <span className="bg-blue-50 px-2 py-1 rounded-lg text-blue-600 flex items-center gap-1"><Stethoscope size={12}/> {a.doctor}</span>}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                             )}
                        </div>
                        <div className="mt-8">
                            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><History className="text-indigo-500"/> ประวัติการกินยา (7 วัน)</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {past7Days.map((dateStr, index) => {
                                    const log = medHistory[dateStr];
                                    const count = log?.takenMeds?.length || 0;
                                    const percentage = totalMeds > 0 ? Math.round((count/totalMeds)*100) : 0;
                                    const isToday = dateStr === getTodayStr();
                                    return (
                                        <div key={dateStr} className={`p-4 rounded-[24px] border relative overflow-hidden ${isToday ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white border-slate-100'}`}>
                                            <div className="flex justify-between items-start relative z-10"><div><p className={`text-xs font-bold uppercase mb-1 ${isToday ? 'text-indigo-200' : 'text-slate-400'}`}>{new Date(dateStr).toLocaleDateString('th-TH', {weekday:'long'})}</p><h3 className={`text-lg font-bold ${isToday ? 'text-white' : 'text-slate-800'}`}>{formatDateThai(dateStr)}</h3></div><div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isToday ? 'bg-white text-indigo-600' : percentage === 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{percentage}%</div></div>
                                            <div className={`absolute bottom-0 left-0 h-1.5 transition-all ${isToday ? 'bg-white/30' : 'bg-slate-100'}`} style={{width: '100%'}}><div className={`h-full ${isToday ? 'bg-white' : 'bg-emerald-500'}`} style={{width: `${percentage}%`}}></div></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="bg-emerald-50 p-6 rounded-[32px] border border-emerald-100"><div className="flex items-center gap-3 mb-3"><div className="bg-white p-2 rounded-full text-emerald-600"><Lightbulb size={20}/></div><h3 className="font-bold text-emerald-800">รู้หรือไม่?</h3></div><p className="text-emerald-700 text-sm leading-relaxed">{todayTip}</p></div>
                    </div>
                )}
                
                {activeTab === 'stats' && (
                    <div className="space-y-6">
                        <h1 className="text-2xl font-bold text-slate-800 mb-4">สถิติสุขภาพ</h1>
                        
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <StatCard title="ความดัน" value={latestBP ? `${latestBP.sys}/${latestBP.dia}` : '-'} unit="mmHg" icon={Heart} colorClass="bg-red-500" isActive={selectedStat === 'bp'} onClick={() => setSelectedStat('bp')} analysis={analyzeBP(latestBP?.sys, latestBP?.dia)}/>
                            <StatCard title="น้ำตาล" value={latestSugar ? latestSugar.sugar : '-'} unit="mg/dL" icon={Droplet} colorClass="bg-orange-500" isActive={selectedStat === 'sugar'} onClick={() => setSelectedStat('sugar')} analysis={analyzeSugar(latestSugar?.sugar)}/>
                            <StatCard title="น้ำหนัก" value={latestWeight ? latestWeight.weight : '-'} unit="kg" icon={Scale} colorClass="bg-blue-500" isActive={selectedStat === 'weight'} onClick={() => setSelectedStat('weight')}/>
                            <StatCard title="ผลเลือด" value={latestLab ? (latestLab.hba1c || 'ล่าสุด') : '-'} unit="HbA1c" icon={TestTube} colorClass="bg-purple-500" isActive={selectedStat === 'lab'} onClick={() => setSelectedStat('lab')}/>
                        </div>

                        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
                             <div className="flex justify-between items-center mb-6">
                                 <h3 className="font-bold text-slate-700 text-lg">
                                     {selectedStat === 'bp' && 'กราฟความดันโลหิต'}
                                     {selectedStat === 'sugar' && 'กราฟระดับน้ำตาล'}
                                     {selectedStat === 'weight' && 'กราฟน้ำหนักตัว'}
                                     {selectedStat === 'lab' && 'ประวัติผลเลือด HbA1c'}
                                 </h3>
                                 <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full">7 ครั้งล่าสุด</span>
                             </div>
                             
                             <div className="h-64 w-full mb-8">
                                <ResponsiveContainer>
                                    <LineChart data={healthLogs.filter(l => l.type === selectedStat || (selectedStat === 'lab' && l.type === 'lab')).slice(-7)}>
                                        <CartesianGrid stroke="#f1f5f9" vertical={false}/>
                                        <XAxis dataKey="dateStr" tick={{fontSize:10}} tickFormatter={(val) => val.split('-')[2]} axisLine={false} tickLine={false}/>
                                        <YAxis domain={['auto', 'auto']} hide/>
                                        <Tooltip contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}/>
                                        {selectedStat === 'bp' ? (
                                            <>
                                                <Line type="monotone" dataKey="sys" stroke="#ef4444" strokeWidth={3} dot={{r:3}}/>
                                                <Line type="monotone" dataKey="dia" stroke="#3b82f6" strokeWidth={3} dot={{r:3}}/>
                                            </>
                                        ) : selectedStat === 'lab' ? (
                                            <Line type="monotone" dataKey="hba1c" stroke="#8b5cf6" strokeWidth={3} dot={{r:3}}/>
                                        ) : (
                                            <Line type="monotone" dataKey={selectedStat} stroke="#10b981" strokeWidth={3} dot={{r:3}}/>
                                        )}
                                    </LineChart>
                                </ResponsiveContainer>
                             </div>

                             <div className="space-y-4">
                                <h4 className="font-bold text-slate-600 text-sm flex items-center gap-2"><List size={16}/> ประวัติรายการ</h4>
                                {healthLogs.filter(l => l.type === selectedStat || (selectedStat === 'lab' && l.type === 'lab')).slice(-10).reverse().map((log) => (
                                    <div key={log.id} className="border-b border-slate-50 pb-3 last:border-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">{formatDateThai(log.dateStr)}</span>
                                            <span className="font-bold text-slate-700 text-lg">
                                                {selectedStat === 'bp' && `${log.sys}/${log.dia}`}
                                                {selectedStat === 'sugar' && log.sugar}
                                                {selectedStat === 'weight' && log.weight}
                                                {selectedStat === 'lab' && `A1c: ${log.hba1c || '-'} / LDL: ${log.lipid || '-'}`}
                                            </span>
                                        </div>
                                        {log.note && (<div className="text-xs text-slate-500 bg-orange-50 p-2 rounded-lg mt-1 flex gap-2 items-start"><FileText size={12} className="mt-0.5 text-orange-400 shrink-0"/>{log.note}</div>)}
                                    </div>
                                ))}
                                {healthLogs.filter(l => l.type === selectedStat || (selectedStat === 'lab' && l.type === 'lab')).length === 0 && (<p className="text-center text-slate-300 text-sm py-4">ยังไม่มีข้อมูล</p>)}
                             </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation Bar */}
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] max-w-sm bg-white/90 backdrop-blur-xl border border-white shadow-2xl rounded-full p-2 flex justify-between items-center z-40 px-6">
                <button onClick={() => setActiveTab('home')} className={`p-3 rounded-full transition-all ${activeTab === 'home' ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400'}`}><Home size={24}/></button>
                <button onClick={() => setActiveTab('care')} className={`p-3 rounded-full transition-all ${activeTab === 'care' ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400'}`}><CalendarIcon size={24}/></button>
                <button onClick={() => setShowInputModal(true)} className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-4 rounded-full shadow-lg shadow-emerald-200 transform -translate-y-6 border-[4px] border-slate-50"><Plus size={28} strokeWidth={3}/></button>
                <button onClick={() => setActiveTab('stats')} className={`p-3 rounded-full transition-all ${activeTab === 'stats' ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400'}`}><Activity size={24}/></button>
                <button onClick={() => setActiveTab('profile')} className={`p-3 rounded-full transition-all ${activeTab === 'profile' ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400'}`}><User size={24}/></button>
            </div>

            {/* MODALS */}
            {showInputModal && (
                <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full sm:max-w-sm rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
                        <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">บันทึกข้อมูลสุขภาพ</h2>
                        
                        <div className="space-y-6">
                            {/* BP Section */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="bg-red-100 p-1.5 rounded-lg text-red-600"><Heart size={16}/></div>
                                    <span className="font-bold text-slate-700 text-sm">ความดันโลหิต</span>
                                </div>
                                <div className="flex gap-3">
                                    <input type="number" placeholder="บน (120)" className="flex-1 p-3 bg-white rounded-xl text-center font-bold border border-slate-200 outline-none focus:border-emerald-500" value={formHealth.sys} onChange={e => setFormHealth({...formHealth, sys: e.target.value})}/>
                                    <input type="number" placeholder="ล่าง (80)" className="flex-1 p-3 bg-white rounded-xl text-center font-bold border border-slate-200 outline-none focus:border-emerald-500" value={formHealth.dia} onChange={e => setFormHealth({...formHealth, dia: e.target.value})}/>
                                </div>
                            </div>

                            {/* Sugar & Weight Row */}
                            <div className="flex gap-3">
                                <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="bg-orange-100 p-1.5 rounded-lg text-orange-600"><Droplet size={16}/></div>
                                        <span className="font-bold text-slate-700 text-sm">น้ำตาล</span>
                                    </div>
                                    <input type="number" placeholder="mg/dL" className="w-full p-3 bg-white rounded-xl text-center font-bold border border-slate-200 outline-none focus:border-emerald-500" value={formHealth.sugar} onChange={e => setFormHealth({...formHealth, sugar: e.target.value})}/>
                                </div>
                                <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600"><Scale size={16}/></div>
                                        <span className="font-bold text-slate-700 text-sm">น้ำหนัก</span>
                                    </div>
                                    <input type="number" placeholder="kg" className="w-full p-3 bg-white rounded-xl text-center font-bold border border-slate-200 outline-none focus:border-emerald-500" value={formHealth.weight} onChange={e => setFormHealth({...formHealth, weight: e.target.value})}/>
                                </div>
                            </div>

                            {/* Lab Section */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="bg-purple-100 p-1.5 rounded-lg text-purple-600"><TestTube size={16}/></div>
                                    <span className="font-bold text-slate-700 text-sm">ผลเลือด (ถ้ามี)</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <input type="number" placeholder="HbA1c" className="p-2 bg-white rounded-xl text-center text-sm border border-slate-200 outline-none focus:border-emerald-500" value={formHealth.hba1c} onChange={e => setFormHealth({...formHealth, hba1c: e.target.value})}/>
                                    <input type="number" placeholder="LDL" className="p-2 bg-white rounded-xl text-center text-sm border border-slate-200 outline-none focus:border-emerald-500" value={formHealth.lipid} onChange={e => setFormHealth({...formHealth, lipid: e.target.value})}/>
                                    <input type="number" placeholder="eGFR" className="p-2 bg-white rounded-xl text-center text-sm border border-slate-200 outline-none focus:border-emerald-500" value={formHealth.egfr} onChange={e => setFormHealth({...formHealth, egfr: e.target.value})}/>
                                </div>
                            </div>

                            {/* Note Section */}
                            <div>
                                <label className="text-xs font-bold text-slate-400 mb-2 block">อาการ / หมายเหตุ</label>
                                <textarea 
                                    className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-emerald-500 transition-all resize-none text-sm" 
                                    placeholder="เช่น เวียนหัว, นอนน้อย, กินเค็มมา..." 
                                    rows="2"
                                    value={formHealth.note}
                                    onChange={e => setFormHealth({...formHealth, note: e.target.value})}
                                ></textarea>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button onClick={() => setShowInputModal(false)} className="flex-1 py-4 text-slate-400 font-bold bg-slate-50 rounded-2xl hover:bg-slate-100">ยกเลิก</button>
                            <button onClick={handleAddHealth} disabled={submitting} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex justify-center items-center">
                                {submitting ? <Loader2 className="animate-spin"/> : 'บันทึกข้อมูล'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {showMedModal && (
                <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
                        <h3 className="font-bold text-xl text-center mb-6">{editMedId ? 'แก้ไขยา' : 'เพิ่มยาใหม่'}</h3>
                        <div className="space-y-4 mb-6">
                            <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none border focus:border-emerald-500" placeholder="ชื่อยา" value={formMed.name || ''} onChange={e => setFormMed({...formMed, name: e.target.value})}/>
                            
                            <div className="flex gap-2">
                                <input className="flex-1 p-4 bg-slate-50 rounded-2xl outline-none border focus:border-emerald-500" placeholder="ขนาด (เช่น 1 เม็ด)" value={formMed.dose || ''} onChange={e => setFormMed({...formMed, dose: e.target.value})}/>
                                <div className="relative flex-1">
                                    <button 
                                        type="button"
                                        onClick={() => setShowDetailDropdown(!showDetailDropdown)}
                                        className="w-full p-4 bg-slate-50 rounded-2xl outline-none border border-transparent focus:border-emerald-500 text-slate-600 flex justify-between items-center"
                                    >
                                        <span className="font-medium">{formMed.detail || 'หลังอาหาร'}</span>
                                        <ChevronDown className={`text-slate-400 transition-transform duration-200 ${showDetailDropdown ? 'rotate-180' : ''}`} size={20}/>
                                    </button>
                                    
                                    {showDetailDropdown && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden max-h-48 overflow-y-auto animate-fade-in-down">
                                            {['หลังอาหาร', 'ก่อนอาหาร', 'พร้อมอาหาร', 'ก่อนนอน', 'ท้องว่าง'].map((opt) => (
                                                <button
                                                    key={opt}
                                                    onClick={() => {
                                                        setFormMed({ ...formMed, detail: opt });
                                                        setShowDetailDropdown(false);
                                                    }}
                                                    className={`w-full text-left p-4 transition-colors border-b border-slate-50 last:border-0 ${formMed.detail === opt ? 'bg-emerald-50 text-emerald-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <label className="text-xs font-bold text-slate-400 mb-3 block">ช่วงเวลาที่กิน</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['เช้า','กลางวัน','เย็น','ก่อนนอน','อื่นๆ'].map(p => (
                                        <button key={p} onClick={() => setFormMed({...formMed, period: p})} className={`p-2 rounded-xl text-sm border transition-all ${formMed.period === p ? 'bg-emerald-500 border-emerald-500 text-white font-bold shadow-md' : 'bg-white border-slate-200 text-slate-500'}`}>{p}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <label className="text-xs font-bold text-slate-400 mb-2 block">ระยะเวลาการกินยา</label>
                                <div className="flex items-center gap-3 mb-3 cursor-pointer" onClick={() => setFormMed({...formMed, isForever: !formMed.isForever})}>
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formMed.isForever ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`}>
                                        {formMed.isForever && <Check size={14} className="text-white"/>}
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 flex items-center gap-1"><InfinityIcon size={16}/> กินตลอดไป (ยาประจำ)</span>
                                </div>
                                
                                {!formMed.isForever && (
                                    <div className="animate-fade-in-down">
                                        <label className="text-xs text-slate-400 mb-1 block">กินถึงวันที่</label>
                                        <input type="date" className="w-full p-3 bg-white rounded-xl border border-slate-200 outline-none focus:border-emerald-500" value={formMed.endDate || ''} onChange={e => setFormMed({...formMed, endDate: e.target.value})}/>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowMedModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold">ยกเลิก</button>
                            <button onClick={() => handleSave(async () => { const c = collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'medications'); if(editMedId) await updateDoc(doc(c, editMedId), formMed); else await addDoc(c, formMed); setShowMedModal(false); })} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg">บันทึก</button>
                        </div>
                    </div>
                </div>
            )}
            
            {showApptModal && (
                <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl">
                        <h3 className="font-bold text-xl text-center mb-6">{editApptId ? 'แก้ไขนัด' : 'เพิ่มนัดหมอ'}</h3>
                        <div className="space-y-3 mb-6">
                            <label className="text-xs font-bold text-slate-400 ml-2">วันที่ & เวลา</label>
                            <div className="flex gap-2">
                                <input type="date" className="flex-1 p-3 bg-slate-50 rounded-2xl outline-none" value={formAppt.date || ''} onChange={e => setFormAppt({...formAppt, date: e.target.value})}/>
                                <input type="time" className="w-24 p-3 bg-slate-50 rounded-2xl outline-none" value={formAppt.time || ''} onChange={e => setFormAppt({...formAppt, time: e.target.value})}/>
                            </div>
                            <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none" placeholder="โรงพยาบาล / สถานที่" value={formAppt.location || ''} onChange={e => setFormAppt({...formAppt, location: e.target.value})}/>
                            <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none" placeholder="แผนก / คลินิก" value={formAppt.dept || ''} onChange={e => setFormAppt({...formAppt, dept: e.target.value})}/>
                            <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none" placeholder="ชื่อแพทย์ (ถ้ามี)" value={formAppt.doctor || ''} onChange={e => setFormAppt({...formAppt, doctor: e.target.value})}/>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowApptModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold">ยกเลิก</button>
                            <button onClick={() => handleSave(async () => { const c = collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'appointments'); if(editApptId) await updateDoc(doc(c, editApptId), formAppt); else await addDoc(c, formAppt); setShowApptModal(false); })} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg">บันทึก</button>
                        </div>
                    </div>
                </div>
            )}
            
            {showFamilyModal && (
                <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl">
                        <h3 className="font-bold text-xl text-center mb-6">เพิ่มลูกหลาน</h3>
                        <div className="space-y-3 mb-6">
                            <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none" placeholder="ชื่อ" value={formFamily.name || ''} onChange={e => setFormFamily({...formFamily, name: e.target.value})}/>
                            <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none" placeholder="เบอร์โทรศัพท์ (ใส่ขีด - หรือติดกันก็ได้)" type="tel" value={formFamily.phone || ''} onChange={e => setFormFamily({...formFamily, phone: e.target.value})}/>
                            <select className="w-full p-4 bg-slate-50 rounded-2xl outline-none" value={formFamily.relation} onChange={e => setFormFamily({...formFamily, relation: e.target.value})}><option>ลูก</option><option>หลาน</option><option>ผู้ดูแล</option><option>ญาติ</option></select>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowFamilyModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold">ยกเลิก</button>
                            <button onClick={() => handleSave(async () => { const c = collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'family_members'); if(editFamilyId) await updateDoc(doc(c, editFamilyId), formFamily); else await addDoc(c, formFamily); setShowFamilyModal(false); })} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg">บันทึก</button>
                        </div>
                    </div>
                </div>
            )}

            {showEditProfile && (
                <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl">
                         <h3 className="font-bold text-xl text-center mb-6">แก้ไขข้อมูลส่วนตัว</h3>
                         <div className="space-y-3 mb-6">
                            <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none" placeholder="ชื่อ-สกุล" value={formProfile.name || ''} onChange={e => setFormProfile({...formProfile, name: e.target.value})}/>
                            <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none" placeholder="อายุ" type="number" value={formProfile.age || ''} onChange={e => setFormProfile({...formProfile, age: e.target.value})}/>
                            <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none" placeholder="โรคประจำตัว" value={formProfile.diseases || ''} onChange={e => setFormProfile({...formProfile, diseases: e.target.value})}/>
                            <input className="w-full p-4 bg-red-50 text-red-600 rounded-2xl outline-none placeholder-red-300" placeholder="แพ้ยา (สำคัญ)" value={formProfile.allergies || ''} onChange={e => setFormProfile({...formProfile, allergies: e.target.value})}/>
                         </div>
                         <div className="flex gap-3">
                            <button onClick={() => setShowEditProfile(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold">ยกเลิก</button>
                            <button onClick={() => handleSave(async () => { await updateDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'profile', 'main'), formProfile); setShowEditProfile(false); })} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg">บันทึก</button>
                        </div>
                    </div>
                </div>
            )}
            
            {deleteConfirm.isOpen && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-xs p-6 rounded-[32px] text-center shadow-2xl animate-scale-up">
                        <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><AlertTriangle size={32}/></div>
                        <h3 className="font-bold text-lg text-slate-800 mb-2">ยืนยันการลบ?</h3>
                        <p className="text-sm text-slate-500 mb-6">คุณต้องการลบ "{deleteConfirm.title}" ใช่ไหม?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm({...deleteConfirm, isOpen: false})} className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm">ยกเลิก</button>
                            <button onClick={confirmDelete} className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-200">ลบ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- CAREGIVER HOME ---
const CaregiverHome = ({ user, onSelectPatient }) => {
    const [patients, setPatients] = useState([]);
    const [addId, setAddId] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [adding, setAdding] = useState(false);
    
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'artifacts', APP_COLLECTION, 'users', user.uid, 'watching'), (snap) => setPatients(snap.docs.map(d => ({ uid: d.id, ...d.data() }))));
        return () => unsub();
    }, [user]);

    const handleAddPatient = async () => {
        if(addId.length !== 6) return; setErrorMsg(''); setAdding(true);
        try {
            const q = query(collection(db, 'artifacts', APP_COLLECTION, 'public_smart_ids'), where("smartId", "==", addId));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const targetUid = snap.docs[0].data().uid;
                const pSnap = await getDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'profile', 'main'));
                await setDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', user.uid, 'watching', targetUid), { name: pSnap.exists() ? pSnap.data().name : `User ${addId}`, smartId: addId, addedAt: serverTimestamp() });
                setShowAddModal(false); setAddId('');
            } else { setErrorMsg('ไม่พบรหัส Smart ID นี้'); }
        } catch(e) { setErrorMsg('เกิดข้อผิดพลาด'); } finally { setAdding(false); }
    };
    
    const handleUnlink = async (patientUid) => {
        if(!confirm('ยืนยันเลิกติดตาม?')) return;
        await deleteDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', user.uid, 'watching', patientUid));
    };

    return (
        <div className="bg-slate-50 min-h-screen p-5 font-sans relative">
            <FontStyles />
            <div className="absolute top-0 right-0 w-[50%] h-[30%] bg-blue-100 rounded-bl-[100px] opacity-50 pointer-events-none"></div>
            
            <div className="relative z-10 pt-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">ดูแลครอบครัว</h1>
                    <p className="text-slate-500">เลือกคนไข้เพื่อติดตามสุขภาพ</p>
                </div>
                
                <div className="grid gap-4">
                    {patients.map(p => (
                        <PatientCard key={p.uid} patientUid={p.uid} info={p} onClick={() => onSelectPatient(p.uid)} onUnlink={() => handleUnlink(p.uid)}/>
                    ))}
                    <button onClick={() => setShowAddModal(true)} className="bg-white border-2 border-dashed border-slate-300 p-6 rounded-[32px] flex items-center justify-center gap-3 text-slate-400 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all font-bold">
                        <Plus/> เพิ่มคนไข้ใหม่
                    </button>
                </div>
                
                 <button onClick={() => signOut(auth)} className="mt-12 w-full text-center text-red-400 text-sm py-4 rounded-2xl hover:bg-red-50 transition-colors">ออกจากระบบ</button>
            </div>
            
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-[40px] w-full max-w-sm shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4"><QrCode size={32}/></div>
                            <h3 className="font-bold text-xl text-slate-800">เชื่อมต่อคนไข้</h3>
                            <p className="text-xs text-slate-500">กรอกรหัส Smart ID 6 หลัก</p>
                        </div>
                        <input value={addId} onChange={e => setAddId(e.target.value)} className="w-full text-center text-4xl font-bold p-5 bg-slate-50 rounded-2xl mb-4 tracking-[0.2em] border-2 border-transparent focus:border-emerald-500 outline-none transition-all text-slate-800" placeholder="000000" maxLength={6} autoFocus/>
                        {errorMsg && <p className="text-red-500 text-xs text-center mb-4">{errorMsg}</p>}
                        <div className="flex gap-3">
                            <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-slate-100 rounded-2xl font-bold text-slate-500">ยกเลิก</button>
                            <button onClick={handleAddPatient} disabled={adding} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg">{adding ? <Loader2 className="animate-spin mx-auto"/> : 'เชื่อมต่อ'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- MAIN ---
export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roleProcessing, setRoleProcessing] = useState(false);
  const [selectedPatientUid, setSelectedPatientUid] = useState(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => { 
        setUser(u); 
        if(u) {
            try {
                const snap = await getDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', u.uid));
                setRole(snap.exists() ? snap.data().role : null);
            } catch (e) { setRole(null); }
        } else { setRole(null); }
        setLoading(false); 
    });
  }, []);

  const handleRoleSelect = async (selectedRole) => {
      if(!user) return; setRoleProcessing(true);
      try {
          let userData = { role: selectedRole, setupAt: serverTimestamp() };
          if(selectedRole === 'patient') {
              const shortId = generateSmartId();
              userData.shortId = shortId;
              await setDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', user.uid, 'profile', 'main'), { name: "ผู้ใช้งาน", shortId }, { merge: true });
              await addDoc(collection(db, 'artifacts', APP_COLLECTION, 'public_smart_ids'), { smartId: shortId, uid: user.uid });
          }
          await setDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', user.uid), userData, { merge: true });
          setRole(selectedRole);
      } catch (e) { alert("Error setting role"); } finally { setRoleProcessing(false); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-emerald-600" size={48}/></div>;
  if (!user) return <AuthScreen />;
  if (!role) return <RoleSelector onSelect={handleRoleSelect} isProcessing={roleProcessing} />;
  if (role === 'caregiver') {
      if (selectedPatientUid) return <PatientDashboard targetUid={selectedPatientUid} currentUserRole="caregiver" onBack={() => setSelectedPatientUid(null)} />;
      return <CaregiverHome user={user} onSelectPatient={setSelectedPatientUid} />;
  }
  return <PatientDashboard targetUid={user?.uid} currentUserRole="patient" />;
}
