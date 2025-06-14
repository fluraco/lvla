import React from 'react';
import { Text as RNEText, TextProps as RNETextProps } from 'react-native-elements';
import { useFontSize } from '../../contexts/FontSizeContext';

interface ScaledTextProps extends RNETextProps {
  style?: any;
  children?: React.ReactNode;
}

export function ScaledElementsText({ style, children, ...props }: ScaledTextProps) {
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
      <RNEText style={scaledStyles} {...props}>
        {children}
      </RNEText>
    );
  }
  
  // Eğer style bir obje ise veya undefined ise
  const fontSize = style?.fontSize;
  const scaledStyle = fontSize
    ? { ...style, fontSize: fontSize * fontSizeScale }
    : style;
  
  return (
    <RNEText style={scaledStyle} {...props}>
      {children}
    </RNEText>
  );
} 