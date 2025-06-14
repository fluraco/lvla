import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { Text as RNEText, TextProps as RNETextProps } from 'react-native-elements';
import { useFontSize } from '../../contexts/FontSizeContext';

/**
 * CustomText bileşeni, React Native'in Text bileşeninin yazı boyutu ölçeklenebilir versiyonu.
 * FontSizeContext'ten gelen ölçek değerini kullanarak yazı boyutunu otomatik olarak ayarlar.
 */
export const CustomText = React.forwardRef<any, RNTextProps>((props, ref) => {
  const { style, children, ...restProps } = props;
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
      <RNText ref={ref} style={scaledStyles} {...restProps}>
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
    <RNText ref={ref} style={scaledStyle} {...restProps}>
      {children}
    </RNText>
  );
});

/**
 * ElementsText bileşeni, React Native Elements'in Text bileşeninin yazı boyutu ölçeklenebilir versiyonu.
 * FontSizeContext'ten gelen ölçek değerini kullanarak yazı boyutunu otomatik olarak ayarlar.
 */
export const ElementsText = React.forwardRef<any, RNETextProps>((props, ref) => {
  const { style, children, ...restProps } = props;
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
      <RNEText ref={ref} style={scaledStyles} {...restProps}>
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
    <RNEText ref={ref} style={scaledStyle} {...restProps}>
      {children}
    </RNEText>
  );
}); 