import { useCallback, useEffect, useState } from "react";
import { Feather } from "@expo/vector-icons";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ActionButton from "../components/ActionButton";
import GlassCard from "../components/GlassCard";
import ScreenFrame from "../components/ScreenFrame";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../lib/api";
import {
  GOOGLE_OAUTH_CALLBACK_PATH,
  clearWebGoogleOAuthCallbackParams,
  getGoogleOAuthCallbackUrl,
  getWebGoogleOAuthCallbackParams,
  parseGoogleOAuthCallbackUrl,
} from "../lib/googleOAuthFlow";
import { colors, fonts, radius, spacing, typography } from "../theme";

export default function LoginScreen({ navigation }) {
  const { login, updateSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Enter both email and password.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await login({
        email: email.trim().toLowerCase(),
        password,
      });
    } catch (loginError) {
      setError(loginError.message || "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyGoogleAuthCallback = useCallback(
    async (params = {}) => {
      const status = params.status;
      const flow = String(params.flow || "auth").toLowerCase();

      if (flow !== "auth") {
        return false;
      }

      if (status === "error") {
        setError(params.message || "Google sign-in failed.");
        return true;
      }

      if (status !== "success") {
        return false;
      }

      if (!params.token || !params.email) {
        setError("Google sign-in completed, but session details were missing.");
        return true;
      }

      await updateSession({
        token: params.token,
        userId: params.userId,
        email: params.email,
        name: params.name || params.email.split("@")[0],
        authProvider: params.authProvider || "google",
        avatar: params.avatar || "",
        gmailConnected: true,
      });

      return true;
    },
    [updateSession]
  );

  const handleGoogleSignIn = useCallback(async () => {
    try {
      setError("");

      const callbackUrl = getGoogleOAuthCallbackUrl();
      const connectUrl = authApi.getGoogleSignInUrl(callbackUrl);

      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.location.assign(connectUrl);
        return;
      }

      await Linking.openURL(connectUrl);
    } catch (_error) {
      setError("Unable to start Google sign-in.");
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    const callbackParams = getWebGoogleOAuthCallbackParams();

    if (!callbackParams) {
      return;
    }

    applyGoogleAuthCallback(callbackParams).finally(() => {
      clearWebGoogleOAuthCallbackParams();
    });
  }, [applyGoogleAuthCallback]);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    const handleOAuthUrl = ({ url }) => {
      const parsed = parseGoogleOAuthCallbackUrl(url);

      if (!parsed || parsed.path !== GOOGLE_OAUTH_CALLBACK_PATH) {
        return;
      }

      applyGoogleAuthCallback(parsed.params);
    };

    const subscription = Linking.addEventListener("url", handleOAuthUrl);
    Linking.getInitialURL()
      .then((initialUrl) => {
        if (initialUrl) {
          handleOAuthUrl({ url: initialUrl });
        }
      })
      .catch(() => {});

    return () => subscription.remove();
  }, [applyGoogleAuthCallback]);

  return (
    <ScreenFrame>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <TouchableOpacity onPress={() => navigation.navigate("Landing")}> 
          <Text style={styles.backLink}>Back</Text>
        </TouchableOpacity>

        <GlassCard style={styles.card}>
          <View style={styles.logoRow}>
            <Feather name="shield" size={18} color={colors.text} />
            <Text style={styles.logoText}>Krypton</Text>
          </View>

          <Text style={styles.eyebrow}>Secure access</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Log in to continue securing your workspace.</Text>

          <View style={styles.formWrap}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email address</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                editable={!isSubmitting}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@company.com"
                placeholderTextColor={colors.textSoft}
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                editable={!isSubmitting}
                secureTextEntry
                placeholder="Enter your password"
                placeholderTextColor={colors.textSoft}
                style={styles.input}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <ActionButton
              label={isSubmitting ? "Signing in..." : "Log In"}
              onPress={handleLogin}
              disabled={isSubmitting}
            />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <ActionButton
              label="Continue with Google"
              variant="ghost"
              onPress={handleGoogleSignIn}
              disabled={isSubmitting}
            />
          </View>

          <TouchableOpacity onPress={() => navigation.replace("Signup")}>
            <Text style={styles.footerText}>
              New to Krypton? <Text style={styles.footerLink}>Create an account</Text>
            </Text>
          </TouchableOpacity>
        </GlassCard>
      </KeyboardAvoidingView>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  backLink: {
    color: colors.textSoft,
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    fontFamily: fonts.monoMedium,
  },
  card: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.sm,
  },
  logoText: {
    color: colors.text,
    fontSize: 19,
    letterSpacing: -0.3,
    fontFamily: fonts.sansSemiBold,
  },
  eyebrow: {
    color: colors.textMuted,
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: 1.7,
    fontFamily: fonts.monoMedium,
  },
  title: {
    color: colors.text,
    fontSize: typography.h1,
    letterSpacing: -0.4,
    fontFamily: fonts.sansBold,
  },
  subtitle: {
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: spacing.xs,
    fontFamily: fonts.sansRegular,
  },
  formWrap: {
    gap: spacing.md,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: fonts.sansMedium,
  },
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 14,
    fontFamily: fonts.sansRegular,
  },
  error: {
    color: colors.warning,
    backgroundColor: "rgba(255, 143, 152, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 143, 152, 0.35)",
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: fonts.sansRegular,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textSoft,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: fonts.monoMedium,
  },
  footerText: {
    marginTop: spacing.sm,
    color: colors.textSoft,
    fontSize: 13,
    textAlign: "center",
    fontFamily: fonts.sansRegular,
  },
  footerLink: {
    color: colors.text,
    fontFamily: fonts.sansSemiBold,
  },
});
