import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Clock, MapPin, Activity, SunMedium, Cloud, CloudSnow, CloudRain, CloudLightning,
    Wind, Droplets, Timer, Globe, Play, Pause, RotateCcw, Thermometer, Sun, Shield,
    CheckSquare, TrendingUp, CalendarClock, Plus, X, Check
} from 'lucide-react';
import { formatDate, translateCity } from '@/lib/utils';

const TiltCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>
        {children}
    </div>
);

const GradientBorder = ({ isDarkMode, customColor }: { isDarkMode: boolean; customColor?: string }) => (
    <>
        <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-50 transition-opacity duration-500 blur-sm" />
        <div className={`absolute inset-0 rounded-3xl ${isDarkMode ? 'bg-slate-800/90' : 'bg-white/90'}`}
            style={customColor ? { background: customColor } : {}}
        />
    </>
);

interface WidgetDashboardProps {
    isDarkMode: boolean;
    sitesCount: number;
    widgetStyle?: 'A' | 'B' | 'C';
    widgetConfig?: {
        worldClocks?: { name: string; timezone: string }[];
        pomodoroDuration?: number;
        customColors?: {
            time?: string;
            weather?: string;
            tools?: string;
        };
    };
}

const DEFAULT_WORLD_CLOCKS = [
    { name: '纽约', timezone: 'America/New_York' },
    { name: '伦敦', timezone: 'Europe/London' },
    { name: '东京', timezone: 'Asia/Tokyo' },
];

const HOLIDAYS = [
    { name: '春节', month: 1, day: 29 },
    { name: '元宵节', month: 2, day: 12 },
    { name: '情人节', month: 2, day: 14 },
    { name: '龙抬头', month: 3, day: 1 },
    { name: '妇女节', month: 3, day: 8 },
    { name: '植树节', month: 3, day: 12 },
    { name: '愚人节', month: 4, day: 1 },
    { name: '清明', month: 4, day: 5 },
    { name: '劳动节', month: 5, day: 1 },
    { name: '青年节', month: 5, day: 4 },
    { name: '母亲节', month: 5, day: 10 },
    { name: '儿童节', month: 6, day: 1 },
    { name: '端午', month: 6, day: 19 },
    { name: '父亲节', month: 6, day: 21 },
    { name: '建党节', month: 7, day: 1 },
    { name: '建军节', month: 8, day: 1 },
    { name: '七夕', month: 8, day: 19 },
    { name: '中元节', month: 8, day: 28 },
    { name: '教师节', month: 9, day: 10 },
    { name: '国庆节', month: 10, day: 1 },
    { name: '中秋', month: 10, day: 6 },
    { name: '重阳节', month: 10, day: 21 },
    { name: '寒衣节', month: 11, day: 11 },
    { name: '下元节', month: 12, day: 4 },
    { name: '平安夜', month: 12, day: 24 },
    { name: '圣诞节', month: 12, day: 25 },
    { name: '元旦', month: 1, day: 1 },
    { name: '小年', month: 1, day: 30 },
    { name: '除夕', month: 2, day: 16 }
];

const SOLAR_TERMS = [
    { name: '小寒', date: '2026-01-05' },
    { name: '大寒', date: '2026-01-20' },
    { name: '立春', date: '2026-02-04' },
    { name: '雨水', date: '2026-02-19' },
    { name: '惊蛰', date: '2026-03-06' },
    { name: '春分', date: '2026-03-21' },
    { name: '清明', date: '2026-04-05' },
    { name: '谷雨', date: '2026-04-20' },
    { name: '立夏', date: '2026-05-06' },
    { name: '小满', date: '2026-05-21' },
    { name: '芒种', date: '2026-06-06' },
    { name: '夏至', date: '2026-06-21' },
    { name: '小暑', date: '2026-07-07' },
    { name: '大暑', date: '2026-07-23' },
    { name: '立秋', date: '2026-08-07' },
    { name: '处暑', date: '2026-08-23' },
    { name: '白露', date: '2026-09-08' },
    { name: '秋分', date: '2026-09-23' },
    { name: '寒露', date: '2026-10-08' },
    { name: '霜降', date: '2026-10-23' },
    { name: '立冬', date: '2026-11-07' },
    { name: '小雪', date: '2026-11-22' },
    { name: '大雪', date: '2026-12-07' },
    { name: '冬至', date: '2026-12-22' },
];

export function WidgetDashboard({ isDarkMode, sitesCount, widgetStyle = 'B', widgetConfig }: WidgetDashboardProps) {
    const [time, setTime] = useState<Date | null>(null);
    const [locationName, setLocationName] = useState('本地');
    const [weather, setWeather] = useState<any>({
        temp: null, feelsLike: null, code: null, humidity: null, windSpeed: null,
        hourly: [], aqi: null, uv: null, loading: true, error: false
    });
    const [mounted, setMounted] = useState(false);

    const worldClocks = widgetConfig?.worldClocks || DEFAULT_WORLD_CLOCKS;
    const pomodoroDuration = (widgetConfig?.pomodoroDuration || 25) * 60;

    const [pomodoroActive, setPomodoroActive] = useState(false);
    const [pomodoroTime, setPomodoroTime] = useState(pomodoroDuration);

    useEffect(() => {
        if (!pomodoroActive) {
            setPomodoroTime(pomodoroDuration);
        }
    }, [pomodoroDuration, pomodoroActive]);

    const [timeMode, setTimeMode] = useState<'clock' | 'world' | 'pomodoro'>('clock');
    const [toolsMode, setToolsMode] = useState<'stock' | 'todo' | 'countdown'>('stock');

    const [todos, setTodos] = useState<{ id: string; text: string; done: boolean }[]>([]);
    const [newTodo, setNewTodo] = useState('');
    const [isAddingTodo, setIsAddingTodo] = useState(false);

    const [countdowns, setCountdowns] = useState<{ id: string; label: string; date: string }[]>([]);
    const [newCountdownLabel, setNewCountdownLabel] = useState('');
    const [newCountdownDate, setNewCountdownDate] = useState('');
    const [isAddingCountdown, setIsAddingCountdown] = useState(false);

    const [marketData, setMarketData] = useState<{ id: string; name: string; price: number; change: number; percent: number; type: string; currency?: string; noData?: boolean }[]>([]);

    const [displayCount, setDisplayCount] = useState(0);

    // ============================================================
    // localStorage 加载
    // ============================================================
    useEffect(() => {
        const savedTodos = localStorage.getItem('aurora_todos');
        if (savedTodos) {
            try {
                setTodos(JSON.parse(savedTodos));
            } catch (e) {
                console.warn('Failed to parse todos', e);
            }
        }

        const savedCountdowns = localStorage.getItem('aurora_countdowns');
        if (savedCountdowns) {
            try {
                setCountdowns(JSON.parse(savedCountdowns));
            } catch (e) {
                console.warn('Failed to parse countdowns', e);
            }
        }
    }, []);

    // ============================================================
    // localStorage 保存
    // ============================================================
    useEffect(() => {
        localStorage.setItem('aurora_todos', JSON.stringify(todos));
    }, [todos]);

    useEffect(() => {
        localStorage.setItem('aurora_countdowns', JSON.stringify(countdowns));
    }, [countdowns]);

    // ============================================================
    // 长按删除
    // ============================================================
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);

    const handleLongPressStart = (item: any, type: 'todo' | 'countdown') => {
        longPressTimer.current = setTimeout(() => {
            const name = type === 'todo' ? item.text : item.label;
            if (confirm(`确定删除 "${name}" 吗？`)) {
                if (type === 'todo') {
                    setTodos(prev => prev.filter(t => t.id !== item.id));
                } else {
                    setCountdowns(prev => prev.filter(c => c.id !== item.id));
                }
            }
            longPressTimer.current = null;
        }, 500);
    };

    const handleLongPressEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleRightClick = (e: React.MouseEvent, item: any, type: 'todo' | 'countdown') => {
        e.preventDefault();
        const name = type === 'todo' ? item.text : item.label;
        if (confirm(`确定删除 "${name}" 吗？`)) {
            if (type === 'todo') {
                setTodos(prev => prev.filter(t => t.id !== item.id));
            } else {
                setCountdowns(prev => prev.filter(c => c.id !== item.id));
            }
        }
    };

    // ============================================================
    // 待办操作
    // ============================================================
    const addTodo = () => {
        console.log('addTodo 被调用');
        if (!newTodo.trim()) return;
        if (todos.length >= 2) {
            console.log('最多只能添加2条待办');
            return;
        }
        const newItem = {
            id: Date.now().toString() + Math.random().toString(36).substring(2),
            text: newTodo.trim(),
            done: false
        };
        const newTodos = [...todos, newItem];
        setTodos(newTodos);
        localStorage.setItem('aurora_todos', JSON.stringify(newTodos));
        setNewTodo('');
        setIsAddingTodo(false);
    };

    const toggleTodo = (id: string) => {
        setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
    };

    // ============================================================
    // 倒计时操作
    // ============================================================
    const addCountdown = () => {
        console.log('addCountdown 被调用');
        if (!newCountdownLabel.trim() || !newCountdownDate) return;
        if (countdowns.length >= 2) {
            console.log('最多只能添加2条倒计时');
            return;
        }
        const newItem = {
            id: Date.now().toString() + Math.random().toString(36).substring(2),
            label: newCountdownLabel.trim(),
            date: newCountdownDate
        };
        const newCountdowns = [...countdowns, newItem];
        setCountdowns(newCountdowns);
        localStorage.setItem('aurora_countdowns', JSON.stringify(newCountdowns));
        setNewCountdownLabel('');
        setNewCountdownDate('');
        setIsAddingCountdown(false);
    };

    // ============================================================
    // 天气
    // ============================================================
    useEffect(() => {
        const fetchWeatherData = async (latitude: number, longitude: number) => {
            try {
                const weatherPromise = fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m&daily=weathercode,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto`
                ).then(res => res.json());

                const airPromise = fetch(
                    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi`
                ).then(res => res.json());

                const [weatherData, airData] = await Promise.all([weatherPromise, airPromise]);

                if (weatherData.error) throw new Error('Weather API error');

                const dailyForecast = weatherData.daily?.time?.slice(1, 7).map((t: string, i: number) => ({
                    time: t,
                    code: weatherData.daily.weathercode[i + 1],
                    max: weatherData.daily.temperature_2m_max[i + 1],
                    min: weatherData.daily.temperature_2m_min[i + 1]
                })) || [];

                const uv = weatherData.daily?.uv_index_max?.[0] || 0;
                const humidity = weatherData.current?.relative_humidity_2m || 50;
                const aqi = airData?.current?.us_aqi || null;

                setWeather((prev: any) => ({
                    ...prev,
                    temp: weatherData.current?.temperature_2m,
                    feelsLike: weatherData.current?.apparent_temperature,
                    code: weatherData.current?.weather_code,
                    windSpeed: weatherData.current?.wind_speed_10m,
                    humidity: humidity,
                    hourly: [],
                    daily: dailyForecast,
                    uv: Math.round(uv),
                    aqi: aqi,
                    loading: false,
                    error: false
                }));
            } catch (e) {
                console.error('Failed to fetch weather data', e);
                setWeather((prev: any) => ({ ...prev, loading: false, error: true }));
            }
        };

        const fetchLocationName = async (latitude?: number, longitude?: number) => {
            if (latitude && longitude) {
                try {
                    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=zh`);
                    if (res.ok) {
                        const data = await res.json();
                        const city = data.city || data.locality || data.principalSubdivision;
                        if (city) {
                            setLocationName(city.replace('市', ''));
                            return;
                        }
                    }
                } catch (e) {
                    console.warn('Reverse geocoding failed, falling back to IP');
                }
            }

            const tryApi = async (url: string, extractor: (data: any) => string | null) => {
                try {
                    const res = await fetch(url);
                    if (!res.ok) throw new Error('Failed');
                    const data = await res.json();
                    return extractor(data);
                } catch {
                    return null;
                }
            };

            let name = await tryApi('https://ipapi.co/json/', (data) => data.city);

            if (!name || name === '本地') {
                name = await tryApi('https://get.geojs.io/v1/ip/geo.json', (data) => data.city || data.region);
            }

            if (!name || name === '本地') {
                name = await tryApi('https://ipwho.is/', (data) => data.city || data.region);
            }

            if (name) {
                setLocationName(translateCity(name));
            }
        };

        const fetchByIP = async () => {
            const tryProvider = async (url: string, parser: (d: any) => any) => {
                try {
                    const res = await fetch(url);
                    if (!res.ok) throw new Error('Status not ok');
                    const data = await res.json();
                    return parser(data);
                } catch (e) {
                    return null;
                }
            };

            const ipapiData = await tryProvider('https://ipapi.co/json/', (d) => ({
                lat: d.latitude,
                lon: d.longitude,
                name: d.city
            }));

            if (ipapiData && ipapiData.lat && ipapiData.lon) {
                if (ipapiData.name) setLocationName(translateCity(ipapiData.name));
                fetchWeatherData(ipapiData.lat, ipapiData.lon);
                return;
            }

            const geojsData = await tryProvider('https://get.geojs.io/v1/ip/geo.json', (d) => ({
                lat: d.latitude ? parseFloat(d.latitude) : null,
                lon: d.longitude ? parseFloat(d.longitude) : null,
                name: d.city || d.region
            }));

            if (geojsData && geojsData.lat && geojsData.lon) {
                if (geojsData.name) setLocationName(translateCity(geojsData.name));
                fetchWeatherData(geojsData.lat, geojsData.lon);
                return;
            }

            const ipwhoisData = await tryProvider('https://ipwho.is/', (d) => ({
                lat: d.latitude,
                lon: d.longitude,
                name: d.city || d.region
            }));

            if (ipwhoisData && ipwhoisData.lat && ipwhoisData.lon) {
                if (ipwhoisData.name) setLocationName(translateCity(ipwhoisData.name));
                fetchWeatherData(ipwhoisData.lat, ipwhoisData.lon);
                return;
            }

            console.warn('All IP geolocation providers failed.');
            setWeather((prev: any) => ({ ...prev, loading: false, error: true }));
        };

        const initWeather = () => {
            const latitude = 36.1950;
            const longitude = 117.1205;
            fetchWeatherData(latitude, longitude);
            setLocationName('泰安');
        };

        initWeather();
        const interval = setInterval(initWeather, 1200000);
        return () => clearInterval(interval);
    }, []);

    // ============================================================
    // 其他 hooks
    // ============================================================
    useEffect(() => {
        setMounted(true);
        setTime(new Date());
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        if (pomodoroActive && pomodoroTime > 0) {
            const timer = setInterval(() => {
                setPomodoroTime(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        }
        if (pomodoroTime === 0) {
            setPomodoroActive(false);
        }
    }, [pomodoroActive, pomodoroTime]);

    useEffect(() => {
        if (mounted && sitesCount > 0) {
            let start = 0;
            const duration = 1000;
            const increment = sitesCount / (duration / 16);
            const timer = setInterval(() => {
                start += increment;
                if (start >= sitesCount) {
                    setDisplayCount(sitesCount);
                    clearInterval(timer);
                } else {
                    setDisplayCount(Math.floor(start));
                }
            }, 16);
            return () => clearInterval(timer);
        }
    }, [mounted, sitesCount]);

    useEffect(() => {
        const fetchMarketData = async () => {
            try {
                const res = await fetch('/api/market');
                if (!res.ok) return;
                const data = await res.json();
                if (Array.isArray(data)) {
                    setMarketData(data);
                }
            } catch (e) {
                console.error('Failed to fetch market data', e);
            }
        };
        fetchMarketData();
        const interval = setInterval(fetchMarketData, 60000);
        return () => clearInterval(interval);
    }, []);

    const getNextHoliday = useCallback(() => {
        const now = new Date();
        const year = now.getFullYear();

        for (const h of HOLIDAYS) {
            const holidayDate = new Date(year, h.month - 1, h.day);
            if (holidayDate > now) {
                const diff = Math.ceil((holidayDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                return { name: h.name, days: diff };
            }
        }
        const nextYear = new Date(year + 1, HOLIDAYS[0].month - 1, HOLIDAYS[0].day);
        const diff = Math.ceil((nextYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { name: HOLIDAYS[0].name, days: diff };
    }, []);

    const getLunarDate = useCallback((date: Date) => {
        try {
            const formatter = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
                month: 'long',
                day: 'numeric'
            });
            return formatter.format(date);
        } catch {
            return '';
        }
    }, []);

    const getSolarTermInfo = useCallback(() => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        const todayTerm = SOLAR_TERMS.find(t => t.date === today);
        if (todayTerm) {
            return { name: todayTerm.name, isToday: true, days: 0 };
        }

        for (const term of SOLAR_TERMS) {
            const termDate = new Date(term.date);
            if (termDate > now) {
                const diff = Math.ceil((termDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                return { name: term.name, isToday: false, days: diff };
            }
        }

        return { name: SOLAR_TERMS[0].name, isToday: false, days: 30 };
    }, []);

    const getClothingAdvice = (temp: number) => {
        if (temp >= 30) return '短袖短裤';
        if (temp >= 25) return '薄款T恤';
        if (temp >= 20) return '长袖衬衫';
        if (temp >= 15) return '薄外套';
        if (temp >= 10) return '厚外套';
        if (temp >= 5) return '毛衣羽绒';
        return '严寒保暖';
    };

    const getTimePeriodGradient = () => {
        if (!time) return 'from-indigo-500/10 to-purple-500/10';
        const hour = time.getHours();
        if (hour >= 5 && hour < 7) return 'from-orange-300/20 to-pink-300/20';
        if (hour >= 7 && hour < 12) return 'from-sky-300/20 to-blue-200/20';
        if (hour >= 12 && hour < 17) return 'from-amber-200/20 to-yellow-200/20';
        if (hour >= 17 && hour < 20) return 'from-orange-400/20 to-red-400/20';
        return 'from-indigo-500/20 to-purple-600/20';
    };

    // 天气图标 - 完全使用静态图标，禁用 Lottie
    const getWeatherIcon = (code: number, size = 24, className = "") => {
        if (code === 0) return <SunMedium size={size} className={className || "text-orange-500"} />;
        if (code >= 1 && code <= 3) return <Cloud size={size} className={className || "text-gray-400"} />;
        if ((code >= 45 && code <= 48) || (code >= 51 && code <= 55)) return <CloudSnow size={size} className={className || "text-blue-300"} />;
        if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain size={size} className={className || "text-blue-500"} />;
        if (code >= 95) return <CloudLightning size={size} className={className || "text-purple-500"} />;
        return <SunMedium size={size} className={className || "text-orange-500"} />;
    };

    const getWeatherDesc = (code: number) => {
        if (code === 0) return "晴";
        if (code >= 1 && code <= 3) return "多云";
        if (code >= 45 && code <= 48) return "雾";
        if (code >= 51 && code <= 67) return "雨";
        if (code >= 71 && code <= 77) return "雪";
        if (code >= 95) return "雷雨";
        return "未知";
    };

    const getAQIDesc = (aqi: number) => {
        if (aqi <= 50) return '优';
        if (aqi <= 100) return '良';
        if (aqi <= 150) return '轻度';
        if (aqi <= 200) return '中度';
        if (aqi <= 300) return '重度';
        return '严重';
    };

    const getUVDesc = (uv: number) => {
        if (uv <= 2) return '低';
        if (uv <= 5) return '中';
        if (uv <= 7) return '高';
        if (uv <= 10) return '甚高';
        return '极高';
    };

    // 禁用粒子动画
    const WeatherParticles = ({ code }: { code: number }) => {
        return null;
    };

    const DailyForecast = ({ data }: { data: { max: number, min: number, code: number, time: string }[] }) => {
        if (!data.length) return null;

        return (
            <div className="flex items-end justify-between gap-1 h-12 w-full pr-1 -ml-4 mt-1">
                {data.map((day, i) => {
                    const date = new Date(day.time);
                    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
                    return (
                        <div key={i} className="flex flex-col items-center justify-between h-full w-full">
                            <span className="text-xs opacity-60 font-medium mb-0.5">{dateStr}</span>
                            <div className="scale-90 origin-center">
                                {getWeatherIcon(day.code, 18)}
                            </div>
                            <div className="flex flex-col items-center leading-none mt-auto">
                                <span className="text-xs font-bold opacity-90">{Math.round(day.max)}°</span>
                                <span className="text-xs opacity-40 leading-tight">{Math.round(day.min)}°</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // ============================================================
    // ✅ Style C - 简洁版（已移除毛玻璃）
    // ============================================================
    if (widgetStyle === 'C') {
        return (
            <div className={`flex items-center justify-between px-5 py-2.5 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-slate-800/90 border-white/15' : 'bg-white/90 border-slate-200/50'}`}>
                <div className="flex items-center gap-4">
                    <Clock size={16} className="text-indigo-500" />
                    <span className="text-sm font-medium tabular-nums">{mounted && time ? time.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        {getWeatherIcon(weather.code, 18)}
                        <span className="text-sm font-medium">{weather.temp ? `${weather.temp}°` : '--'}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Activity size={16} className="text-emerald-500" />
                    <span className="text-sm font-medium tabular-nums">{displayCount}</span>
                </div>
            </div>
        );
    }

    // ============================================================
    // ✅ Style A / B - 卡片基础样式（已移除毛玻璃）
    // ============================================================
    const cardBase = `relative overflow-hidden flex flex-row items-center justify-between p-2 md:p-3 rounded-3xl transition-all duration-300 active:scale-95 border h-[120px] sm:h-[120px] md:h-[130px] ${isDarkMode
        ? 'bg-slate-800/90 border-white/15 text-white shadow-xl shadow-black/20'
        : 'bg-white/90 border-slate-200/50 text-slate-900 shadow-lg shadow-slate-200/50'
        }`;

    const nextHoliday = getNextHoliday();
    const pomodoroMins = Math.floor(pomodoroTime / 60);
    const pomodoroSecs = pomodoroTime % 60;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 卡片1：时钟 */}
            <TiltCard className="group">
                <div className={cardBase}>
                    <GradientBorder isDarkMode={isDarkMode} customColor={widgetConfig?.customColors?.time} />
                    <div className={`absolute inset-0 pointer-events-none ${isDarkMode ? 'bg-white/5' : 'bg-white/10'}`} />
                    <div className="flex flex-col justify-center h-full z-10 flex-1">
                        <div className="flex items-center gap-1 mb-1">
                            {[
                                { id: 'clock', icon: Clock, label: '时钟' },
                                { id: 'world', icon: Globe, label: '世界' },
                                { id: 'pomodoro', icon: Timer, label: '番茄' },
                            ].map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setTimeMode(m.id as any)}
                                    className={`p-1.5 rounded-md transition-all ${timeMode === m.id ? 'bg-indigo-500/20 text-indigo-500' : 'opacity-40 hover:opacity-70'}`}
                                    title={m.label}
                                >
                                    <m.icon size={14} />
                                </button>
                            ))}
                        </div>
                        <div>
                            {timeMode === 'clock' && (
                                <div>
                                    <div className="text-2xl md:text-3xl font-bold tabular-nums tracking-tight leading-none mb-1 text-slate-900 dark:text-white">
                                        {mounted && time ? time.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        <span className={`text-base ml-1 ${isDarkMode ? 'opacity-50' : 'text-slate-500'}`}>{mounted && time ? time.getSeconds().toString().padStart(2, '0') : '00'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
                                        <span className={`font-medium ${isDarkMode ? 'opacity-60' : 'text-slate-600'}`}>{mounted && time ? formatDate(time) : ''}</span>
                                        <span className={`${isDarkMode ? 'opacity-40' : 'text-slate-500'}`}>{mounted && time ? getLunarDate(time) : ''}</span>
                                        {mounted && (() => {
                                            const termInfo = getSolarTermInfo();
                                            if (termInfo.isToday) {
                                                return <span className="text-indigo-500 font-medium">今日{termInfo.name}</span>;
                                            }
                                            return <span className={`${isDarkMode ? 'opacity-40' : 'text-slate-500'}`}>距{termInfo.name}{termInfo.days}天</span>;
                                        })()}
                                    </div>
                                </div>
                            )}

                            {timeMode === 'world' && (
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                    {worldClocks.slice(0, 6).map((tz, idx) => {
                                        const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit',
                                            hour12: false,
                                            timeZone: tz.timezone
                                        });
                                        const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
                                            month: 'numeric',
                                            day: 'numeric',
                                            timeZone: tz.timezone
                                        });
                                        const timeStr = time ? timeFormatter.format(time) : '--:--:--';
                                        const dateStr = time ? dateFormatter.format(time) : '';
                                        return (
                                            <div key={idx} className="flex items-center gap-2 text-xs">
                                                <span className={`w-11 text-left shrink-0 ${isDarkMode ? 'opacity-60' : 'text-slate-600'}`}>{tz.name}</span>
                                                <span className={`w-8 text-right shrink-0 tabular-nums ${isDarkMode ? 'opacity-40' : 'text-slate-500'}`}>{dateStr}</span>
                                                <span className="font-bold tabular-nums text-slate-900 dark:text-white">{timeStr}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {timeMode === 'pomodoro' && (
                                <div>
                                    <div className="text-3xl font-bold tabular-nums tracking-tight leading-none mb-2 text-red-500">
                                        {pomodoroMins.toString().padStart(2, '0')}:{pomodoroSecs.toString().padStart(2, '0')}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setPomodoroActive(!pomodoroActive)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors">
                                            {pomodoroActive ? <Pause size={14} /> : <Play size={14} />}
                                        </button>
                                        <button onClick={() => { setPomodoroActive(false); setPomodoroTime(pomodoroDuration); }} className="p-1.5 rounded-lg bg-slate-500/10 hover:bg-slate-500/20 opacity-50 hover:opacity-100 transition-all">
                                            <RotateCcw size={14} />
                                        </button>
                                        <span className="text-sm opacity-50">专注</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="z-10 pl-4 border-l border-white/10 dark:border-white/5 h-full flex flex-col justify-center items-center min-w-[70px]">
                        <div className="text-2xl md:text-3xl font-bold text-indigo-500">{nextHoliday.days}</div>
                        <div className={`text-xs ${isDarkMode ? 'opacity-50' : 'text-slate-500'}`}>天后</div>
                        <div className="text-xs font-medium text-slate-700 dark:text-white">{nextHoliday.name}</div>
                    </div>
                </div>
            </TiltCard>

            {/* 卡片2：天气 */}
            <TiltCard className="group min-w-0">
                <div className={`${cardBase} overflow-hidden h-[120px] sm:h-[120px] md:h-[130px]`}>
                    <GradientBorder isDarkMode={isDarkMode} customColor={widgetConfig?.customColors?.weather} />
                    <WeatherParticles code={weather.code} />
                    <div className="flex flex-col justify-center h-full z-10 min-w-[80px] flex-shrink-0">
                        <div className="flex items-center gap-1.5 mb-1">
                            <MapPin size={12} className="text-cyan-500 shrink-0" />
                            <span className={`text-xs font-medium truncate max-w-[80px] sm:max-w-[140px] ${isDarkMode ? 'opacity-70' : 'text-slate-700'}`}>{locationName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl md:text-3xl font-bold leading-none text-slate-900 dark:text-white">{weather.temp}°</span>
                            {getWeatherIcon(weather.code, 32)}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
                            <span className={`${isDarkMode ? 'opacity-70' : 'text-slate-700'}`}>{getWeatherDesc(weather.code)}</span>
                            <span className={`${isDarkMode ? 'opacity-50' : 'text-slate-500'}`}>体感 {weather.feelsLike}°</span>
                        </div>
                        <div className="text-xs text-cyan-600 dark:text-cyan-400 font-medium mt-0.5 truncate">
                            {getClothingAdvice(weather.feelsLike || weather.temp || 20)}
                        </div>
                    </div>
                    <div className="z-10 pl-3 border-l border-white/10 dark:border-white/5 h-full flex flex-col justify-center gap-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-0 sm:gap-2 text-[9px] sm:text-xs -ml-3 flex-nowrap">
                            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                                <Shield size={9} className="text-green-500 shrink-0 sm:w-3 sm:h-3" />
                                <span className={`${isDarkMode ? 'opacity-50' : 'text-slate-500'}`}>AQI</span>
                                <span className="font-bold text-slate-900 dark:text-white">{weather.aqi || '--'}</span>
                                {weather.aqi && <span className={`${isDarkMode ? 'opacity-60' : 'text-slate-600'}`}>{getAQIDesc(weather.aqi)}</span>}
                            </div>
                            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                                <Sun size={9} className="text-amber-500 shrink-0 sm:w-3 sm:h-3" />
                                <span className={`${isDarkMode ? 'opacity-50' : 'text-slate-500'}`}>UV</span>
                                <span className="font-bold text-slate-900 dark:text-white">{weather.uv || '--'}</span>
                                {weather.uv !== null && <span className={`${isDarkMode ? 'opacity-60' : 'text-slate-600'}`}>{getUVDesc(weather.uv)}</span>}
                            </div>
                        </div>
                        {weather.daily?.length > 0 && (
                            <div className="ml-1">
                                <DailyForecast data={weather.daily} />
                            </div>
                        )}
                    </div>
                </div>
            </TiltCard>

            {/* 卡片3：工具 */}
            <TiltCard className="group">
                <div className={cardBase}>
                    <GradientBorder isDarkMode={isDarkMode} customColor={widgetConfig?.customColors?.tools} />
                    <div className={`absolute inset-0 pointer-events-none ${isDarkMode ? 'bg-white/5' : 'bg-white/10'}`} />
                    <div className="flex flex-col justify-between h-full z-10 w-full">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1">
                                {[
                                    { id: 'stock', icon: TrendingUp, label: '行情' },
                                    { id: 'todo', icon: CheckSquare, label: '待办' },
                                    { id: 'countdown', icon: CalendarClock, label: '倒计时' },
                                ].map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setToolsMode(m.id as any)}
                                        className={`p-1.5 rounded-md transition-all ${toolsMode === m.id ? 'bg-emerald-500/20 text-emerald-500' : 'opacity-40 hover:opacity-70'}`}
                                        title={m.label}
                                    >
                                        <m.icon size={14} />
                                    </button>
                                ))}
                            </div>
                            <div className="text-[10px] font-medium opacity-50 px-2">
                                {toolsMode === 'todo' && <span>{todos.filter(t => !t.done).length}/{todos.length}</span>}
                                {toolsMode === 'countdown' && <span>共 {countdowns.length} 个</span>}
                            </div>
                        </div>

                        <div>
                            {toolsMode === 'stock' && (
                                <div className="flex-1 flex flex-col justify-center h-full overflow-visible relative">
                                    <button
                                        onClick={() => {
                                            const container = document.getElementById('stock-scroll-container');
                                            if (container) {
                                                container.scrollBy({ left: -container.clientWidth, behavior: 'smooth' });
                                            }
                                        }}
                                        className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-5 h-5 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center border border-white/20 shadow-lg transition-all hover:scale-110 active:scale-90"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="15 18 9 12 15 6"></polyline>
                                        </svg>
                                    </button>
                                    
                                    <div 
                                        id="stock-scroll-container"
                                        className="flex flex-row flex-nowrap items-center gap-2 overflow-x-auto overflow-y-visible no-scrollbar w-full h-full snap-x snap-mandatory scroll-smooth"
                                        style={{ 
                                            scrollbarWidth: 'none', 
                                            msOverflowStyle: 'none',
                                            WebkitOverflowScrolling: 'touch'
                                        }}
                                    >
                                        <div className="flex flex-row flex-nowrap items-center gap-2 px-6">
                                            {marketData.length > 0 ? marketData.map(item => {
                                                const percent = item.percent || 0;
                                                const isUp = percent > 0;
                                                const isZero = percent === 0;
                                                const isNoData = item.noData === true;
                                                const currencySymbol = item.currency === 'CNY' ? '¥' : '$';
                                                const displayPrice = item.price;
                                                
                                                let fractionDigits = 2;
                                                if (item.id === 1 || item.id === 'pi-USD' || item.name === 'PI-USD' || item.id === 'pi-cny' || item.name === 'PI-CNY') {
                                                    fractionDigits = 4;
                                                }
                                                
                                                return (
                                                    <div key={item.id} className={`flex-shrink-0 flex flex-col items-center justify-center py-2.5 px-4 rounded-xl min-w-[100px] max-w-[120px] snap-start border transition-all hover:scale-105 ${
                                                        isDarkMode 
                                                            ? 'bg-slate-800/80 border-slate-700/50 shadow-lg shadow-black/30' 
                                                            : 'bg-white/90 border-slate-200/80 shadow-lg shadow-slate-200/50'
                                                    }`}>
                                                        <div className={`text-[10px] font-medium leading-none py-0.5 whitespace-nowrap ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.name}</div>
                                                        {isNoData ? (
                                                            <div className={`font-medium tabular-nums text-[11px] leading-tight mb-0.5 text-center truncate w-full ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>无数据</div>
                                                        ) : (
                                                            <>
                                                                <div className={`font-bold tabular-nums text-[14px] leading-tight mb-1 text-center truncate w-full ${isDarkMode ? 'text-white' : 'text-slate-800'}`} title={displayPrice?.toLocaleString()}>
                                                                    {currencySymbol}{displayPrice?.toLocaleString(undefined, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })}
                                                                </div>
                                                                {!isZero && (
                                                                    <div className={`text-[10px] px-2 py-0.5 rounded-full font-medium leading-none ${
                                                                        isUp 
                                                                            ? 'bg-emerald-500/20 text-emerald-400' 
                                                                            : 'bg-red-500/20 text-red-400'
                                                                    }`}>
                                                                        {isUp ? '+' : ''}{percent.toFixed(2)}%
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            }) : (
                                                Array.from({ length: 5 }).map((_, i) => (
                                                    <div key={i} className={`flex-shrink-0 flex flex-col items-center justify-center p-2 rounded-xl animate-pulse min-w-[100px] h-[60px] ${
                                                        isDarkMode 
                                                            ? 'bg-slate-800/60 border border-slate-700/50' 
                                                            : 'bg-white/80 border border-slate-200/80'
                                                    }`}>
                                                        <div className="w-10 h-2 bg-white/10 rounded mb-0.5"></div>
                                                        <div className="w-12 h-3 bg-white/10 rounded mb-0.5"></div>
                                                        <div className="w-10 h-2 bg-white/10 rounded"></div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                    
                                    <button
                                        onClick={() => {
                                            const container = document.getElementById('stock-scroll-container');
                                            if (container) {
                                                container.scrollBy({ left: container.clientWidth, behavior: 'smooth' });
                                            }
                                        }}
                                        className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-5 h-5 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center border border-white/20 shadow-lg transition-all hover:scale-110 active:scale-90"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="9 18 15 12 9 6"></polyline>
                                        </svg>
                                    </button>
                                </div>
                            )}

                            {/* ========== 待办模式 ========== */}
                            {toolsMode === 'todo' && (
                                <div className="flex-1 flex flex-col h-full relative min-h-0">
                                    {isAddingTodo ? (
                                        <div className="absolute inset-x-1 -top-16 bottom-auto z-20 bg-slate-800 border border-indigo-500/50 rounded-xl shadow-2xl p-2" style={{ height: '70px' }}>
                                            <input
                                                type="text"
                                                value={newTodo}
                                                onChange={(e) => setNewTodo(e.target.value)}
                                                autoFocus
                                                placeholder="输入待办..."
                                                className="w-full h-7 bg-white/20 text-white text-xs px-2 rounded-lg outline-none focus:bg-white/30 transition-colors border border-white/20 focus:border-emerald-500 placeholder:text-white/40"
                                            />
                                            <div className="flex gap-1.5 mt-1">
                                                <button onClick={addTodo} className="flex-1 h-6 flex items-center justify-center bg-emerald-500 text-white text-[10px] rounded hover:bg-emerald-400 transition-colors">
                                                    <Check size={14} />
                                                </button>
                                                <button onClick={() => setIsAddingTodo(false)} className="flex-1 h-6 flex items-center justify-center bg-white/20 text-white text-[10px] rounded hover:bg-white/30 transition-colors">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}
                                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-10 min-h-0">
                                        {todos.length > 0 ? (
                                            <div className="flex flex-col gap-1">
                                                {todos.map(todo => (
                                                    <div
                                                        key={todo.id}
                                                        className="flex items-center gap-2 px-2 py-1.5 bg-white/90 dark:bg-slate-800/90 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 shadow-sm cursor-context-menu"
                                                        onContextMenu={(e) => handleRightClick(e, todo, 'todo')}
                                                        onTouchStart={() => handleLongPressStart(todo, 'todo')}
                                                        onTouchEnd={handleLongPressEnd}
                                                        onTouchMove={handleLongPressEnd}
                                                    >
                                                        <button
                                                            onClick={() => toggleTodo(todo.id)}
                                                            className={`shrink-0 w-4 h-4 rounded flex items-center justify-center transition-all border ${todo.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-500 hover:border-emerald-500 text-transparent'}`}
                                                        >
                                                            <Check size={10} strokeWidth={4} />
                                                        </button>
                                                        <span className={`text-xs truncate flex-1 ${todo.done ? 'line-through opacity-40 text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{todo.text}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center opacity-30">
                                                <CheckSquare size={20} className="mb-1" />
                                                <p className="text-[10px]">列表为空</p>
                                            </div>
                                        )}
                                    </div>
                                    {todos.length < 2 && (
                                        <button 
                                            onClick={() => {
                                                console.log('加号被点击');
                                                setIsAddingTodo(true);
                                            }} 
                                            className="absolute bottom-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg hover:scale-110 active:scale-95 transition-all z-10 border border-white/10"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* ========== 倒计时模式 ========== */}
                            {toolsMode === 'countdown' && (
                                <div className="flex-1 flex flex-col h-full relative min-h-0">
                                    {isAddingCountdown ? (
                                        <div className="absolute inset-x-1 top-0 bottom-auto z-20 bg-slate-800 border border-indigo-500/50 rounded-xl shadow-2xl p-2" style={{ height: '95px' }}>
                                            <div className="flex flex-col gap-1">
                                                <input
                                                    type="text"
                                                    value={newCountdownLabel}
                                                    onChange={(e) => setNewCountdownLabel(e.target.value)}
                                                    autoFocus
                                                    placeholder="事件名称..."
                                                    className="w-full h-7 bg-white/20 text-white text-xs px-2 rounded-lg outline-none focus:bg-white/30 transition-colors border border-white/20 focus:border-emerald-500 placeholder:text-white/40"
                                                />
                                                <div className="flex gap-1.5 items-center">
                                                    <input
                                                        type="date"
                                                        value={newCountdownDate}
                                                        onChange={(e) => setNewCountdownDate(e.target.value)}
                                                        className="flex-1 h-7 bg-white/20 text-white text-[10px] px-1 rounded-lg outline-none focus:bg-white/30 transition-colors border border-white/20 focus:border-emerald-500 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:scale-75"
                                                    />
                                                    <button onClick={addCountdown} className="w-8 h-7 flex items-center justify-center bg-emerald-500 text-white rounded hover:bg-emerald-400 transition-colors">
                                                        <Check size={14} />
                                                    </button>
                                                    <button onClick={() => setIsAddingCountdown(false)} className="w-8 h-7 flex items-center justify-center bg-white/20 text-white rounded hover:bg-white/30 transition-colors">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-10 min-h-0">
                                        {countdowns.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-1">
                                                {countdowns.map(cd => {
                                                    const daysLeft = Math.max(0, Math.ceil((new Date(cd.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                                                    return (
                                                        <div
                                                            key={cd.id}
                                                            className="flex flex-col p-2.5 rounded-lg bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-emerald-500/50 transition-all cursor-context-menu"
                                                            onContextMenu={(e) => handleRightClick(e, cd, 'countdown')}
                                                            onTouchStart={() => handleLongPressStart(cd, 'countdown')}
                                                            onTouchEnd={handleLongPressEnd}
                                                            onTouchMove={handleLongPressEnd}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-medium truncate text-slate-700 dark:text-slate-200 flex-1">{cd.label}</span>
                                                                <span className="text-[10px] opacity-50 text-slate-500 dark:text-slate-400 shrink-0 ml-2">{new Date(cd.date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace('/', '-')}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <span className="text-sm font-bold text-emerald-500">{daysLeft}</span>
                                                                <span className="text-[9px] text-slate-400 dark:text-slate-500">天后</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center opacity-30">
                                                <CalendarClock size={20} className="mb-1" />
                                                <p className="text-[10px]">添加倒计时</p>
                                            </div>
                                        )}
                                    </div>
                                    {countdowns.length < 2 && (
                                        <button 
                                            onClick={() => {
                                                console.log('倒计时加号被点击');
                                                setIsAddingCountdown(true);
                                            }} 
                                            className="absolute bottom-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg hover:scale-110 active:scale-95 transition-all z-10 border border-white/10"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </TiltCard>
        </div>
    );
}