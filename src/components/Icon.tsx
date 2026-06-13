/** Cienki wrapper na Ionicons, spięty z kolorem motywu. */
import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function Icon({
  name,
  size = 22,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const { c } = useTheme();
  return <Ionicons name={name} size={size} color={color ?? c.text} />;
}
