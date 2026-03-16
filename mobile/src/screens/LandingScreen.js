import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import ActionButton from "../components/ActionButton";
import GlassCard from "../components/GlassCard";
import ScreenFrame from "../components/ScreenFrame";
import { colors, fonts, radius, spacing, typography } from "../theme";

const overviewStats = [
  { value: "05", label: "Protected channels" },
  { value: "24/7", label: "Continuous verdict loop" },
  { value: "<120ms", label: "Typical response path" },
];

const overviewNotes = [
  "Analyst-readable verdicts instead of opaque scores",
  "Private-by-default capture before any route leaves the device",
  "One handoff from suspicious input to documented response action",
];

const protocolSteps = [
  {
    id: "01",
    title: "Input and local encryption",
    description:
      "Before payloads leave the device, the signal is normalized and sealed so raw user context stays private.",
  },
  {
    id: "02",
    title: "Identity dissolve via mesh routing",
    description:
      "Sessions are fragmented across adaptive routes so no single path can be traced back to the origin.",
  },
  {
    id: "03",
    title: "Threat filtering and behavioral scoring",
    description:
      "Classifier layers inspect tone, links, prompts, and anomalies before a case ever reaches the user queue.",
  },
  {
    id: "04",
    title: "Destination delivery",
    description:
      "Only the clean response moves forward, with verdicts, rationale, and response guidance attached.",
  },
];

const threatSignals = [
  {
    icon: "mail",
    label: "Email infiltration",
    surface: "Mail pipeline",
    value: "Spear-phishing, invoice fraud, impersonation trails",
  },
  {
    icon: "terminal",
    label: "Prompt defense",
    surface: "LLM interface",
    value: "Instruction override, jailbreak patterns, extraction attempts",
  },
  {
    icon: "git-branch",
    label: "Session routing",
    surface: "Traffic control",
    value: "Adaptive pathing, local sealing, analyst-grade telemetry",
  },
];

export default function LandingScreen({ navigation }) {
  return (
    <ScreenFrame>
      <View style={styles.heroBlock}>
        <Text style={styles.eyebrow}>DEPLOYED SIGNAL LAYER</Text>
        <Text style={styles.heroTitle}>A calmer front-end for high-stakes threat decisions.</Text>
        <Text style={styles.heroCopy}>
          The product surface below the hero now behaves like a real launch site: concise
          product framing, clearer evidence of what the system does, and a path from curiosity
          to console access.
        </Text>
      </View>

      <View style={styles.actionRow}>
        <ActionButton
          label="Sign Up"
          style={styles.actionButton}
          onPress={() => navigation.navigate("Signup")}
        />
        <ActionButton
          label="Log In"
          variant="ghost"
          style={styles.actionButton}
          onPress={() => navigation.navigate("Login")}
        />
      </View>

      <GlassCard>
        <View style={styles.statsHeader}>
          <Text style={styles.sectionLabel}>SYSTEM FLOW</Text>
          <Text style={styles.sectionCode}>mesh route active</Text>
        </View>
        <View style={styles.statsRow}>
          {overviewStats.map((stat) => (
            <View key={stat.label} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.noteList}>
          {overviewNotes.map((note) => (
            <View key={note} style={styles.noteItem}>
              <View style={styles.noteDot} />
              <Text style={styles.noteText}>{note}</Text>
            </View>
          ))}
        </View>
      </GlassCard>

      <GlassCard>
        <View style={styles.statsHeader}>
          <Text style={styles.sectionLabel}>PROTOCOL</Text>
          <Text style={styles.sectionCode}>04 steps</Text>
        </View>

        <View style={styles.protocolWrap}>
          {protocolSteps.map((step) => (
            <View key={step.id} style={styles.protocolStep}>
              <Text style={styles.protocolId}>{step.id}</Text>
              <View style={styles.protocolCopyWrap}>
                <Text style={styles.protocolTitle}>{step.title}</Text>
                <Text style={styles.protocolDescription}>{step.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </GlassCard>

      <View style={styles.listWrap}>
        {threatSignals.map((signal) => (
          <GlassCard key={signal.label} style={styles.nodeCard}>
            <View style={styles.nodeTopRow}>
              <View style={styles.nodeIconWrap}>
                <Feather name={signal.icon} size={15} color={colors.accentBlue} />
              </View>
              <View style={styles.signalTitleWrap}>
                <Text style={styles.nodeTitle}>{signal.label}</Text>
                <Text style={styles.surfaceLabel}>{signal.surface}</Text>
              </View>
            </View>
            <Text style={styles.nodeCopy}>{signal.value}</Text>
          </GlassCard>
        ))}
      </View>

      <ActionButton
        label="Open Console"
        onPress={() => navigation.navigate("Login")}
      />
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  heroBlock: {
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: typography.caption,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    fontFamily: fonts.monoMedium,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1,
    fontFamily: fonts.sansBold,
  },
  heroCopy: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: fonts.sansRegular,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  sectionLabel: {
    color: colors.text,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontFamily: fonts.monoMedium,
  },
  sectionCode: {
    color: colors.textSoft,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: "hidden",
    fontFamily: fonts.monoMedium,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.glass,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: 4,
  },
  statValue: {
    color: colors.text,
    fontSize: 22,
    letterSpacing: -0.3,
    fontFamily: fonts.monoSemiBold,
  },
  statLabel: {
    color: colors.textSoft,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontFamily: fonts.monoMedium,
  },
  noteList: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  noteItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  noteDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: colors.accent,
  },
  noteText: {
    color: colors.textMuted,
    lineHeight: 20,
    fontSize: 13,
    flex: 1,
    fontFamily: fonts.sansRegular,
  },
  protocolWrap: {
    gap: spacing.md,
  },
  protocolStep: {
    flexDirection: "row",
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  protocolId: {
    color: colors.textSoft,
    fontSize: 11,
    marginTop: 2,
    fontFamily: fonts.monoMedium,
  },
  protocolCopyWrap: {
    flex: 1,
    gap: 5,
  },
  protocolTitle: {
    color: colors.text,
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
  },
  protocolDescription: {
    color: colors.textMuted,
    lineHeight: 19,
    fontSize: 13,
    fontFamily: fonts.sansRegular,
  },
  listWrap: {
    gap: spacing.sm,
  },
  nodeCard: {
    gap: spacing.sm,
  },
  nodeTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  nodeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(36, 146, 255, 0.4)",
  },
  signalTitleWrap: {
    flex: 1,
    gap: 2,
  },
  nodeTitle: {
    color: colors.text,
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
  },
  surfaceLabel: {
    color: colors.textSoft,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: fonts.monoMedium,
  },
  nodeCopy: {
    color: colors.textMuted,
    lineHeight: 20,
    fontSize: 13,
    fontFamily: fonts.sansRegular,
  },
});
