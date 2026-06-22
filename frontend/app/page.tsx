"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  Activity,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Download,
  DownloadCloud,
  FileSpreadsheet,
  Globe2,
  HardDrive,
  KeyRound,
  Languages,
  LayoutDashboard,
  Loader2,
  Network,
  Plus,
  Power,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Smartphone,
  Trash2,
  UploadCloud,
  Users,
  Wifi,
  WifiOff,
  Calendar,
  Filter,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const DEFAULT_SERVER_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
const DEFAULT_TABLET_API = process.env.NEXT_PUBLIC_TABLET_API_URL || 'http://localhost:5000/api';

type Stats = {
  totalStudents: number;
  totalDevices: number;
  onlineDevices: number;
  activeDevices?: number;
  offlineDevices?: number;
  attendanceToday: number;
  presentToday?: number;
  absentToday?: number;
  lateStudents: number;
  totalLogs: number;
  uniqueStudents: number;
  checkInCount: number;
  checkOutCount: number;
  fingerprintCount: number;
  faceCount: number;
  cardCount: number;
  passwordCount: number;
  attendanceRate?: number;
  deviceConnected?: boolean;
  deviceUsers?: number;
  deviceFaces?: number;
  deviceFingerprints?: number;
};

type Student = {
  id?: string;
  studentId?: string;
  studentDeviceId?: string;
  name: string;
  class?: string;
  className?: string;
  section?: string;
  club?: string;
  parentPhone?: string;
  status?: string;
  biometricMethods?: string[];
  backupNumbers?: number[];
  privilege?: number;
  enabled?: boolean;
};

type AttendanceLog = {
  id?: string;
  studentId?: string;
  studentDeviceId?: string;
  studentName?: string;
  name?: string;
  className?: string;
  section?: string;
  club?: string;
  deviceId?: string;
  method?: string | number;
  authenticationMethod?: string;
  direction?: string | number;
  directionLabel?: string;
  timestamp: string;
  status?: string;
  tabletId?: string;
};

type Tablet = {
  id: string;
  name: string;
  ip: string;
  port: number;
  url?: string;
  status: 'online' | 'offline' | 'error';
  lastSync?: string;
};

type DeviceStatus = {
  connected?: boolean;
  deviceId?: string;
  ipAddress?: string;
  port?: number;
  serialNumber?: string;
  productName?: string;
  productCode?: string;
  users?: number;
  logs?: number;
  faces?: number;
  fingerprints?: number;
  cards?: number;
};

type SystemHealth = {
  ok: boolean;
  label: string;
  detail: string;
};

type Session = {
  id?: string;
  name: string;
  className: string;
  subject?: string;
  startTime: string;
  endTime?: string;
  status?: 'scheduled' | 'active' | 'ended';
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

type LiveMonitorRecord = AttendanceLog & {
  club?: string;
  timeAgo?: string;
};

const emptyStats: Stats = {
  totalStudents: 0,
  totalDevices: 0,
  onlineDevices: 0,
  attendanceToday: 0,
  lateStudents: 0,
  totalLogs: 0,
  uniqueStudents: 0,
  checkInCount: 0,
  checkOutCount: 0,
  fingerprintCount: 0,
  faceCount: 0,
  cardCount: 0,
  passwordCount: 0,
  deviceConnected: false,
  deviceUsers: 0,
  deviceFaces: 0,
  deviceFingerprints: 0,
};

const classes = ['S1', 'S2', 'S3', 'S4', 'S5 MPC', 'S5 MEG', 'S5 PCB', 'S6 MPC', 'S6 MEG', 'S6 PCB'];
const clubs = ['None', 'Football', 'Basketball', 'Music', 'Drama', 'Debate', 'Science', 'Art', 'Chess', 'Robotics'];

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'monitor', label: 'Live Monitor', icon: Activity },
  { id: 'sessions', label: 'Sessions', icon: Calendar },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'devices', label: 'Devices', icon: Cpu },
  { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function getStoredValue(key: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  return window.localStorage.getItem(key) || fallback;
}

function unwrapArray<T>(payload: any, keys: string[] = []): T[] {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data?.students)) return payload.data.students;
  if (Array.isArray(payload?.data?.users)) return payload.data.users;
  return [];
}

function unwrapStats(payload: any): Stats {
  const data = payload?.stats || payload?.data || payload || {};
  return { ...emptyStats, ...data };
}

function normalizeLog(log: AttendanceLog): AttendanceLog {
  return {
    ...log,
    name: log.name || log.studentName || log.studentId || log.studentDeviceId || 'Unknown student',
    authenticationMethod: String(log.authenticationMethod || log.method || 'Device Verified'),
    directionLabel: log.directionLabel || ([1, 3, 5, 7].includes(Number(log.direction)) ? 'In' : [2, 4, 6, 8].includes(Number(log.direction)) ? 'Out' : ''),
    status: log.status || 'Present',
  };
}

function statusTone(ok?: boolean) {
  return ok ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border-rose-500/30';
}

export default function ServerCommandCenter() {
  const [activeTab, setActiveTab] = useState('overview');
  const [serverApi, setServerApi] = useState(DEFAULT_SERVER_API);
  const [tabletApi, setTabletApi] = useState(DEFAULT_TABLET_API);
  const [serverHealth, setServerHealth] = useState<SystemHealth>({ ok: false, label: 'Server API', detail: 'Checking...' });
  const [tabletHealth, setTabletHealth] = useState<SystemHealth>({ ok: false, label: 'Tablet API', detail: 'Checking...' });
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [students, setStudents] = useState<Student[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [tablets, setTablets] = useState<Tablet[]>([]);
  const [device, setDevice] = useState<DeviceStatus | null>(null);
  const [deviceUsers, setDeviceUsers] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('All Methods');
  const [busy, setBusy] = useState(false);
  const [readMark, setReadMark] = useState(0);
  // Date range filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [studentForm, setStudentForm] = useState({
    name: '',
    studentId: 'RW-',
    deviceUserId: '',
    className: 'S1',
    section: 'A',
    club: 'None',
    parentPhone: '',
  });
  const [tabletForm, setTabletForm] = useState({
    name: 'Main Gate Tablet',
    ip: 'localhost',
    port: 5000,
  });
  const [deviceForm, setDeviceForm] = useState({
    deviceId: 'DV-KGL-01',
    ipAddress: '10.212.124.16',
    port: 5005,
    license: 1261,
  });

  // ===== NEW STATE FOR SESSIONS, LIVE MONITOR, AND FILTERS =====
  const [sessions, setSessions] = useState<Session[]>([]);
  const [liveMonitor, setLiveMonitor] = useState<LiveMonitorRecord[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceLog[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  
  // Student filters
  const [studentClassFilter, setStudentClassFilter] = useState('');
  const [studentSectionFilter, setStudentSectionFilter] = useState('');
  const [studentClubFilter, setStudentClubFilter] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [viewAllStudents, setViewAllStudents] = useState(false);
  
  // Session form
  const [sessionForm, setSessionForm] = useState({
    name: '',
    className: 'S1',
    subject: '',
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
  });

  useEffect(() => {
    const savedServer = getStoredValue('fk-server-api', DEFAULT_SERVER_API);
    const savedTablet = getStoredValue('fk-tablet-api', DEFAULT_TABLET_API);
    setServerApi(savedServer);
    setTabletApi(savedTablet);
  }, []);

  useEffect(() => {
    refreshAll();
    const timer = window.setInterval(refreshAll, 30000);
    return () => window.clearInterval(timer);
  }, [serverApi, tabletApi]);

  async function request(base: string, endpoint: string, options?: RequestInit) {
    const response = await fetch(`${base}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok) throw new Error(data?.error || data?.message || `${response.status} ${response.statusText}`);
    return data;
  }

  async function refreshAll() {
    setBusy(true);
    try {
      // Build attendance query with date filters
      let attendanceEndpoint = '/attendance';
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (params.toString()) attendanceEndpoint += '?' + params.toString();

      const [
        serverHealthRes,
        tabletHealthRes,
        statsRes,
        studentsRes,
        logsRes,
        tabletsRes,
        deviceRes,
        usersRes,
        sessionsRes,
        liveMonitorRes,
        todayAttendanceRes,
      ] = await Promise.allSettled([
        request(serverApi, '/health'),
        request(tabletApi, '/health'),
        request(serverApi, '/dashboard/stats'),
        request(serverApi, '/students'),
        request(serverApi, attendanceEndpoint),
        request(serverApi, '/tablets'),
        request(tabletApi, '/device/status'),
        request(tabletApi, '/device/users'),
        request(serverApi, '/sessions'),
        request(serverApi, '/monitor/live?limit=50'),
        request(serverApi, '/attendance/today'),
      ]);

      setServerHealth(serverHealthRes.status === 'fulfilled'
        ? { ok: true, label: 'Linux Server API', detail: serverApi }
        : { ok: false, label: 'Linux Server API', detail: serverHealthRes.reason?.message || 'Offline' });

      setTabletHealth(tabletHealthRes.status === 'fulfilled'
        ? { ok: true, label: 'Windows Tablet API', detail: tabletApi }
        : { ok: false, label: 'Windows Tablet API', detail: tabletHealthRes.reason?.message || 'Offline' });

      if (statsRes.status === 'fulfilled') setStats(unwrapStats(statsRes.value));
      if (studentsRes.status === 'fulfilled') setStudents(unwrapArray<Student>(studentsRes.value, ['students']));
      if (logsRes.status === 'fulfilled') setLogs(unwrapArray<AttendanceLog>(logsRes.value, ['attendance', 'logs']).map(normalizeLog));
      if (tabletsRes.status === 'fulfilled') setTablets(unwrapArray<Tablet>(tabletsRes.value, ['tablets']));
      if (deviceRes.status === 'fulfilled') setDevice(deviceRes.value?.data || deviceRes.value?.device || deviceRes.value || null);
      if (usersRes.status === 'fulfilled') setDeviceUsers(unwrapArray<any>(usersRes.value, ['users']));
      
      // NEW: Load sessions and live monitoring data
      if (sessionsRes.status === 'fulfilled') setSessions(unwrapArray<Session>(sessionsRes.value, ['sessions', 'data']));
      if (liveMonitorRes.status === 'fulfilled') setLiveMonitor(unwrapArray<LiveMonitorRecord>(liveMonitorRes.value, ['data']));
      if (todayAttendanceRes.status === 'fulfilled') setTodayAttendance(unwrapArray<AttendanceLog>(todayAttendanceRes.value, ['data']).map(normalizeLog));
    } finally {
      setBusy(false);
    }
  }

  function saveApiSettings(event: FormEvent) {
    event.preventDefault();
    window.localStorage.setItem('fk-server-api', serverApi.replace(/\/$/, ''));
    window.localStorage.setItem('fk-tablet-api', tabletApi.replace(/\/$/, ''));
    setServerApi((value) => value.replace(/\/$/, ''));
    setTabletApi((value) => value.replace(/\/$/, ''));
    toast.success('API settings saved');
  }

  async function registerTablet(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    toast.loading('Registering tablet on Linux server...', { id: 'tablet-register' });
    try {
      await request(serverApi, '/tablets', {
        method: 'POST',
        body: JSON.stringify(tabletForm),
      });
      toast.success('Tablet registered and reachable', { id: 'tablet-register' });
      await refreshAll();
    } catch (error: any) {
      toast.error(error?.message || 'Tablet registration failed', { id: 'tablet-register' });
    } finally {
      setBusy(false);
    }
  }

  async function connectDevice(event?: FormEvent) {
    event?.preventDefault();
    setBusy(true);
    toast.loading('Connecting tablet backend to FK623 device...', { id: 'connect-device' });
    try {
      const res = await request(tabletApi, '/device/connect', {
        method: 'POST',
        body: JSON.stringify(deviceForm),
      });
      setDevice(res?.data || res);
      toast.success('Device connected through tablet backend', { id: 'connect-device' });
      await refreshAll();
    } catch (error: any) {
      toast.error(error?.message || 'Device connection failed', { id: 'connect-device' });
    } finally {
      setBusy(false);
    }
  }

  async function disconnectDevice() {
    setBusy(true);
    try {
      await request(tabletApi, '/device/disconnect', { method: 'POST' });
      toast.success('Device disconnected');
      await refreshAll();
    } catch (error: any) {
      toast.error(error?.message || 'Disconnect failed');
    } finally {
      setBusy(false);
    }
  }

  async function syncDeviceTime() {
    setBusy(true);
    try {
      await request(tabletApi, '/device/sync-time', { method: 'POST' });
      toast.success('Tablet sent time sync command to device');
    } catch (error: any) {
      toast.error(error?.message || 'Sync time failed');
    } finally {
      setBusy(false);
    }
  }

  // ====== PULL LOGS via server proxy ======
  async function pullDeviceLogs() {
    setBusy(true);
    toast.loading('Pulling logs from tablet and saving to server...', { id: 'pull-logs' });
    try {
      const res = await request(serverApi, '/device/pull-logs', {
        method: 'POST',
        body: JSON.stringify({ tabletId: 'TABLET-001', readMark }),
      });
      const count = res?.data?.savedCount || res?.savedCount || 0;
      toast.success(`Saved ${count} logs to server database`, { id: 'pull-logs' });
      await refreshAll();
    } catch (error: any) {
      toast.error(error?.message || 'Pull logs failed', { id: 'pull-logs' });
    } finally {
      setBusy(false);
    }
  }

  // ====== PULL USERS via server proxy ======
  async function pullDeviceUsers() {
    setBusy(true);
    toast.loading('Pulling students from device and saving to server...', { id: 'pull-users' });
    try {
      const res = await request(serverApi, '/device/users?tabletId=TABLET-001', {
        method: 'GET',
      });
      const count = res?.data?.savedCount || res?.savedCount || 0;
      toast.success(`Saved ${count} students to server database`, { id: 'pull-users' });
      await refreshAll();
    } catch (error: any) {
      toast.error(error?.message || 'Pull students failed', { id: 'pull-users' });
    } finally {
      setBusy(false);
    }
  }

  // ====== CREATE SESSION ======
  async function createSession(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    toast.loading('Creating attendance session...', { id: 'session-create' });
    try {
      const res = await request(serverApi, '/sessions', {
        method: 'POST',
        body: JSON.stringify({ ...sessionForm, createdBy: 'admin' }),
      });
      toast.success('Session created successfully', { id: 'session-create' });
      setSessionForm({
        name: '',
        className: 'S1',
        subject: '',
        startTime: new Date().toISOString().slice(0, 16),
        endTime: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
      });
      await refreshAll();
    } catch (error: any) {
      toast.error(error?.message || 'Session creation failed', { id: 'session-create' });
    } finally {
      setBusy(false);
    }
  }

  // ====== UPDATE SESSION STATUS ======
  async function updateSessionStatus(sessionId: string, status: string) {
    setBusy(true);
    try {
      await request(serverApi, `/sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      toast.success(`Session ${status === 'active' ? 'started' : 'ended'}`);
      await refreshAll();
    } catch (error: any) {
      toast.error(error?.message || 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  // ====== Register Student ======
  async function registerStudent(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    toast.loading('Saving student on server and pushing to tablet/device...', { id: 'student-save' });
    try {
      await request(serverApi, '/students', {
        method: 'POST',
        body: JSON.stringify({ ...studentForm, pushToDevice: true }),
      });
      
      await request(tabletApi, '/students', {
        method: 'POST',
        body: JSON.stringify({ ...studentForm, pushToDevice: true }),
      }).catch(() => null);
      
      await request(tabletApi, '/device/push-students', {
        method: 'POST',
        body: JSON.stringify({ studentIds: [studentForm.studentId] }),
      }).catch(() => null);
      
      toast.success('Student synchronized across server and tablet', { id: 'student-save' });
      setStudentForm({ name: '', studentId: 'RW-', deviceUserId: '', className: 'S1', section: 'A', club: 'None', parentPhone: '' });
      await refreshAll();
    } catch (error: any) {
      toast.error(error?.message || 'Student sync failed', { id: 'student-save' });
    } finally {
      setBusy(false);
    }
  }

  async function deleteStudent(student: Student) {
    if (!confirm(`Delete ${student.name}?`)) return;
    setBusy(true);
    try {
      const id = student.studentId || student.id || student.studentDeviceId;
      await request(serverApi, `/students/${id}`, { method: 'DELETE' });
      if (student.studentDeviceId) {
        await request(tabletApi, `/device/users/${student.studentDeviceId}`, { method: 'DELETE' }).catch(() => null);
      }
      toast.success('Student removed from server and tablet device user list');
      await refreshAll();
    } catch (error: any) {
      toast.error(error?.message || 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  // ====== SEARCH ======
  const filteredStudents = useMemo(() => {
    let result = students;
    
    // Search query filter
    if (query || studentSearchQuery) {
      const q = (query || studentSearchQuery).toLowerCase();
      result = result.filter((student) => {
        const target = `${student.studentId} ${student.studentDeviceId} ${student.name} ${student.className || student.class} ${student.section} ${student.club || ''}`.toLowerCase();
        return target.includes(q);
      });
    }
    
    // Class filter
    if (studentClassFilter) {
      result = result.filter((student) => student.className === studentClassFilter || student.class === studentClassFilter);
    }
    
    // Club filter
    if (studentClubFilter) {
      result = result.filter((student) => student.club === studentClubFilter);
    }
    
    return result;
  }, [students, query, studentSearchQuery, studentClassFilter, studentClubFilter]);

  const filteredLogs = useMemo(() => {
    const q = query.toLowerCase();
    return logs.filter((log) => {
      const matchesMethod = methodFilter === 'All Methods' || String(log.authenticationMethod).includes(methodFilter);
      const target = `${log.name} ${log.studentId} ${log.studentDeviceId} ${log.className} ${log.section} ${log.club || ''}`.toLowerCase();
      return matchesMethod && target.includes(q);
    });
  }, [logs, methodFilter, query]);

  const chartData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map((day) => ({ day, attendance: logs.filter((log) => new Date(log.timestamp).getDay() === days.indexOf(day)).length }));
  }, [logs]);

  const methodData = useMemo(() => [
    { name: 'Fingerprint', value: stats.fingerprintCount, color: '#38bdf8' },
    { name: 'Face', value: stats.faceCount, color: '#34d399' },
    { name: 'Card', value: stats.cardCount, color: '#f59e0b' },
    { name: 'Password', value: stats.passwordCount, color: '#a78bfa' },
  ].filter((item) => item.value > 0), [stats]);

  const connected = Boolean(device?.connected || stats?.deviceConnected);
  const attendanceRate = stats.attendanceRate || (stats.totalStudents ? Math.round((stats.attendanceToday / stats.totalStudents) * 100) : 0);

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-600">
              <ShieldCheck size={16} />
              Two-way HTTP/REST command center
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">FK SmartAttend Server Console</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Manage the Linux server database and the active Windows tablet backend from one professional interface.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <HealthPill health={serverHealth} icon={Server} />
            <HealthPill health={tabletHealth} icon={Smartphone} />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search students, logs, class, club..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none ring-blue-500/10 focus:border-blue-500 focus:ring-4 sm:w-80"
            />
          </div>
          <button
            onClick={refreshAll}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {busy ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            Refresh
          </button>
        </div>
      </section>

      {activeTab === 'overview' && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <MetricCard label="Total Students" value={stats.totalStudents} icon={Users} tone="blue" />
            <MetricCard label="Attendance Today" value={stats.attendanceToday || stats.presentToday || 0} icon={CheckCircle2} tone="emerald" />
            <MetricCard label="Device Status" value={connected ? 'Online' : 'Offline'} icon={connected ? Wifi : WifiOff} tone={connected ? 'emerald' : 'rose'} />
            <MetricCard label="Device Users" value={stats.deviceUsers || 0} icon={Users} tone="cyan" />
            <MetricCard label="Attendance Rate" value={`${attendanceRate}%`} icon={BarChart3} tone="violet" />
            <MetricCard label="Total Logs" value={stats.totalLogs || logs.length} icon={Database} tone="amber" />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
            <Panel title="Weekly Attendance Trend" icon={BarChart3}>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="attendanceFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" stroke="#64748b" />
                  <YAxis allowDecimals={false} stroke="#64748b" />
                  <Tooltip />
                  <Area type="monotone" dataKey="attendance" stroke="#2563eb" fill="url(#attendanceFill)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Authentication Methods" icon={KeyRound}>
              {methodData.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={methodData} dataKey="value" nameKey="name" innerRadius={65} outerRadius={98} paddingAngle={4}>
                      {methodData.map((item) => <Cell key={item.name} fill={item.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState text="No method distribution yet. Pull logs from the tablet to populate this chart." />
              )}
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Recent Attendance" icon={Clock}>
              <LogTable logs={filteredLogs.slice(0, 8)} />
            </Panel>
            <Panel title="Active Tablet Snapshot" icon={Smartphone}>
              <DeviceSnapshot device={device} connected={connected} />
            </Panel>
          </div>
        </motion.section>
      )}

      {activeTab === 'monitor' && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* TODAY'S ATTENDANCE SUMMARY */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Today's Attendance" value={todayAttendance.length} icon={CheckCircle2} tone="emerald" />
            <MetricCard label="Unique Students" value={new Set(todayAttendance.map(r => r.studentId || r.studentDeviceId)).size} icon={Users} tone="blue" />
            <MetricCard label="Check-ins" value={todayAttendance.filter(r => r.direction === 'IN' || r.direction === 1).length} icon={Activity} tone="cyan" />
            <MetricCard label="Check-outs" value={todayAttendance.filter(r => r.direction === 'OUT' || r.direction === 2).length} icon={Activity} tone="amber" />
          </div>

          {/* LIVE MONITORING TABLE */}
          <Panel title="Live Attendance Feed" icon={Activity} action={
            <div className="flex flex-wrap gap-2 items-center">
              <button onClick={pullDeviceLogs} disabled={busy || !tabletHealth.ok} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                <Download size={16} />
                Pull Latest Logs
              </button>
            </div>
          }>
            <div className="overflow-x-auto">
              <table className="min-w-[1200px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-3 px-2">Time</th>
                    <th className="py-3 px-2">Student</th>
                    <th className="py-3 px-2">ID</th>
                    <th className="py-3 px-2">Class</th>
                    <th className="py-3 px-2">Club</th>
                    <th className="py-3 px-2">Device</th>
                    <th className="py-3 px-2">Method</th>
                    <th className="py-3 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {liveMonitor.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        <EmptyState text="No attendance records yet. Pull logs to see live data." />
                      </td>
                    </tr>
                  )}
                  {liveMonitor.slice(0, 30).map((record, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-2 text-xs text-slate-500">
                        {new Date(record.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-2 font-semibold text-slate-950">{record.name || record.studentName || 'Unknown'}</td>
                      <td className="py-3 px-2 text-xs">{record.studentId || record.studentDeviceId || '-'}</td>
                      <td className="py-3 px-2 text-sm">{record.className || '-'}</td>
                      <td className="py-3 px-2 text-sm">{record.club || '-'}</td>
                      <td className="py-3 px-2 text-xs text-slate-500">{record.deviceId || 'FK623'}</td>
                      <td className="py-3 px-2">
                        <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                          {record.authenticationMethod || record.method || 'Device'}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          record.direction === 'IN' || record.direction === 1 ? 'bg-emerald-100 text-emerald-700' :
                          record.direction === 'OUT' || record.direction === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {record.direction === 'IN' || record.direction === 1 ? '↓ In' : record.direction === 'OUT' || record.direction === 2 ? '↑ Out' : record.status || 'Present'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* LOG PULL INTERFACE */}
          <Panel title="Pull Attendance Logs from Device" icon={Download}>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-slate-600">Filters:</span>
                <select value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                  <option>All Methods</option>
                  <option>Fingerprint</option>
                  <option>Face</option>
                  <option>Card</option>
                  <option>Password</option>
                </select>
              </div>
              <button onClick={pullDeviceLogs} disabled={busy || !tabletHealth.ok} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                <DownloadCloud size={16} />
                Pull Now
              </button>
              <span className="text-sm text-slate-500">Last pulled: {logs[0]?.timestamp ? new Date(logs[0].timestamp).toLocaleString() : 'Never'}</span>
            </div>
          </Panel>

          {/* LOGS TABLE */}
          <Panel title="Filtered Logs" icon={Database}>
            <LogTable logs={filteredLogs} />
          </Panel>
        </motion.section>
      )}

      {activeTab === 'students' && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 xl:grid-cols-[0.9fr_1.4fr]">
          <Panel title="Register And Push Student" icon={Plus}>
            <form onSubmit={registerStudent} className="grid gap-3">
              <Field label="Full Name" value={studentForm.name} onChange={(value) => setStudentForm({ ...studentForm, name: value })} required />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Student ID" value={studentForm.studentId} onChange={(value) => setStudentForm({ ...studentForm, studentId: value.toUpperCase() })} required />
                <Field label="Device User ID" value={studentForm.deviceUserId} onChange={(value) => setStudentForm({ ...studentForm, deviceUserId: value })} required />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-600">Class</span>
                  <select value={studentForm.className} onChange={(event) => setStudentForm({ ...studentForm, className: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                    {classes.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <Field label="Section" value={studentForm.section} onChange={(value) => setStudentForm({ ...studentForm, section: value })} />
              </div>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-600">Club</span>
                <select value={studentForm.club} onChange={(event) => setStudentForm({ ...studentForm, club: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                  {clubs.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <Field label="Parent Phone" value={studentForm.parentPhone} onChange={(value) => setStudentForm({ ...studentForm, parentPhone: value })} />
              <button disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                <UploadCloud size={17} />
                Save On Server And Tablet
              </button>
            </form>
          </Panel>

          <Panel title="Server Students" icon={Users}>
            <div className="flex flex-col gap-3">
              {/* SEARCH & FILTERS */}
              <div className="flex flex-col sm:flex-row gap-2 items-end">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="Search by name, ID, class..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <select value={studentClassFilter} onChange={(e) => setStudentClassFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm min-w-[120px]">
                  <option value="">All Classes</option>
                  {classes.map((item) => <option key={item}>{item}</option>)}
                </select>
                <select value={studentClubFilter} onChange={(e) => setStudentClubFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm min-w-[120px]">
                  <option value="">All Clubs</option>
                  {clubs.map((item) => <option key={item}>{item}</option>)}
                </select>
                <button onClick={pullDeviceUsers} disabled={busy || !tabletHealth.ok} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  <Download size={16} />
                  Pull from Device
                </button>
              </div>

              {/* STATS & ACTIONS */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Showing {filteredStudents.length} of {students.length} students</span>
                <button onClick={() => setViewAllStudents(!viewAllStudents)} className="text-sm px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold">
                  {viewAllStudents ? '▼ Collapse' : '▶ View All'}
                </button>
              </div>
            </div>

            {/* STUDENTS TABLE */}
            <div className="overflow-x-auto mt-3">
              <table className="min-w-[900px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-3">Student</th>
                    <th>Student ID</th>
                    <th>Device ID</th>
                    <th>Class</th>
                    <th>Club</th>
                    <th>Biometrics</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={`${student.studentId}-${student.studentDeviceId}`} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 font-semibold text-slate-950">{student.name}</td>
                      <td>{student.studentId || student.id || '-'}</td>
                      <td>{student.studentDeviceId || '-'}</td>
                      <td>{[student.className || student.class, student.section].filter(Boolean).join(' ') || '-'}</td>
                      <td>{student.club || '-'}</td>
                      <td>{student.biometricMethods?.length ? student.biometricMethods.join(', ') : '-'}</td>
                      <td>
                        <button onClick={() => deleteStudent(student)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredStudents.length && <EmptyState text="No students match your search. Click 'Pull Students from Device' to import." />}
            </div>
          </Panel>
        </motion.section>
      )}

      {activeTab === 'sessions' && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 xl:grid-cols-[1fr_1.5fr]">
          <Panel title="Create Attendance Session" icon={Calendar}>
            <form onSubmit={createSession} className="grid gap-3">
              <Field label="Session Name" value={sessionForm.name} onChange={(value) => setSessionForm({ ...sessionForm, name: value })} required />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-600">Class</span>
                <select value={sessionForm.className} onChange={(event) => setSessionForm({ ...sessionForm, className: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                  {classes.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <Field label="Subject (Optional)" value={sessionForm.subject} onChange={(value) => setSessionForm({ ...sessionForm, subject: value })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-600">Start Time</span>
                  <input type="datetime-local" value={sessionForm.startTime} onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-600">End Time</span>
                  <input type="datetime-local" value={sessionForm.endTime} onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
                </label>
              </div>
              <button disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                <Plus size={17} />
                Create Session
              </button>
            </form>
          </Panel>

          <Panel title="Active Sessions" icon={Calendar}>
            <div className="space-y-2">
              {sessions.length === 0 && <EmptyState text="No sessions created. Create one to start tracking attendance." />}
              {sessions.map((session) => (
                <div key={session.id} className="rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-slate-950">{session.name}</h4>
                      <p className="text-xs text-slate-500">{session.className} {session.subject ? `• ${session.subject}` : ''}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      session.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 
                      session.status === 'ended' ? 'bg-slate-100 text-slate-700' : 
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {session.status || 'scheduled'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">
                    {new Date(session.startTime).toLocaleString()} → {session.endTime ? new Date(session.endTime).toLocaleString() : 'TBD'}
                  </p>
                  <div className="flex gap-2">
                    {session.status !== 'ended' && (
                      <>
                        <button onClick={() => updateSessionStatus(session.id!, session.status === 'active' ? 'ended' : 'active')} disabled={busy} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200">
                          {session.status === 'active' ? '⏹ End Session' : '▶ Start Session'}
                        </button>
                      </>
                    )}
                    <button disabled className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">
                      📊 View Report
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </motion.section>
      )}

      {activeTab === 'devices' && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 xl:grid-cols-[0.9fr_1.2fr]">
          <div className="space-y-4">
            <Panel title="Register Active Tablet On Server" icon={Network}>
              <form onSubmit={registerTablet} className="grid gap-3">
                <Field label="Tablet Name" value={tabletForm.name} onChange={(value) => setTabletForm({ ...tabletForm, name: value })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Tablet IP / Host" value={tabletForm.ip} onChange={(value) => setTabletForm({ ...tabletForm, ip: value })} />
                  <Field label="Tablet API Port" type="number" value={tabletForm.port} onChange={(value) => setTabletForm({ ...tabletForm, port: Number(value) })} />
                </div>
                <button disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                  <Globe2 size={17} />
                  Register Tablet
                </button>
              </form>
            </Panel>

            <Panel title="Connect FK623 Through Tablet" icon={Cpu}>
              <form onSubmit={connectDevice} className="grid gap-3">
                <Field label="Device ID" value={deviceForm.deviceId} onChange={(value) => setDeviceForm({ ...deviceForm, deviceId: value })} />
                <Field label="Device IP Address" value={deviceForm.ipAddress} onChange={(value) => setDeviceForm({ ...deviceForm, ipAddress: value })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Device Port" type="number" value={deviceForm.port} onChange={(value) => setDeviceForm({ ...deviceForm, port: Number(value) })} />
                  <Field label="License" type="number" value={deviceForm.license} onChange={(value) => setDeviceForm({ ...deviceForm, license: Number(value) })} />
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <button disabled={busy || !tabletHealth.ok} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    <Wifi size={16} />
                    Connect
                  </button>
                  <button type="button" onClick={syncDeviceTime} disabled={busy || !connected} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
                    <Clock size={16} />
                    Sync Time
                  </button>
                  <button type="button" onClick={disconnectDevice} disabled={busy || !connected} className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 disabled:opacity-50">
                    <Power size={16} />
                    Disconnect
                  </button>
                </div>
              </form>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="Registered Tablets" icon={Smartphone}>
              <div className="grid gap-3">
                {tablets.map((tablet) => (
                  <div key={tablet.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-950">{tablet.name}</h3>
                        <p className="text-sm text-slate-500">{tablet.url || `http://${tablet.ip}:${tablet.port}`}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(tablet.status === 'online')}`}>{tablet.status}</span>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">Last sync: {tablet.lastSync ? new Date(tablet.lastSync).toLocaleString() : 'Not synced yet'}</p>
                  </div>
                ))}
                {!tablets.length && <EmptyState text="No tablets registered on the Linux server yet." />}
              </div>
            </Panel>
            <Panel title="Pulled Device Users (Detailed)" icon={HardDrive}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-slate-500">Users from device (cached)</span>
                <button
                  onClick={pullDeviceUsers}
                  disabled={busy || !tabletHealth.ok}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <Download size={16} />
                  Refresh from Device
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-2">User ID</th>
                      <th>Name</th>
                      <th>Privilege</th>
                      <th>Status</th>
                      <th>Biometric Methods</th>
                      <th>Backup Numbers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deviceUsers.length ? deviceUsers.map((user) => (
                      <tr key={user.userId} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 font-mono text-sm">{user.userId}</td>
                        <td className="font-medium">{user.name || '—'}</td>
                        <td>{user.privilege === 1 ? 'Admin' : 'User'}</td>
                        <td>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${user.enabled ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
                            {user.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td>
                          {user.biometricMethods?.length
                            ? user.biometricMethods.join(', ')
                            : 'None'}
                        </td>
                        <td>
                          {user.backupNumbers?.length
                            ? user.backupNumbers.join(', ')
                            : '—'}
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={6} className="py-8 text-center text-slate-500">Click "Refresh from Device" to pull users from FK623.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        </motion.section>
      )}

      {activeTab === 'reports' && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {['Daily Report', 'Weekly Report', 'Monthly Report', 'Annual Report'].map((label) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <FileSpreadsheet className="text-blue-600" />
                <h3 className="mt-4 font-semibold text-slate-950">{label}</h3>
                <p className="mt-1 text-sm text-slate-500">Generate from synchronized server attendance records.</p>
                <button className="mt-4 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Prepare Export</button>
              </div>
            ))}
          </div>
          <Panel title="Attendance by Class" icon={BarChart3}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#64748b" />
                <YAxis allowDecimals={false} stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="attendance" fill="#0f172a" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </motion.section>
      )}

      {activeTab === 'settings' && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 xl:grid-cols-2">
          <Panel title="API Connections" icon={Settings}>
            <form onSubmit={saveApiSettings} className="grid gap-3">
              <Field label="Linux Server API" value={serverApi} onChange={setServerApi} />
              <Field label="Windows Tablet API" value={tabletApi} onChange={setTabletApi} />
              <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
                <Settings size={17} />
                Save API Settings
              </button>
            </form>
          </Panel>
          <Panel title="Enterprise Options" icon={Bell}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Feature icon={Languages} label="Languages" value="EN / FR / RW" />
              <Feature icon={ShieldCheck} label="Roles" value="Admin / Staff / Parent" />
              <Feature icon={Database} label="Database" value="Server SQLite now, VPS ready" />
              <Feature icon={Network} label="Communication" value="Server <-> Tablet REST" />
            </div>
          </Panel>
        </motion.section>
      )}
    </div>
  );
}

// ----- Helper Components -----
function HealthPill({ health, icon: Icon }: { health: SystemHealth; icon: any }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${statusTone(health.ok)}`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon size={17} />
        {health.label}
      </div>
      <p className="mt-1 max-w-[280px] truncate text-xs opacity-80">{health.detail}</p>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: any; tone: 'blue' | 'emerald' | 'cyan' | 'rose' | 'violet' | 'amber' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
        </div>
        <div className={`rounded-xl border p-3 ${tones[tone]}`}>
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, action, children }: { title: string; icon: any; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
            <Icon size={18} />
          </div>
          <h2 className="font-semibold text-slate-950">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500/10 focus:border-blue-500 focus:ring-4"
      />
    </label>
  );
}

function LogTable({ logs }: { logs: AttendanceLog[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1100px] w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <th className="py-3">Student</th>
            <th>Student ID</th>
            <th>Class</th>
            <th>Club</th>
            <th>Device</th>
            <th>Method</th>
            <th>Direction</th>
            <th>Time</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, index) => (
            <tr key={log.id || `${log.studentId}-${log.timestamp}-${index}`} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-3 font-semibold text-slate-950">{log.name || log.studentName || '-'}</td>
              <td>{log.studentId || log.studentDeviceId || '-'}</td>
              <td>{[log.className, log.section].filter(Boolean).join(' ') || '-'}</td>
              <td>{log.club || '-'}</td>
              <td>{log.deviceId || log.tabletId || '-'}</td>
              <td>{log.authenticationMethod || log.method || '-'}</td>
              <td>{log.directionLabel || log.direction || '-'}</td>
              <td>{log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}</td>
              <td><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{log.status || 'Present'}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!logs.length && <EmptyState text="No attendance logs loaded yet. Pull logs from tablet or adjust date filters." />}
    </div>
  );
}

function DeviceSnapshot({ device, connected }: { device: DeviceStatus | null; connected: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Feature icon={connected ? Wifi : WifiOff} label="Device Status" value={connected ? 'Connected' : 'Offline'} />
      <Feature icon={Cpu} label="Device ID" value={device?.deviceId || '-'} />
      <Feature icon={HardDrive} label="Product" value={device?.productName || device?.productCode || '-'} />
      <Feature icon={Users} label="Device Users" value={String(device?.users || 0)} />
      <Feature icon={Database} label="Logs On Device" value={String(device?.logs || 0)} />
      <Feature icon={KeyRound} label="Biometrics" value={`${device?.fingerprints || 0} FP / ${device?.faces || 0} face / ${device?.cards || 0} cards`} />
    </div>
  );
}

function Feature({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <Icon className="text-blue-600" size={18} />
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">{text}</div>;
}