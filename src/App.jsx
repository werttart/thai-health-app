import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { 
  Heart, Pill, Activity, User, Plus, Phone, AlertCircle, 
  Home, MessageCircle, FileText, Shield, Stethoscope, 
  Send, QrCode, MapPin, Loader2, Scale, Droplet,
  Calendar as CalendarIcon, Clock, Users, Trash2, ChevronLeft, ChevronRight,
  Share2, Check, Edit2, X, AlertTriangle, LogOut, Lock, Mail, Lightbulb,
  XCircle, CheckCircle, Sun, Moon, Sunrise, Sunset, Infinity as InfinityIcon, ChevronDown,
  Thermometer, FileBarChart, StickyNote
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, 
  serverTimestamp, setDoc, deleteDoc, query, orderBy, getDoc, where, getDocs, limit 
} from 'firebase/firestore';

// --- 1. การตั้งค่า Firebase (ของคุณ) ---
const firebaseConfig = {
  apiKey: "AIzaSyBILcG2lnb_dhsENlPtYboFrGj_gP3D3d8",
  authDomain: "thaihealth-fcd28.firebaseapp.com",
  projectId: "thaihealth-fcd28",
  storageBucket: "thaihealth-fcd28.firebasestorage.app",
  messagingSenderId: "250288902410",
  appId: "1:250288902410:web:6747e94b114b6425232af3",
  measurementId: "G-FB72B6NB2Q"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ใช้ Collection เดิมของคุณ
const APP_ID = 'thai-health-pro'; 
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

// ตรวจสอบว่ายาต้องกินวันนี้ไหม
const isMedActiveToday = (med) => {
    const today = getTodayStr();
    if (med.startDate && today < med.startDate) return false;
    if (!med.isForever && med.endDate && today > med.endDate) return false;
    return true;
};

// จัดกลุ่มยา
const groupMedsByPeriod = (meds) => {
    const groups = { 'เช้า': [], 'กลางวัน': [], 'เย็น': [], 'ก่อนนอน': [], 'อื่นๆ': [] };
    const activeMeds = meds.filter(isMedActiveToday);
    activeMeds.forEach(med => {
        const p = med.period || 'อื่นๆ';
        if (groups[p]) groups[p].push(med);
        else groups['อื่นๆ'].push(med);
    });
    return groups;
};

// วิเคราะห์สุขภาพ (Smart Logic)
const analyzeHealth = (type, value) => {
    if (!value) return { status: 'normal', color: 'bg-slate-100', text: 'ไม่มีข้อมูล', textColor: 'text-slate-400' };
    const val = Number(value);
    
    if (type === 'sys') { // ความดันตัวบน
        if (val > 140) return { status: 'danger', color: 'bg-red-500', text: 'สูงอันตราย', textColor: 'text-white', animate: true };
        if (val > 120) return { status: 'warning', color: 'bg-orange-400', text: 'เริ่มสูง', textColor: 'text-white' };
        return { status: 'normal', color: 'bg-emerald-500', text: 'ปกติ', textColor: 'text-white' };
    }
    if (type === 'sugar') { // น้ำตาล
        if (val > 126) return { status: 'danger', color: 'bg-red-500', text: 'เบาหวาน', textColor: 'text-white', animate: true };
        if (val > 100) return { status: 'warning', color: 'bg-orange-400', text: 'เสี่ยง', textColor: 'text-white' };
        return { status: 'normal', color: 'bg-emerald-500', text: 'ปกติ', textColor: 'text-white' };
    }
    if (type === 'bmi') { // BMI (สมมติ)
         return { status: 'normal', color: 'bg-blue-500', text: 'ปกติ', textColor: 'text-white' };
    }
    return { status: 'normal', color: 'bg-slate-100', text: 'ปกติ', textColor: 'text-slate-600' };
};

// --- Styles ---
const FontStyles = () => (
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap');
        body { font-family: 'Prompt', sans-serif; background-color: #f8fafc; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .glass-panel { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.5); }
    `}</style>
);

// --- Shared Components ---

const Toast = ({ message, type, onClose }) => {
    useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl transition-all animate-fade-in ${type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-600 text-white'}`}>
            {type === 'error' ? <XCircle size={24}/> : <CheckCircle size={24}/>}
            <span className="font-medium text-base">{message}</span>
        </div>
    );
};

// Smart Stat Card Components
const SmartStatCard = ({ title, value, unit, icon: Icon, type, onClick, isSelected }) => {
    const analysis = analyzeHealth(type, value);
    
    return (
        <div 
            onClick={onClick} 
            className={`relative overflow-hidden rounded-[24px] p-5 cursor-pointer transition-all duration-300 border
            ${isSelected ? 'ring-2 ring-emerald-500 shadow-lg scale-[1.02] bg-white' : 'bg-white hover:shadow-md border-slate-100 shadow-sm'}
            `}
        >
            <div className="flex justify-between items-start mb-2">
                <div className={`p-2.5 rounded-2xl ${isSelected ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                    <Icon size={20} />
                </div>
                {value && (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${analysis.color} ${analysis.textColor} ${analysis.animate ? 'animate-pulse' : ''}`}>
                        {analysis.text}
                    </span>
                )}
            </div>
            <div>
                <p className="text-slate-400 text-xs font-medium mb-1">{title}</p>
                <div className="flex items-baseline gap-1">
                    <h3 className="text-2xl font-bold text-slate-800">{value || '-'}</h3>
                    <span className="text-xs text-slate-400">{unit}</span>
                </div>
            </div>
        </div>
    );
};

// --- Application Components ---

const PatientDashboard = ({ targetUid, currentUserRole, onBack }) => {
    // Data State
    const [healthLogs, setHealthLogs] = useState([]);
    const [meds, setMeds] = useState([]);
    const [medHistory, setMedHistory] = useState({});
    const [appointments, setAppointments] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // UI State
    const [activeTab, setActiveTab] = useState('home');
    const [notification, setNotification] = useState(null);
    const [showInputModal, setShowInputModal] = useState(false);
    
    // Unified Input Form State
    const [unifiedForm, setUnifiedForm] = useState({
        sys: '', dia: '', sugar: '', weight: '', 
        hba1c: '', lipid: '', note: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    // Stats View State
    const [statView, setStatView] = useState('bp'); // bp, sugar, weight, lab

    const canEdit = currentUserRole === 'patient' || currentUserRole === 'caregiver';

    useEffect(() => {
        if (!targetUid) return;
        
        // Fetch Real-time Data
        const unsubHealth = onSnapshot(query(collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'health_logs'), orderBy('timestamp', 'asc')), s => {
             setHealthLogs(s.docs.map(d => ({id: d.id, ...d.data()}))); 
             setLoading(false);
        });
        const unsubMeds = onSnapshot(collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'medications'), s => setMeds(s.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubHistory = onSnapshot(collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'daily_logs'), s => { const h = {}; s.docs.forEach(d => h[d.id] = d.data()); setMedHistory(h); });
        const unsubAppts = onSnapshot(query(collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'appointments'), orderBy('date')), s => setAppointments(s.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubProfile = onSnapshot(doc(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'profile', 'main'), (s) => {
            if(s.exists()) setProfile(s.data());
        });

        return () => { unsubHealth(); unsubMeds(); unsubHistory(); unsubAppts(); unsubProfile(); };
    }, [targetUid]);

    // Unified Save Function
    const handleUnifiedSave = async () => {
        setIsSaving(true);
        try {
            const batchPromises = [];
            const timestamp = serverTimestamp();
            const dateStr = getTodayStr();

            // 1. Save BP if entered
            if (unifiedForm.sys && unifiedForm.dia) {
                batchPromises.push(addDoc(collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'health_logs'), {
                    type: 'bp', sys: Number(unifiedForm.sys), dia: Number(unifiedForm.dia), 
                    note: unifiedForm.note, dateStr, timestamp
                }));
            }
            // 2. Save Sugar if entered
            if (unifiedForm.sugar) {
                batchPromises.push(addDoc(collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'health_logs'), {
                    type: 'sugar', sugar: Number(unifiedForm.sugar), 
                    note: unifiedForm.note, dateStr, timestamp
                }));
            }
            // 3. Save Weight if entered
            if (unifiedForm.weight) {
                batchPromises.push(addDoc(collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'health_logs'), {
                    type: 'weight', weight: Number(unifiedForm.weight), 
                    note: unifiedForm.note, dateStr, timestamp
                }));
            }
            // 4. Save Lab if entered
            if (unifiedForm.hba1c || unifiedForm.lipid) {
                batchPromises.push(addDoc(collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'health_logs'), {
                    type: 'lab', hba1c: unifiedForm.hba1c, lipid: unifiedForm.lipid,
                    note: unifiedForm.note, dateStr, timestamp
                }));
            }

            // If only note entered (log as general note)
            if (!unifiedForm.sys && !unifiedForm.sugar && !unifiedForm.weight && !unifiedForm.hba1c && unifiedForm.note) {
                 batchPromises.push(addDoc(collection(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'health_logs'), {
                    type: 'note', note: unifiedForm.note, dateStr, timestamp
                }));
            }

            await Promise.all(batchPromises);
            setNotification({ message: 'บันทึกข้อมูลสำเร็จ', type: 'success' });
            setShowInputModal(false);
            setUnifiedForm({ sys: '', dia: '', sugar: '', weight: '', hba1c: '', lipid: '', note: '' });
        } catch (error) {
            console.error(error);
            setNotification({ message: 'เกิดข้อผิดพลาดในการบันทึก', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    // Derived Data
    const latestBP = [...healthLogs].filter(x => x.type === 'bp').pop();
    const latestSugar = [...healthLogs].filter(x => x.type === 'sugar').pop();
    const latestWeight = [...healthLogs].filter(x => x.type === 'weight').pop();
    const latestLab = [...healthLogs].filter(x => x.type === 'lab').pop();
    const recentLogs = [...healthLogs].filter(x => x.note).reverse().slice(0, 3); // Get last 3 notes

    // Toggle Med Logic
    const toggleMedToday = async (medId) => { 
        if(!canEdit) return;
        const today = getTodayStr(); 
        const ref = doc(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'daily_logs', today); 
        const current = medHistory[today]?.takenMeds || []; 
        const newTaken = current.includes(medId) ? current.filter(id => id !== medId) : [...current, medId]; 
        await setDoc(ref, { takenMeds: newTaken }, { merge: true }); 
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-emerald-600" size={48}/></div>;

    return (
        <div className="pb-28 min-h-screen bg-slate-50 font-sans">
            <FontStyles />
            {notification && <Toast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}

            {/* Header */}
            <div className="bg-white sticky top-0 z-30 px-6 py-4 shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-3">
                    {currentUserRole === 'caregiver' && (
                        <button onClick={onBack} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200 transition-colors">
                            <ChevronLeft className="text-slate-600" size={20}/>
                        </button>
                    )}
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">{profile?.name || 'Loading...'}</h1>
                        <p className="text-xs text-slate-500">{currentUserRole === 'caregiver' ? 'โหมดผู้ดูแล' : 'สวัสดี ขอให้สุขภาพแข็งแรง'}</p>
                    </div>
                </div>
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 border-2 border-white shadow-sm">
                    <User size={20}/>
                </div>
            </div>

            <div className="p-5 max-w-md mx-auto">
                {activeTab === 'home' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Status Cards Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <SmartStatCard 
                                title="ความดัน" 
                                value={latestBP ? `${latestBP.sys}/${latestBP.dia}` : '-'} 
                                unit="mmHg" 
                                icon={Heart} 
                                type="sys" // Use 'sys' for analysis
                                valueForAnalysis={latestBP?.sys}
                                onClick={() => { setActiveTab('stats'); setStatView('bp'); }}
                            />
                            <SmartStatCard 
                                title="น้ำตาล" 
                                value={latestSugar?.sugar} 
                                unit="mg/dL" 
                                icon={Droplet} 
                                type="sugar"
                                onClick={() => { setActiveTab('stats'); setStatView('sugar'); }}
                            />
                            <SmartStatCard 
                                title="น้ำหนัก" 
                                value={latestWeight?.weight} 
                                unit="kg" 
                                icon={Scale} 
                                type="weight"
                                onClick={() => { setActiveTab('stats'); setStatView('weight'); }}
                            />
                             <SmartStatCard 
                                title="ผลเลือดล่าสุด" 
                                value={latestLab ? `LDL ${latestLab.lipid}` : '-'} 
                                unit="" 
                                icon={FileBarChart} 
                                type="lab"
                                onClick={() => { setActiveTab('stats'); setStatView('lab'); }}
                            />
                        </div>

                        {/* Recent Activity / Notes */}
                        {recentLogs.length > 0 && (
                            <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
                                <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><StickyNote size={18} className="text-yellow-500"/> บันทึกล่าสุด</h3>
                                <div className="space-y-3">
                                    {recentLogs.map((log) => (
                                        <div key={log.id} className="flex gap-3 text-sm border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                                            <div className="min-w-[40px] text-xs text-slate-400 pt-0.5">{formatDateThai(log.dateStr)}</div>
                                            <div>
                                                <p className="text-slate-800 font-medium">{log.note}</p>
                                                <p className="text-xs text-slate-400 mt-0.5 capitalize">{log.type === 'note' ? 'ทั่วไป' : `บันทึกพร้อมค่า ${log.type}`}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Medications */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-bold text-slate-700 text-lg flex items-center gap-2"><Pill className="text-emerald-500"/> รายการยา</h2>
                                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">วันนี้</span>
                            </div>
                            {meds.length === 0 ? (
                                <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-200">
                                    <p className="text-slate-400 text-sm">ยังไม่มีรายการยา</p>
                                </div>
                            ) : (
                                Object.entries(groupMedsByPeriod(meds)).map(([period, list]) => list.length > 0 && (
                                    <div key={period} className="mb-4">
                                        <h3 className="text-sm font-bold text-slate-500 mb-2 ml-1">{period}</h3>
                                        <div className="space-y-2">
                                            {list.map(med => {
                                                const isTaken = (medHistory[getTodayStr()]?.takenMeds || []).includes(med.id);
                                                return (
                                                    <div key={med.id} onClick={() => toggleMedToday(med.id)} className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${isTaken ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100 hover:shadow-md'}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isTaken ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                                                <Pill size={20}/>
                                                            </div>
                                                            <div>
                                                                <p className={`font-bold ${isTaken ? 'text-emerald-800 line-through opacity-60' : 'text-slate-700'}`}>{med.name}</p>
                                                                <p className="text-xs text-slate-400">{med.dose} • {med.detail}</p>
                                                            </div>
                                                        </div>
                                                        {isTaken && <div className="bg-emerald-500 text-white rounded-full p-1"><Check size={14} strokeWidth={3}/></div>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'stats' && (
                    <div className="space-y-6 animate-fade-in">
                        <h2 className="text-xl font-bold text-slate-800">สถิติสุขภาพ</h2>
                        
                        {/* Interactive Stats Selector */}
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                             {[
                                { id: 'bp', label: 'ความดัน', icon: Heart, color: 'text-red-500' },
                                { id: 'sugar', label: 'น้ำตาล', icon: Droplet, color: 'text-orange-500' },
                                { id: 'weight', label: 'น้ำหนัก', icon: Scale, color: 'text-blue-500' },
                                { id: 'lab', label: 'ผลเลือด', icon: FileBarChart, color: 'text-purple-500' },
                             ].map((item) => (
                                <button 
                                    key={item.id}
                                    onClick={() => setStatView(item.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold whitespace-nowrap transition-all
                                    ${statView === item.id 
                                        ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                                        : 'bg-white text-slate-500 border-slate-200'}`}
                                >
                                    <item.icon size={16} className={statView === item.id ? 'text-white' : item.color}/> {item.label}
                                </button>
                             ))}
                        </div>

                        {/* Chart Area */}
                        <div className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100 min-h-[300px]">
                            {statView === 'bp' && (
                                <>
                                    <div className="mb-4">
                                        <h3 className="font-bold text-slate-700">กราฟความดันโลหิต</h3>
                                        <p className="text-xs text-slate-400">7 ครั้งล่าสุด</p>
                                    </div>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={healthLogs.filter(l => l.type === 'bp').slice(-7)}>
                                                <CartesianGrid stroke="#f1f5f9" vertical={false}/>
                                                <XAxis dataKey="dateStr" tick={{fontSize:10}} tickFormatter={(val) => val.split('-')[2]} axisLine={false} tickLine={false}/>
                                                <YAxis domain={[60, 180]} hide/>
                                                <Tooltip contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}/>
                                                <Line type="monotone" dataKey="sys" stroke="#ef4444" strokeWidth={3} dot={{r:4, fill:'#ef4444', strokeWidth:2, stroke:'white'}} name="ตัวบน"/>
                                                <Line type="monotone" dataKey="dia" stroke="#3b82f6" strokeWidth={3} dot={{r:4, fill:'#3b82f6', strokeWidth:2, stroke:'white'}} name="ตัวล่าง"/>
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </>
                            )}
                            {statView === 'sugar' && (
                                <>
                                    <div className="mb-4">
                                        <h3 className="font-bold text-slate-700">ระดับน้ำตาลในเลือด</h3>
                                    </div>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={healthLogs.filter(l => l.type === 'sugar').slice(-7)}>
                                                <defs>
                                                    <linearGradient id="colorSugar" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid stroke="#f1f5f9" vertical={false}/>
                                                <XAxis dataKey="dateStr" tick={{fontSize:10}} tickFormatter={(val) => val.split('-')[2]} axisLine={false} tickLine={false}/>
                                                <Tooltip contentStyle={{borderRadius:'12px'}}/>
                                                <Area type="monotone" dataKey="sugar" stroke="#f97316" fillOpacity={1} fill="url(#colorSugar)" strokeWidth={3}/>
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </>
                            )}
                             {statView === 'lab' && (
                                <div className="space-y-4">
                                    <h3 className="font-bold text-slate-700">ประวัติผลเลือดล่าสุด</h3>
                                    {healthLogs.filter(l => l.type === 'lab').length === 0 ? (
                                        <p className="text-slate-400 text-center py-10">ไม่พบข้อมูลผลเลือด</p>
                                    ) : (
                                        healthLogs.filter(l => l.type === 'lab').reverse().map(log => (
                                            <div key={log.id} className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
                                                <div>
                                                    <p className="text-xs text-slate-400">{formatDateThai(log.dateStr)}</p>
                                                    <p className="text-sm font-bold text-slate-700">HbA1c: <span className="text-emerald-600">{log.hba1c || '-'}%</span></p>
                                                </div>
                                                <div className="text-right">
                                                     <p className="text-xs text-slate-400">ไขมัน LDL</p>
                                                     <p className="text-lg font-bold text-slate-800">{log.lipid || '-'}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Unified Input Modal (Redesigned) */}
            {showInputModal && (
                <div className="fixed inset-0 bg-slate-900/50 z-[60] flex items-end sm:items-center justify-center backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full sm:max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white p-4 border-b border-slate-100 flex justify-between items-center z-10 rounded-t-[32px]">
                            <h2 className="text-lg font-bold text-slate-800 pl-2">บันทึกข้อมูลสุขภาพ</h2>
                            <button onClick={() => setShowInputModal(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X size={20} className="text-slate-500"/></button>
                        </div>
                        
                        <div className="p-6 space-y-8">
                            {/* Section: Blood Pressure */}
                            <section>
                                <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Heart className="text-red-500" size={18}/> ความดันโลหิต</h3>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="text-xs text-slate-400 ml-2 mb-1 block">ตัวบน (SYS)</label>
                                        <input type="number" className="w-full p-3 bg-slate-50 rounded-2xl text-center font-bold text-lg border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all" placeholder="120" value={unifiedForm.sys} onChange={e => setUnifiedForm({...unifiedForm, sys: e.target.value})}/>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs text-slate-400 ml-2 mb-1 block">ตัวล่าง (DIA)</label>
                                        <input type="number" className="w-full p-3 bg-slate-50 rounded-2xl text-center font-bold text-lg border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all" placeholder="80" value={unifiedForm.dia} onChange={e => setUnifiedForm({...unifiedForm, dia: e.target.value})}/>
                                    </div>
                                </div>
                            </section>

                            <hr className="border-slate-100"/>

                            {/* Section: Sugar & Weight */}
                            <section className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Droplet className="text-orange-500" size={18}/> น้ำตาล</h3>
                                    <input type="number" className="w-full p-3 bg-slate-50 rounded-2xl text-center font-bold text-lg border-2 border-transparent focus:border-orange-500 focus:bg-white outline-none transition-all" placeholder="mg/dL" value={unifiedForm.sugar} onChange={e => setUnifiedForm({...unifiedForm, sugar: e.target.value})}/>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Scale className="text-blue-500" size={18}/> น้ำหนัก</h3>
                                    <input type="number" className="w-full p-3 bg-slate-50 rounded-2xl text-center font-bold text-lg border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all" placeholder="kg" value={unifiedForm.weight} onChange={e => setUnifiedForm({...unifiedForm, weight: e.target.value})}/>
                                </div>
                            </section>

                            <hr className="border-slate-100"/>

                             {/* Section: Lab */}
                             <section>
                                <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><FileBarChart className="text-purple-500" size={18}/> ผลเลือด (ถ้ามี)</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="number" className="p-3 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-purple-500 outline-none" placeholder="HbA1c (%)" value={unifiedForm.hba1c} onChange={e => setUnifiedForm({...unifiedForm, hba1c: e.target.value})}/>
                                    <input type="number" className="p-3 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-purple-500 outline-none" placeholder="LDL (mg/dL)" value={unifiedForm.lipid} onChange={e => setUnifiedForm({...unifiedForm, lipid: e.target.value})}/>
                                </div>
                            </section>

                            <hr className="border-slate-100"/>

                            {/* Section: Note */}
                            <section>
                                <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><StickyNote className="text-yellow-500" size={18}/> อาการ / หมายเหตุ</h3>
                                <textarea 
                                    className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none resize-none text-slate-700"
                                    rows="3"
                                    placeholder="เช่น เวียนหัวนิดหน่อย, วันนี้กินเค็มเยอะ..."
                                    value={unifiedForm.note}
                                    onChange={e => setUnifiedForm({...unifiedForm, note: e.target.value})}
                                ></textarea>
                            </section>
                        </div>
                        
                        <div className="p-4 border-t border-slate-100 bg-white sticky bottom-0 rounded-b-[32px]">
                            <button 
                                onClick={handleUnifiedSave} 
                                disabled={isSaving}
                                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 className="animate-spin"/> : <><CheckCircle size={24}/> บันทึกทั้งหมด</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Bar */}
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] max-w-sm bg-white/90 backdrop-blur-xl border border-white shadow-2xl rounded-full p-2 flex justify-between items-center z-40 px-6">
                <button onClick={() => setActiveTab('home')} className={`p-3 rounded-full transition-all ${activeTab === 'home' ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400'}`}><Home size={24}/></button>
                <button onClick={() => setShowInputModal(true)} className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-4 rounded-full shadow-lg shadow-emerald-200 transform -translate-y-6 border-[4px] border-slate-50"><Plus size={28} strokeWidth={3}/></button>
                <button onClick={() => setActiveTab('stats')} className={`p-3 rounded-full transition-all ${activeTab === 'stats' ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400'}`}><Activity size={24}/></button>
            </div>
        </div>
    );
};

// --- Caregiver Components ---

const PatientListCard = ({ patient, onSelect, onRemove }) => {
    const [latestBP, setLatestBP] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch only the latest BP for the card preview
        const q = query(collection(db, 'artifacts', APP_COLLECTION, 'users', patient.uid, 'health_logs'), where('type', '==', 'bp'), orderBy('timestamp', 'desc'), limit(1));
        const unsub = onSnapshot(q, (s) => {
            if(!s.empty) setLatestBP(s.docs[0].data());
            setLoading(false);
        });
        return () => unsub();
    }, [patient.uid]);

    const status = latestBP ? analyzeHealth('sys', latestBP.sys) : { color: 'bg-slate-100' };

    return (
        <div onClick={() => onSelect(patient.uid)} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm relative overflow-hidden group cursor-pointer hover:shadow-lg transition-all">
            <div className="flex justify-between items-start">
                <div className="flex gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-[24px] flex items-center justify-center text-white font-bold text-2xl shadow-emerald-100 shadow-lg">
                        {patient.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">{patient.name}</h3>
                        <p className="text-xs text-slate-400 mb-1">ID: {patient.smartId}</p>
                        <div className="flex gap-2 text-xs text-slate-500 mt-1">
                             {patient.diseases && <span className="bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[100px]">{patient.diseases}</span>}
                        </div>
                    </div>
                </div>
                
                {/* BP Indicator */}
                <div className="flex flex-col items-end">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold text-white mb-1 ${loading ? 'bg-slate-200' : status.color} ${status.animate ? 'animate-pulse' : ''}`}>
                        {loading ? '...' : (latestBP ? `${latestBP.sys}/${latestBP.dia}` : 'รอข้อมูล')}
                    </div>
                    {status.status === 'danger' && <AlertTriangle size={16} className="text-red-500 animate-bounce"/>}
                </div>
            </div>

            <button 
                onClick={(e) => { e.stopPropagation(); onRemove(patient.uid); }}
                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 transition-colors bg-white/80 rounded-full"
            >
                <XCircle size={20}/>
            </button>
        </div>
    );
};

const CaregiverHome = ({ user, onSelectPatient }) => {
    const [patients, setPatients] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addId, setAddId] = useState('');
    const [loadingAdd, setLoadingAdd] = useState(false);
    const [alertMsg, setAlertMsg] = useState('');

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'artifacts', APP_COLLECTION, 'users', user.uid, 'watching'), (snap) => {
            const list = [];
            snap.forEach(d => list.push({ uid: d.id, ...d.data() }));
            setPatients(list);
        });
        return () => unsub();
    }, [user]);

    const handleAddPatient = async () => {
        if(addId.length < 6) return;
        setLoadingAdd(true); setAlertMsg('');
        try {
            const q = query(collection(db, 'artifacts', APP_COLLECTION, 'public_smart_ids'), where("smartId", "==", addId));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const targetUid = snap.docs[0].data().uid;
                // Fetch profile to get name/disease immediately
                const pSnap = await getDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', targetUid, 'profile', 'main'));
                const pData = pSnap.exists() ? pSnap.data() : { name: `User ${addId}` };
                
                await setDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', user.uid, 'watching', targetUid), { 
                    smartId: addId, 
                    name: pData.name,
                    diseases: pData.diseases || '',
                    addedAt: serverTimestamp() 
                });
                setShowAddModal(false); setAddId('');
            } else {
                setAlertMsg('ไม่พบรหัส Smart ID นี้ในระบบ');
            }
        } catch (e) {
            console.error(e);
            setAlertMsg('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setLoadingAdd(false);
        }
    };

    const handleRemovePatient = async (targetUid) => {
        if(confirm('ต้องการยกเลิกการดูแลคนไข้ท่านนี้ใช่ไหม?')) {
            await deleteDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', user.uid, 'watching', targetUid));
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen p-6 font-sans">
             <div className="flex justify-between items-center mb-8 pt-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">ดูแลครอบครัว</h1>
                    <p className="text-slate-500 text-sm">ติดตามสุขภาพคนที่คุณรัก</p>
                </div>
                <button onClick={() => signOut(auth)} className="bg-white p-2 rounded-full border border-slate-200 text-slate-400 hover:text-red-500"><LogOut size={20}/></button>
            </div>

            <div className="grid gap-4">
                {patients.map(p => (
                    <PatientListCard key={p.uid} patient={p} onSelect={onSelectPatient} onRemove={handleRemovePatient} />
                ))}
                
                <button onClick={() => setShowAddModal(true)} className="border-2 border-dashed border-slate-300 rounded-[28px] p-6 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm"><Plus size={24}/></div>
                    <span className="font-bold">เพิ่มคนไข้ใหม่</span>
                </button>
            </div>

            {/* Add Patient Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-[40px] w-full max-w-sm shadow-2xl relative">
                        <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X/></button>
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[28px] flex items-center justify-center mx-auto mb-4"><QrCode size={40}/></div>
                            <h3 className="font-bold text-xl text-slate-800">เชื่อมต่อคนไข้</h3>
                            <p className="text-xs text-slate-500 mt-1">กรอกรหัส Smart ID 6 หลัก ของคนไข้</p>
                        </div>
                        <input 
                            value={addId} 
                            onChange={e => setAddId(e.target.value)} 
                            className="w-full text-center text-4xl font-bold p-4 bg-slate-50 rounded-2xl mb-2 tracking-[0.3em] border-2 border-transparent focus:border-emerald-500 outline-none text-slate-800" 
                            placeholder="000000" 
                            maxLength={6} 
                            autoFocus
                        />
                        {alertMsg && <p className="text-red-500 text-xs text-center mb-4 bg-red-50 p-2 rounded-lg">{alertMsg}</p>}
                        <button onClick={handleAddPatient} disabled={loadingAdd} className="w-full py-4 mt-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg hover:bg-emerald-700 transition-all">
                            {loadingAdd ? <Loader2 className="animate-spin mx-auto"/> : 'ยืนยันการเชื่อมต่อ'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Auth Screen (Simplified for Code Block) ---
const AuthScreen = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Removed auto-login useEffect to prevent custom token mismatch error
    // Users must login manually with their own credentials for custom projects

    const handleAuth = async (e) => {
        e.preventDefault(); setLoading(true); setError('');
        try {
            if (isRegister) await createUserWithEmailAndPassword(auth, email, password);
            else await signInWithEmailAndPassword(auth, email, password);
        } catch (err) { 
            console.error(err);
            if(err.code === 'auth/invalid-credential') setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
            else if (err.code === 'auth/email-already-in-use') setError('อีเมลนี้มีผู้ใช้แล้ว');
            else setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-6 relative overflow-hidden">
             <div className="bg-white/90 backdrop-blur-xl w-full max-w-sm p-8 rounded-[40px] shadow-2xl border border-white relative z-10">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[28px] flex items-center justify-center mx-auto mb-4"><Heart size={40} className="animate-pulse"/></div>
                    <h1 className="text-2xl font-bold text-slate-800">ThaiHealth Pro</h1>
                    <p className="text-slate-500 text-sm">ระบบดูแลสุขภาพอัจฉริยะ</p>
                </div>
                <form onSubmit={handleAuth} className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3 border border-transparent focus-within:border-emerald-500 transition-all">
                        <Mail className="text-slate-400"/>
                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="bg-transparent outline-none w-full text-slate-700 font-medium" placeholder="อีเมล"/>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3 border border-transparent focus-within:border-emerald-500 transition-all">
                        <Lock className="text-slate-400"/>
                        <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="bg-transparent outline-none w-full text-slate-700 font-medium" placeholder="รหัสผ่าน"/>
                    </div>
                    {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                    <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-bold shadow-lg hover:bg-emerald-700 transition-all">
                        {loading ? <Loader2 className="animate-spin mx-auto"/> : (isRegister ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ')}
                    </button>
                </form>
                <button onClick={() => setIsRegister(!isRegister)} className="mt-6 w-full text-center text-slate-400 text-sm hover:text-emerald-600">
                    {isRegister ? 'มีบัญชีแล้ว? เข้าสู่ระบบ' : 'สมัครสมาชิกใหม่'}
                </button>
             </div>
        </div>
    );
};

// --- Role Selection (Simplified) ---
const RoleSelector = ({ onSelect }) => (
    <div className="h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-[40px] w-full max-w-sm text-center shadow-xl">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">เลือกสถานะการใช้งาน</h2>
            <div className="space-y-4">
                <button onClick={() => onSelect('patient')} className="w-full p-6 border-2 border-emerald-100 rounded-[32px] hover:border-emerald-500 hover:bg-emerald-50 transition-all group">
                    <User size={40} className="mx-auto mb-2 text-emerald-600 group-hover:scale-110 transition-transform"/>
                    <span className="font-bold text-lg text-slate-700">ผู้ใช้งานทั่วไป</span>
                </button>
                <button onClick={() => onSelect('caregiver')} className="w-full p-6 border-2 border-blue-100 rounded-[32px] hover:border-blue-500 hover:bg-blue-50 transition-all group">
                    <Users size={40} className="mx-auto mb-2 text-blue-600 group-hover:scale-110 transition-transform"/>
                    <span className="font-bold text-lg text-slate-700">ผู้ดูแล / ญาติ</span>
                </button>
            </div>
             <button onClick={() => signOut(auth)} className="mt-8 text-slate-400 text-sm flex items-center justify-center gap-2 w-full hover:text-red-500"><LogOut size={16}/> เปลี่ยนบัญชี</button>
        </div>
    </div>
);

// --- Main App Entry ---
export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPatientUid, setSelectedPatientUid] = useState(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => { 
        setUser(u); 
        if(u) {
            try {
                const s = await getDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', u.uid));
                if(s.exists()) setRole(s.data().role);
            } catch(e) {}
        }
        setLoading(false); 
    });
  }, []);

  const handleRoleSelect = async (r) => {
      if(!user) return;
      const data = { role: r, setupAt: serverTimestamp() };
      if(r === 'patient') {
          const sid = generateSmartId();
          await setDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', user.uid, 'profile', 'main'), { name: "ผู้ใช้งาน", shortId: sid }, { merge: true });
          await addDoc(collection(db, 'artifacts', APP_COLLECTION, 'public_smart_ids'), { smartId: sid, uid: user.uid });
          data.shortId = sid;
      }
      await setDoc(doc(db, 'artifacts', APP_COLLECTION, 'users', user.uid), data, { merge: true });
      setRole(r);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-emerald-600" size={48}/></div>;
  if (!user) return <AuthScreen />;
  if (!role) return <RoleSelector onSelect={handleRoleSelect} />;
  
  if (role === 'caregiver') {
      if (selectedPatientUid) return <PatientDashboard targetUid={selectedPatientUid} currentUserRole="caregiver" onBack={() => setSelectedPatientUid(null)} />;
      return <CaregiverHome user={user} onSelectPatient={setSelectedPatientUid} />;
  }
  return <PatientDashboard targetUid={user.uid} currentUserRole="patient" />;
}
