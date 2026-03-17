import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import {
  KeyboardAvoidingView,
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
import { colors, fonts, radius, spacing, typography } from "../theme";

export default function SignupScreen({ navigation }) {
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Complete all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await signup({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
    } catch (signupError) {
      setError(signupError.message || "Unable to create your account.");
    } finally {
      setIsSubmitting(false);
    }
  };

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

          <Text style={styles.eyebrow}>New operator</Text>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            Join and get started with intelligent threat defense.
          </Text>

          <View style={styles.formWrap}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                editable={!isSubmitting}
                autoCapitalize="words"
                placeholder="Aarav Sharma"
                placeholderTextColor={colors.textSoft}
                style={styles.input}
              />
            </View>

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
                placeholder="Create a strong password"
                placeholderTextColor={colors.textSoft}
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm password</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!isSubmitting}
                secureTextEntry
                placeholder="Re-enter your password"
                placeholderTextColor={colors.textSoft}
                style={styles.input}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <ActionButton
              label={isSubmitting ? "Creating account..." : "Create Account"}
              onPress={handleSignup}
              disabled={isSubmitting}
            />
          </View>

          <TouchableOpacity onPress={() => navigation.replace("Login")}>
            <Text style={styles.footerText}>
              Already have an account? <Text style={styles.footerLink}>Log in</Text>
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
