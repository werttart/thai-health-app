import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { 
  Heart, Pill, Activity, User, Plus, Phone, AlertCircle, 
  Home, MessageCircle, FileText, Shield, Stethoscope, 
  Clock, Users, Trash2, ChevronLeft, ChevronRight, 
  Share2, Check, Edit2, X, AlertTriangle, Scale, Droplet, 
  Calendar as CalendarIcon, Sunrise, Sunset, Sun, Moon, 
  Lightbulb, LogOut, Lock, Mail, ChevronDown, CheckCircle, XCircle, FileBarChart
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, signInWithCustomToken, signInAnonymously 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, 
  serverTimestamp, setDoc, deleteDoc, query, orderBy, getDoc, where, getDocs, limit 
} from 'firebase/firestore';

// --- 1. การตั้งค่า Firebase ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ใช้ appId จาก environment หรือ default
const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'thai-health-v2';
// Path หลัก: artifacts/{appId}/users/{uid}/...
// Helper เพื่อสร้าง path ให้ถูกต้องตามกฎ
const getUserCollection = (uid, colName) => collection(db, 'artifacts', APP_ID, 'users', uid, colName);
const getUserDoc = (uid, colName, docId) => doc(db, 'artifacts', APP_ID, 'users', uid, colName, docId);
const getPublicCollection = (colName) => collection(db, 'artifacts', APP_ID, 'public', 'data', colName);

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

const generateSmartId = () => Math.floor(100000 + Math.random() * 900000).toString();

// --- Logic วิเคราะห์สุขภาพ (Smart Health Logic) ---
const analyzeHealth = (type, value, value2 = null) => {
    if (!value) return { status: 'ไม่มีข้อมูล', color: 'bg-slate-100 text-slate-400', level: 0 };
    
    const val = Number(value);
    
    if (type === 'sys') { // ความดันตัวบน
        if (val > 160) return { status: 'อันตรายสูง', color: 'bg-red-500 text-white animate-pulse', level: 3 };
        if (val > 140) return { status: 'สูงผิดปกติ', color: 'bg-orange-500 text-white', level: 2 };
        if (val > 120) return { status: 'เริ่มสูง', color: 'bg-yellow-100 text-yellow-700', level: 1 };
        return { status: 'ปกติ', color: 'bg-emerald-100 text-emerald-700', level: 0 };
    }
    if (type === 'sugar') { // น้ำตาล
        if (val > 200) return { status: 'อันตราย', color: 'bg-red-500 text-white', level: 3 };
        if (val > 125) return { status: 'เบาหวาน', color: 'bg-orange-500 text-white', level: 2 };
        if (val > 100) return { status: 'เสี่ยง', color: 'bg-yellow-100 text-yellow-700', level: 1 };
        return { status: 'ปกติ', color: 'bg-emerald-100 text-emerald-700', level: 0 };
    }
    if (type === 'weight') {
        return { status: 'บันทึกแล้ว', color: 'bg-blue-100 text-blue-700', level: 0 };
    }
    return { status: '-', color: 'bg-slate-100', level: 0 };
};

// --- Components ---

const Toast = ({ message, type, onClose }) => {
    useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, [onClose]);
    return (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl transition-all ${type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-600 text-white'}`}>
            {type === 'error' ? <XCircle size={24}/> : <CheckCircle size={24}/>}
            <span className="font-medium text-base">{message}</span>
        </div>
    );
};

// 1. Unified Entry Form Modal (แก้ไขข้อ 1: กรอกรวมกันได้เลย)
const UnifiedEntryModal = ({ onClose, onSave, submitting }) => {
    const [form, setForm] = useState({
        sys: '', dia: '', pulse: '',
        sugar: '', weight: '',
        hba1c: '', lipid: '', egfr: '',
        note: ''
    });

    const handleChange = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const handleSaveClick = () => {
        // กรองค่าว่างทิ้ง ส่งเฉพาะที่มีค่า
        const dataToSave = {};
        Object.keys(form).forEach(key => {
            if (form[key]) dataToSave[key] = key === 'note' ? form[key] : (isNaN(Number(form[key])) ? form[key] : Number(form[key]));
        });
        if (Object.keys(dataToSave).length === 0) return;
        onSave(dataToSave);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full sm:max-w-md rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
                <h2 className="text-2xl font-bold text-slate-800 mb-1 text-center">บันทึกสุขภาพวันนี้</h2>
                <p className="text-slate-400 text-sm text-center mb-6">กรอกเฉพาะข้อมูลที่คุณตรวจวัดมา</p>

                <div className="space-y-6">
                    {/* ความดัน */}
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                        <div className="flex items-center gap-2 mb-3 text-red-700 font-bold"><Heart size={18}/> ความดันโลหิต</div>
                        <div className="flex gap-3">
                            <input type="number" placeholder="บน (120)" className="w-full p-3 bg-white rounded-xl text-center border focus:border-red-400 outline-none" onChange={e => handleChange('sys', e.target.value)}/>
                            <input type="number" placeholder="ล่าง (80)" className="w-full p-3 bg-white rounded-xl text-center border focus:border-red-400 outline-none" onChange={e => handleChange('dia', e.target.value)}/>
                        </div>
                    </div>

                    {/* น้ำตาล */}
                    <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                        <div className="flex items-center gap-2 mb-3 text-orange-700 font-bold"><Droplet size={18}/> ระดับน้ำตาล</div>
                        <input type="number" placeholder="mg/dL (เช่น 100)" className="w-full p-3 bg-white rounded-xl text-center border focus:border-orange-400 outline-none" onChange={e => handleChange('sugar', e.target.value)}/>
                    </div>

                    {/* น้ำหนัก */}
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                        <div className="flex items-center gap-2 mb-3 text-blue-700 font-bold"><Scale size={18}/> น้ำหนักตัว</div>
                        <input type="number" placeholder="กิโลกรัม" className="w-full p-3 bg-white rounded-xl text-center border focus:border-blue-400 outline-none" onChange={e => handleChange('weight', e.target.value)}/>
                    </div>

                    {/* ผลเลือด (Lab) */}
                    <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                         <div className="flex items-center gap-2 mb-3 text-purple-700 font-bold"><FileBarChart size={18}/> ผลเลือด / Lab (ถ้ามี)</div>
                         <div className="grid grid-cols-2 gap-3">
                            <input type="number" placeholder="HbA1c" className="w-full p-2 bg-white rounded-lg text-center text-sm border outline-none" onChange={e => handleChange('hba1c', e.target.value)}/>
                            <input type="number" placeholder="ไขมัน LDL" className="w-full p-2 bg-white rounded-lg text-center text-sm border outline-none" onChange={e => handleChange('lipid', e.target.value)}/>
                            <input type="number" placeholder="eGFR (ไต)" className="w-full p-2 bg-white rounded-lg text-center text-sm border outline-none" onChange={e => handleChange('egfr', e.target.value)}/>
                         </div>
                    </div>

                    {/* หมายเหตุ */}
                    <div>
                        <label className="text-sm font-bold text-slate-500 mb-2 block">อาการ / หมายเหตุ</label>
                        <textarea 
                            className="w-full p-4 bg-slate-50 rounded-2xl border focus:border-emerald-500 outline-none resize-none text-slate-700" 
                            rows="2"
                            placeholder="เช่น เวียนหัว, นอนน้อย, กินเค็ม, เจาะเลือดที่ รพ."
                            onChange={e => handleChange('note', e.target.value)}
                        ></textarea>
                    </div>

                    <button onClick={handleSaveClick} disabled={submitting} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all text-lg">
                        {submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูลทั้งหมด'}
                    </button>
                    <button onClick={onClose} className="w-full py-3 text-slate-400 font-medium">ยกเลิก</button>
                </div>
            </div>
        </div>
    );
};

// 2. Smart Stat Card (แก้ไขข้อ 3: มีสถานะเปลี่ยนสี)
const SmartStatCard = ({ title, value, unit, icon: Icon, type, isActive, onClick, note }) => {
    const analysis = analyzeHealth(type, value);
    
    return (
        <div 
            onClick={onClick} 
            className={`relative p-5 rounded-[24px] border-2 transition-all cursor-pointer flex flex-col justify-between h-32
            ${isActive ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-slate-100 bg-white shadow-sm hover:shadow-md'}
            `}
        >
            <div className="flex justify-between items-start">
                <div className={`p-2 rounded-xl ${isActive ? 'bg-white text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                    <Icon size={20} />
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${analysis.color}`}>
                    {analysis.status}
                </span>
            </div>
            
            <div>
                <p className="text-slate-400 text-xs uppercase font-bold mb-1">{title}</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-800">{value || '-'}</span>
                    <span className="text-xs text-slate-400 font-medium">{unit}</span>
                </div>
            </div>
        </div>
    );
};

// 3. Caregiver Patient Card (แก้ไขข้อ 4: แสดงข้อมูล Real-time หน้าการ์ด)
const CaregiverPatientCard = ({ patient, onSelect, onDelete }) => {
    // ใช้ component state เพื่อ fetch ข้อมูลสุขภาพล่าสุดของคนนี้โดยเฉพาะ
    const [latestHealth, setLatestHealth] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch latest log limit 1
        const q = query(getUserCollection(patient.uid, 'health_logs'), orderBy('timestamp', 'desc'), limit(1));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                setLatestHealth(snapshot.docs[0].data());
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [patient.uid]);

    // Check status for flashing effect
    const bpAnalysis = latestHealth?.sys ? analyzeHealth('sys', latestHealth.sys) : { level: 0 };
    const isDanger = bpAnalysis.level >= 2;

    return (
        <div 
            onClick={() => onSelect(patient.uid)}
            className={`relative bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm cursor-pointer transition-all hover:shadow-lg group overflow-hidden
            ${isDanger ? 'ring-2 ring-red-400 animate-pulse-slow' : ''}
            `}
        >
            {isDanger && <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl z-10">ผิดปกติ</div>}
            
            <div className="flex items-center gap-4 mb-4">
                <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center text-2xl font-bold shadow-sm transition-transform group-hover:scale-105
                    ${isDanger ? 'bg-red-100 text-red-600' : 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white'}
                `}>
                    {patient.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-xl text-slate-800 truncate">{patient.name}</h3>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-1">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md">อายุ {patient.profile?.age || '-'}</span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md max-w-[100px] truncate">{patient.profile?.diseases || 'ไม่มีโรค'}</span>
                    </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onDelete(patient.uid); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-20">
                    <Trash2 size={20}/>
                </button>
            </div>

            {/* Health Snapshot */}
            <div className="grid grid-cols-2 gap-2 mt-2 bg-slate-50 p-3 rounded-2xl">
                <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">ความดัน</p>
                    <p className={`font-bold ${isDanger ? 'text-red-600' : 'text-slate-700'}`}>
                        {latestHealth?.sys ? `${latestHealth.sys}/${latestHealth.dia}` : '-'}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">อัปเดต</p>
                    <p className="text-xs text-slate-600">
                         {latestHealth?.timestamp ? new Date(latestHealth.timestamp.seconds * 1000).toLocaleDateString('th-TH') : '-'}
                    </p>
                </div>
            </div>
        </div>
    );
};

// --- Patient Dashboard (Main) ---
const PatientDashboard = ({ targetUid, currentUserRole, onBack }) => {
    const [activeTab, setActiveTab] = useState('home');
    const [healthLogs, setHealthLogs] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // UI State
    const [notification, setNotification] = useState(null);
    const [showEntryModal, setShowEntryModal] = useState(false);
    const [statType, setStatType] = useState('bp'); // 'bp', 'sugar', 'weight'

    const canEdit = currentUserRole === 'patient' || currentUserRole === 'caregiver';
    const showToast = (msg, type = 'success') => setNotification({ message: msg, type });

    useEffect(() => {
        if (!targetUid) return;
        
        // 1. Fetch Profile
        const unsubProfile = onSnapshot(getUserDoc(targetUid, 'profile', 'main'), (s) => { 
            if(s.exists()) setProfile(s.data()); 
        });
        
        // 2. Fetch Health Logs (All types mixed)
        const q = query(getUserCollection(targetUid, 'health_logs'), orderBy('timestamp', 'asc'));
        const unsubHealth = onSnapshot(q, s => {
             setHealthLogs(s.docs.map(d => ({id: d.id, ...d.data()}))); 
             setLoading(false);
        });
        
        return () => { unsubProfile(); unsubHealth(); };
    }, [targetUid]);

    // Handle Unified Save
    const handleSaveEntry = async (data) => {
        setSubmitting(true);
        try {
            await addDoc(getUserCollection(targetUid, 'health_logs'), {
                ...data,
                dateStr: getTodayStr(),
                timestamp: serverTimestamp()
            });
            setShowEntryModal(false);
            showToast('บันทึกข้อมูลเรียบร้อย');
        } catch(e) {
            console.error(e);
            showToast('เกิดข้อผิดพลาด', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Calculate Latest Data for Cards
    const latestLog = healthLogs.length > 0 ? healthLogs[healthLogs.length - 1] : null;
    // Find specific latest (sometimes mixed log might miss fields, so reverse find)
    const findLatest = (key) => [...healthLogs].reverse().find(l => l[key] !== undefined);
    
    const latestBP = findLatest('sys');
    const latestSugar = findLatest('sugar');
    const latestWeight = findLatest('weight');
    const latestLab = findLatest('hba1c');

    // Filter Data for Graph
    const graphData = healthLogs.filter(l => {
        if (statType === 'bp') return l.sys !== undefined;
        if (statType === 'sugar') return l.sugar !== undefined;
        if (statType === 'weight') return l.weight !== undefined;
        return false;
    }).slice(-14); // Last 14 entries

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>;

    return (
        <div className="pb-28 font-sans bg-slate-50 min-h-screen">
            {notification && <Toast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md p-6 pt-10 sticky top-0 z-30 border-b border-slate-100 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    {currentUserRole === 'caregiver' && <button onClick={onBack} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200"><ChevronLeft className="text-slate-600"/></button>}
                    <div>
                        <h1 className="font-bold text-slate-800 text-xl">{profile?.name || 'สวัสดีครับ'}</h1>
                        <p className="text-slate-400 text-xs">{currentUserRole === 'caregiver' ? 'โหมดผู้ดูแล' : 'ขอให้สุขภาพแข็งแรงนะครับ'}</p>
                    </div>
                </div>
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold">
                    {profile?.name?.charAt(0) || <User/>}
                </div>
            </div>

            <div className="p-5 space-y-6">
                
                {/* 1. Dashboard Grid (แก้ไขข้อ 2: 4 กล่องกดเปลี่ยนกราฟ) */}
                <div className="grid grid-cols-2 gap-3">
                    <SmartStatCard 
                        title="ความดัน" 
                        value={latestBP ? `${latestBP.sys}/${latestBP.dia}` : '-'} 
                        unit="mmHg" 
                        icon={Heart} 
                        type="sys" 
                        isActive={statType === 'bp'}
                        onClick={() => setStatType('bp')}
                    />
                    <SmartStatCard 
                        title="น้ำตาล" 
                        value={latestSugar ? latestSugar.sugar : '-'} 
                        unit="mg/dL" 
                        icon={Droplet} 
                        type="sugar" 
                        isActive={statType === 'sugar'}
                        onClick={() => setStatType('sugar')}
                    />
                    <SmartStatCard 
                        title="น้ำหนัก" 
                        value={latestWeight ? latestWeight.weight : '-'} 
                        unit="kg" 
                        icon={Scale} 
                        type="weight" 
                        isActive={statType === 'weight'}
                        onClick={() => setStatType('weight')}
                    />
                    {/* Lab Card */}
                    <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between h-32">
                        <div className="flex justify-between">
                            <div className="p-2 rounded-xl bg-purple-50 text-purple-600"><FileBarChart size={20}/></div>
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded-full">ล่าสุด</span>
                        </div>
                        <div>
                             <p className="text-slate-400 text-xs uppercase font-bold mb-1">ผลเลือด (HbA1c)</p>
                             <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-slate-800">{latestLab?.hba1c || '-'}</span>
                                <span className="text-xs text-slate-400">%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Graph Section */}
                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                        <Activity className="text-emerald-500"/> 
                        แนวโน้ม {statType === 'bp' ? 'ความดัน' : statType === 'sugar' ? 'ระดับน้ำตาล' : 'น้ำหนัก'}
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer>
                            <AreaChart data={graphData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={statType === 'bp' ? '#ef4444' : statType === 'sugar' ? '#f97316' : '#3b82f6'} stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid stroke="#f1f5f9" vertical={false}/>
                                <XAxis dataKey="dateStr" tick={{fontSize:10}} tickFormatter={(val) => val.split('-')[2]} axisLine={false} tickLine={false}/>
                                <Tooltip contentStyle={{borderRadius:'16px', border:'none', boxShadow:'0 10px 20px rgba(0,0,0,0.1)'}}/>
                                {statType === 'bp' ? (
                                    <>
                                        <Area type="monotone" dataKey="sys" stroke="#ef4444" fill="url(#colorValue)" strokeWidth={3}/>
                                        <Area type="monotone" dataKey="dia" stroke="#fca5a5" strokeWidth={3} strokeDasharray="5 5" fill="none"/>
                                    </>
                                ) : (
                                    <Area type="monotone" dataKey={statType} stroke={statType === 'sugar' ? '#f97316' : '#3b82f6'} fill="url(#colorValue)" strokeWidth={3}/>
                                )}
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. History & Notes (แก้ไขข้อ 1: แสดง Note และ Lab ที่หายไป) */}
                <div>
                    <h3 className="font-bold text-slate-700 mb-4 px-2">ประวัติและหมายเหตุ</h3>
                    <div className="space-y-3">
                        {healthLogs.slice().reverse().slice(0, 5).map(log => (
                            <div key={log.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex gap-4 items-start">
                                <div className="bg-slate-50 min-w-[50px] text-center py-2 rounded-xl">
                                    <span className="text-xs font-bold text-slate-400 block">{new Date(log.timestamp?.seconds * 1000).toLocaleString('th-TH', {month:'short'})}</span>
                                    <span className="text-xl font-bold text-slate-700">{new Date(log.timestamp?.seconds * 1000).getDate()}</span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {log.sys && <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-md font-bold">BP: {log.sys}/{log.dia}</span>}
                                        {log.sugar && <span className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded-md font-bold">Sugar: {log.sugar}</span>}
                                        {log.hba1c && <span className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-md font-bold">HbA1c: {log.hba1c}</span>}
                                    </div>
                                    {log.note ? (
                                        <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded-lg italic">"{log.note}"</p>
                                    ) : (
                                        <p className="text-xs text-slate-300 italic">ไม่มีบันทึกเพิ่มเติม</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* Floating Action Button */}
            {canEdit && (
                <div className="fixed bottom-6 right-6 z-40">
                    <button onClick={() => setShowEntryModal(true)} className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-full shadow-lg shadow-emerald-200 flex items-center justify-center hover:scale-105 transition-transform">
                        <Plus size={32} strokeWidth={3}/>
                    </button>
                </div>
            )}

            {/* Modals */}
            {showEntryModal && <UnifiedEntryModal onClose={() => setShowEntryModal(false)} onSave={handleSaveEntry} submitting={submitting} />}
        </div>
    );
};

// --- Caregiver View (Updated) ---
const CaregiverHome = ({ user, onSelectPatient }) => {
    const [patients, setPatients] = useState([]);
    const [addId, setAddId] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [loading, setLoading] = useState(true);

    // Fetch Patients
    useEffect(() => {
        const unsub = onSnapshot(getUserCollection(user.uid, 'watching'), async (snap) => {
            const list = await Promise.all(snap.docs.map(async (d) => {
                // Fetch Profile ของคนไข้เพื่อเอาข้อมูล อายุ/โรค มาโชว์
                const pSnap = await getDoc(getUserDoc(d.id, 'profile', 'main'));
                return { 
                    uid: d.id, 
                    ...d.data(),
                    profile: pSnap.exists() ? pSnap.data() : {} 
                };
            }));
            setPatients(list);
            setLoading(false);
        });
        return () => unsub();
    }, [user]);

    const handleAddPatient = async () => {
        if(addId.length !== 6) return;
        try {
            const q = query(getPublicCollection('public_smart_ids'), where("smartId", "==", addId));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const targetUid = snap.docs[0].data().uid;
                const pSnap = await getDoc(getUserDoc(targetUid, 'profile', 'main'));
                await setDoc(getUserDoc(user.uid, 'watching', targetUid), { 
                    name: pSnap.exists() ? pSnap.data().name : `User ${addId}`, 
                    smartId: addId, 
                    addedAt: serverTimestamp() 
                });
                setShowAddModal(false); setAddId('');
            } else { alert('ไม่พบรหัส Smart ID นี้'); }
        } catch(e) { alert('เกิดข้อผิดพลาด'); }
    };

    const handleDeletePatient = async (targetUid) => {
        if(window.confirm('ต้องการยกเลิกการดูแลคนไข้รายนี้?')) {
            await deleteDoc(getUserDoc(user.uid, 'watching', targetUid));
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen p-5 font-sans relative">
            <div className="absolute top-0 right-0 w-[50%] h-[30%] bg-emerald-100 rounded-bl-[100px] opacity-50 pointer-events-none"></div>
            <div className="relative z-10 pt-8 pb-20">
                <div className="mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">ดูแลครอบครัว</h1>
                        <p className="text-slate-500">ติดตามสุขภาพคนที่คุณรัก</p>
                    </div>
                    <button onClick={() => setShowAddModal(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-200">+ เพิ่มคนไข้</button>
                </div>
                
                {loading ? <div className="text-center py-10 text-slate-400">กำลังโหลด...</div> : (
                    <div className="space-y-4">
                        {patients.map(p => (
                            <CaregiverPatientCard 
                                key={p.uid} 
                                patient={p} 
                                onSelect={onSelectPatient} 
                                onDelete={handleDeletePatient}
                            />
                        ))}
                        {patients.length === 0 && (
                            <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-slate-200">
                                <Users size={48} className="mx-auto text-slate-300 mb-4"/>
                                <p className="text-slate-400">ยังไม่มีคนไข้ในความดูแล</p>
                            </div>
                        )}
                    </div>
                )}
                
                <button onClick={() => signOut(auth)} className="mt-12 w-full text-center text-red-400 text-sm py-4 bg-white rounded-2xl border border-red-50 hover:bg-red-50 transition-colors">ออกจากระบบ</button>
            </div>

            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-[40px] w-full max-w-sm shadow-2xl">
                        <div className="text-center mb-6">
                            <h3 className="font-bold text-xl text-slate-800">เชื่อมต่อคนไข้</h3>
                            <p className="text-xs text-slate-500">กรอกรหัส Smart ID 6 หลัก</p>
                        </div>
                        <input value={addId} onChange={e => setAddId(e.target.value)} className="w-full text-center text-4xl font-bold p-5 bg-slate-50 rounded-2xl mb-6 tracking-[0.2em] outline-none border focus:border-emerald-500" placeholder="000000" maxLength={6} autoFocus/>
                        <div className="flex gap-3">
                            <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-slate-100 rounded-2xl font-bold text-slate-500">ยกเลิก</button>
                            <button onClick={handleAddPatient} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg">เชื่อมต่อ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Auth & Role (Simplified) ---
const AuthScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegister, setIsRegister] = useState(false);
    
    const handleAuth = async (e) => {
        e.preventDefault();
        try {
            if(isRegister) await createUserWithEmailAndPassword(auth, email, password);
            else await signInWithEmailAndPassword(auth, email, password);
        } catch(e) { alert('เกิดข้อผิดพลาด: ' + e.message); }
    };

    return (
        <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-6">
            <div className="bg-white p-8 rounded-[40px] shadow-xl w-full max-w-sm">
                <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center text-emerald-600 mx-auto mb-6"><Heart size={40} fill="currentColor"/></div>
                <h1 className="text-2xl font-bold text-center text-slate-800 mb-8">{isRegister ? 'สมัครสมาชิก' : 'ยินดีต้อนรับ'}</h1>
                <form onSubmit={handleAuth} className="space-y-4">
                    <input type="email" placeholder="Email" className="w-full p-4 bg-slate-50 rounded-2xl outline-none" value={email} onChange={e => setEmail(e.target.value)} required/>
                    <input type="password" placeholder="Password" className="w-full p-4 bg-slate-50 rounded-2xl outline-none" value={password} onChange={e => setPassword(e.target.value)} required/>
                    <button className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-emerald-700 transition-all">{isRegister ? 'สมัครเลย' : 'เข้าสู่ระบบ'}</button>
                </form>
                <button onClick={() => setIsRegister(!isRegister)} className="w-full mt-4 text-slate-400 text-sm">{isRegister ? 'มีบัญชีแล้ว?' : 'ยังไม่มีบัญชี?'}</button>
            </div>
        </div>
    );
};

const RoleSelector = ({ onSelect }) => (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-6">
        <div className="space-y-4 w-full max-w-sm">
            <h1 className="text-2xl font-bold text-center text-slate-800 mb-8">เลือกการใช้งาน</h1>
            <button onClick={() => onSelect('patient')} className="w-full p-6 bg-white rounded-[32px] shadow-sm hover:shadow-lg transition-all flex items-center gap-4">
                <div className="bg-emerald-100 p-4 rounded-full text-emerald-600"><User size={32}/></div>
                <div className="text-left">
                    <h3 className="font-bold text-lg text-slate-800">ผู้ใช้งานทั่วไป</h3>
                    <p className="text-xs text-slate-400">บันทึกสุขภาพตนเอง</p>
                </div>
            </button>
            <button onClick={() => onSelect('caregiver')} className="w-full p-6 bg-white rounded-[32px] shadow-sm hover:shadow-lg transition-all flex items-center gap-4">
                <div className="bg-blue-100 p-4 rounded-full text-blue-600"><Users size={32}/></div>
                <div className="text-left">
                    <h3 className="font-bold text-lg text-slate-800">ผู้ดูแล / ญาติ</h3>
                    <p className="text-xs text-slate-400">ติดตามสุขภาพครอบครัว</p>
                </div>
            </button>
            <button onClick={() => signOut(auth)} className="w-full text-center text-slate-400 text-sm pt-4">ออกจากระบบ</button>
        </div>
    </div>
);

// --- Main App ---
export default function App() {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedPatientUid, setSelectedPatientUid] = useState(null);

    // Initial Auth Logic for React Environment
    useEffect(() => {
        const initAuth = async () => {
             if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await signInWithCustomToken(auth, __initial_auth_token);
             } else {
                await signInAnonymously(auth);
             }
        };
        initAuth();
        
        return onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if(u) {
                // Check Role
                const snap = await getDoc(getUserDoc(u.uid, 'profile', 'main')); // Check virtual profile doc for role storage pattern
                // In this simple version, we store role in root user doc or local state. 
                // For simplicity here: Check if user doc exists with role
                const userDoc = await getDoc(getUserDoc(u.uid, 'settings', 'role'));
                if(userDoc.exists()) setRole(userDoc.data().role);
            }
            setLoading(false);
        });
    }, []);

    const handleRoleSelect = async (selectedRole) => {
        if(!user) return;
        // Save role
        await setDoc(getUserDoc(user.uid, 'settings', 'role'), { role: selectedRole });
        
        // Setup initial profile if patient
        if(selectedRole === 'patient') {
             const shortId = generateSmartId();
             await setDoc(getUserDoc(user.uid, 'profile', 'main'), { name: "ผู้ใช้งาน", shortId }, { merge: true });
             await addDoc(getPublicCollection('public_smart_ids'), { smartId: shortId, uid: user.uid });
        }
        setRole(selectedRole);
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin text-emerald-600"><Activity/></div></div>;
    if (!user) return <AuthScreen />;
    if (!role) return <RoleSelector onSelect={handleRoleSelect} />;
    
    if (role === 'caregiver') {
        if (selectedPatientUid) return <PatientDashboard targetUid={selectedPatientUid} currentUserRole="caregiver" onBack={() => setSelectedPatientUid(null)} />;
        return <CaregiverHome user={user} onSelectPatient={setSelectedPatientUid} />;
    }
    
    return <PatientDashboard targetUid={user.uid} currentUserRole="patient" />;
}
