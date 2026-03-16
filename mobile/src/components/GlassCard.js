import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";
import { colors, gradients, radius } from "../theme";

export default function GlassCard({ children, style }) {
  return (
    <LinearGradient
      colors={gradients.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 26,
    elevation: 8,
  },
});
