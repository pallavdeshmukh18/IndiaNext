import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors, fonts, gradients, radius } from "../theme";

export default function ActionButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  style,
  textStyle,
}) {
  const isGhost = variant === "ghost";
  const fillColors = isGhost ? gradients.buttonGhost : gradients.button;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.wrapper,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <LinearGradient
        colors={fillColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.fill, isGhost ? styles.ghostFill : null]}
      >
        <Text style={[styles.label, isGhost ? styles.ghostLabel : null, textStyle]}>
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.md,
    overflow: "hidden",
  },
  fill: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.24)",
    paddingHorizontal: 16,
  },
  ghostFill: {
    borderColor: colors.border,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    letterSpacing: 0.2,
  },
  ghostLabel: {
    color: colors.text,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.68,
  },
});
