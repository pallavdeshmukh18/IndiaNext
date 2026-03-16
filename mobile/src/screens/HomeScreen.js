import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

const features = [
  "Email phishing checks",
  "URL risk analysis",
  "Prompt injection detection",
  "Anomaly detection",
  "Deepfake image and audio checks",
];

export default function HomeScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Krypton Sentinel Mobile</Text>
        <Text style={styles.title}>IndiaNext security workflows, now ready for mobile.</Text>
        <Text style={styles.copy}>
          This scaffold is ready for the next step: connecting your React Native UI
          to the existing backend threat analysis services.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Planned Modules</Text>
        {features.map((feature) => (
          <Text key={feature} style={styles.featureItem}>
            • {feature}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    gap: 20,
    backgroundColor: colors.background,
  },
  hero: {
    gap: 12,
  },
  eyebrow: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.accent,
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "800",
    color: colors.ink,
  },
  copy: {
    fontSize: 16,
    lineHeight: 24,
    color: "#3f4e43",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
  },
  featureItem: {
    fontSize: 15,
    lineHeight: 22,
    color: "#304034",
  },
});
