/**
 * Bazowe komponenty UI spięte z motywem. Importowane przez wszystkie ekrany.
 */
import React from 'react';
import {
  Text as RNText,
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  type TextProps,
  type ViewProps,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useTheme, Spacing, Radius, FontSize } from '@/theme';

type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'mono';

const VARIANT_SIZE: Record<TextVariant, number> = {
  display: FontSize.display,
  title: FontSize.xxl,
  heading: FontSize.xl,
  body: FontSize.md,
  label: FontSize.sm,
  caption: FontSize.xs,
  mono: FontSize.lg,
};

export function Text({
  variant = 'body',
  color,
  weight,
  center,
  style,
  ...rest
}: TextProps & {
  variant?: TextVariant;
  color?: string;
  weight?: TextStyle['fontWeight'];
  center?: boolean;
}) {
  const { c } = useTheme();
  const defaultColor =
    variant === 'caption' || variant === 'label' ? c.textSecondary : c.text;
  const defaultWeight: TextStyle['fontWeight'] =
    variant === 'display' || variant === 'title' ? '800' : variant === 'heading' ? '700' : '500';
  return (
    <RNText
      style={[
        {
          color: color ?? defaultColor,
          fontSize: VARIANT_SIZE[variant],
          fontWeight: weight ?? defaultWeight,
          textAlign: center ? 'center' : 'left',
        },
        style,
      ]}
      {...rest}
    />
  );
}

export function Card({
  children,
  style,
  padded = true,
  ...rest
}: ViewProps & { padded?: boolean }) {
  const { c } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: c.surface,
          borderRadius: Radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.border,
          padding: padded ? Spacing.lg : 0,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  size = 'md',
  style,
  fullWidth = true,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}) {
  const { c } = useTheme();
  const bg: Record<ButtonVariant, string> = {
    primary: c.primary,
    secondary: c.surfaceAlt,
    ghost: 'transparent',
    danger: c.danger,
    success: c.success,
  };
  const fg: Record<ButtonVariant, string> = {
    primary: c.onPrimary,
    secondary: c.text,
    ghost: c.primary,
    danger: '#fff',
    success: '#fff',
  };
  const pad = size === 'lg' ? Spacing.lg : size === 'sm' ? Spacing.sm : Spacing.md;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          backgroundColor: bg[variant],
          borderRadius: Radius.md,
          paddingVertical: pad,
          paddingHorizontal: Spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: Spacing.sm,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          borderWidth: variant === 'ghost' ? StyleSheet.hairlineWidth : 0,
          borderColor: c.border,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <>
          {icon}
          <Text
            variant={size === 'sm' ? 'label' : 'body'}
            color={fg[variant]}
            weight="700"
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** Mała pigułka/etykieta (filtr, tag partii itp.). */
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: active ? c.primary : c.surfaceAlt,
        borderRadius: Radius.pill,
        paddingVertical: Spacing.xs + 2,
        paddingHorizontal: Spacing.md,
        opacity: pressed ? 0.8 : 1,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: active ? c.primary : c.border,
      })}
    >
      <Text variant="label" color={active ? c.onPrimary : c.textSecondary} weight="600">
        {label}
      </Text>
    </Pressable>
  );
}

/** Separator. */
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: c.border }, style]} />;
}

/** Pusty stan (lista bez danych). */
export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm }}>
      {icon}
      <Text variant="heading" center>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" color={c.textSecondary} center style={{ maxWidth: 280 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
