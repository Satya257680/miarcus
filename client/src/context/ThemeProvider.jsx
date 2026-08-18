import React,{createContext,useCallback,useContext,useEffect,useMemo,useState} from "react";
import axios from "../axiosConfig";
const ThemeContext=createContext(null);
export const THEMES=[
{id:"miarcus-original",name:"Miarcus Original",description:"The current playful Miarcus look.",icon:"🧸",preview:"original",mode:"light"},
{id:"professional",name:"Professional",description:"Clean corporate workspace.",icon:"💼",preview:"professional",mode:"light"},
{id:"dark",name:"Dark",description:"Comfortable dark workspace.",icon:"🌙",preview:"dark",mode:"dark"},
{id:"minimal",name:"Minimal",description:"Simple, quiet and focused.",icon:"🤍",preview:"minimal",mode:"light"},
{id:"classic-blue",name:"Classic Blue",description:"Traditional business software.",icon:"🔵",preview:"classic-blue",mode:"light"},
{id:"high-contrast",name:"High Contrast",description:"Strong contrast for visibility.",icon:"⚡",preview:"high-contrast",mode:"dark"},
{id:"purple",name:"Royal Purple",description:"Modern purple business interface.",icon:"💜",preview:"purple",mode:"light"},
{id:"ocean",name:"Ocean",description:"Fresh blue and teal workspace.",icon:"🌊",preview:"ocean",mode:"light"},
{id:"emerald",name:"Emerald",description:"Calm green professional interface.",icon:"🌿",preview:"emerald",mode:"light"},
{id:"sunset",name:"Sunset",description:"Warm orange and rose interface.",icon:"🌅",preview:"sunset",mode:"light"},
{id:"midnight",name:"Midnight",description:"Deep navy dark workspace.",icon:"🌌",preview:"midnight",mode:"dark"},
{id:"sky",name:"Sky",description:"Bright, airy blue interface.",icon:"🩵",preview:"sky",mode:"light"}
];
export const ACCENT_COLORS=[
{id:"purple",name:"Purple",value:"#6d57c8"},{id:"blue",name:"Blue",value:"#2563eb"},{id:"teal",name:"Teal",value:"#0f766e"},{id:"green",name:"Green",value:"#16a34a"},{id:"orange",name:"Orange",value:"#ea580c"},{id:"red",name:"Red",value:"#dc2626"}
];
const DEFAULT={theme:"miarcus-original",accentColor:"purple",fontSize:"medium",sidebarStyle:"comfortable"};
const getKey=()=>{const id=localStorage.getItem("userId");return id?`miarcus_theme_preferences_${id}`:"miarcus_theme_preferences_guest";};
const readLocal=()=>{try{const v=JSON.parse(localStorage.getItem(getKey())||"null");return v&&typeof v==="object"?{...DEFAULT,...v}:DEFAULT;}catch{return DEFAULT;}};
const normalize=v=>({theme:THEMES.some(t=>t.id===v.theme)?v.theme:DEFAULT.theme,accentColor:ACCENT_COLORS.some(a=>a.id===v.accentColor)?v.accentColor:DEFAULT.accentColor,fontSize:["small","medium","large"].includes(v.fontSize)?v.fontSize:DEFAULT.fontSize,sidebarStyle:["comfortable","compact"].includes(v.sidebarStyle)?v.sidebarStyle:DEFAULT.sidebarStyle});
function ThemeProvider({children}){
 const [preferences,setPreferences]=useState(readLocal); const [loadedFromServer,setLoadedFromServer]=useState(false);
 const applyPreferences=useCallback(value=>{const n=normalize(value||{});setPreferences(n);const r=document.documentElement;r.dataset.miarcusTheme=n.theme;r.dataset.miarcusFontSize=n.fontSize;r.dataset.miarcusSidebarStyle=n.sidebarStyle;r.dataset.miarcusMode=THEMES.find(t=>t.id===n.theme)?.mode||"light";const accent=ACCENT_COLORS.find(a=>a.id===n.accentColor);r.style.setProperty("--mi-accent",accent?.value||"#6d57c8");try{localStorage.setItem(getKey(),JSON.stringify(n));}catch{}return n;},[]);
 useEffect(()=>{applyPreferences(readLocal());},[applyPreferences]);
 useEffect(()=>{let cancelled=false;const token=localStorage.getItem("token"),id=localStorage.getItem("userId");if(!token||!id){setLoadedFromServer(true);return;} (async()=>{try{const r=await axios.get("/api/theme-preferences");if(!cancelled&&r.data?.success)applyPreferences(r.data.preferences);}catch(e){console.warn("Theme preference load:",e?.message||e);}finally{if(!cancelled)setLoadedFromServer(true);}})();return()=>{cancelled=true;};},[applyPreferences]);
 const updatePreferences=useCallback(async changes=>{const next=applyPreferences({...preferences,...changes});if(!localStorage.getItem("token"))return next;try{const r=await axios.put("/api/theme-preferences",next);if(r.data?.success&&r.data.preferences)applyPreferences(r.data.preferences);}catch(e){console.warn("Theme preference save:",e?.message||e);}return next;},[applyPreferences,preferences]);
 const saveCurrentForUser=useCallback(async()=>{if(!localStorage.getItem("token")||!localStorage.getItem("userId"))return preferences;try{const r=await axios.put("/api/theme-preferences",preferences);if(r.data?.success&&r.data.preferences)return applyPreferences(r.data.preferences);}catch(e){console.warn("Theme preference save:",e?.message||e);}return preferences;},[applyPreferences,preferences]);
 const toggleColorMode=useCallback(()=>{if(preferences.theme==="dark"){const prev=localStorage.getItem("miarcus_previous_light_theme")||"miarcus-original";return updatePreferences({theme:THEMES.some(t=>t.id===prev&&t.mode==="light")?prev:"miarcus-original"});}localStorage.setItem("miarcus_previous_light_theme",preferences.theme);return updatePreferences({theme:"dark"});},[preferences.theme,updatePreferences]);
 const value=useMemo(()=>({preferences,themes:THEMES,accentColors:ACCENT_COLORS,updatePreferences,toggleColorMode,saveCurrentForUser,loadedFromServer}),[preferences,updatePreferences,toggleColorMode,saveCurrentForUser,loadedFromServer]);
 return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export const useTheme=()=>{const c=useContext(ThemeContext);if(!c)throw new Error("useTheme must be used inside ThemeProvider");return c;};
export default ThemeProvider;
