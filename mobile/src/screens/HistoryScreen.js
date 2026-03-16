import { Feather } from "@expo/vector-icons";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import GlassCard from "../components/GlassCard";
import WorkspaceShell from "../components/WorkspaceShell";
import { useAuth } from "../context/AuthContext";
import { analyticsApi, isUnauthorizedError } from "../lib/api";
import { formatRelativeTime, normalizeScan } from "../lib/data";
import { colors, fonts, radius, spacing } from "../theme";

const riskOptions = [
  { value: "ALL", label: "All levels" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

const channelOptions = [
  { value: "ALL", label: "All channels" },
  { value: "messageText", label: "Message" },
  { value: "url", label: "URL" },
  { value: "promptInput", label: "Prompt" },
  { value: "logText", label: "Logs" },
  { value: "generatedText", label: "Generated" },
  { value: "imageUrl", label: "Image" },
  { value: "audioUrl", label: "Audio" },
];

const channelLabels = Object.fromEntries(channelOptions.map((option) => [option.value, option.label]));

function getRiskColor(level) {
  if (level === "HIGH") {
    return colors.warning;
  }

  if (level === "MEDIUM") {
    return colors.accentAlt;
  }

  return colors.success;
}

export default function HistoryScreen() {
  const { logout, session } = useAuth();
  const [state, setState] = useState({
    loading: true,
    error: "",
    scans: [],
  });
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const loadScans = useCallback(async () => {
    if (!session?.token) {
      return;
    }

    setState((current) => ({
      ...current,
      loading: true,
      error: "",
    }));

    try {
      const response = await analyticsApi.getScans(session.token, { page: 1, limit: 40 });

      setState({
        loading: false,
        error: "",
        scans: (response?.scans || []).map(normalizeScan),
      });
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await logout();
        return;
      }

      setState((current) => ({
        ...current,
        loading: false,
        error: error.message || "Unable to load scan history.",
      }));
    }
  }, [logout, session?.token]);

  useEffect(() => {
    loadScans();
  }, [loadScans]);

  const filteredScans = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return state.scans.filter((scan) => {
      const matchesRisk = riskFilter === "ALL" || scan.riskLevel === riskFilter;
      const matchesChannel = channelFilter === "ALL" || scan.inputType === channelFilter;
      const matchesQuery =
        !normalizedQuery ||
        scan.content.toLowerCase().includes(normalizedQuery) ||
        scan.prediction.toLowerCase().includes(normalizedQuery) ||
        scan.explanation.join(" ").toLowerCase().includes(normalizedQuery);

      return matchesRisk && matchesChannel && matchesQuery;
    });
  }, [channelFilter, deferredQuery, riskFilter, state.scans]);

  const highRiskCount = filteredScans.filter((scan) => scan.riskLevel === "HIGH").length;

  return (
    <WorkspaceShell routeName="History">
      <GlassCard style={styles.filterPanel}>
        <View style={styles.panelHead}>
          <View>
            <Text style={styles.panelTitle}>Filter the archive</Text>
            <Text style={styles.panelDescription}>
              Filter by verdict, risk level, channel, and text content.
            </Text>
          </View>
          <Feather name="filter" size={16} color={colors.accentHistory} />
        </View>

        <View style={styles.searchWrap}>
          <Text style={styles.fieldLabel}>Search</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            placeholder="Search prediction, content, or explanation"
            placeholderTextColor={colors.textSoft}
          />
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.fieldLabel}>Risk</Text>
          <View style={styles.filterRow}>
            {riskOptions.map((option) => {
              const active = riskFilter === option.value;

              return (
                <Pressable
                  key={option.value}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setRiskFilter(option.value)}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.fieldLabel}>Channel</Text>
          <View style={styles.filterRow}>
            {channelOptions.map((option) => {
              const active = channelFilter === option.value;

              return (
                <Pressable
                  key={option.value}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setChannelFilter(option.value)}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryPill}>
            <Feather name="search" size={12} color={colors.textSoft} />
            <Text style={styles.summaryText}>{filteredScans.length} matching cases</Text>
          </View>
          <View style={styles.summaryPill}>
            <Feather name="alert-triangle" size={12} color={colors.warning} />
            <Text style={styles.summaryText}>{highRiskCount} high-risk</Text>
          </View>
          <Pressable style={styles.summaryPill} onPress={loadScans}>
            <Feather name="clock" size={12} color={colors.textSoft} />
            <Text style={styles.summaryText}>{state.loading ? "Loading archive" : "Archive ready"}</Text>
          </Pressable>
        </View>
      </GlassCard>

      {state.error ? (
        <GlassCard style={styles.errorCard}>
          <Text style={styles.errorTitle}>History sync failed</Text>
          <Text style={styles.errorText}>{state.error}</Text>
          <Pressable style={styles.errorAction} onPress={loadScans}>
            <Text style={styles.errorActionText}>Retry</Text>
          </Pressable>
        </GlassCard>
      ) : null}

      {filteredScans.length ? (
        filteredScans.map((scan) => {
          const riskColor = getRiskColor(scan.riskLevel);

          return (
            <GlassCard key={scan.id} style={styles.historyCard}>
              <View style={styles.cardHead}>
                <View style={styles.cardHeadMain}>
                  <Text style={styles.cardTitle}>{scan.prediction}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{formatRelativeTime(scan.createdAt)}</Text>
                    <Text style={styles.metaText}>{channelLabels[scan.inputType] || scan.inputType}</Text>
                    <Text style={styles.metaText}>{scan.confidence}% confidence</Text>
                  </View>
                </View>

                <Text style={[styles.riskBadge, { color: riskColor, borderColor: `${riskColor}88` }]}>
                  {scan.riskLevel}
                </Text>
              </View>

              <View style={styles.contentCard}>
                <Text style={styles.contentText}>{scan.content}</Text>
              </View>

              <View style={styles.analysisList}>
                <View style={styles.analysisBlock}>
                  <Text style={styles.blockTitle}>Why it was flagged</Text>
                  <Text style={styles.blockCopy}>{scan.explanation[0]}</Text>
                </View>

                <View style={styles.analysisBlock}>
                  <Text style={styles.blockTitle}>Recommended next step</Text>
                  <Text style={styles.blockCopy}>{scan.recommendations[0]}</Text>
                </View>
              </View>
            </GlassCard>
          );
        })
      ) : (
        <GlassCard style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{state.loading ? "Loading stored detections" : "No matching scans"}</Text>
          <Text style={styles.emptyCopy}>
            {state.loading
              ? "Fetching the authenticated user archive from the backend."
              : "Adjust the filters or run a new analysis to populate this archive."}
          </Text>
        </GlassCard>
      )}
    </WorkspaceShell>
  );
}

const styles = StyleSheet.create({
  filterPanel: {
    gap: spacing.sm,
  },
  panelHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 17,
    fontFamily: fonts.sansSemiBold,
  },
  panelDescription: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fonts.sansRegular,
  },
  searchWrap: {
    gap: 7,
  },
  fieldLabel: {
    color: colors.textSoft,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: fonts.monoMedium,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.glass,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.sansRegular,
  },
  filterGroup: {
    gap: 7,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    backgroundColor: colors.glass,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  filterChipActive: {
    borderColor: "rgba(232, 196, 132, 0.6)",
    backgroundColor: "rgba(232, 196, 132, 0.18)",
  },
  filterChipText: {
    color: colors.textSoft,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    fontFamily: fonts.monoMedium,
  },
  filterChipTextActive: {
    color: colors.text,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  summaryPill: {
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
  summaryText: {
    color: colors.textSoft,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    fontFamily: fonts.monoMedium,
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
  historyCard: {
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
  contentCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.glass,
    padding: spacing.md,
  },
  contentText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fonts.sansRegular,
  },
  analysisList: {
    gap: 8,
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
});