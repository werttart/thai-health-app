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
  Lightbulb, LogOut, Lock, Mail, ChevronDown, CheckCircle, XCircle, FileBarChart,
  Infinity as InfinityIcon
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

const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'thai-health-v2-merged';
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
const formatDateThai = (dateStr) => { if(!dateStr) return ''; const date = new Date(dateStr); return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }); };
const formatFullDateThai = (date) => { return date.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); };

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

// --- Logic วิเคราะห์สุขภาพ (Smart Health Logic) ---
const analyzeHealth = (type, value) => {
    if (!value) return { status: 'ไม่มีข้อมูล', color: 'bg-slate-100 text-slate-400', level: 0 };
    const val = Number(value);
    if (type === 'sys') { 
        if (val > 160) return { status: 'อันตรายสูง', color: 'bg-red-500 text-white animate-pulse', level: 3 };
        if (val > 140) return { status: 'สูงผิดปกติ', color: 'bg-orange-500 text-white', level: 2 };
        if (val > 120) return { status: 'เริ่มสูง', color: 'bg-yellow-100 text-yellow-700', level: 1 };
        return { status: 'ปกติ', color: 'bg-emerald-100 text-emerald-700', level: 0 };
    }
    if (type === 'sugar') { 
        if (val > 200) return { status: 'อันตราย', color: 'bg-red-500 text-white', level: 3 };
        if (val > 125) return { status: 'เบาหวาน', color: 'bg-orange-500 text-white', level: 2 };
        if (val > 100) return { status: 'เสี่ยง', color: 'bg-yellow-100 text-yellow-700', level: 1 };
        return { status: 'ปกติ', color: 'bg-emerald-100 text-emerald-700', level: 0 };
    }
    if (type === 'weight') return { status: 'บันทึกแล้ว', color: 'bg-blue-100 text-blue-700', level: 0 };
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

const CurrentTimeWidget = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => { const timer = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(timer); }, []);
    return (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-6 rounded-[32px] shadow-lg shadow-emerald-200 mb-6 relative overflow-hidden">
            <div className="absolute right-[-20px] top-[-20px] opacity-10"><Clock size={150} /></div>
            <p className="text-emerald-100 text-sm mb-1">{formatFullDateThai(time)}</p>
            <h2 className="text-5xl font-bold tracking-tight">
                {time.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                <span className="text-lg font-normal ml-2">น.</span>
            </h2>
        </div>
    );
};

// 2. Smart Stat Card (New)
const SmartStatCard = ({ title, value, unit, icon: Icon, type, isActive, onClick }) => {
    const analysis = analyzeHealth(type, value?.split('/')[0] || value); // Handle BP format 120/80
    return (
        <div onClick={onClick} className={`relative p-5 rounded-[24px] border-2 transition-all cursor-pointer flex flex-col justify-between h-32 ${isActive ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-slate-100 bg-white shadow-sm hover:shadow-md'}`}>
            <div className="flex justify-between items-start">
                <div className={`p-2 rounded-xl ${isActive ? 'bg-white text-emerald-600' : 'bg-slate-50 text-slate-400'}`}><Icon size={20} /></div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${analysis.color}`}>{analysis.status}</span>
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
                                <div>
                                    <h4 className={`font-bold text-lg ${isTaken ? 'text-emerald-800 line-through opacity-70' : 'text-slate-700'}`}>{med.name}</h4>
                                    <p className="text-xs text-slate-400">{med.dose || '1 หน่วย'} • {med.detail || 'ก่อนอาหาร'}</p>
                                </div>
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

// 1. Unified Entry Form Modal (New)
const UnifiedEntryModal = ({ onClose, onSave, submitting }) => {
    const [form, setForm] = useState({ sys: '', dia: '', sugar: '', weight: '', hba1c: '', lipid: '', egfr: '', note: '' });
    const handleChange = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
    const handleSaveClick = () => {
        const dataToSave = {};
        Object.keys(form).forEach(key => { if (form[key]) dataToSave[key] = key === 'note' ? form[key] : (isNaN(Number(form[key])) ? form[key] : Number(form[key])); });
        if (Object.keys(dataToSave).length === 0) return;
        onSave(dataToSave);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full sm:max-w-md rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
                <h2 className="text-2xl font-bold text-slate-800 mb-1 text-center">บันทึกสุขภาพวันนี้</h2>
                <div className="space-y-6 mt-4">
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                        <div className="flex items-center gap-2 mb-3 text-red-700 font-bold"><Heart size={18}/> ความดันโลหิต</div>
                        <div className="flex gap-3">
                            <input type="number" placeholder="บน (120)" className="w-full p-3 bg-white rounded-xl text-center border focus:border-red-400 outline-none" onChange={e => handleChange('sys', e.target.value)}/>
                            <input type="number" placeholder="ล่าง (80)" className="w-full p-3 bg-white rounded-xl text-center border focus:border-red-400 outline-none" onChange={e => handleChange('dia', e.target.value)}/>
                        </div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                        <div className="flex items-center gap-2 mb-3 text-orange-700 font-bold"><Droplet size={18}/> ระดับน้ำตาล</div>
                        <input type="number" placeholder="mg/dL (เช่น 100)" className="w-full p-3 bg-white rounded-xl text-center border focus:border-orange-400 outline-none" onChange={e => handleChange('sugar', e.target.value)}/>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                        <div className="flex items-center gap-2 mb-3 text-blue-700 font-bold"><Scale size={18}/> น้ำหนักตัว</div>
                        <input type="number" placeholder="กิโลกรัม" className="w-full p-3 bg-white rounded-xl text-center border focus:border-blue-400 outline-none" onChange={e => handleChange('weight', e.target.value)}/>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                         <div className="flex items-center gap-2 mb-3 text-purple-700 font-bold"><FileBarChart size={18}/> ผลเลือด / Lab (ถ้ามี)</div>
                         <div className="grid grid-cols-2 gap-3">
                            <input type="number" placeholder="HbA1c" className="w-full p-2 bg-white rounded-lg text-center text-sm border outline-none" onChange={e => handleChange('hba1c', e.target.value)}/>
                            <input type="number" placeholder="ไขมัน LDL" className="w-full p-2 bg-white rounded-lg text-center text-sm border outline-none" onChange={e => handleChange('lipid', e.target.value)}/>
                         </div>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-slate-500 mb-2 block">อาการ / หมายเหตุ</label>
                        <textarea className="w-full p-4 bg-slate-50 rounded-2xl border focus:border-emerald-500 outline-none resize-none text-slate-700" rows="2" placeholder="เช่น เวียนหัว, นอนน้อย..." onChange={e => handleChange('note', e.target.value)}></textarea>
                    </div>
                    <button onClick={handleSaveClick} disabled={submitting} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg">{submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button>
                    <button onClick={onClose} className="w-full py-3 text-slate-400 font-medium">ยกเลิก</button>
                </div>
            </div>
        </div>
    );
};

// 3. Caregiver Patient Card (New)
const CaregiverPatientCard = ({ patient, onSelect, onDelete }) => {
    const [latestHealth, setLatestHealth] = useState(null);
    useEffect(() => {
        const q = query(getUserCollection(patient.uid, 'health_logs'), orderBy('timestamp', 'desc'), limit(1));
        const unsubscribe = onSnapshot(q, (snapshot) => { if (!snapshot.empty) setLatestHealth(snapshot.docs[0].data()); });
        return () => unsubscribe();
    }, [patient.uid]);

    const bpAnalysis = latestHealth?.sys ? analyzeHealth('sys', latestHealth.sys) : { level: 0 };
    const isDanger = bpAnalysis.level >= 2;

    return (
        <div onClick={() => onSelect(patient.uid)} className={`relative bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm cursor-pointer transition-all hover:shadow-lg group overflow-hidden ${isDanger ? 'ring-2 ring-red-400 animate-pulse' : ''}`}>
            {isDanger && <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl z-10">ผิดปกติ</div>}
            <div className="flex items-center gap-4 mb-4">
                <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center text-2xl font-bold shadow-sm ${isDanger ? 'bg-red-100 text-red-600' : 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white'}`}>{patient.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-xl text-slate-800 truncate">{patient.name}</h3>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-1">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md">อายุ {patient.profile?.age || '-'}</span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md max-w-[100px] truncate">{patient.profile?.diseases || 'ไม่มีโรค'}</span>
                    </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onDelete(patient.uid); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-20"><Trash2 size={20}/></button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 bg-slate-50 p-3 rounded-2xl">
                <div><p className="text-[10px] text-slate-400 font-bold uppercase">ความดัน</p><p className={`font-bold ${isDanger ? 'text-red-600' : 'text-slate-700'}`}>{latestHealth?.sys ? `${latestHealth.sys}/${latestHealth.dia}` : '-'}</p></div>
                <div><p className="text-[10px] text-slate-400 font-bold uppercase">อัปเดต</p><p className="text-xs text-slate-600">{latestHealth?.timestamp ? new Date(latestHealth.timestamp.seconds * 1000).toLocaleDateString('th-TH') : '-'}</p></div>
            </div>
        </div>
    );
};

// --- Patient Dashboard ---
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
    
    // UI State
    const [notification, setNotification] = useState(null);
    const [showEntryModal, setShowEntryModal] = useState(false);
    const [statType, setStatType] = useState('bp'); // 'bp', 'sugar', 'weight', 'lab'
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, collection: null, id: null, title: '' });

    // Modals
    const [showMedModal, setShowMedModal] = useState(false); const [editMedId, setEditMedId] = useState(null); const [formMed, setFormMed] = useState({});
    const [showApptModal, setShowApptModal] = useState(false); const [editApptId, setEditApptId] = useState(null); const [formAppt, setFormAppt] = useState({});
    const [showFamilyModal, setShowFamilyModal] = useState(false); const [editFamilyId, setEditFamilyId] = useState(null); const [formFamily, setFormFamily] = useState({});
    const [showEditProfile, setShowEditProfile] = useState(false); const [formProfile, setFormProfile] = useState({});

    const canEdit = currentUserRole === 'patient' || currentUserRole === 'caregiver';
    const showToast = (msg, type = 'success') => setNotification({ message: msg, type });

    useEffect(() => {
        if (!targetUid) return;
        const unsubMeds = onSnapshot(getUserCollection(targetUid, 'medications'), s => setMeds(s.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubHistory = onSnapshot(getUserCollection(targetUid, 'daily_logs'), s => { const h = {}; s.docs.forEach(d => h[d.id] = d.data()); setMedHistory(h); });
        const unsubAppts = onSnapshot(query(getUserCollection(targetUid, 'appointments'), orderBy('date')), s => setAppointments(s.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubFamily = onSnapshot(getUserCollection(targetUid, 'family_members'), s => setFamily(s.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubProfile = onSnapshot(getUserDoc(targetUid, 'profile', 'main'), (s) => { if(s.exists()) setProfile(s.data()); setFormProfile(s.data() || {}); });
        const unsubHealth = onSnapshot(query(getUserCollection(targetUid, 'health_logs'), orderBy('timestamp', 'asc')), s => { setHealthLogs(s.docs.map(d => ({id: d.id, ...d.data()}))); setLoading(false); });
        
        return () => { unsubMeds(); unsubHistory(); unsubAppts(); unsubFamily(); unsubProfile(); unsubHealth(); };
    }, [targetUid]);

    // Actions
    const handleSaveEntry = async (data) => {
        setSubmitting(true);
        try { await addDoc(getUserCollection(targetUid, 'health_logs'), { ...data, dateStr: getTodayStr(), timestamp: serverTimestamp() }); setShowEntryModal(false); showToast('บันทึกข้อมูลเรียบร้อย'); } catch(e) { showToast('เกิดข้อผิดพลาด', 'error'); } finally { setSubmitting(false); }
    };
    const toggleMedToday = async (medId) => {
        if(!canEdit) return;
        const today = getTodayStr();
        const current = medHistory[today]?.takenMeds || [];
        const newTaken = current.includes(medId) ? current.filter(id => id !== medId) : [...current, medId];
        await setDoc(getUserDoc(targetUid, 'daily_logs', today), { takenMeds: newTaken }, { merge: true });
    };
    const handleSave = async (fn) => { setSubmitting(true); try { await fn(); showToast('บันทึกสำเร็จ'); } catch(e) { showToast("เกิดข้อผิดพลาด", 'error'); } setSubmitting(false); };
    const confirmDelete = async () => { await deleteDoc(getUserDoc(targetUid, deleteConfirm.collection, deleteConfirm.id)); setDeleteConfirm({ isOpen: false, collection: null, id: null, title: '' }); showToast('ลบข้อมูลเรียบร้อย'); };
    const handleShareToLine = () => {
        const message = `สุขภาพวันนี้\nคุณ ${profile?.name || '-'}\nBP: ${latestBP?.sys || '-'}/${latestBP?.dia || '-'} mmHg\nSugar: ${latestSugar?.sugar || '-'} mg/dL`;
        window.open(`https://line.me/R/msg/text/?${encodeURIComponent(message)}`, '_blank');
    };

    // Derived Data
    const findLatest = (key) => [...healthLogs].reverse().find(l => l[key] !== undefined);
    const latestBP = findLatest('sys'); const latestSugar = findLatest('sugar'); const latestWeight = findLatest('weight'); const latestLab = findLatest('hba1c');
    const medGroups = groupMedsByPeriod(meds);
    const nextAppt = appointments.filter(a => new Date(a.date) >= new Date().setHours(0,0,0,0))[0];
    const graphData = healthLogs.filter(l => { if (statType === 'bp') return l.sys; if (statType === 'sugar') return l.sugar; if (statType === 'weight') return l.weight; return l.hba1c; }).slice(-14);

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin text-emerald-600"><Activity/></div></div>;

    return (
        <div className="pb-28 font-sans bg-slate-50 min-h-screen">
            {notification && <Toast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            
            {/* Header */}
            <div className="bg-white/90 backdrop-blur-md p-6 pt-10 sticky top-0 z-30 border-b border-slate-100 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    {currentUserRole === 'caregiver' && <button onClick={onBack} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200"><ChevronLeft className="text-slate-600"/></button>}
                    <div><h1 className="font-bold text-slate-800 text-xl">{profile?.name || 'สวัสดีครับ'}</h1><p className="text-slate-400 text-xs">{currentUserRole === 'caregiver' ? 'โหมดผู้ดูแล' : 'ขอให้สุขภาพแข็งแรงนะครับ'}</p></div>
                </div>
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold">{profile?.name?.charAt(0) || <User/>}</div>
            </div>

            <div className="p-5">
                {activeTab === 'home' && (
                    <div className="space-y-6">
                        <CurrentTimeWidget />
                        <button onClick={handleShareToLine} className="w-full bg-[#06C755] text-white p-3 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-md hover:bg-[#05b64d] transition-all mb-2"><Share2 size={20}/> แชร์สรุปวันนี้เข้า LINE</button>
                        
                        {/* Summary Smart Cards */}
                        <div className="grid grid-cols-3 gap-3">
                            <SmartStatCard title="ความดัน" value={latestBP ? `${latestBP.sys}/${latestBP.dia}` : '-'} unit="mmHg" icon={Heart} type="sys" onClick={() => setActiveTab('stats')}/>
                            <SmartStatCard title="น้ำตาล" value={latestSugar ? latestSugar.sugar : '-'} unit="mg/dL" icon={Droplet} type="sugar" onClick={() => setActiveTab('stats')}/>
                            <SmartStatCard title="น้ำหนัก" value={latestWeight ? latestWeight.weight : '-'} unit="kg" icon={Scale} type="weight" onClick={() => setActiveTab('stats')}/>
                        </div>

                        {/* Next Appointment Teaser */}
                        {nextAppt && (
                            <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition-all" onClick={() => setActiveTab('care')}>
                                <div className="bg-orange-100 text-orange-600 p-4 rounded-2xl flex flex-col items-center min-w-[70px]">
                                    <span className="text-xs font-bold uppercase">{new Date(nextAppt.date).toLocaleString('th-TH', { month: 'short' })}</span>
                                    <span className="text-2xl font-bold">{new Date(nextAppt.date).getDate()}</span>
                                </div>
                                <div>
                                    <p className="text-xs text-orange-500 font-bold uppercase mb-1">นัดหมายเร็วๆ นี้</p>
                                    <h3 className="font-bold text-slate-800">{nextAppt.location}</h3>
                                    <p className="text-sm text-slate-400">{nextAppt.time} น. • {nextAppt.dept}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'care' && (
                    <div className="space-y-6">
                        {/* Medications */}
                        <div>
                            <div className="flex justify-between items-end mb-4 px-1">
                                <h2 className="font-bold text-slate-700 text-xl flex items-center gap-2"><Pill className="text-emerald-500"/> ยาของฉัน</h2>
                                {canEdit && <button onClick={() => { setFormMed({name:'', dose:'', detail:'หลังอาหาร', period:'เช้า', isForever: true, startDate: getTodayStr()}); setEditMedId(null); setShowMedModal(true); }} className="text-emerald-600 text-sm font-bold bg-emerald-50 px-3 py-1.5 rounded-xl hover:bg-emerald-100">+ เพิ่มยา</button>}
                            </div>
                            {meds.length === 0 ? <div className="text-center py-10 bg-slate-50 rounded-3xl border-dashed border-2"><p className="text-slate-400">ยังไม่มีรายการยา</p></div> : (
                                <>
                                    <MedicineGroup title="ช่วงเช้า" icon={Sunrise} meds={medGroups['เช้า']} medHistory={medHistory} toggleMed={toggleMedToday} canEdit={canEdit} onEdit={(m) => {setFormMed(m); setEditMedId(m.id); setShowMedModal(true);}} onDelete={(id,n) => setDeleteConfirm({isOpen:true, collection:'medications', id, title:n})} />
                                    <MedicineGroup title="ช่วงกลางวัน" icon={Sun} meds={medGroups['กลางวัน']} medHistory={medHistory} toggleMed={toggleMedToday} canEdit={canEdit} onEdit={(m) => {setFormMed(m); setEditMedId(m.id); setShowMedModal(true);}} onDelete={(id,n) => setDeleteConfirm({isOpen:true, collection:'medications', id, title:n})} />
                                    <MedicineGroup title="ช่วงเย็น" icon={Sunset} meds={medGroups['เย็น']} medHistory={medHistory} toggleMed={toggleMedToday} canEdit={canEdit} onEdit={(m) => {setFormMed(m); setEditMedId(m.id); setShowMedModal(true);}} onDelete={(id,n) => setDeleteConfirm({isOpen:true, collection:'medications', id, title:n})} />
                                    <MedicineGroup title="ก่อนนอน" icon={Moon} meds={medGroups['ก่อนนอน']} medHistory={medHistory} toggleMed={toggleMedToday} canEdit={canEdit} onEdit={(m) => {setFormMed(m); setEditMedId(m.id); setShowMedModal(true);}} onDelete={(id,n) => setDeleteConfirm({isOpen:true, collection:'medications', id, title:n})} />
                                </>
                            )}
                        </div>
                        {/* Appointments */}
                        <div>
                             <div className="flex justify-between items-center mb-4">
                                 <h2 className="font-bold text-slate-700 text-xl flex items-center gap-2"><CalendarIcon className="text-orange-500"/> นัดหมายแพทย์</h2>
                                 {canEdit && <button onClick={() => { setFormAppt({date:'',time:'',location:'',dept:''}); setEditApptId(null); setShowApptModal(true); }} className="bg-orange-50 text-orange-600 px-3 py-1.5 rounded-xl text-sm font-bold hover:bg-orange-100">+ เพิ่มนัด</button>}
                             </div>
                             <div className="space-y-3">
                                {appointments.map(a => (
                                    <div key={a.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex gap-4">
                                        <div className="bg-orange-50 p-3 rounded-xl flex flex-col items-center min-w-[60px]"><span className="text-xs font-bold text-orange-400">{new Date(a.date).toLocaleString('th-TH', { month: 'short' })}</span><span className="text-xl font-bold text-orange-600">{new Date(a.date).getDate()}</span></div>
                                        <div className="flex-1">
                                            <div className="flex justify-between">
                                                <h3 className="font-bold text-slate-700">{a.location}</h3>
                                                {canEdit && <div className="flex gap-2"><button onClick={() => { setFormAppt(a); setEditApptId(a.id); setShowApptModal(true); }}><Edit2 size={16} className="text-slate-300"/></button><button onClick={() => setDeleteConfirm({isOpen:true, collection:'appointments', id:a.id, title:'นัดหมาย'})}><Trash2 size={16} className="text-slate-300"/></button></div>}
                                            </div>
                                            <p className="text-sm text-slate-500">{a.time} น. • {a.dept}</p>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'stats' && (
                    <div className="space-y-6">
                        <h1 className="text-2xl font-bold text-slate-800 mb-2">สถิติสุขภาพ</h1>
                        
                        {/* 4 Box Dashboard Selector */}
                        <div className="grid grid-cols-2 gap-3">
                            <SmartStatCard title="ความดัน" value={latestBP ? `${latestBP.sys}/${latestBP.dia}` : '-'} unit="mmHg" icon={Heart} type="sys" isActive={statType === 'bp'} onClick={() => setStatType('bp')}/>
                            <SmartStatCard title="น้ำตาล" value={latestSugar ? latestSugar.sugar : '-'} unit="mg/dL" icon={Droplet} type="sugar" isActive={statType === 'sugar'} onClick={() => setStatType('sugar')}/>
                            <SmartStatCard title="น้ำหนัก" value={latestWeight ? latestWeight.weight : '-'} unit="kg" icon={Scale} type="weight" isActive={statType === 'weight'} onClick={() => setStatType('weight')}/>
                            <div onClick={() => setStatType('lab')} className={`p-5 rounded-[24px] border-2 cursor-pointer flex flex-col justify-between h-32 ${statType === 'lab' ? 'border-purple-500 bg-purple-50' : 'border-slate-100 bg-white'}`}>
                                <div className="flex justify-between"><div className={`p-2 rounded-xl ${statType === 'lab' ? 'bg-white text-purple-600' : 'bg-purple-50 text-purple-600'}`}><FileBarChart size={20}/></div></div>
                                <div><p className="text-slate-400 text-xs uppercase font-bold mb-1">ผลเลือด (HbA1c)</p><div className="flex items-baseline gap-1"><span className="text-2xl font-bold text-slate-800">{latestLab?.hba1c || '-'}</span><span className="text-xs text-slate-400">%</span></div></div>
                            </div>
                        </div>

                        {/* Interactive Graph */}
                        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
                             <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Activity className="text-emerald-500"/> แนวโน้ม (14 ครั้งล่าสุด)</h3>
                             <div className="h-64 w-full">
                                <ResponsiveContainer>
                                    <AreaChart data={graphData}>
                                        <defs>
                                            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={statType==='bp'?'#ef4444':statType==='sugar'?'#f97316':statType==='weight'?'#3b82f6':'#a855f7'} stopOpacity={0.2}/>
                                                <stop offset="95%" stopColor="#fff" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid stroke="#f1f5f9" vertical={false}/>
                                        <XAxis dataKey="dateStr" tick={{fontSize:10}} tickFormatter={(val) => val.split('-')[2]} axisLine={false} tickLine={false}/>
                                        <Tooltip contentStyle={{borderRadius:'12px'}}/>
                                        {statType === 'bp' ? (
                                            <><Area type="monotone" dataKey="sys" stroke="#ef4444" fill="url(#colorVal)" strokeWidth={3}/><Area type="monotone" dataKey="dia" stroke="#fca5a5" strokeWidth={3} strokeDasharray="5 5" fill="none"/></>
                                        ) : (
                                            <Area type="monotone" dataKey={statType === 'lab' ? 'hba1c' : statType} stroke={statType==='sugar'?'#f97316':statType==='weight'?'#3b82f6':'#a855f7'} fill="url(#colorVal)" strokeWidth={3}/>
                                        )}
                                    </AreaChart>
                                </ResponsiveContainer>
                             </div>
                        </div>

                        {/* History & Notes List */}
                        <div>
                            <h3 className="font-bold text-slate-700 mb-4">ประวัติและหมายเหตุ</h3>
                            <div className="space-y-3">
                                {healthLogs.slice().reverse().slice(0, 10).map(log => (
                                    <div key={log.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex gap-4 items-start">
                                        <div className="bg-slate-50 min-w-[50px] text-center py-2 rounded-xl"><span className="text-xs font-bold text-slate-400 block">{new Date(log.timestamp?.seconds * 1000).toLocaleString('th-TH', {month:'short'})}</span><span className="text-xl font-bold text-slate-700">{new Date(log.timestamp?.seconds * 1000).getDate()}</span></div>
                                        <div className="flex-1">
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {log.sys && <span className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded-md font-bold">BP: {log.sys}/{log.dia}</span>}
                                                {log.sugar && <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-1 rounded-md font-bold">Sugar: {log.sugar}</span>}
                                                {log.hba1c && <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-1 rounded-md font-bold">HbA1c: {log.hba1c}</span>}
                                            </div>
                                            {log.note && <p className="text-sm text-slate-600 bg-yellow-50 p-2 rounded-lg italic border border-yellow-100"><span className="font-bold not-italic text-yellow-600">Note:</span> {log.note}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-[32px] p-8 text-white text-center shadow-lg shadow-emerald-200 relative overflow-hidden">
                             <div className="absolute top-0 right-0 opacity-10"><Shield size={180}/></div>
                             <p className="text-emerald-100 text-sm mb-1 uppercase tracking-wider">Smart ID ของฉัน</p>
                             <h1 className="text-5xl font-bold tracking-widest mb-4 font-mono">{profile?.shortId || '------'}</h1>
                        </div>
                        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
                            <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><User className="text-emerald-500"/> ข้อมูลส่วนตัว</h3><button onClick={() => { setFormProfile(profile); setShowEditProfile(true); }} className="text-slate-400 hover:text-emerald-600"><Edit2 size={18}/></button></div>
                            <div className="space-y-4">
                                <div className="flex justify-between border-b border-slate-50 pb-3"><span className="text-slate-400 text-sm">ชื่อ-สกุล</span><span className="font-bold text-slate-700">{profile?.name}</span></div>
                                <div className="flex justify-between border-b border-slate-50 pb-3"><span className="text-slate-400 text-sm">อายุ</span><span className="font-bold text-slate-700">{profile?.age || '-'} ปี</span></div>
                                <div className="flex justify-between border-b border-slate-50 pb-3"><span className="text-slate-400 text-sm">โรคประจำตัว</span><span className="font-bold text-slate-700">{profile?.diseases || '-'}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400 text-sm">แพ้ยา</span><span className="font-bold text-red-500">{profile?.allergies || '-'}</span></div>
                            </div>
                        </div>
                        {/* Family Section */}
                        <div>
                             <div className="flex justify-between items-center mb-4 px-2"><h3 className="font-bold text-slate-700 text-lg">ลูกหลาน ({family.length})</h3><button onClick={() => { setFormFamily({name:'',phone:'',relation:'ลูก'}); setEditFamilyId(null); setShowFamilyModal(true); }} className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-100">+ เพิ่ม</button></div>
                             <div className="grid gap-3">{family.map(f => (<div key={f.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold">{f.name.charAt(0)}</div><div><p className="font-bold text-slate-700">{f.name}</p><p className="text-xs text-slate-400">{f.relation}</p></div></div><div className="flex gap-2">{f.phone && <a href={`tel:${f.phone}`} className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><Phone size={18}/></a>}<button onClick={() => setDeleteConfirm({isOpen:true, collection:'family_members', id:f.id, title:f.name})} className="w-10 h-10 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center hover:bg-red-50 hover:text-red-500"><Trash2 size={18}/></button></div></div>))}</div>
                        </div>
                        <button onClick={() => signOut(auth)} className="w-full py-4 text-red-400 font-bold bg-white rounded-2xl border border-red-50 hover:bg-red-50 transition-colors">ออกจากระบบ</button>
                    </div>
                )}
            </div>

            {/* Navigation Bar */}
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] max-w-sm bg-white/90 backdrop-blur-xl border border-white shadow-2xl rounded-full p-2 flex justify-between items-center z-40 px-6">
                <button onClick={() => setActiveTab('home')} className={`p-3 rounded-full transition-all ${activeTab === 'home' ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400'}`}><Home size={24}/></button>
                <button onClick={() => setActiveTab('care')} className={`p-3 rounded-full transition-all ${activeTab === 'care' ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400'}`}><CalendarIcon size={24}/></button>
                <button onClick={() => setShowEntryModal(true)} className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-4 rounded-full shadow-lg shadow-emerald-200 transform -translate-y-6 border-[4px] border-slate-50"><Plus size={28} strokeWidth={3}/></button>
                <button onClick={() => setActiveTab('stats')} className={`p-3 rounded-full transition-all ${activeTab === 'stats' ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400'}`}><Activity size={24}/></button>
                <button onClick={() => setActiveTab('profile')} className={`p-3 rounded-full transition-all ${activeTab === 'profile' ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400'}`}><User size={24}/></button>
            </div>

            {/* Modals */}
            {showEntryModal && <UnifiedEntryModal onClose={() => setShowEntryModal(false)} onSave={handleSaveEntry} submitting={submitting} />}
            {showMedModal && (
                <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
                        <h3 className="font-bold text-xl text-center mb-6">{editMedId ? 'แก้ไขยา' : 'เพิ่มยาใหม่'}</h3>
                        <div className="space-y-4 mb-6">
                            <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none" placeholder="ชื่อยา" value={formMed.name || ''} onChange={e => setFormMed({...formMed, name: e.target.value})}/>
                            <div className="flex gap-2"><input className="flex-1 p-4 bg-slate-50 rounded-2xl outline-none" placeholder="ขนาด" value={formMed.dose || ''} onChange={e => setFormMed({...formMed, dose: e.target.value})}/><input className="flex-1 p-4 bg-slate-50 rounded-2xl outline-none" placeholder="รายละเอียด" value={formMed.detail || ''} onChange={e => setFormMed({...formMed, detail: e.target.value})}/></div>
                            <div className="p-4 bg-slate-50 rounded-2xl"><label className="text-xs font-bold text-slate-400 mb-3 block">ช่วงเวลา</label><div className="grid grid-cols-3 gap-2">{['เช้า','กลางวัน','เย็น','ก่อนนอน','อื่นๆ'].map(p => (<button key={p} onClick={() => setFormMed({...formMed, period: p})} className={`p-2 rounded-xl text-sm border ${formMed.period === p ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500'}`}>{p}</button>))}</div></div>
                            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setFormMed({...formMed, isForever: !formMed.isForever})}><div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${formMed.isForever ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>{formMed.isForever && <Check size={14} className="text-white"/>}</div><span className="text-sm font-medium">กินตลอดไป (ยาประจำ)</span></div>
                        </div>
                        <div className="flex gap-3"><button onClick={() => setShowMedModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold">ยกเลิก</button><button onClick={() => handleSave(async () => { const c = getUserCollection(targetUid, 'medications'); if(editMedId) await updateDoc(doc(c, editMedId), formMed); else await addDoc(c, formMed); setShowMedModal(false); })} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg">บันทึก</button></div>
                    </div>
                </div>
            )}
             {/* Note: Other modals (Appt, Family, Profile, Delete) follow similar pattern, omitted for brevity but included in full file logic */}
             {showApptModal && (<div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl"><h3 className="font-bold text-xl text-center mb-6">นัดหมอ</h3><div className="space-y-3 mb-6"><div className="flex gap-2"><input type="date" className="flex-1 p-3 bg-slate-50 rounded-2xl outline-none" value={formAppt.date || ''} onChange={e => setFormAppt({...formAppt, date: e.target.value})}/><input type="time" className="w-24 p-3 bg-slate-50 rounded-2xl outline-none" value={formAppt.time || ''} onChange={e => setFormAppt({...formAppt, time: e.target.value})}/></div><input className="w-full p-4 bg-slate-50 rounded-2xl outline-none" placeholder="สถานที่" value={formAppt.location || ''} onChange={e => setFormAppt({...formAppt, location: e.target.value})}/><input className="w-full p-4 bg-slate-50 rounded-2xl outline-none" placeholder="แผนก" value={formAppt.dept || ''} onChange={e => setFormAppt({...formAppt, dept: e.target.value})}/></div><div className="flex gap-3"><button onClick={() => setShowApptModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold">ยกเลิก</button><button onClick={() => handleSave(async () => { const c = getUserCollection(targetUid, 'appointments'); if(editApptId) await updateDoc(doc(c, editApptId), formAppt); else await addDoc(c, formAppt); setShowApptModal(false); })} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg">บันทึก</button></div></div></div>)}
             {showFamilyModal && (<div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl"><h3 className="font-bold text-xl text-center mb-6">เพิ่มลูกหลาน</h3><div className="space-y-3 mb-6"><input className="w-full p-4 bg-slate-50 rounded-2xl outline-none" placeholder="ชื่อ" value={formFamily.name || ''} onChange={e => setFormFamily({...formFamily, name: e.target.value})}/><input className="w-full p-4 bg-slate-50 rounded-2xl outline-none" placeholder="เบอร์โทร" type="tel" value={formFamily.phone || ''} onChange={e => setFormFamily({...formFamily, phone: e.target.value})}/><select className="w-full p-4 bg-slate-50 rounded-2xl outline-none" value={formFamily.relation} onChange={e => setFormFamily({...formFamily, relation: e.target.value})}><option>ลูก</option><option>หลาน</option><option>ผู้ดูแล</option></select></div><div className="flex gap-3"><button onClick={() => setShowFamilyModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold">ยกเลิก</button><button onClick={() => handleSave(async () => { const c = getUserCollection(targetUid, 'family_members'); if(editFamilyId) await updateDoc(doc(c, editFamilyId), formFamily); else await addDoc(c, formFamily); setShowFamilyModal(false); })} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg">บันทึก</button></div></div></div>)}
             {showEditProfile && (<div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl"><h3 className="font-bold text-xl text-center mb-6">ข้อมูลส่วนตัว</h3><div className="space-y-3 mb-6"><input className="w-full p-4 bg-slate-50 rounded-2xl outline-none" placeholder="ชื่อ-สกุล" value={formProfile.name || ''} onChange={e => setFormProfile({...formProfile, name: e.target.value})}/><input className="w-full p-4 bg-slate-50 rounded-2xl outline-none" placeholder="อายุ" type="number" value={formProfile.age || ''} onChange={e => setFormProfile({...formProfile, age: e.target.value})}/><input className="w-full p-4 bg-slate-50 rounded-2xl outline-none" placeholder="โรคประจำตัว" value={formProfile.diseases || ''} onChange={e => setFormProfile({...formProfile, diseases: e.target.value})}/><input className="w-full p-4 bg-red-50 text-red-600 rounded-2xl outline-none placeholder-red-300" placeholder="แพ้ยา" value={formProfile.allergies || ''} onChange={e => setFormProfile({...formProfile, allergies: e.target.value})}/></div><div className="flex gap-3"><button onClick={() => setShowEditProfile(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold">ยกเลิก</button><button onClick={() => handleSave(async () => { await updateDoc(getUserDoc(targetUid, 'profile', 'main'), formProfile); setShowEditProfile(false); })} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg">บันทึก</button></div></div></div>)}
             {deleteConfirm.isOpen && (<div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white w-full max-w-xs p-6 rounded-[32px] text-center shadow-2xl animate-scale-up"><div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><AlertTriangle size={32}/></div><h3 className="font-bold text-lg text-slate-800 mb-2">ยืนยันการลบ?</h3><p className="text-sm text-slate-500 mb-6">คุณต้องการลบ "{deleteConfirm.title}" ใช่ไหม?</p><div className="flex gap-3"><button onClick={() => setDeleteConfirm({...deleteConfirm, isOpen: false})} className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm">ยกเลิก</button><button onClick={confirmDelete} className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-200">ลบ</button></div></div></div>)}
        </div>
    );
};

// --- Caregiver View ---
const CaregiverHome = ({ user, onSelectPatient }) => {
    const [patients, setPatients] = useState([]);
    const [addId, setAddId] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onSnapshot(getUserCollection(user.uid, 'watching'), async (snap) => {
            const list = await Promise.all(snap.docs.map(async (d) => {
                const pSnap = await getDoc(getUserDoc(d.id, 'profile', 'main'));
                return { uid: d.id, ...d.data(), profile: pSnap.exists() ? pSnap.data() : {} };
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
                await setDoc(getUserDoc(user.uid, 'watching', targetUid), { name: pSnap.exists() ? pSnap.data().name : `User ${addId}`, smartId: addId, addedAt: serverTimestamp() });
                setShowAddModal(false); setAddId('');
            } else { alert('ไม่พบรหัส Smart ID นี้'); }
        } catch(e) { alert('เกิดข้อผิดพลาด'); }
    };

    const handleDeletePatient = async (targetUid) => {
        if(window.confirm('ต้องการยกเลิกการดูแลคนไข้รายนี้?')) await deleteDoc(getUserDoc(user.uid, 'watching', targetUid));
    };

    return (
        <div className="bg-slate-50 min-h-screen p-5 font-sans relative">
            <div className="absolute top-0 right-0 w-[50%] h-[30%] bg-emerald-100 rounded-bl-[100px] opacity-50 pointer-events-none"></div>
            <div className="relative z-10 pt-8 pb-20">
                <div className="mb-8 flex justify-between items-end">
                    <div><h1 className="text-3xl font-bold text-slate-800">ดูแลครอบครัว</h1><p className="text-slate-500">ติดตามสุขภาพคนที่คุณรัก</p></div>
                    <button onClick={() => setShowAddModal(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-200">+ เพิ่มคนไข้</button>
                </div>
                {loading ? <div className="text-center py-10 text-slate-400">กำลังโหลด...</div> : (
                    <div className="space-y-4">
                        {patients.map(p => (<CaregiverPatientCard key={p.uid} patient={p} onSelect={onSelectPatient} onDelete={handleDeletePatient}/>))}
                        {patients.length === 0 && (<div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-slate-200"><Users size={48} className="mx-auto text-slate-300 mb-4"/><p className="text-slate-400">ยังไม่มีคนไข้ในความดูแล</p></div>)}
                    </div>
                )}
                <button onClick={() => signOut(auth)} className="mt-12 w-full text-center text-red-400 text-sm py-4 bg-white rounded-2xl border border-red-50 hover:bg-red-50 transition-colors">ออกจากระบบ</button>
            </div>
            {showAddModal && (<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white p-8 rounded-[40px] w-full max-w-sm shadow-2xl"><div className="text-center mb-6"><h3 className="font-bold text-xl text-slate-800">เชื่อมต่อคนไข้</h3><p className="text-xs text-slate-500">กรอกรหัส Smart ID 6 หลัก</p></div><input value={addId} onChange={e => setAddId(e.target.value)} className="w-full text-center text-4xl font-bold p-5 bg-slate-50 rounded-2xl mb-6 tracking-[0.2em] outline-none border focus:border-emerald-500" placeholder="000000" maxLength={6} autoFocus/><div className="flex gap-3"><button onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-slate-100 rounded-2xl font-bold text-slate-500">ยกเลิก</button><button onClick={handleAddPatient} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg">เชื่อมต่อ</button></div></div></div>)}
        </div>
    );
};

// --- Auth & Role ---
const AuthScreen = () => {
    const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [isRegister, setIsRegister] = useState(false);
    const handleAuth = async (e) => { e.preventDefault(); try { if(isRegister) await createUserWithEmailAndPassword(auth, email, password); else await signInWithEmailAndPassword(auth, email, password); } catch(e) { alert('เกิดข้อผิดพลาด: ' + e.message); } };
    return (<div className="min-h-screen bg-emerald-50 flex items-center justify-center p-6"><div className="bg-white p-8 rounded-[40px] shadow-xl w-full max-w-sm"><div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center text-emerald-600 mx-auto mb-6"><Heart size={40} fill="currentColor"/></div><h1 className="text-2xl font-bold text-center text-slate-800 mb-8">{isRegister ? 'สมัครสมาชิก' : 'ยินดีต้อนรับ'}</h1><form onSubmit={handleAuth} className="space-y-4"><input type="email" placeholder="Email" className="w-full p-4 bg-slate-50 rounded-2xl outline-none" value={email} onChange={e => setEmail(e.target.value)} required/><input type="password" placeholder="Password" className="w-full p-4 bg-slate-50 rounded-2xl outline-none" value={password} onChange={e => setPassword(e.target.value)} required/><button className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-emerald-700 transition-all">{isRegister ? 'สมัครเลย' : 'เข้าสู่ระบบ'}</button></form><button onClick={() => setIsRegister(!isRegister)} className="w-full mt-4 text-slate-400 text-sm">{isRegister ? 'มีบัญชีแล้ว?' : 'ยังไม่มีบัญชี?'}</button></div></div>);
};

const RoleSelector = ({ onSelect }) => (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-6"><div className="space-y-4 w-full max-w-sm"><h1 className="text-2xl font-bold text-center text-slate-800 mb-8">เลือกการใช้งาน</h1><button onClick={() => onSelect('patient')} className="w-full p-6 bg-white rounded-[32px] shadow-sm hover:shadow-lg transition-all flex items-center gap-4"><div className="bg-emerald-100 p-4 rounded-full text-emerald-600"><User size={32}/></div><div className="text-left"><h3 className="font-bold text-lg text-slate-800">ผู้ใช้งานทั่วไป</h3><p className="text-xs text-slate-400">บันทึกสุขภาพตนเอง</p></div></button><button onClick={() => onSelect('caregiver')} className="w-full p-6 bg-white rounded-[32px] shadow-sm hover:shadow-lg transition-all flex items-center gap-4"><div className="bg-blue-100 p-4 rounded-full text-blue-600"><Users size={32}/></div><div className="text-left"><h3 className="font-bold text-lg text-slate-800">ผู้ดูแล / ญาติ</h3><p className="text-xs text-slate-400">ติดตามสุขภาพครอบครัว</p></div></button><button onClick={() => signOut(auth)} className="w-full text-center text-slate-400 text-sm pt-4">ออกจากระบบ</button></div></div>
);

// --- Main App ---
export default function App() {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedPatientUid, setSelectedPatientUid] = useState(null);

    useEffect(() => {
        const initAuth = async () => { if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { await signInWithCustomToken(auth, __initial_auth_token); } else { await signInAnonymously(auth); } };
        initAuth();
        return onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if(u) { const userDoc = await getDoc(getUserDoc(u.uid, 'settings', 'role')); if(userDoc.exists()) setRole(userDoc.data().role); }
            setLoading(false);
        });
    }, []);

    const handleRoleSelect = async (selectedRole) => {
        if(!user) return;
        await setDoc(getUserDoc(user.uid, 'settings', 'role'), { role: selectedRole });
        if(selectedRole === 'patient') { const shortId = generateSmartId(); await setDoc(getUserDoc(user.uid, 'profile', 'main'), { name: "ผู้ใช้งาน", shortId }, { merge: true }); await addDoc(getPublicCollection('public_smart_ids'), { smartId: shortId, uid: user.uid }); }
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
