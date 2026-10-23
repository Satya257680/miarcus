import { createContext, useContext } from "react";

// Appearance context shared by ThemeProvider (which supplies it) and every
// component that reads or changes the appearance via useTheme().
// Kept in a plain .js module so ThemeProvider.jsx only exports a component
// (required for React Fast Refresh).
export const ThemeContext = createContext(null);

export const useTheme = () => {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error("useTheme must be used inside ThemeProvider");
    }

    return context;
};
