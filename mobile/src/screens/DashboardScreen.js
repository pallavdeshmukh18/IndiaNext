import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import GlassCard from "../components/GlassCard";
import WorkspaceShell from "../components/WorkspaceShell";
import { useAuth } from "../context/AuthContext";
import { analyticsApi, isUnauthorizedError } from "../lib/api";
import { formatRelativeTime, formatTrendLabel, normalizeScan } from "../lib/data";
import { colors, fonts, radius, spacing } from "../theme";

const emptyAnalytics = {
  totalScans: 0,
  highRisk: 0,
  mediumRisk: 0,
  lowRisk: 0,
};

export default function DashboardScreen() {
  const { logout, session } = useAuth();
  const [state, setState] = useState({
    loading: true,
    error: "",
    analytics: emptyAnalytics,
    trends: [],
    threatTypes: [],
    alerts: [],
  });

  const loadDashboard = useCallback(async () => {
    if (!session?.token) {
      return;
    }

    setState((current) => ({
      ...current,
      loading: true,
      error: "",
    }));

    try {
      const [analyticsResponse, trendsResponse, threatTypesResponse, alertsResponse] = await Promise.all([
        analyticsApi.getAnalytics(session.token),
        analyticsApi.getTrends(session.token),
        analyticsApi.getThreatTypes(session.token),
        analyticsApi.getAlerts(session.token),
      ]);

      setState({
        loading: false,
        error: "",
        analytics: analyticsResponse?.data || emptyAnalytics,
        trends: trendsResponse?.data || [],
        threatTypes: threatTypesResponse?.data || [],
        alerts: (alertsResponse?.alerts || []).map(normalizeScan),
      });
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await logout();
        return;
      }

      setState((current) => ({
        ...current,
        loading: false,
        error: error.message || "Unable to load dashboard telemetry.",
      }));
    }
  }, [logout, session?.token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const metricCards = [
    {
      icon: "activity",
      label: "Total scans",
      value: state.analytics.totalScans,
      note: "Threat submissions processed",
    },
    {
      icon: "shield",
      label: "High risk",
      value: state.analytics.highRisk,
      note: "Immediate analyst attention",
    },
    {
      icon: "alert-triangle",
      label: "Medium risk",
      value: state.analytics.mediumRisk,
      note: "Watch closely and validate context",
    },
    {
      icon: "check-circle",
      label: "Low risk",
      value: state.analytics.lowRisk,
      note: "Monitor without escalation",
    },
  ];

  const maxTrend = useMemo(() => {
    const values = state.trends.map((entry) => Number(entry.scans) || 0);
    return Math.max(1, ...values);
  }, [state.trends]);

  const totalThreats = useMemo(
    () => state.threatTypes.reduce((sum, entry) => sum + Number(entry.count || 0), 0),
    [state.threatTypes]
  );

  return (
    <WorkspaceShell routeName="Overview">
      <View style={styles.metricGrid}>
        {metricCards.map((metric) => (
          <GlassCard key={metric.label} style={styles.metricCard}>
            <View style={styles.metricHead}>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Feather name={metric.icon} size={16} color={colors.accent} />
            </View>
            <Text style={styles.metricValue}>{state.loading ? "..." : metric.value}</Text>
            <Text style={styles.metricNote}>{metric.note}</Text>
          </GlassCard>
        ))}
      </View>

      {state.error ? (
        <GlassCard style={styles.errorCard}>
          <Text style={styles.errorTitle}>Dashboard sync failed</Text>
          <Text style={styles.errorText}>{state.error}</Text>
          <Pressable style={styles.errorAction} onPress={loadDashboard}>
            <Text style={styles.errorActionText}>Retry</Text>
          </Pressable>
        </GlassCard>
      ) : null}

      <GlassCard style={styles.panelCard}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Threat activity timeline</Text>
          <Pressable style={styles.sectionChip} onPress={loadDashboard} disabled={state.loading}>
            <Feather name="refresh-cw" size={11} color={colors.textSoft} />
            <Text style={styles.sectionChipText}>{state.loading ? "Syncing" : "Refresh"}</Text>
          </Pressable>
        </View>

        {state.trends.length ? (
          <View style={styles.chartWrap}>
            {state.trends.map((row) => (
              <View key={row.date} style={styles.trendRow}>
                <View style={styles.trendMeta}>
                  <Text style={styles.trendDate}>{formatTrendLabel(row.date)}</Text>
                  <Text style={styles.trendCount}>{row.scans} scans</Text>
                </View>

                <View style={styles.trendTrack}>
                  <View
                    style={[
                      styles.trendFill,
                      { width: `${Math.max(10, (Number(row.scans || 0) / maxTrend) * 100)}%` },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {state.loading ? "Loading activity data" : "No trend data yet"}
            </Text>
            <Text style={styles.emptyCopy}>
              {state.loading
                ? "Fetching scan volume from the backend analytics service."
                : "Run an analysis to begin building daily scan telemetry."}
            </Text>
          </View>
        )}
      </GlassCard>

      <GlassCard style={styles.panelCard}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Top threat types</Text>
          <Text style={styles.sectionTag}>{state.loading ? "Syncing" : "Distribution"}</Text>
        </View>

        {state.threatTypes.length ? (
          <View style={styles.chartWrap}>
            {state.threatTypes.map((threat) => {
              const width = totalThreats ? (Number(threat.count || 0) / totalThreats) * 100 : 0;

              return (
                <View key={threat.threatType} style={styles.trendRow}>
                  <View style={styles.trendMeta}>
                    <Text style={styles.trendDate}>{threat.threatType}</Text>
                    <Text style={styles.trendCount}>{threat.count}</Text>
                  </View>
                  <View style={styles.trendTrack}>
                    <View style={[styles.trendFill, { width: `${Math.max(10, width)}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No threat distribution yet</Text>
            <Text style={styles.emptyCopy}>
              Stored scan categories will appear here once the account has logged detections.
            </Text>
          </View>
        )}
      </GlassCard>

      <GlassCard style={styles.panelCard}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Critical alerts</Text>
          <Text style={styles.sectionTag}>{state.loading ? "Loading" : "High risk"}</Text>
        </View>

        {state.alerts.length ? (
          <View style={styles.listWrap}>
            {state.alerts.slice(0, 4).map((item) => (
              <View key={item.id} style={styles.listItem}>
                <Text style={styles.itemTitle}>{item.prediction}</Text>
                <Text style={styles.itemDetail}>{item.explanation[0]}</Text>
                <Text style={styles.itemMeta}>
                  {formatRelativeTime(item.createdAt)} · {item.inputType} · {item.riskLevel}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No critical alerts</Text>
            <Text style={styles.emptyCopy}>
              High-risk cases from the backend alert queue will surface here automatically.
            </Text>
          </View>
        )}
      </GlassCard>
    </WorkspaceShell>
  );
}

const styles = StyleSheet.create({
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metricCard: {
    width: "48%",
    minHeight: 124,
    gap: spacing.sm,
  },
  metricHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    flex: 1,
    paddingRight: 6,
    fontFamily: fonts.monoMedium,
  },
  metricValue: {
    color: colors.text,
    fontSize: 27,
    letterSpacing: -0.4,
    fontFamily: fonts.monoSemiBold,
  },
  metricNote: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
    marginTop: "auto",
    fontFamily: fonts.sansRegular,
  },
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
  panelCard: {
    gap: spacing.sm,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontFamily: fonts.sansSemiBold,
    flex: 1,
  },
  sectionTag: {
    color: colors.textSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontFamily: fonts.monoMedium,
  },
  sectionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    backgroundColor: colors.glass,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sectionChipText: {
    color: colors.textSoft,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: fonts.monoMedium,
  },
  chartWrap: {
    gap: spacing.sm,
  },
  trendRow: {
    gap: 6,
  },
  trendMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  trendDate: {
    color: colors.text,
    fontSize: 13,
    fontFamily: fonts.sansMedium,
    flex: 1,
  },
  trendCount: {
    color: colors.textSoft,
    fontSize: 12,
    fontFamily: fonts.sansRegular,
  },
  trendTrack: {
    width: "100%",
    height: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.glass,
    overflow: "hidden",
  },
  trendFill: {
    height: "100%",
    borderRadius: radius.full,
    backgroundColor: colors.accentBlue,
  },
  listWrap: {
    gap: spacing.sm,
  },
  listItem: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.glass,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 8,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
  },
  itemDetail: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: fonts.sansRegular,
  },
  itemMeta: {
    color: colors.textSoft,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontFamily: fonts.monoMedium,
  },
  emptyState: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.glass,
    padding: spacing.md,
    gap: 6,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
  },
  emptyCopy: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fonts.sansRegular,
  },
});