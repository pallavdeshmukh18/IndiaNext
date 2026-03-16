import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { workspaceMeta } from "../navigation/workspaceMeta";
import { colors, fonts, radius, spacing, typography } from "../theme";
import GlassCard from "./GlassCard";
import ScreenFrame from "./ScreenFrame";

export default function WorkspaceShell({ routeName, children }) {
  const { logout, session } = useAuth();
  const meta = workspaceMeta[routeName] || workspaceMeta.Overview;
  const userLabel = session?.name?.split(" ")[0] || session?.email?.split("@")[0] || "Analyst";

  return (
    <ScreenFrame>
      <View style={styles.topBar}>
        <View style={styles.brandWrap}>
          <View style={styles.brandIcon}>
            <Feather name="shield" size={14} color={colors.text} />
          </View>
          <View>
            <Text style={styles.brandName}>Krypton</Text>
            <Text style={styles.brandSub}>AI threat detection</Text>
          </View>
        </View>

        <View style={styles.userActions}>
          <View style={styles.userChip}>
            <View style={styles.liveDot} />
            <Text style={styles.userText}>{userLabel}</Text>
          </View>

          <Pressable style={styles.logoutChip} onPress={logout}>
            <Feather name="log-out" size={12} color={colors.textSoft} />
            <Text style={styles.logoutText}>Sign out</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.breadcrumbRow}>
        <Text style={styles.breadcrumbItem}>Dashboard</Text>
        <Feather name="chevron-right" size={12} color={colors.textSoft} />
        <Text style={[styles.breadcrumbItem, styles.breadcrumbActive]}>{meta.breadcrumb}</Text>
      </View>

      <GlassCard style={[styles.heroCard, { borderColor: `${meta.accentColor}55` }]}>
        <Text style={[styles.eyebrow, { color: meta.accentColor }]}>{meta.eyebrow}</Text>
        <Text style={styles.title}>{meta.title}</Text>
        <Text style={styles.description}>{meta.description}</Text>
      </GlassCard>

      <View style={styles.body}>{children}</View>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  topBar: {
    marginTop: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  brandWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(36, 146, 255, 0.45)",
    backgroundColor: "rgba(36, 146, 255, 0.16)",
  },
  brandName: {
    color: colors.text,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    letterSpacing: -0.2,
  },
  brandSub: {
    marginTop: 1,
    color: colors.textSoft,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.9,
    fontFamily: fonts.monoMedium,
  },
  userActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  userText: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.sansMedium,
  },
  logoutChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  logoutText: {
    color: colors.textSoft,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: fonts.monoMedium,
  },
  breadcrumbRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: spacing.xs,
  },
  breadcrumbItem: {
    color: colors.textSoft,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    fontFamily: fonts.monoMedium,
  },
  breadcrumbActive: {
    color: colors.text,
  },
  heroCard: {
    marginTop: spacing.sm,
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  eyebrow: {
    fontSize: typography.caption,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    fontFamily: fonts.monoMedium,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.6,
    fontFamily: fonts.sansBold,
  },
  description: {
    color: colors.textMuted,
    lineHeight: 21,
    fontSize: 13,
    fontFamily: fonts.sansRegular,
  },
  body: {
    gap: spacing.md,
  },
});
