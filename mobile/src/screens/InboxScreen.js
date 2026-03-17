import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import GlassCard from "../components/GlassCard";
import WorkspaceShell from "../components/WorkspaceShell";
import { useAuth } from "../context/AuthContext";
import { authApi, inboxApi } from "../lib/api";
import { formatRelativeTime, normalizeEmail } from "../lib/data";
import { colors, fonts, radius, spacing } from "../theme";

function getRiskMeta(level) {
  if (level === "HIGH") {
    return { color: colors.warning, icon: "alert-triangle" };
  }

  if (level === "MEDIUM") {
    return { color: colors.accentAlt, icon: "info" };
  }

  return { color: colors.success, icon: "check-circle" };
}

export default function InboxScreen() {
  const { session, updateSession } = useAuth();
  const [emails, setEmails] = useState([]);
  const [selectedEmailId, setSelectedEmailId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedEmail = useMemo(
    () => emails.find((item) => item.id === selectedEmailId) || emails[0] || null,
    [emails, selectedEmailId]
  );

  const loadInbox = useCallback(async () => {
    if (!session?.email && !session?.userId) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await inboxApi.getInboxScan({
        email: session?.email,
        userId: session?.userId,
      });
      const nextEmails = (response?.results || []).map(normalizeEmail);

      setEmails(nextEmails);
      setSelectedEmailId((currentId) => {
        if (currentId && nextEmails.some((item) => item.id === currentId)) {
          return currentId;
        }

        return nextEmails[0]?.id || null;
      });
      setNotice("");
      updateSession({ gmailConnected: true });
    } catch (loadError) {
      setError(loadError.message || "Unable to load inbox.");
    } finally {
      setIsLoading(false);
    }
  }, [session?.email, session?.userId, updateSession]);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  const handleConnectGmail = useCallback(async () => {
    try {
      setNotice("Complete Google authorization in the browser, then return here and tap Refresh.");
      await Linking.openURL(authApi.getGoogleConnectUrl());
    } catch (_error) {
      setError("Unable to open the Gmail connection flow.");
    }
  }, []);

  return (
    <WorkspaceShell routeName="Inbox">
      <GlassCard style={styles.listPanel}>
        <View style={styles.panelHead}>
          <View>
            <Text style={styles.panelTitle}>Message queue</Text>
            <Text style={styles.panelDescription}>
              {isLoading ? "Syncing Gmail..." : `${emails.length} messages scanned`}
            </Text>
          </View>

          <View style={styles.actionsWrap}>
            <Pressable style={styles.refreshChip} onPress={loadInbox} disabled={isLoading}>
              <Feather name="refresh-cw" size={12} color={colors.textSoft} />
              <Text style={styles.refreshText}>{isLoading ? "Syncing" : "Refresh"}</Text>
            </Pressable>
            <Feather name="mail" size={16} color={colors.textSoft} />
          </View>
        </View>

        {notice ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Browser-based Gmail connect</Text>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Gmail access needed</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorHint}>
              The current backend OAuth flow completes in the browser and stores Gmail tokens server-side for this email address.
            </Text>
            <Pressable style={styles.primaryChip} onPress={handleConnectGmail}>
              <Text style={styles.primaryChipText}>Connect Gmail</Text>
            </Pressable>
          </View>
        ) : null}

        {!emails.length && !error ? (
          <View style={styles.emptyCard}>
            <Feather name="mail" size={16} color={colors.textSoft} />
            <Text style={styles.emptyTitle}>{isLoading ? "Loading inbox" : "No messages found"}</Text>
            <Text style={styles.emptyCopy}>
              {isLoading
                ? "Fetching the latest Gmail messages and running backend scam analysis."
                : "Connect Gmail and refresh to analyze the latest inbox messages."}
            </Text>
            {!isLoading && !session?.gmailConnected ? (
              <Pressable style={styles.primaryChip} onPress={handleConnectGmail}>
                <Text style={styles.primaryChipText}>Connect Gmail</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {emails.length ? (
          <View style={styles.listWrap}>
            {emails.map((item) => {
              const active = selectedEmail?.id === item.id;
              const risk = getRiskMeta(item.riskLevel);

              return (
                <Pressable
                  key={item.id}
                  style={[styles.listItem, active && styles.listItemActive]}
                  onPress={() => setSelectedEmailId(item.id)}
                >
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemSender}>{item.senderName}</Text>
                    <Text style={styles.itemTime}>{formatRelativeTime(item.date)}</Text>
                  </View>

                  <Text style={styles.itemSubject}>{item.subject}</Text>
                  <Text style={styles.itemPreview} numberOfLines={2}>
                    {item.preview}
                  </Text>

                  <View style={styles.itemFooter}>
                    <View style={[styles.riskBadge, { borderColor: `${risk.color}99` }]}>
                      <Feather name={risk.icon} size={11} color={risk.color} />
                      <Text style={[styles.riskBadgeText, { color: risk.color }]}>{item.riskLevel}</Text>
                    </View>
                    <Text style={styles.itemScore}>Score: {item.riskScore}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </GlassCard>

      {selectedEmail ? (
        <>
          {selectedEmail.riskLevel !== "LOW" ? (
            <GlassCard style={styles.threatPanel}>
              <View style={styles.panelHead}>
                <View>
                  <Text style={styles.panelTitle}>Threat analysis</Text>
                  <Text style={styles.panelDescription}>
                    The backend email scanner detected potential risks in this message.
                  </Text>
                </View>

                <Feather
                  name="shield"
                  size={17}
                  color={selectedEmail.riskLevel === "HIGH" ? colors.warning : colors.accentAlt}
                />
              </View>

              <View style={styles.scoreCard}>
                <View style={styles.scoreHead}>
                  <Text style={styles.scoreThreat}>{selectedEmail.threatType}</Text>
                  <Text
                    style={[
                      styles.scoreRisk,
                      {
                        color: getRiskMeta(selectedEmail.riskLevel).color,
                        borderColor: getRiskMeta(selectedEmail.riskLevel).color,
                      },
                    ]}
                  >
                    {selectedEmail.riskLevel} RISK
                  </Text>
                </View>

                <View style={styles.scoreGrid}>
                  <View>
                    <Text style={styles.gridLabel}>Risk score</Text>
                    <Text style={styles.gridValue}>{selectedEmail.riskScore}</Text>
                  </View>
                  <View style={styles.scoreExplanationWrap}>
                    <Text style={styles.gridLabel}>AI explanation</Text>
                    <Text style={styles.scoreExplanation}>{selectedEmail.explanation}</Text>
                  </View>
                </View>

                <Text style={styles.scoreBasis}>{selectedEmail.scoreBasis}</Text>

                <View style={styles.scoreTrack}>
                  <View
                    style={[
                      styles.scoreFill,
                      {
                        width: `${Math.max(8, selectedEmail.riskScore)}%`,
                        backgroundColor: getRiskMeta(selectedEmail.riskLevel).color,
                      },
                    ]}
                  />
                </View>
              </View>

              {selectedEmail.indicators.length ? (
                <View style={styles.indicatorList}>
                  {selectedEmail.indicators.map((indicator) => (
                    <View key={indicator} style={styles.indicatorChip}>
                      <Feather name="star" size={12} color={colors.accentAlt} />
                      <Text style={styles.indicatorText}>{indicator}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </GlassCard>
          ) : null}

          <GlassCard style={styles.viewerPanel}>
            <View style={styles.viewerHead}>
              <Text style={styles.viewerTitle}>{selectedEmail.subject}</Text>

              <View style={styles.senderRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{selectedEmail.senderName.slice(0, 1)}</Text>
                </View>

                <View style={styles.senderMeta}>
                  <Text style={styles.senderName}>{selectedEmail.senderName}</Text>
                  <Text style={styles.senderEmail}>{`<${selectedEmail.senderEmail}>`}</Text>
                </View>
              </View>

              <View style={styles.timeRow}>
                <Feather name="clock" size={12} color={colors.textSoft} />
                <Text style={styles.timeText}>{new Date(selectedEmail.date).toLocaleString()}</Text>
              </View>
            </View>

            <Text style={styles.messageBody}>{selectedEmail.body}</Text>

            <View style={styles.metaGrid}>
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>Links</Text>
                <Text style={styles.metaValue}>{selectedEmail.links}</Text>
              </View>
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>Attachments</Text>
                <Text style={styles.metaValue}>{selectedEmail.attachments}</Text>
              </View>
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>Model source</Text>
                <Text style={styles.metaValue}>{selectedEmail.modelSource}</Text>
              </View>
            </View>
          </GlassCard>
        </>
      ) : null}
    </WorkspaceShell>
  );
}

const styles = StyleSheet.create({
  listPanel: {
    gap: spacing.sm,
  },
  panelHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  actionsWrap: {
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
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: colors.glass,
  },
  refreshText: {
    color: colors.textSoft,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontFamily: fonts.monoMedium,
  },
  noticeCard: {
    borderWidth: 1,
    borderColor: "rgba(36, 146, 255, 0.35)",
    borderRadius: radius.md,
    backgroundColor: "rgba(36, 146, 255, 0.08)",
    padding: spacing.md,
    gap: 6,
  },
  noticeTitle: {
    color: colors.text,
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
  },
  noticeText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fonts.sansRegular,
  },
  errorCard: {
    borderWidth: 1,
    borderColor: "rgba(255, 143, 152, 0.35)",
    borderRadius: radius.md,
    backgroundColor: "rgba(255, 143, 152, 0.08)",
    padding: spacing.md,
    gap: 7,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
  },
  errorText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fonts.sansRegular,
  },
  errorHint: {
    color: colors.textSoft,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: fonts.sansRegular,
  },
  primaryChip: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.24)",
    borderRadius: radius.full,
    backgroundColor: colors.glassStrong,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  primaryChipText: {
    color: colors.text,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: fonts.monoMedium,
  },
  emptyCard: {
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.glass,
    padding: spacing.md,
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
  listWrap: {
    gap: 8,
  },
  listItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.glass,
    padding: spacing.md,
    gap: 7,
  },
  listItemActive: {
    borderColor: "rgba(36, 146, 255, 0.56)",
    backgroundColor: "rgba(36, 146, 255, 0.14)",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  itemSender: {
    color: colors.text,
    fontSize: 12,
    fontFamily: fonts.sansMedium,
    flex: 1,
  },
  itemTime: {
    color: colors.textSoft,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    fontFamily: fonts.monoMedium,
  },
  itemSubject: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.sansSemiBold,
  },
  itemPreview: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fonts.sansRegular,
  },
  itemFooter: {
    marginTop: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: colors.glass,
  },
  riskBadgeText: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: fonts.monoMedium,
  },
  itemScore: {
    color: colors.textSoft,
    fontSize: 11,
    fontFamily: fonts.sansRegular,
  },
  threatPanel: {
    gap: spacing.sm,
  },
  scoreCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.glass,
    padding: spacing.md,
    gap: spacing.sm,
  },
  scoreHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  scoreThreat: {
    color: colors.text,
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    flex: 1,
  },
  scoreRisk: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: fonts.monoMedium,
  },
  scoreGrid: {
    flexDirection: "row",
    gap: spacing.md,
  },
  scoreExplanationWrap: {
    flex: 1,
  },
  gridLabel: {
    color: colors.textSoft,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: fonts.monoMedium,
  },
  gridValue: {
    marginTop: 4,
    color: colors.text,
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
  },
  scoreExplanation: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fonts.sansRegular,
  },
  scoreBasis: {
    color: colors.textSoft,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: fonts.sansRegular,
  },
  scoreTrack: {
    width: "100%",
    height: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  scoreFill: {
    height: "100%",
    borderRadius: radius.full,
  },
  indicatorList: {
    gap: 7,
  },
  indicatorChip: {
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
  indicatorText: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.sansRegular,
  },
  viewerPanel: {
    gap: spacing.sm,
  },
  viewerHead: {
    gap: spacing.sm,
  },
  viewerTitle: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontFamily: fonts.sansSemiBold,
  },
  senderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
  },
  avatarText: {
    color: colors.text,
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
  },
  senderMeta: {
    flex: 1,
    gap: 2,
  },
  senderName: {
    color: colors.text,
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
  },
  senderEmail: {
    color: colors.textSoft,
    fontSize: 11,
    fontFamily: fonts.sansRegular,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeText: {
    color: colors.textSoft,
    fontSize: 11,
    fontFamily: fonts.sansRegular,
  },
  messageBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 21,
    fontFamily: fonts.sansRegular,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaCard: {
    minWidth: "31%",
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.glass,
    padding: spacing.md,
    gap: 6,
  },
  metaLabel: {
    color: colors.textSoft,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: fonts.monoMedium,
  },
  metaValue: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fonts.sansSemiBold,
  },
});