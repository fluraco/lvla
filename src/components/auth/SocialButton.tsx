import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Image, ImageSourcePropType } from 'react-native';

interface SocialButtonProps {
  title: string;
  icon: ImageSourcePropType;
  onPress: () => void;
  backgroundColor?: string;
  textColor?: string;
}

export function SocialButton({
  title,
  icon,
  onPress,
  backgroundColor = '#FFFFFF',
  textColor = '#000000',
}: SocialButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image source={icon} style={styles.icon} />
      <Text style={[styles.text, { color: textColor }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 