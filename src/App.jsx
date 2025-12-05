import React, { useState, useEffect, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { 
  Heart, Pill, Activity, User, Plus, Phone, AlertCircle, 
  Home, MessageCircle, FileText, Shield, Stethoscope, 
  Send, QrCode, MapPin, Loader2, Scale, Droplet,
  Calendar as CalendarIcon, Clock, Users, Trash2, ChevronLeft, ChevronRight,
  Share2, Check, Edit2, X, AlertTriangle, Download, Type, Navigation, LogOut, Lock, Mail
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, 
  serverTimestamp, setDoc, deleteDoc, query, orderBy, getDoc, where, getDocs
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// --- Firebase Config ---
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
const storage = getStorage(app);
const appId = 'thaihealth-app-v1';

// --- Helpers ---
const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateThai = (dateStr) => {
  if(!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  } catch {
    return dateStr;
  }
};

const formatTime = (timeStr) => {
  if(!timeStr) return '';
  const [hour, minute] = timeStr.split(':');
  const hourNum = parseInt(hour);
  if(hourNum >= 12) {
    return `${hourNum === 12 ? 12 : hourNum - 12}:${minute} น.`;
  }
  return `${hourNum}:${minute} น.`;
};

const generateSmartId = () => Math.floor(100000 + Math.random() * 900000).toString();

const calculateAge = (birthDate) => {
  if(!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// --- AUTH COMPONENTS ---

const AuthScreen = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isRegister && password !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      setLoading(false);
      return;
    }

    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      let errorMessage = 'เกิดข้อผิดพลาด';
      switch(err.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'อีเมลนี้ถูกใช้งานแล้ว';
          break;
        case 'auth/invalid-email':
          errorMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
          break;
        case 'auth/weak-password':
          errorMessage = 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
          break;
        case 'auth/wrong-password':
          errorMessage = 'รหัสผ่านไม่ถูกต้อง';
          break;
        case 'auth/user-not-found':
          errorMessage = 'ไม่พบผู้ใช้งาน';
          break;
        default:
          errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white w-full max-w-sm p-8 rounded-3xl shadow-xl">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Heart size={40} fill="white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">ThaiHealth Care</h1>
          <p className="text-gray-500 text-sm mt-1">ระบบดูแลสุขภาพครอบครัว</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">อีเมล</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={20}/>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="w-full pl-10 p-3 bg-gray-50 rounded-xl border focus:border-blue-500 outline-none transition-all" 
                placeholder="name@email.com" 
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">รหัสผ่าน</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={20}/>
              <input 
                type="password" 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full pl-10 p-3 bg-gray-50 rounded-xl border focus:border-blue-500 outline-none transition-all" 
                placeholder="******" 
                minLength={6}
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">ยืนยันรหัสผ่าน</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={20}/>
                <input 
                  type="password" 
                  required 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  className="w-full pl-10 p-3 bg-gray-50 rounded-xl border focus:border-blue-500 outline-none transition-all" 
                  placeholder="******" 
                  minLength={6}
                />
              </div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex justify-center items-center disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : isRegister ? (
              'สมัครสมาชิก'
            ) : (
              'เข้าสู่ระบบ'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            {isRegister ? 'มีบัญชีอยู่แล้ว?' : 'ยังไม่มีบัญชี?'} 
            <button 
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
                setConfirmPassword('');
              }} 
              className="text-blue-600 font-bold ml-1 hover:underline"
            >
              {isRegister ? 'เข้าสู่ระบบ' : 'สมัครใหม่'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

const RoleSelector = ({ onSelect, onBack }) => (
  <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 flex flex-col items-center justify-center p-6 animate-fade-in">
    <div className="mb-10 text-center">
      <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
        <Users size={40} />
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">เลือกสถานะของคุณ</h1>
      <p className="text-gray-500 text-sm">ข้อมูลนี้จะใช้เพื่อปรับหน้าจอให้เหมาะสม</p>
    </div>
    
    <div className="space-y-4 w-full max-w-xs">
      <button 
        onClick={() => onSelect('patient')} 
        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-3xl shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center gap-4 hover:shadow-xl"
      >
        <div className="bg-white/20 p-3 rounded-2xl">
          <User size={32}/>
        </div>
        <div className="text-left">
          <h3 className="font-bold text-xl">ผู้สูงอายุ / ผู้ป่วย</h3>
          <p className="text-xs text-blue-100 opacity-90">ต้องการจดบันทึกสุขภาพ</p>
        </div>
      </button>
      
      <button 
        onClick={() => onSelect('caregiver')} 
        className="w-full bg-white border-2 border-gray-100 text-gray-700 p-6 rounded-3xl active:scale-95 transition-all flex items-center gap-4 hover:border-blue-300 shadow-lg hover:shadow-xl"
      >
        <div className="bg-gray-100 p-3 rounded-2xl">
          <Users size={32}/>
        </div>
        <div className="text-left">
          <h3 className="font-bold text-xl">ลูกหลาน / ผู้ดูแล</h3>
          <p className="text-xs text-gray-400">ต้องการติดตามสุขภาพครอบครัว</p>
        </div>
      </button>
    </div>
    
    <button 
      onClick={onBack} 
      className="mt-12 text-gray-400 text-sm hover:text-gray-600 transition-colors"
    >
      ← กลับไปหน้าเข้าสู่ระบบ
    </button>
  </div>
);

// --- SHARED COMPONENTS ---

const StatCard = ({ title, value, unit, icon: Icon, color, onClick, statusType, rawValue, fontSize, trend }) => {
  const getStatusColor = () => {
    if (!rawValue) return 'bg-gray-300';
    
    if (statusType === 'sys') {
      if (rawValue >= 140) return 'bg-red-500';
      if (rawValue >= 120) return 'bg-yellow-400';
      return 'bg-green-500';
    }
    
    if (statusType === 'sugar') {
      if (rawValue >= 180) return 'bg-red-500';
      if (rawValue >= 140) return 'bg-yellow-400';
      return 'bg-green-500';
    }
    
    return 'bg-green-500';
  };

  return (
    <div 
      onClick={onClick} 
      className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex-1 min-w-[100px] cursor-pointer hover:bg-gray-50 transition-all active:scale-95 relative overflow-hidden group"
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${color} shadow-sm text-white`}>
          <Icon size={fontSize === 'large' ? 24 : 18} />
        </div>
        {trend && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}
          </span>
        )}
      </div>
      
      {statusType && rawValue && (
        <div className={`absolute top-4 right-4 w-3 h-3 rounded-full shadow-sm ${getStatusColor()} ${rawValue > 140 || rawValue > 180 ? 'animate-pulse' : ''}`}></div>
      )}
      
      <div className="flex flex-col">
        <span className={`text-gray-500 mb-1 font-medium ${fontSize === 'large' ? 'text-sm' : 'text-xs'}`}>
          {title}
        </span>
        <span className={`font-bold text-gray-800 ${fontSize === 'large' ? 'text-2xl' : 'text-xl'}`}>
          {value || '-'}
        </span>
        <span className="text-gray-400 text-[10px]">{unit}</span>
      </div>
    </div>
  );
};

const MedicineItem = ({ med, isTaken, onToggle, onDelete, onEdit, fontSize }) => {
  const getTimeColor = (time) => {
    if (time.includes('เช้า')) return 'bg-blue-100 text-blue-600';
    if (time.includes('กลางวัน')) return 'bg-yellow-100 text-yellow-600';
    if (time.includes('เย็น')) return 'bg-orange-100 text-orange-600';
    if (time.includes('ก่อนนอน')) return 'bg-purple-100 text-purple-600';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className={`flex items-center justify-between p-4 rounded-2xl mb-3 border transition-all ${isTaken ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100 hover:border-blue-200'}`}>
      <div 
        className="flex items-center gap-3 cursor-pointer flex-1" 
        onClick={onToggle}
      >
        <div className={`p-2.5 rounded-full ${isTaken ? 'bg-emerald-200 text-emerald-700' : 'bg-blue-50 text-blue-500'}`}>
          <Pill size={fontSize === 'large' ? 24 : 20} />
        </div>
        <div>
          <h3 className={`font-bold ${isTaken ? 'text-emerald-800' : 'text-gray-800'} ${fontSize === 'large' ? 'text-lg' : 'text-base'}`}>
            {med.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-1 rounded-full text-xs ${getTimeColor(med.time)}`}>
              {med.time}
            </span>
            <span className="text-gray-500 text-xs">
              {med.dose || '1 เม็ด'} • {med.frequency || 'ทุกวัน'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button 
          onClick={(e) => { e.stopPropagation(); onToggle(); }} 
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isTaken ? 'bg-emerald-500 border-emerald-500 scale-110' : 'border-gray-300 bg-white hover:border-emerald-300'}`}
        >
          {isTaken && <Check size={16} className="text-white" />}
        </button>
        
        {onEdit && (
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }} 
            className="text-gray-400 hover:text-blue-500 p-1.5 transition-colors"
          >
            <Edit2 size={16}/>
          </button>
        )}
        
        {onDelete && (
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }} 
            className="text-gray-400 hover:text-red-500 p-1.5 transition-colors"
          >
            <Trash2 size={16}/>
          </button>
        )}
      </div>
    </div>
  );
};

const AppointmentItem = ({ appointment, onEdit, onDelete, onComplete }) => {
  const isToday = appointment.date === getTodayStr();
  const isPast = new Date(appointment.date) < new Date(getTodayStr());
  
  return (
    <div className={`bg-white p-4 rounded-2xl border mb-3 transition-all ${isToday ? 'border-blue-300 bg-blue-50' : isPast ? 'border-gray-200' : 'border-gray-100 hover:border-blue-200'}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-bold text-gray-800">{appointment.title || 'นัดหมายแพทย์'}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-600 flex items-center gap-1">
              <CalendarIcon size={14} />
              {formatDateThai(appointment.date)}
            </span>
            {appointment.time && (
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Clock size={14} />
                {formatTime(appointment.time)}
              </span>
            )}
          </div>
          
          {appointment.location && (
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <MapPin size={14} />
              {appointment.location}
            </p>
          )}
          
          {appointment.note && (
            <p className="text-sm text-gray-600 mt-2">{appointment.note}</p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {appointment.completed ? (
            <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full">
              เสร็จสิ้น
            </span>
          ) : (
            <>
              {!isPast && (
                <button 
                  onClick={() => onComplete && onComplete(appointment.id)}
                  className="bg-blue-100 text-blue-600 p-2 rounded-full hover:bg-blue-200"
                >
                  <Check size={16} />
                </button>
              )}
              
              <button 
                onClick={() => onEdit && onEdit(appointment)}
                className="text-gray-400 hover:text-blue-500 p-1.5"
              >
                <Edit2 size={16} />
              </button>
              
              <button 
                onClick={() => onDelete && onDelete(appointment.id)}
                className="text-gray-400 hover:text-red-500 p-1.5"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

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
  const [emergencyContacts, setEmergencyContacts] = useState([]);

  // UI & Forms
  const [showDoctorMode, setShowDoctorMode] = useState(false);
  const [showInputModal, setShowInputModal] = useState(false);
  const [inputType, setInputType] = useState('bp');
  const [formHealth, setFormHealth] = useState({ 
    sys: '', dia: '', pulse: '', sugar: '', weight: '', 
    hba1c: '', lipid: '', egfr: '', cholesterol: '', triglyceride: '' 
  });
  
  // Charts Data
  const [bpData, setBpData] = useState([]);
  const [sugarData, setSugarData] = useState([]);
  const [weightData, setWeightData] = useState([]);
  const [statType, setStatType] = useState('bp');

  // Modals
  const [showMedModal, setShowMedModal] = useState(false);
  const [editMedId, setEditMedId] = useState(null);
  const [formMed, setFormMed] = useState({
    name: '',
    time: 'หลังอาหารเช้า',
    dose: '1 เม็ด',
    frequency: 'ทุกวัน',
    note: ''
  });
  
  const [showApptModal, setShowApptModal] = useState(false);
  const [editApptId, setEditApptId] = useState(null);
  const [formAppt, setFormAppt] = useState({
    title: '',
    date: getTodayStr(),
    time: '09:00',
    location: '',
    doctor: '',
    note: ''
  });
  
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [formProfile, setFormProfile] = useState({
    name: '',
    birthDate: '',
    bloodType: '',
    height: '',
    diseases: [],
    allergies: [],
    emergencyContact: ''
  });
  
  const [deleteConfirm, setDeleteConfirm] = useState({ 
    isOpen: false, 
    collection: null, 
    id: null, 
    title: '' 
  });

  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relationship: '' });

  // Fetch data
  useEffect(() => {
    if (!targetUid) return;
    
    setLoading(true);
    
    // Medications
    const unsubMeds = onSnapshot(
      query(collection(db, 'artifacts', appId, 'users', targetUid, 'medications'), orderBy('createdAt', 'desc')),
      s => setMeds(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    
    // Daily logs (medicine taken)
    const unsubHistory = onSnapshot(
      collection(db, 'artifacts', appId, 'users', targetUid, 'daily_logs'), 
      s => { 
        const h = {}; 
        s.docs.forEach(d => h[d.id] = d.data()); 
        setMedHistory(h); 
      }
    );
    
    // Appointments
    const unsubAppts = onSnapshot(
      query(collection(db, 'artifacts', appId, 'users', targetUid, 'appointments'), orderBy('date')),
      s => setAppointments(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    
    // Profile
    const unsubProfile = onSnapshot(
      doc(db, 'artifacts', appId, 'users', targetUid, 'profile', 'main'), 
      s => { 
        if (s.exists()) { 
          const data = s.data();
          setProfile(data); 
          setFormProfile(prev => ({ ...prev, ...data }));
          
          // Initialize emergency contacts
          if (data.emergencyContacts) {
            setEmergencyContacts(data.emergencyContacts);
          }
        }
      }
    );
    
    // Health logs
    const unsubHealth = onSnapshot(
      query(collection(db, 'artifacts', appId, 'users', targetUid, 'health_logs'), orderBy('timestamp', 'desc')),
      s => {
        const logs = s.docs.map(d => ({ id: d.id, ...d.data() }));
        setHealthLogs(logs);
        
        // Filter lab results
        const labs = logs.filter(l => l.hba1c || l.lipid || l.egfr);
        setLabLogs(labs);
        
        // Prepare chart data
        const bpLogs = logs.filter(l => l.type === 'bp');
        const sugarLogs = logs.filter(l => l.type === 'sugar');
        const weightLogs = logs.filter(l => l.type === 'weight');
        
        setBpData(bpLogs.slice(-14).map(l => ({ 
          day: formatDateThai(l.dateStr).split(' ')[0], 
          sys: l.sys, 
          dia: l.dia,
          date: l.dateStr
        })));
        
        setSugarData(sugarLogs.slice(-14).map(l => ({ 
          day: formatDateThai(l.dateStr).split(' ')[0], 
          sugar: l.sugar,
          date: l.dateStr
        })));
        
        setWeightData(weightLogs.slice(-14).map(l => ({ 
          day: formatDateThai(l.dateStr).split(' ')[0], 
          weight: l.weight,
          date: l.dateStr
        })));
        
        setLoading(false);
      }
    );
    
    // Family connections
    const unsubFamily = onSnapshot(
      collection(db, 'artifacts', appId, 'users', targetUid, 'family'),
      s => setFamily(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    
    return () => {
      unsubMeds();
      unsubHistory();
      unsubAppts();
      unsubProfile();
      unsubHealth();
      unsubFamily();
    };
  }, [targetUid]);

  // Handlers
  const handleAddHealth = async () => {
    if (!formHealth) return;
    
    let data = { 
      type: inputType, 
      dateStr: getTodayStr(), 
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString()
    };
    
    try {
      if (inputType === 'bp') {
        if (!formHealth.sys || !formHealth.dia) {
          alert('กรุณากรอกค่าความดันให้ครบ');
          return;
        }
        data = { 
          ...data, 
          sys: parseInt(formHealth.sys), 
          dia: parseInt(formHealth.dia),
          pulse: formHealth.pulse ? parseInt(formHealth.pulse) : null
        };
      } 
      else if (inputType === 'sugar') {
        if (!formHealth.sugar) {
          alert('กรุณากรอกค่าน้ำตาล');
          return;
        }
        data = { ...data, sugar: parseInt(formHealth.sugar) };
      } 
      else if (inputType === 'weight') {
        if (!formHealth.weight) {
          alert('กรุณากรอกน้ำหนัก');
          return;
        }
        data = { ...data, weight: parseFloat(formHealth.weight) };
      }
      else if (inputType === 'lab') {
        data = { 
          ...data, 
          hba1c: formHealth.hba1c || null, 
          lipid: formHealth.lipid || null, 
          egfr: formHealth.egfr || null,
          cholesterol: formHealth.cholesterol || null,
          triglyceride: formHealth.triglyceride || null
        };
      }
      
      await addDoc(collection(db, 'artifacts', appId, 'users', targetUid, 'health_logs'), data);
      
      setShowInputModal(false);
      setFormHealth({ 
        sys: '', dia: '', pulse: '', sugar: '', weight: '', 
        hba1c: '', lipid: '', egfr: '', cholesterol: '', triglyceride: '' 
      });
    } catch (error) {
      console.error('Error adding health data:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };
  
  const toggleMedToday = async (medId) => {
    const today = getTodayStr();
    const ref = doc(db, 'artifacts', appId, 'users', targetUid, 'daily_logs', today);
    const current = medHistory[today]?.takenMeds || [];
    const newTaken = current.includes(medId) 
      ? current.filter(id => id !== medId) 
      : [...current, medId];
    
    await setDoc(ref, { 
      takenMeds: newTaken, 
      takenCount: newTaken.length,
      date: today,
      updatedAt: serverTimestamp()
    }, { merge: true });
  };
  
  const handleSaveMed = async () => {
    if (!formMed.name) {
      alert('กรุณากรอกชื่อยา');
      return;
    }
    
    const medData = {
      ...formMed,
      updatedAt: serverTimestamp(),
      ...(editMedId ? {} : { createdAt: serverTimestamp() })
    };
    
    try {
      const collectionRef = collection(db, 'artifacts', appId, 'users', targetUid, 'medications');
      
      if (editMedId) {
        await updateDoc(doc(collectionRef, editMedId), medData);
      } else {
        await addDoc(collectionRef, medData);
      }
      
      setShowMedModal(false);
      setFormMed({
        name: '',
        time: 'หลังอาหารเช้า',
        dose: '1 เม็ด',
        frequency: 'ทุกวัน',
        note: ''
      });
      setEditMedId(null);
    } catch (error) {
      console.error('Error saving medication:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกยา');
    }
  };
  
  const handleSaveAppt = async () => {
    if (!formAppt.title || !formAppt.date) {
      alert('กรุณากรอกหัวข้อและวันที่');
      return;
    }
    
    const apptData = {
      ...formAppt,
      updatedAt: serverTimestamp(),
      ...(editApptId ? {} : { createdAt: serverTimestamp() })
    };
    
    try {
      const collectionRef = collection(db, 'artifacts', appId, 'users', targetUid, 'appointments');
      
      if (editApptId) {
        await updateDoc(doc(collectionRef, editApptId), apptData);
      } else {
        await addDoc(collectionRef, apptData);
      }
      
      setShowApptModal(false);
      setFormAppt({
        title: '',
        date: getTodayStr(),
        time: '09:00',
        location: '',
        doctor: '',
        note: ''
      });
      setEditApptId(null);
    } catch (error) {
      console.error('Error saving appointment:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกนัดหมาย');
    }
  };
  
  const handleUpdateProfile = async () => {
    try {
      const profileData = {
        ...formProfile,
        updatedAt: serverTimestamp(),
        emergencyContacts: emergencyContacts
      };
      
      await updateDoc(
        doc(db, 'artifacts', appId, 'users', targetUid, 'profile', 'main'), 
        profileData
      );
      
      setShowEditProfile(false);
      alert('บันทึกข้อมูลสำเร็จ');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };
  
  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phone) {
      alert('กรุณากรอกชื่อและเบอร์โทร');
      return;
    }
    
    const updatedContacts = [...emergencyContacts, { ...newContact, id: Date.now().toString() }];
    setEmergencyContacts(updatedContacts);
    setNewContact({ name: '', phone: '', relationship: '' });
    setShowAddContact(false);
  };
  
  const handleDeleteContact = (contactId) => {
    setEmergencyContacts(emergencyContacts.filter(c => c.id !== contactId));
  };
  
  const requestDelete = (collection, id, title) => {
    setDeleteConfirm({ isOpen: true, collection, id, title });
  };
  
  const confirmDeleteAction = async () => {
    try {
      await deleteDoc(
        doc(db, 'artifacts', appId, 'users', targetUid, deleteConfirm.collection, deleteConfirm.id)
      );
      setDeleteConfirm({ isOpen: false, collection: null, id: null, title: '' });
    } catch (error) {
      console.error('Error deleting:', error);
      alert('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };
  
  const markAppointmentComplete = async (apptId) => {
    try {
      await updateDoc(
        doc(db, 'artifacts', appId, 'users', targetUid, 'appointments', apptId),
        { completed: true, completedAt: serverTimestamp() }
      );
    } catch (error) {
      console.error('Error completing appointment:', error);
    }
  };
  
  const fetchLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(4);
          const lng = position.coords.longitude.toFixed(4);
          setGpsLocation(`${lat}, ${lng}`);
        },
        () => {
          setGpsLocation("ไม่สามารถระบุตำแหน่งได้");
        }
      );
    } else {
      setGpsLocation("อุปกรณ์ไม่รองรับ");
    }
  };
  
  const callEmergency = () => {
    fetchLocation();
    if (emergencyContacts.length > 0) {
      const firstContact = emergencyContacts[0];
      alert(`กำลังโทรหา: ${firstContact.name} (${firstContact.phone})`);
      window.open(`tel:${firstContact.phone}`, '_blank');
    } else {
      alert('กำลังโทรหา: 1669 (ฉุกเฉิน)');
      window.open('tel:1669', '_blank');
    }
  };
  
  const shareHealthSummary = async () => {
    const latestBP = healthLogs.filter(x => x.type === 'bp')[0];
    const latestSugar = healthLogs.filter(x => x.type === 'sugar')[0];
    
    const summary = `
สรุปสุขภาพ ${profile?.name || 'ผู้ป่วย'}
------------------------
ความดันล่าสุด: ${latestBP ? `${latestBP.sys}/${latestBP.dia} mmHg` : '-'}
น้ำตาลล่าสุด: ${latestSugar ? `${latestSugar.sugar} mg/dL` : '-'}
ยาที่ต้องทานวันนี้: ${meds.length} รายการ
นัดหมายล่าสุด: ${appointments.length > 0 ? appointments[0].title : '-'}
    `;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'สรุปสุขภาพ',
          text: summary,
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
        navigator.clipboard.writeText(summary);
        alert('คัดลอกข้อมูลไปยังคลิปบอร์ดแล้ว');
      }
    } else {
      navigator.clipboard.writeText(summary);
      alert('คัดลอกข้อมูลไปยังคลิปบอร์ดแล้ว');
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto" size={40} />
          <p className="text-gray-500 mt-4">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  const latestBP = healthLogs.filter(x => x.type === 'bp')[0];
  const latestSugar = healthLogs.filter(x => x.type === 'sugar')[0];
  const latestWeight = healthLogs.filter(x => x.type === 'weight')[0];
  
  const todayMedsTaken = medHistory[getTodayStr()]?.takenMeds || [];
  const todayMedsCount = todayMedsTaken.length;
  const totalMedsCount = meds.length;
  
  const upcomingAppointments = appointments.filter(a => !a.completed && new Date(a.date) >= new Date(getTodayStr())).slice(0, 3);
  
  return (
    <div className="pb-24 animate-fade-in relative font-sans bg-gradient-to-b from-blue-50/30 to-white min-h-screen">
      {/* Header */}
      <div className="bg-white p-5 pt-8 pb-4 sticky top-0 z-30 shadow-sm flex justify-between items-center rounded-b-3xl border-b">
        <div className="flex items-center gap-3">
          {currentUserRole === 'caregiver' && (
            <button 
              onClick={onBack} 
              className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div>
            <h1 className={`font-bold text-gray-800 ${fontSize === 'large' ? 'text-xl' : 'text-lg'}`}>
              {profile?.name || 'ผู้ป่วย'}
            </h1>
            <p className="text-gray-500 text-xs">
              {currentUserRole === 'caregiver' ? 'โหมดผู้ดูแล' : 'ดูแลสุขภาพตัวเอง'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowDoctorMode(true)}
            className="bg-indigo-50 text-indigo-600 p-2 rounded-full border border-indigo-100 shadow-sm hover:bg-indigo-100"
          >
            <Stethoscope size={20} />
          </button>
          {currentUserRole === 'patient' && (
            <button 
              onClick={() => setActiveTab('profile')}
              className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 cursor-pointer hover:bg-blue-200"
            >
              <User size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Content Switcher */}
      {activeTab === 'home' && (
        <div className="px-5 mt-4 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard 
              title="ความดัน" 
              value={latestBP ? `${latestBP.sys}/${latestBP.dia}` : '-'} 
              rawValue={latestBP?.sys} 
              statusType="sys" 
              unit="mmHg" 
              icon={Heart} 
              color="bg-gradient-to-br from-pink-400 to-pink-600" 
              fontSize={fontSize}
            />
            <StatCard 
              title="น้ำตาล" 
              value={latestSugar ? latestSugar.sugar : '-'} 
              rawValue={latestSugar?.sugar} 
              statusType="sugar" 
              unit="mg/dL" 
              icon={Droplet} 
              color="bg-gradient-to-br from-emerald-400 to-emerald-600" 
              fontSize={fontSize}
            />
            <StatCard 
              title="น้ำหนัก" 
              value={latestWeight ? latestWeight.weight : '-'} 
              unit="kg" 
              icon={Scale} 
              color="bg-gradient-to-br from-orange-400 to-orange-600" 
              fontSize={fontSize}
            />
            <StatCard 
              title="ทานยาแล้ว" 
              value={`${todayMedsCount}/${totalMedsCount}`} 
              unit="เม็ด" 
              icon={Pill} 
              color="bg-gradient-to-br from-blue-400 to-blue-600" 
              fontSize={fontSize}
            />
          </div>
          
          {/* Quick Actions */}
          <div className="grid grid-cols-4 gap-3">
            <button 
              onClick={() => { setInputType('bp'); setShowInputModal(true); }}
              className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-1 hover:bg-gray-50"
            >
              <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center text-pink-600">
                <Heart size={20} />
              </div>
              <span className="text-xs text-gray-600">ความดัน</span>
            </button>
            
            <button 
              onClick={() => { setInputType('sugar'); setShowInputModal(true); }}
              className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-1 hover:bg-gray-50"
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                <Droplet size={20} />
              </div>
              <span className="text-xs text-gray-600">น้ำตาล</span>
            </button>
            
            <button 
              onClick={() => { setInputType('weight'); setShowInputModal(true); }}
              className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-1 hover:bg-gray-50"
            >
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                <Scale size={20} />
              </div>
              <span className="text-xs text-gray-600">น้ำหนัก</span>
            </button>
            
            <button 
              onClick={() => setShowMedModal(true)}
              className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-1 hover:bg-gray-50"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <Plus size={20} />
              </div>
              <span className="text-xs text-gray-600">เพิ่มยา</span>
            </button>
          </div>
          
          {/* Medications */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Pill size={16} className="text-blue-500" /> 
                ยาของฉัน ({totalMedsCount})
              </h2>
              <button 
                onClick={() => { 
                  setFormMed({ name: '', time: 'หลังอาหารเช้า', dose: '1 เม็ด', frequency: 'ทุกวัน', note: '' }); 
                  setEditMedId(null); 
                  setShowMedModal(true); 
                }} 
                className="text-blue-600 text-xs font-bold bg-blue-50 px-3 py-1 rounded-lg hover:bg-blue-100"
              >
                + เพิ่ม
              </button>
            </div>
            
            {meds.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-dashed border-gray-200 text-center">
                <Pill size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">ยังไม่ได้เพิ่มยา</p>
                <button 
                  onClick={() => setShowMedModal(true)}
                  className="text-blue-600 text-xs mt-2 underline"
                >
                  เพิ่มยาครั้งแรก
                </button>
              </div>
            ) : (
              meds.slice(0, 3).map(med => {
                const isTaken = todayMedsTaken.includes(med.id);
                return (
                  <MedicineItem 
                    key={med.id} 
                    med={med} 
                    isTaken={isTaken} 
                    onToggle={() => toggleMedToday(med.id)}
                    onDelete={() => requestDelete('medications', med.id, med.name)}
                    onEdit={() => { setFormMed(med); setEditMedId(med.id); setShowMedModal(true); }}
                    fontSize={fontSize}
                  />
                );
              })
            )}
            
            {meds.length > 3 && (
              <button 
                onClick={() => setActiveTab('care')}
                className="w-full text-center text-blue-600 text-sm mt-2 py-2"
              >
                ดูทั้งหมด ({meds.length})
              </button>
            )}
          </div>
          
          {/* Upcoming Appointments */}
          {upcomingAppointments.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <CalendarIcon size={16} className="text-blue-500" /> 
                  นัดหมายใกล้เคียง
                </h2>
                <button 
                  onClick={() => { 
                    setFormAppt({ 
                      title: '', 
                      date: getTodayStr(), 
                      time: '09:00', 
                      location: '', 
                      doctor: '', 
                      note: '' 
                    }); 
                    setEditApptId(null); 
                    setShowApptModal(true); 
                  }} 
                  className="text-blue-600 text-xs font-bold bg-blue-50 px-3 py-1 rounded-lg hover:bg-blue-100"
                >
                  + เพิ่ม
                </button>
              </div>
              
              {upcomingAppointments.map(appt => (
                <AppointmentItem 
                  key={appt.id}
                  appointment={appt}
                  onEdit={() => { setFormAppt(appt); setEditApptId(appt.id); setShowApptModal(true); }}
                  onDelete={() => requestDelete('appointments', appt.id, appt.title)}
                  onComplete={() => markAppointmentComplete(appt.id)}
                />
              ))}
            </div>
          )}
          
          {/* Emergency Button */}
          <div 
            onClick={callEmergency}
            className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between cursor-pointer active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Phone size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">โทรฉุกเฉิน</h3>
                <p className="text-sm opacity-90">1669 หรือผู้ติดต่อฉุกเฉิน</p>
              </div>
            </div>
            <Navigation size={24} className="opacity-80" />
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="p-5">
          <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
            <button 
              onClick={() => setStatType('bp')} 
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${statType === 'bp' ? 'bg-white shadow text-pink-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              ความดัน
            </button>
            <button 
              onClick={() => setStatType('sugar')} 
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${statType === 'sugar' ? 'bg-white shadow text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              น้ำตาล
            </button>
            <button 
              onClick={() => setStatType('weight')} 
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${statType === 'weight' ? 'bg-white shadow text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              น้ำหนัก
            </button>
            <button 
              onClick={() => setStatType('lab')} 
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${statType === 'lab' ? 'bg-white shadow text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              ผลเลือด
            </button>
          </div>
          
          {statType === 'lab' ? (
            <div className="space-y-4">
              {labLogs.slice(0, 5).map((lab, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-gray-400 text-xs">{formatDateThai(lab.dateStr)}</span>
                    <button 
                      onClick={() => shareHealthSummary()}
                      className="text-blue-500 text-xs flex items-center gap-1"
                    >
                      <Share2 size={12} /> แชร์
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {lab.hba1c && (
                      <div className="bg-blue-50 p-3 rounded-xl">
                        <p className="text-xs text-blue-600">HbA1c</p>
                        <p className="font-bold text-lg">{lab.hba1c}%</p>
                      </div>
                    )}
                    {lab.lipid && (
                      <div className="bg-emerald-50 p-3 rounded-xl">
                        <p className="text-xs text-emerald-600">ไขมัน</p>
                        <p className="font-bold text-lg">{lab.lipid} mg/dL</p>
                      </div>
                    )}
                    {lab.egfr && (
                      <div className="bg-purple-50 p-3 rounded-xl">
                        <p className="text-xs text-purple-600">eGFR</p>
                        <p className="font-bold text-lg">{lab.egfr}</p>
                      </div>
                    )}
                    {lab.cholesterol && (
                      <div className="bg-orange-50 p-3 rounded-xl">
                        <p className="text-xs text-orange-600">คอเลสเตอรอล</p>
                        <p className="font-bold text-lg">{lab.cholesterol} mg/dL</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {labLogs.length === 0 && (
                <div className="bg-white p-8 rounded-2xl border border-dashed border-gray-200 text-center">
                  <FileText size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">ยังไม่มีผลตรวจเลือด</p>
                  <button 
                    onClick={() => { setInputType('lab'); setShowInputModal(true); }}
                    className="text-blue-600 text-sm mt-2 underline"
                  >
                    บันทึกผลเลือดครั้งแรก
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 h-72">
              <ResponsiveContainer width="100%" height="100%">
                {statType === 'bp' ? (
                  <LineChart data={bpData}>
                    <CartesianGrid stroke="#f5f5f5" />
                    <XAxis 
                      dataKey="day" 
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [value, statType === 'bp' ? 'mmHg' : '']}
                      labelFormatter={(label) => `วันที่: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sys" 
                      stroke="#EC4899" 
                      strokeWidth={2} 
                      dot={{ r: 3 }}
                      name="ความดันบน"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="dia" 
                      stroke="#8B5CF6" 
                      strokeWidth={2} 
                      dot={{ r: 3 }}
                      name="ความดันล่าง"
                    />
                  </LineChart>
                ) : statType === 'sugar' ? (
                  <LineChart data={sugarData}>
                    <CartesianGrid stroke="#f5f5f5" />
                    <XAxis 
                      dataKey="day" 
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [value, 'mg/dL']}
                      labelFormatter={(label) => `วันที่: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sugar" 
                      stroke="#10B981" 
                      strokeWidth={2} 
                      dot={{ r: 3 }}
                      name="น้ำตาลในเลือด"
                    />
                    <ReferenceLine y={140} stroke="#F59E0B" strokeDasharray="3 3" />
                    <ReferenceLine y={180} stroke="#EF4444" strokeDasharray="3 3" />
                  </LineChart>
                ) : (
                  <LineChart data={weightData}>
                    <CartesianGrid stroke="#f5f5f5" />
                    <XAxis 
                      dataKey="day" 
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [value, 'kg']}
                      labelFormatter={(label) => `วันที่: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="#F97316" 
                      strokeWidth={2} 
                      dot={{ r: 3 }}
                      name="น้ำหนัก"
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
          
          <div className="mt-6 bg-white p-4 rounded-2xl border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-2">สถิติล่าสุด</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500">ความดันเฉลี่ย 7 วัน</p>
                <p className="font-bold">
                  {bpData.length > 0 ? 
                    `${Math.round(bpData.reduce((a, b) => a + b.sys, 0) / bpData.length)}/` +
                    `${Math.round(bpData.reduce((a, b) => a + b.dia, 0) / bpData.length)}` 
                    : '-'
                  }
                </p>
              </div>
              <div>
                <p className="text-gray-500">น้ำตาลเฉลี่ย 7 วัน</p>
                <p className="font-bold">
                  {sugarData.length > 0 ? 
                    `${Math.round(sugarData.reduce((a, b) => a + b.sugar, 0) / sugarData.length)} mg/dL` 
                    : '-'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'care' && (
        <div className="p-5">
          {/* Appointments Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-gray-800 text-lg">นัดหมายแพทย์</h2>
              <button 
                onClick={() => { 
                  setFormAppt({ 
                    title: '', 
                    date: getTodayStr(), 
                    time: '09:00', 
                    location: '', 
                    doctor: '', 
                    note: '' 
                  }); 
                  setEditApptId(null); 
                  setShowApptModal(true); 
                }} 
                className="text-blue-600 text-sm font-bold bg-blue-50 px-3 py-1 rounded-lg hover:bg-blue-100"
              >
                + เพิ่มนัดหมาย
              </button>
            </div>
            
            {appointments.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-dashed border-gray-200 text-center">
                <CalendarIcon size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">ยังไม่มีนัดหมาย</p>
                <button 
                  onClick={() => setShowApptModal(true)}
                  className="text-blue-600 text-sm mt-2 underline"
                >
                  เพิ่มนัดหมายครั้งแรก
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map(appt => (
                  <AppointmentItem 
                    key={appt.id}
                    appointment={appt}
                    onEdit={() => { setFormAppt(appt); setEditApptId(appt.id); setShowApptModal(true); }}
                    onDelete={() => requestDelete('appointments', appt.id, appt.title)}
                    onComplete={() => markAppointmentComplete(appt.id)}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Medications List */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-gray-800 text-lg">รายการยาทั้งหมด</h2>
              <button 
                onClick={() => { 
                  setFormMed({ name: '', time: 'หลังอาหารเช้า', dose: '1 เม็ด', frequency: 'ทุกวัน', note: '' }); 
                  setEditMedId(null); 
                  setShowMedModal(true); 
                }} 
                className="text-blue-600 text-sm font-bold bg-blue-50 px-3 py-1 rounded-lg hover:bg-blue-100"
              >
                + เพิ่มยา
              </button>
            </div>
            
            {meds.map(med => {
              const isTaken = todayMedsTaken.includes(med.id);
              return (
                <MedicineItem 
                  key={med.id} 
                  med={med} 
                  isTaken={isTaken} 
                  onToggle={() => toggleMedToday(med.id)}
                  onDelete={() => requestDelete('medications', med.id, med.name)}
                  onEdit={() => { setFormMed(med); setEditMedId(med.id); setShowMedModal(true); }}
                  fontSize={fontSize}
                />
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="p-5 space-y-6">
          {/* Smart ID Card */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 rounded-3xl shadow-lg text-center">
            <p className="text-blue-200 text-sm mb-2">Smart ID ของฉัน</p>
            <h1 className="text-5xl font-bold tracking-widest mb-4">{profile?.shortId || '------'}</h1>
            <p className="text-xs opacity-80 mb-4">บอกรหัสนี้ให้ลูกหลานเพื่อเชื่อมต่อข้อมูล</p>
            <div className="flex gap-2 justify-center">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(profile?.shortId || '');
                  alert('คัดลอกรหัสแล้ว');
                }}
                className="bg-white/20 text-white px-3 py-1 rounded-full text-sm hover:bg-white/30"
              >
                คัดลอกรหัส
              </button>
              <button 
                onClick={shareHealthSummary}
                className="bg-white/20 text-white px-3 py-1 rounded-full text-sm hover:bg-white/30"
              >
                <Share2 size={14} className="inline mr-1" /> แชร์ข้อมูล
              </button>
            </div>
          </div>
          
          {/* Personal Info */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800">ข้อมูลส่วนตัว</h3>
              <button 
                onClick={() => setShowEditProfile(true)}
                className="text-blue-600 text-sm flex items-center gap-1"
              >
                <Edit2 size={14} /> แก้ไข
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                <div>
                  <p className="text-xs text-gray-500">ชื่อ-นามสกุล</p>
                  <p className="font-bold">{profile?.name || 'ยังไม่ได้ตั้งค่า'}</p>
                </div>
              </div>
              
              {profile?.birthDate && (
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                  <div>
                    <p className="text-xs text-gray-500">วันเกิด / อายุ</p>
                    <p className="font-bold">
                      {formatDateThai(profile.birthDate)} ({calculateAge(profile.birthDate)} ปี)
                    </p>
                  </div>
                </div>
              )}
              
              {profile?.bloodType && (
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                  <div>
                    <p className="text-xs text-gray-500">กรุ๊ปเลือด</p>
                    <p className="font-bold">{profile.bloodType}</p>
                  </div>
                </div>
              )}
              
              {profile?.diseases?.length > 0 && (
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                  <div>
                    <p className="text-xs text-gray-500">โรคประจำตัว</p>
                    <p className="font-bold">{profile.diseases.join(', ')}</p>
                  </div>
                </div>
              )}
              
              {profile?.allergies?.length > 0 && (
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                  <div>
                    <p className="text-xs text-gray-500">อาการแพ้</p>
                    <p className="font-bold">{profile.allergies.join(', ')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Emergency Contacts */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800">ผู้ติดต่อฉุกเฉิน</h3>
              <button 
                onClick={() => setShowAddContact(true)}
                className="text-blue-600 text-sm flex items-center gap-1"
              >
                <Plus size={14} /> เพิ่ม
              </button>
            </div>
            
            <div className="space-y-3">
              {emergencyContacts.length === 0 ? (
                <p className="text-gray-500 text-center py-4">ยังไม่มีผู้ติดต่อฉุกเฉิน</p>
              ) : (
                emergencyContacts.map((contact, index) => (
                  <div key={contact.id || index} className="flex justify-between items-center bg-red-50 p-3 rounded-xl">
                    <div>
                      <p className="font-bold text-red-800">{contact.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-red-600">{contact.phone}</span>
                        {contact.relationship && (
                          <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">
                            {contact.relationship}
                          </span>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteContact(contact.id)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Settings */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4">การตั้งค่า</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Type className="text-gray-500" size={20} />
                  <span className="text-sm font-bold text-gray-700">ขนาดตัวอักษร</span>
                </div>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                  <button 
                    onClick={() => setFontSize('normal')} 
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${fontSize === 'normal' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    ปกติ
                  </button>
                  <button 
                    onClick={() => setFontSize('large')} 
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${fontSize === 'large' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    ใหญ่
                  </button>
                </div>
              </div>
              
              <div 
                onClick={callEmergency}
                className="flex justify-between items-center bg-red-50 p-3 rounded-xl cursor-pointer active:scale-95 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 p-2 rounded-full text-red-600">
                    <Phone size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-red-800 text-sm">1669 ฉุกเฉิน</h3>
                    <p className="text-[10px] text-red-400">
                      {gpsLocation ? `พิกัด: ${gpsLocation}` : 'แตะเพื่อดูพิกัด GPS'}
                    </p>
                  </div>
                </div>
                <Navigation size={16} className="text-red-400" />
              </div>
              
              <button 
                onClick={() => signOut(auth)}
                className="w-full text-center text-red-500 text-sm p-3 bg-red-50 rounded-xl hover:bg-red-100"
              >
                <LogOut size={14} className="inline mr-2" />
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-100 pb-6 pt-2 px-2 flex justify-between items-center z-40 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
        <button 
          onClick={() => setActiveTab('home')} 
          className={`flex-1 p-2 flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Home size={24} />
          <span className="text-[10px]">หน้าหลัก</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('stats')} 
          className={`flex-1 p-2 flex flex-col items-center gap-1 transition-all ${activeTab === 'stats' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Activity size={24} />
          <span className="text-[10px]">กราฟ</span>
        </button>
        
        <div className="relative -top-8 mx-2">
          <button 
            onClick={() => setShowInputModal(true)} 
            className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-4 rounded-full shadow-xl active:scale-95 transition-transform border-4 border-slate-50 hover:shadow-2xl"
          >
            <Plus size={32} strokeWidth={3} />
          </button>
        </div>
        
        <button 
          onClick={() => setActiveTab('care')} 
          className={`flex-1 p-2 flex flex-col items-center gap-1 transition-all ${activeTab === 'care' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <CalendarIcon size={24} />
          <span className="text-[10px]">ตาราง</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('profile')} 
          className={`flex-1 p-2 flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <User size={24} />
          <span className="text-[10px]">ฉัน</span>
        </button>
      </div>

      {/* Modals */}
      
      {/* Health Input Modal */}
      {showInputModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">บันทึกข้อมูลสุขภาพ</h2>
              <button 
                onClick={() => setShowInputModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {[
                { type: 'bp', label: 'ความดัน' },
                { type: 'sugar', label: 'น้ำตาล' },
                { type: 'weight', label: 'น้ำหนัก' },
                { type: 'lab', label: 'ผลเลือด' }
              ].map(item => (
                <button 
                  key={item.type}
                  onClick={() => setInputType(item.type)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold border whitespace-nowrap transition-all ${inputType === item.type ? 'bg-blue-50 border-blue-500 text-blue-600' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            
            <div className="space-y-4 mb-6">
              {inputType === 'bp' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">ความดันบน (SYS)</label>
                      <input 
                        type="number" 
                        placeholder="120" 
                        value={formHealth.sys}
                        onChange={e => setFormHealth({...formHealth, sys: e.target.value})}
                        className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">ความดันล่าง (DIA)</label>
                      <input 
                        type="number" 
                        placeholder="80" 
                        value={formHealth.dia}
                        onChange={e => setFormHealth({...formHealth, dia: e.target.value})}
                        className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">อัตราการเต้นหัวใจ (ไม่บังคับ)</label>
                    <input 
                      type="number" 
                      placeholder="72" 
                      value={formHealth.pulse}
                      onChange={e => setFormHealth({...formHealth, pulse: e.target.value})}
                      className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                    />
                  </div>
                </>
              )}
              
              {inputType === 'sugar' && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">น้ำตาลในเลือด (mg/dL)</label>
                  <input 
                    type="number" 
                    placeholder="100" 
                    value={formHealth.sugar}
                    onChange={e => setFormHealth({...formHealth, sugar: e.target.value})}
                    className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                  />
                </div>
              )}
              
              {inputType === 'weight' && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">น้ำหนัก (กิโลกรัม)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    placeholder="65.5" 
                    value={formHealth.weight}
                    onChange={e => setFormHealth({...formHealth, weight: e.target.value})}
                    className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                  />
                </div>
              )}
              
              {inputType === 'lab' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">HbA1c (%)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      placeholder="5.8" 
                      value={formHealth.hba1c}
                      onChange={e => setFormHealth({...formHealth, hba1c: e.target.value})}
                      className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">ไขมัน (mg/dL)</label>
                      <input 
                        type="number" 
                        placeholder="150" 
                        value={formHealth.lipid}
                        onChange={e => setFormHealth({...formHealth, lipid: e.target.value})}
                        className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">eGFR</label>
                      <input 
                        type="number" 
                        placeholder="90" 
                        value={formHealth.egfr}
                        onChange={e => setFormHealth({...formHealth, egfr: e.target.value})}
                        className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowInputModal(false)}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleAddHealth}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:opacity-90 transition-opacity"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Medication Modal */}
      {showMedModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                {editMedId ? 'แก้ไขยา' : 'เพิ่มยาใหม่'}
              </h2>
              <button 
                onClick={() => {
                  setShowMedModal(false);
                  setEditMedId(null);
                  setFormMed({ name: '', time: 'หลังอาหารเช้า', dose: '1 เม็ด', frequency: 'ทุกวัน', note: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">ชื่อยา *</label>
                <input 
                  type="text" 
                  placeholder="ชื่อยา" 
                  value={formMed.name}
                  onChange={e => setFormMed({...formMed, name: e.target.value})}
                  className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-500 mb-1 block">เวลาทาน</label>
                <select 
                  value={formMed.time}
                  onChange={e => setFormMed({...formMed, time: e.target.value})}
                  className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                >
                  <option value="หลังอาหารเช้า">หลังอาหารเช้า</option>
                  <option value="ก่อนอาหารเช้า">ก่อนอาหารเช้า</option>
                  <option value="หลังอาหารกลางวัน">หลังอาหารกลางวัน</option>
                  <option value="ก่อนอาหารกลางวัน">ก่อนอาหารกลางวัน</option>
                  <option value="หลังอาหารเย็น">หลังอาหารเย็น</option>
                  <option value="ก่อนอาหารเย็น">ก่อนอาหารเย็น</option>
                  <option value="ก่อนนอน">ก่อนนอน</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">ปริมาณ</label>
                  <input 
                    type="text" 
                    placeholder="1 เม็ด" 
                    value={formMed.dose}
                    onChange={e => setFormMed({...formMed, dose: e.target.value})}
                    className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">ความถี่</label>
                  <select 
                    value={formMed.frequency}
                    onChange={e => setFormMed({...formMed, frequency: e.target.value})}
                    className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                  >
                    <option value="ทุกวัน">ทุกวัน</option>
                    <option value="สัปดาห์ละครั้ง">สัปดาห์ละครั้ง</option>
                    <option value="เดือนละครั้ง">เดือนละครั้ง</option>
                    <option value="เมื่อมีอาการ">เมื่อมีอาการ</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-500 mb-1 block">หมายเหตุ (ไม่บังคับ)</label>
                <textarea 
                  placeholder="เช่น ก่อนนอน, หลังอาหาร 30 นาที"
                  value={formMed.note}
                  onChange={e => setFormMed({...formMed, note: e.target.value})}
                  className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                  rows="2"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              {editMedId && (
                <button 
                  onClick={() => requestDelete('medications', editMedId, formMed.name)}
                  className="flex-1 py-3 rounded-xl bg-red-100 text-red-600 font-bold hover:bg-red-200 transition-colors"
                >
                  ลบ
                </button>
              )}
              <button 
                onClick={handleSaveMed}
                className={`${editMedId ? 'flex-1' : 'w-full'} py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:opacity-90 transition-opacity`}
              >
                {editMedId ? 'บันทึก' : 'เพิ่มยา'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Appointment Modal */}
      {showApptModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                {editApptId ? 'แก้ไขนัดหมาย' : 'เพิ่มนัดหมายใหม่'}
              </h2>
              <button 
                onClick={() => {
                  setShowApptModal(false);
                  setEditApptId(null);
                  setFormAppt({ 
                    title: '', 
                    date: getTodayStr(), 
                    time: '09:00', 
                    location: '', 
                    doctor: '', 
                    note: '' 
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">หัวข้อ *</label>
                <input 
                  type="text" 
                  placeholder="เช่น นัดตรวจเลือด, พบแพทย์ประจำตัว"
                  value={formAppt.title}
                  onChange={e => setFormAppt({...formAppt, title: e.target.value})}
                  className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">วันที่ *</label>
                  <input 
                    type="date" 
                    value={formAppt.date}
                    onChange={e => setFormAppt({...formAppt, date: e.target.value})}
                    className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">เวลา</label>
                  <input 
                    type="time" 
                    value={formAppt.time}
                    onChange={e => setFormAppt({...formAppt, time: e.target.value})}
                    className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-500 mb-1 block">สถานที่ (ไม่บังคับ)</label>
                <input 
                  type="text" 
                  placeholder="เช่น โรงพยาบาล..."
                  value={formAppt.location}
                  onChange={e => setFormAppt({...formAppt, location: e.target.value})}
                  className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-500 mb-1 block">แพทย์ (ไม่บังคับ)</label>
                <input 
                  type="text" 
                  placeholder="ชื่อแพทย์"
                  value={formAppt.doctor}
                  onChange={e => setFormAppt({...formAppt, doctor: e.target.value})}
                  className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-500 mb-1 block">หมายเหตุ (ไม่บังคับ)</label>
                <textarea 
                  placeholder="เช่น ต้องงดอาหาร 8 ชั่วโมง"
                  value={formAppt.note}
                  onChange={e => setFormAppt({...formAppt, note: e.target.value})}
                  className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                  rows="2"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              {editApptId && (
                <button 
                  onClick={() => requestDelete('appointments', editApptId, formAppt.title)}
                  className="flex-1 py-3 rounded-xl bg-red-100 text-red-600 font-bold hover:bg-red-200 transition-colors"
                >
                  ลบ
                </button>
              )}
              <button 
                onClick={handleSaveAppt}
                className={`${editApptId ? 'flex-1' : 'w-full'} py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:opacity-90 transition-opacity`}
              >
                {editApptId ? 'บันทึก' : 'เพิ่มนัดหมาย'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">แก้ไขข้อมูลส่วนตัว</h2>
              <button 
                onClick={() => setShowEditProfile(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">ชื่อ-นามสกุล *</label>
                <input 
                  type="text" 
                  placeholder="ชื่อ-นามสกุล" 
                  value={formProfile.name}
                  onChange={e => setFormProfile({...formProfile, name: e.target.value})}
                  className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-500 mb-1 block">วันเกิด</label>
                <input 
                  type="date" 
                  value={formProfile.birthDate}
                  onChange={e => setFormProfile({...formProfile, birthDate: e.target.value})}
                  className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-500 mb-1 block">กรุ๊ปเลือด</label>
                <select 
                  value={formProfile.bloodType || ''}
                  onChange={e => setFormProfile({...formProfile, bloodType: e.target.value})}
                  className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                >
                  <option value="">ไม่ระบุ</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="AB">AB</option>
                  <option value="O">O</option>
                </select>
              </div>
              
              <div>
                <label className="text-xs text-gray-500 mb-1 block">โรคประจำตัว (คั่นด้วยลูกน้ำ)</label>
                <input 
                  type="text" 
                  placeholder="เช่น เบาหวาน, ความดันสูง" 
                  value={Array.isArray(formProfile.diseases) ? formProfile.diseases.join(', ') : formProfile.diseases}
                  onChange={e => setFormProfile({...formProfile, diseases: e.target.value.split(',').map(d => d.trim())})}
                  className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-500 mb-1 block">อาการแพ้ (คั่นด้วยลูกน้ำ)</label>
                <input 
                  type="text" 
                  placeholder="เช่น ยาแก้ปวด, อาหารทะเล" 
                  value={Array.isArray(formProfile.allergies) ? formProfile.allergies.join(', ') : formProfile.allergies}
                  onChange={e => setFormProfile({...formProfile, allergies: e.target.value.split(',').map(a => a.trim())})}
                  className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowEditProfile(false)}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleUpdateProfile}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:opacity-90 transition-opacity"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">เพิ่มผู้ติดต่อฉุกเฉิน</h2>
              <button 
                onClick={() => setShowAddContact(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">ชื่อ *</label>
                <input 
                  type="text" 
                  placeholder="ชื่อผู้ติดต่อ" 
                  value={newContact.name}
                  onChange={e => setNewContact({...newContact, name: e.target.value})}
                  className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-500 mb-1 block">เบอร์โทร *</label>
                <input 
                  type="tel" 
                  placeholder="0812345678" 
                  value={newContact.phone}
                  onChange={e => setNewContact({...newContact, phone: e.target.value})}
                  className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-500 mb-1 block">ความสัมพันธ์ (ไม่บังคับ)</label>
                <input 
                  type="text" 
                  placeholder="เช่น ลูกชาย, ญาติ" 
                  value={newContact.relationship}
                  onChange={e => setNewContact({...newContact, relationship: e.target.value})}
                  className="w-full p-3 border rounded-xl focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowAddContact(false)}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleAddContact}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:opacity-90 transition-opacity"
              >
                เพิ่ม
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">ยืนยันการลบ</h3>
              <p className="text-gray-500">
                คุณต้องการลบ "{deleteConfirm.title}" ใช่หรือไม่?
              </p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirm({ isOpen: false, collection: null, id: null, title: '' })}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={confirmDeleteAction}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Doctor Mode Modal */}
      {showDoctorMode && (
        <div className="fixed inset-0 bg-white z-[70] overflow-y-auto animate-fade-in p-6">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-800">สรุปประวัติสุขภาพ</h1>
              <button 
                onClick={() => setShowDoctorMode(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-xl border mb-6">
              <h2 className="font-bold text-gray-700 mb-2">ข้อมูลผู้ป่วย</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-500">ชื่อ-นามสกุล</p>
                  <p className="font-bold">{profile?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">อายุ</p>
                  <p className="font-bold">{calculateAge(profile?.birthDate) || '-'} ปี</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">กรุ๊ปเลือด</p>
                  <p className="font-bold">{profile?.bloodType || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Smart ID</p>
                  <p className="font-bold">{profile?.shortId || '-'}</p>
                </div>
              </div>
              
              {profile?.diseases?.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-500">โรคประจำตัว</p>
                  <p className="font-bold">{profile.diseases.join(', ')}</p>
                </div>
              )}
              
              {profile?.allergies?.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-500">อาการแพ้</p>
                  <p className="font-bold">{profile.allergies.join(', ')}</p>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white p-4 rounded-xl border">
                <h3 className="font-bold text-gray-700 mb-2">ค่าสุขภาพล่าสุด</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">ความดัน</span>
                    <span className="font-bold">{latestBP ? `${latestBP.sys}/${latestBP.dia}` : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">น้ำตาล</span>
                    <span className="font-bold">{latestSugar ? `${latestSugar.sugar} mg/dL` : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">น้ำหนัก</span>
                    <span className="font-bold">{latestWeight ? `${latestWeight.weight} kg` : '-'}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-xl border">
                <h3 className="font-bold text-gray-700 mb-2">ยาที่ใช้ประจำ</h3>
                <div className="space-y-1">
                  {meds.slice(0, 3).map(med => (
                    <div key={med.id} className="flex justify-between text-sm">
                      <span>{med.name}</span>
                      <span className="text-gray-500">{med.time}</span>
                    </div>
                  ))}
                  {meds.length > 3 && (
                    <p className="text-xs text-gray-400">และอีก {meds.length - 3} รายการ</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl border mb-6">
              <h3 className="font-bold text-gray-700 mb-2">ประวัติผลเลือดล่าสุด</h3>
              {labLogs.length > 0 ? (
                labLogs.slice(0, 2).map((lab, i) => (
                  <div key={i} className="mb-3 last:mb-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-500">{formatDateThai(lab.dateStr)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {lab.hba1c && <div className="text-center"><span className="text-xs text-gray-500">HbA1c</span><p className="font-bold">{lab.hba1c}%</p></div>}
                      {lab.lipid && <div className="text-center"><span className="text-xs text-gray-500">ไขมัน</span><p className="font-bold">{lab.lipid} mg/dL</p></div>}
                      {lab.egfr && <div className="text-center"><span className="text-xs text-gray-500">eGFR</span><p className="font-bold">{lab.egfr}</p></div>}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">ไม่มีข้อมูลผลเลือด</p>
              )}
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => window.print()}
                className="flex-1 bg-indigo-600 text-white p-3 rounded-xl font-bold hover:bg-indigo-700"
              >
                พิมพ์รายงาน
              </button>
              <button 
                onClick={() => setShowDoctorMode(false)}
                className="flex-1 bg-gray-100 text-gray-600 p-3 rounded-xl font-bold hover:bg-gray-200"
              >
                ปิด
              </button>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'artifacts', appId, 'users', user.uid, 'watching'),
      async (snap) => {
        const patientPromises = snap.docs.map(async (d) => {
          const data = d.data();
          // Try to get latest health data for each patient
          const healthSnap = await getDocs(
            query(
              collection(db, 'artifacts', appId, 'users', d.id, 'health_logs'),
              orderBy('timestamp', 'desc'),
              limit(1)
            )
          );
          
          let latestHealth = {};
          if (!healthSnap.empty) {
            latestHealth = healthSnap.docs[0].data();
          }
          
          return { 
            uid: d.id, 
            ...data,
            latestHealth
          };
        });
        
        const patientsData = await Promise.all(patientPromises);
        setPatients(patientsData);
        setLoading(false);
      }
    );
    
    return () => unsub();
  }, [user]);

  const handleAddPatient = async () => {
    if (addId.length !== 6) {
      alert('กรุณากรอกรหัส 6 หลัก');
      return;
    }
    
    try {
      // 1. Find UID from Public Smart ID Mapping
      const publicIdRef = doc(db, 'artifacts', appId, 'public', 'smart_ids', addId);
      const publicIdSnap = await getDoc(publicIdRef);
      
      if (publicIdSnap.exists()) {
        const targetUid = publicIdSnap.data().uid;
        
        // Check if already added
        if (patients.some(p => p.uid === targetUid)) {
          alert('คุณได้เพิ่มผู้ป่วยนี้แล้ว');
          return;
        }
        
        // 2. Fetch Profile Name
        const profileSnap = await getDoc(doc(db, 'artifacts', appId, 'users', targetUid, 'profile', 'main'));
        const patientData = profileSnap.exists() ? profileSnap.data() : {};
        
        // 3. Add to Watch List
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'watching', targetUid), {
          name: patientData.name || `ผู้ป่วย (${addId})`,
          shortId: addId,
          addedAt: serverTimestamp(),
          bloodType: patientData.bloodType,
          diseases: patientData.diseases || []
        });
        
        setShowAddModal(false);
        setAddId('');
        alert('เพิ่มผู้ป่วยสำเร็จ');
      } else {
        alert('ไม่พบรหัส Smart ID นี้ในระบบ');
      }
    } catch (error) {
      console.error('Error adding patient:', error);
      alert('เกิดข้อผิดพลาดในการเพิ่มผู้ป่วย');
    }
  };

  const handleRemovePatient = async (patientUid) => {
    if (window.confirm('คุณต้องการลบผู้ป่วยออกจากรายการหรือไม่?')) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'watching', patientUid));
      } catch (error) {
        console.error('Error removing patient:', error);
        alert('เกิดข้อผิดพลาดในการลบผู้ป่วย');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-white to-blue-50 min-h-screen p-5 animate-fade-in">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-6 mt-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">ดูแลครอบครัว</h1>
            <p className="text-gray-500 text-sm">ติดตามสุขภาพคนที่คุณห่วงใย</p>
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="text-gray-400 hover:text-gray-600"
          >
            <LogOut size={20} />
          </button>
        </div>
        
        <div className="space-y-4 mb-8">
          {patients.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-dashed border-gray-200 text-center shadow-sm">
              <Users size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="font-bold text-gray-700 mb-2">ยังไม่มีผู้ป่วยที่ติดตาม</h3>
              <p className="text-gray-500 text-sm mb-4">
                เพิ่มผู้ป่วยโดยใช้รหัส Smart ID 6 หลัก
              </p>
              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-xl font-bold"
              >
                เพิ่มผู้ป่วยแรก
              </button>
            </div>
          ) : (
            <>
              {patients.map(patient => {
                const latestBP = patient.latestHealth?.sys && patient.latestHealth?.dia 
                  ? `${patient.latestHealth.sys}/${patient.latestHealth.dia}`
                  : '-';
                
                const latestSugar = patient.latestHealth?.sugar 
                  ? `${patient.latestHealth.sugar}`
                  : '-';
                
                return (
                  <div 
                    key={patient.uid} 
                    className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer active:scale-95 transition-all hover:shadow-md"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div 
                        className="flex items-center gap-4 flex-1"
                        onClick={() => onSelectPatient(patient.uid)}
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                          {patient.name?.charAt(0) || 'P'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-800">{patient.name}</h3>
                            {patient.bloodType && (
                              <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
                                {patient.bloodType}
                              </span>
                            )}
                          </div>
                          {patient.diseases?.length > 0 && (
                            <p className="text-gray-500 text-xs mt-1">
                              {patient.diseases.slice(0, 2).join(', ')}
                              {patient.diseases.length > 2 && '...'}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePatient(patient.uid);
                          }}
                          className="text-gray-400 hover:text-red-500 p-1.5"
                        >
                          <Trash2 size={16} />
                        </button>
                        <ChevronRight className="text-gray-300" size={20} />
                      </div>
                    </div>
                    
                    <div 
                      className="grid grid-cols-2 gap-3"
                      onClick={() => onSelectPatient(patient.uid)}
                    >
                      <div className="bg-gray-50 p-2 rounded-xl text-center">
                        <p className="text-xs text-gray-500">ความดันล่าสุด</p>
                        <p className="font-bold text-lg text-gray-800">{latestBP}</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-xl text-center">
                        <p className="text-xs text-gray-500">น้ำตาลล่าสุด</p>
                        <p className="font-bold text-lg text-gray-800">{latestSugar}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="w-full bg-white p-4 rounded-2xl border-2 border-dashed border-blue-200 flex justify-center items-center gap-2 text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <Plus size={20} /> เพิ่มคนไข้ใหม่
        </button>
        
        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            ต้องการเป็นผู้ป่วยเอง? 
            <button 
              onClick={async () => {
                try {
                  await setDoc(
                    doc(db, 'artifacts', appId, 'users', user.uid), 
                    { role: 'patient' }, 
                    { merge: true }
                  );
                  // Refresh page to update role
                  window.location.reload();
                } catch (error) {
                  console.error('Error switching role:', error);
                }
              }}
              className="text-blue-600 ml-1 underline"
            >
              เปลี่ยนเป็นผู้ป่วย
            </button>
          </p>
        </div>
      </div>
      
      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <QrCode size={24} className="text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-800">เพิ่มผู้ป่วยด้วย Smart ID</h3>
              <p className="text-gray-500 text-sm">ขอรหัส 6 หลักจากผู้ป่วย</p>
            </div>
            
            <div className="mb-6">
              <input 
                value={addId}
                onChange={e => setAddId(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full text-center text-3xl font-bold p-4 bg-gray-50 rounded-xl mb-2 tracking-widest outline-none"
                placeholder="000000"
                maxLength={6}
              />
              <p className="text-gray-400 text-xs text-center">
                กรอกรหัส Smart ID 6 หลัก
              </p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setAddId('');
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleAddPatient}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
              >
                ค้นหา
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPatientUid, setSelectedPatientUid] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          // Check if user role is already set
          const userDoc = await getDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setRole(userData.role || null);
            
            // If patient, ensure they have a shortId
            if (userData.role === 'patient' && !userData.shortId) {
              const shortId = generateSmartId();
              
              // Update user document with shortId
              await updateDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid), {
                shortId,
                updatedAt: serverTimestamp()
              });
              
              // Create profile if not exists
              await setDoc(
                doc(db, 'artifacts', appId, 'users', currentUser.uid, 'profile', 'main'),
                { 
                  name: 'ผู้สูงอายุ',
                  shortId,
                  createdAt: serverTimestamp()
                },
                { merge: true }
              );
              
              // Register in public smart_id mapping
              await setDoc(
                doc(db, 'artifacts', appId, 'public', 'smart_ids', shortId),
                { uid: currentUser.uid }
              );
            }
          }
        } catch (error) {
          console.error('Error checking user role:', error);
        }
      } else {
        setRole(null);
        setSelectedPatientUid(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRoleSelect = async (selectedRole) => {
    if (!user) return;
    
    try {
      const userData = { 
        role: selectedRole, 
        setupAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      if (selectedRole === 'patient') {
        const shortId = generateSmartId();
        userData.shortId = shortId;
        
        // Create user document
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid), userData);
        
        // Create profile
        await setDoc(
          doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main'),
          { 
            name: 'ผู้สูงอายุ',
            shortId,
            createdAt: serverTimestamp()
          }
        );
        
        // Register in public smart_id mapping
        await setDoc(
          doc(db, 'artifacts', appId, 'public', 'smart_ids', shortId),
          { uid: user.uid }
        );
      } else {
        // Caregiver
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid), userData);
      }
      
      setRole(selectedRole);
    } catch (error) {
      console.error('Error setting role:', error);
      alert('เกิดข้อผิดพลาดในการตั้งค่าบทบาท');
    }
  };

  const handleBackToAuth = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setRole(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto" size={40} />
          <p className="text-gray-500 mt-4">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (!role) {
    return <RoleSelector onSelect={handleRoleSelect} onBack={handleBackToAuth} />;
  }

  if (role === 'caregiver') {
    if (selectedPatientUid) {
      return (
        <PatientDashboard 
          targetUid={selectedPatientUid} 
          currentUserRole="caregiver" 
          onBack={() => setSelectedPatientUid(null)} 
        />
      );
    }
    return <CaregiverHome user={user} onSelectPatient={setSelectedPatientUid} />;
  }

  return <PatientDashboard targetUid={user?.uid} currentUserRole="patient" />;
}
