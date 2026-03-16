export const colors = {
  background: "#121214",
  backgroundSoft: "#0f1013",
  surface: "#1e1e20",
  surfaceSoft: "#16171b",
  glass: "rgba(255, 255, 255, 0.03)",
  glassStrong: "rgba(255, 255, 255, 0.07)",
  border: "rgba(255, 255, 255, 0.1)",
  borderSoft: "rgba(255, 255, 255, 0.06)",
  text: "#f5f5f7",
  textMuted: "#9e9ea6",
  textSoft: "rgba(245, 245, 247, 0.52)",
  accent: "#ffffff",
  accentBlue: "#2492ff",
  accentSoft: "rgba(36, 146, 255, 0.16)",
  accentAlt: "#9ea7d8",
  accentHistory: "#e8c484",
  accentAlert: "#ff8f98",
  success: "#34c759",
  warning: "#ff8f98",
};

export const gradients = {
  page: ["#121214", "#101116", "#0f1014"],
  card: ["rgba(20, 20, 24, 0.9)", "rgba(10, 10, 14, 0.95)"],
  button: ["rgba(255, 255, 255, 0.16)", "rgba(255, 255, 255, 0.08)"],
  buttonGhost: ["rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.03)"],
};

export const fonts = {
  sansRegular: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansSemiBold: "Inter_600SemiBold",
  sansBold: "Inter_700Bold",
  monoMedium: "SpaceGrotesk_500Medium",
  monoSemiBold: "SpaceGrotesk_600SemiBold",
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
};

export const typography = {
  hero: 32,
  h1: 28,
  h2: 22,
  h3: 18,
  body: 15,
  caption: 12,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 999,
};

export const navigationTheme = {
  dark: true,
  colors: {
    primary: colors.accentBlue,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.borderSoft,
    notification: colors.warning,
  },
  fonts: {
    regular: { fontFamily: "Inter_400Regular", fontWeight: "400" },
    medium: { fontFamily: "Inter_500Medium", fontWeight: "500" },
    bold: { fontFamily: "Inter_700Bold", fontWeight: "700" },
    heavy: { fontFamily: "Inter_700Bold", fontWeight: "900" },
  },
};
