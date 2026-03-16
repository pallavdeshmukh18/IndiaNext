import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, gradients, spacing } from "../theme";

export default function ScreenFrame({
  children,
  scroll = true,
  contentContainerStyle,
  style,
}) {
  const Container = scroll ? ScrollView : View;
  const containerProps = scroll
    ? {
        showsVerticalScrollIndicator: false,
        contentContainerStyle: [styles.content, contentContainerStyle],
      }
    : {
        style: [styles.content, contentContainerStyle],
      };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <LinearGradient colors={gradients.page} style={[styles.gradient, style]}>
        <View pointerEvents="none" style={styles.glowPrimary} />
        <View pointerEvents="none" style={styles.glowSecondary} />
        <Container {...containerProps}>{children}</Container>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + spacing.md,
    gap: spacing.lg,
  },
  glowPrimary: {
    position: "absolute",
    top: -180,
    right: -140,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "rgba(122, 131, 179, 0.16)",
  },
  glowSecondary: {
    position: "absolute",
    bottom: -210,
    left: -180,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "rgba(88, 95, 134, 0.12)",
  },
});
