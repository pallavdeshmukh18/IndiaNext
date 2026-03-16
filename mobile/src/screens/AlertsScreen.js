import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import GlassCard from "../components/GlassCard";
import WorkspaceShell from "../components/WorkspaceShell";
import { useAuth } from "../context/AuthContext";
import { analyticsApi, isUnauthorizedError } from "../lib/api";
import { formatRelativeTime, normalizeScan } from "../lib/data";
import { colors, fonts, radius, spacing } from "../theme";

function getRiskColor(level) {
  if (level === "HIGH") {
    return colors.warning;
  }

  if (level === "MEDIUM") {
    return colors.accentAlt;
  }

  return colors.success;
}

export default function AlertsScreen({ navigation }) {
  const { logout, session } = useAuth();
  const [state, setState] = useState({
    loading: true,
    error: "",
    alerts: [],
    topThreats: [],
  });

  const loadAlerts = useCallback(async () => {
    if (!session?.token) {
      return;
    }

    setState((current) => ({
      ...current,
      loading: true,
      error: "",
    }));

    try {
      const [alertsResponse, threatTypesResponse] = await Promise.all([
        analyticsApi.getAlerts(session.token),
        analyticsApi.getThreatTypes(session.token),
      ]);

      setState({
        loading: false,
        error: "",
        alerts: (alertsResponse?.alerts || []).map(normalizeScan),
        topThreats: threatTypesResponse?.data || [],
      });
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await logout();
        return;
      }

      setState((current) => ({
        ...current,
        loading: false,
        error: error.message || "Unable to load the alert queue.",
      }));
    }
  }, [logout, session?.token]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const priorityThreat = state.topThreats[0]?.threatType || "No dominant threat yet";

  return (
    <WorkspaceShell routeName="Alerts">
      {state.error ? (
        <GlassCard style={styles.errorCard}>
          <Text style={styles.errorTitle}>Alert queue sync failed</Text>
          <Text style={styles.errorText}>{state.error}</Text>
          <Pressable style={styles.errorAction} onPress={loadAlerts}>
            <Text style={styles.errorActionText}>Retry</Text>
          </Pressable>
        </GlassCard>
      ) : null}

      {state.alerts.length ? (
        state.alerts.map((alert) => {
          const riskColor = getRiskColor(alert.riskLevel);

          return (
            <GlassCard key={alert.id} style={styles.alertCard}>
              <View style={styles.cardHead}>
                <View style={styles.cardHeadMain}>
                  <Text style={styles.cardTitle}>{alert.prediction}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{formatRelativeTime(alert.createdAt)}</Text>
                    <Text style={styles.metaText}>{alert.inputType}</Text>
                    <Text style={styles.metaText}>{alert.confidence}% confidence</Text>
                  </View>
                </View>

                <Text style={[styles.riskBadge, { color: riskColor, borderColor: `${riskColor}88` }]}>
                  {alert.riskLevel}
                </Text>
              </View>

              <View style={styles.previewCard}>
                <Text style={styles.previewText}>{alert.content}</Text>
              </View>

              <View style={styles.analysisBlock}>
                <Text style={styles.blockTitle}>What triggered the alert</Text>
                <Text style={styles.blockCopy}>{alert.explanation[0]}</Text>
              </View>

              <View style={styles.alertActions}>
                <View style={styles.actionPill}>
                  <Feather name="alert-triangle" size={12} color={colors.warning} />
                  <Text style={styles.actionText}>Recommended: {alert.recommendations[0]}</Text>
                </View>
                <Pressable style={styles.openHistoryChip} onPress={() => navigation.navigate("History")}>
                  <Text style={styles.openHistoryText}>Open in history</Text>
                  <Feather name="arrow-right" size={12} color={colors.textSoft} />
                </Pressable>
              </View>
            </GlassCard>
          );
        })
      ) : (
        <GlassCard style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{state.loading ? "Loading active alerts" : "No active alerts"}</Text>
          <Text style={styles.emptyCopy}>
            {state.loading
              ? "Fetching high-risk cases from the backend alert service."
              : "The queue will populate when a case crosses the high-risk threshold."}
          </Text>
        </GlassCard>
      )}

      <GlassCard style={styles.playbookCard}>
        <View style={styles.playbookHead}>
          <View>
            <Text style={styles.playbookTitle}>Response playbook</Text>
            <Text style={styles.playbookCopy}>
              Use queue context to decide what to block, verify, and escalate.
            </Text>
          </View>

          <View style={styles.playbookActions}>
            <Pressable style={styles.refreshChip} onPress={loadAlerts}>
              <Feather name="refresh-cw" size={12} color={colors.textSoft} />
              <Text style={styles.refreshText}>{state.loading ? "Syncing" : "Refresh"}</Text>
            </Pressable>
            <Feather name="bell" size={16} color={colors.accentAlert} />
          </View>
        </View>

        <View style={styles.playbookList}>
          <View style={styles.playbookStep}>
            <Text style={styles.stepTitle}>Priority signal</Text>
            <Text style={styles.stepCopy}>{priorityThreat}</Text>
          </View>

          <View style={styles.playbookStep}>
            <Text style={styles.stepTitle}>Queue depth</Text>
            <Text style={styles.stepCopy}>
              {state.loading ? "Loading queue..." : `${state.alerts.length} alerts require analyst attention.`}
            </Text>
          </View>

          <View style={styles.playbookStep}>
            <Text style={styles.stepTitle}>Suggested ladder</Text>
            <Text style={styles.stepCopy}>
              Block or quarantine, confirm sender or domain, then archive evidence into scan history.
            </Text>
          </View>
        </View>

        <View style={styles.playbookFooter}>
          <View style={styles.footerPill}>
            <Feather name="clock" size={12} color={colors.textSoft} />
            <Text style={styles.footerPillText}>Continuous triage</Text>
          </View>
          <View style={styles.footerPill}>
            <Feather name="shield" size={12} color={colors.success} />
            <Text style={styles.footerPillText}>Analyst-ready context</Text>
          </View>
        </View>
      </GlassCard>
    </WorkspaceShell>
  );
}

const styles = StyleSheet.create({
  errorCard: {
    gap: 8,
    borderColor: "rgba(255, 143, 152, 0.35)",
  },
  errorTitle: {
    color: colors.text,
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
  },
  errorText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fonts.sansRegular,
  },
  errorAction: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    backgroundColor: colors.glass,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  errorActionText: {
    color: colors.text,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: fonts.monoMedium,
  },
  alertCard: {
    gap: spacing.sm,
  },
  cardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  cardHeadMain: {
    flex: 1,
    gap: 6,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.sansSemiBold,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metaText: {
    color: colors.textSoft,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    fontFamily: fonts.monoMedium,
  },
  riskBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: fonts.monoMedium,
  },
  previewCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.glass,
    padding: spacing.md,
  },
  previewText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fonts.sansRegular,
  },
  analysisBlock: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.glass,
    padding: spacing.md,
    gap: 6,
  },
  blockTitle: {
    color: colors.text,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontFamily: fonts.monoMedium,
  },
  blockCopy: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fonts.sansRegular,
  },
  alertActions: {
    gap: 7,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    backgroundColor: colors.glass,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionText: {
    color: colors.textSoft,
    fontSize: 11,
    fontFamily: fonts.sansRegular,
    flex: 1,
  },
  openHistoryChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    backgroundColor: colors.glass,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  openHistoryText: {
    color: colors.textSoft,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    fontFamily: fonts.monoMedium,
  },
  emptyCard: {
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
  },
  emptyCopy: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    fontFamily: fonts.sansRegular,
  },
  playbookCard: {
    gap: spacing.sm,
  },
  playbookHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  playbookTitle: {
    color: colors.text,
    fontSize: 17,
    fontFamily: fonts.sansSemiBold,
  },
  playbookCopy: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fonts.sansRegular,
  },
  playbookActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  refreshChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    backgroundColor: colors.glass,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  refreshText: {
    color: colors.textSoft,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontFamily: fonts.monoMedium,
  },
  playbookList: {
    gap: 8,
  },
  playbookStep: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.glass,
    padding: spacing.md,
    gap: 5,
  },
  stepTitle: {
    color: colors.text,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontFamily: fonts.monoMedium,
  },
  stepCopy: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fonts.sansRegular,
  },
  playbookFooter: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  footerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    backgroundColor: colors.glass,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  footerPillText: {
    color: colors.textSoft,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontFamily: fonts.monoMedium,
  },
});