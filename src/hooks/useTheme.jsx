import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { userSettingsService } from '../services/firestore';

const THEMES = {
    teal: {
        name: 'Ocean Teal',
        primary: '#06b6d4',
        primaryLight: '#22d3ee',
        primaryDark: '#0891b2',
        bgMain: '#0a192f',
        bgCard: '#112240',
        bgCardHover: '#1d3a5f',
        gradient: 'from-cyan-500 to-teal-500',
    },
    blue: {
        name: 'Deep Blue',
        primary: '#3b82f6',
        primaryLight: '#60a5fa',
        primaryDark: '#2563eb',
        bgMain: '#0f172a',
        bgCard: '#1e293b',
        bgCardHover: '#334155',
        gradient: 'from-blue-500 to-indigo-500',
    },
    emerald: {
        name: 'Forest Green',
        primary: '#10b981',
        primaryLight: '#34d399',
        primaryDark: '#059669',
        bgMain: '#022c22',
        bgCard: '#064e3b',
        bgCardHover: '#065f46',
        gradient: 'from-emerald-500 to-green-500',
    },
    amber: {
        name: 'Warm Amber',
        primary: '#f59e0b',
        primaryLight: '#fbbf24',
        primaryDark: '#d97706',
        bgMain: '#1c1917',
        bgCard: '#292524',
        bgCardHover: '#44403c',
        gradient: 'from-amber-500 to-orange-500',
    },
    rose: {
        name: 'Rose Pink',
        primary: '#f43f5e',
        primaryLight: '#fb7185',
        primaryDark: '#e11d48',
        bgMain: '#1f1315',
        bgCard: '#3b1d23',
        bgCardHover: '#5c2a33',
        gradient: 'from-rose-500 to-pink-500',
    },
    pink: {
        name: 'Candy Pink',
        primary: '#ec4899',
        primaryLight: '#f472b6',
        primaryDark: '#db2777',
        bgMain: '#1a0a14',
        bgCard: '#2d1225',
        bgCardHover: '#4a1d3d',
        gradient: 'from-pink-500 to-fuchsia-500',
    },
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('teal');
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                loadTheme(currentUser.uid);
            }
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    const loadTheme = async (uid) => {
        try {
            const settings = await userSettingsService.get(uid);
            if (settings?.theme && THEMES[settings.theme]) {
                setTheme(settings.theme);
            }
        } catch (error) {
            console.error('Error loading theme:', error);
        }
    };

    const applyTheme = (themeId) => {
        const themeConfig = THEMES[themeId] || THEMES.teal;
        const root = document.documentElement;

        // Set CSS custom properties for colors
        root.style.setProperty('--theme-primary', themeConfig.primary);
        root.style.setProperty('--theme-primary-light', themeConfig.primaryLight);
        root.style.setProperty('--theme-primary-dark', themeConfig.primaryDark);

        // Set CSS custom properties for backgrounds
        root.style.setProperty('--theme-bg-main', themeConfig.bgMain);
        root.style.setProperty('--theme-bg-card', themeConfig.bgCard);
        root.style.setProperty('--theme-bg-card-hover', themeConfig.bgCardHover);

        // Set data attribute for Tailwind classes
        root.setAttribute('data-theme', themeId);
    };

    const changeTheme = async (newTheme) => {
        setTheme(newTheme);
        applyTheme(newTheme);
        if (user) {
            try {
                await userSettingsService.createOrUpdate(user.uid, { theme: newTheme });
            } catch (error) {
                console.error('Error saving theme:', error);
            }
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, themes: THEMES, changeTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

export { THEMES };
