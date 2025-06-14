import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { useFontSize } from '../contexts/FontSizeContext';

// Özel ölçeklenebilir Text bileşeni
export const ScaledText = (props: TextProps) => {
  const { style, children, ...restProps } = props;
  const { fontSizeScale } = useFontSize();
  
  // Stil işleme fonksiyonu
  const processStyle = (styleObj: any) => {
    if (!styleObj) return styleObj;
    const fontSize = styleObj.fontSize;
    if (fontSize) {
      return {
        ...styleObj,
        fontSize: fontSize * fontSizeScale,
      };
    }
    return styleObj;
  };
  
  // Eğer style bir dizi ise
  if (Array.isArray(style)) {
    const scaledStyles = style.map(s => processStyle(s));
    
    return <RNText style={scaledStyles} {...restProps}>{children}</RNText>;
  }
  
  // Eğer style bir obje ise
  const scaledStyle = processStyle(style);
  
  return <RNText style={scaledStyle} {...restProps}>{children}</RNText>;
};

// Bu yöntem artık kullanılmıyor, bunun yerine ScaledText bileşenini doğrudan kullan
export function overrideTextComponent() {
  console.warn(
    'overrideTextComponent() işlevi artık kullanılmıyor. Bunun yerine ScaledText bileşenini doğrudan kullanın.'
  );
  
  // Boş bir işlev döndürüyoruz, böylece mevcut kod çalışmaya devam eder
  return () => {};
}

export default ScaledText; 