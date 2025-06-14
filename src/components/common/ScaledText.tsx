import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { useFontSize } from '../../contexts/FontSizeContext';

interface ScaledTextProps extends TextProps {
  style?: any;
  children?: React.ReactNode;
}

export function ScaledText({ style, children, ...props }: ScaledTextProps) {
  const { fontSizeScale } = useFontSize();
  
  // Eğer style bir dizi ise
  if (Array.isArray(style)) {
    // Her bir stili fontSizeScale ile ölçeklendir
    const scaledStyles = style.map(s => {
      if (!s) return s;
      const fontSize = s.fontSize;
      if (fontSize) {
        return {
          ...s,
          fontSize: fontSize * fontSizeScale,
        };
      }
      return s;
    });
    
    return (
      <RNText style={scaledStyles} {...props}>
        {children}
      </RNText>
    );
  }
  
  // Eğer style bir obje ise veya undefined ise
  const fontSize = style?.fontSize;
  const scaledStyle = fontSize
    ? { ...style, fontSize: fontSize * fontSizeScale }
    : style;
  
  return (
    <RNText style={scaledStyle} {...props}>
      {children}
    </RNText>
  );
} 