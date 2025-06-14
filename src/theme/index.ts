export const COLORS = {
  light: {
    primary: '#FF4B7E',
    primaryDark: '#E63E6D',
    primaryLight: '#FF6B94',
    secondary: '#6C63FF',
    background: '#FFFFFF',
    surface: '#F8F9FA',
    surfaceVariant: '#F0F2F5',
    text: '#2D3436',
    textSecondary: '#636E72',
    border: '#DFE6E9',
    error: '#FF4757',
    success: '#2ECC71',
    warning: '#FFA502',
    overlay: 'rgba(0, 0, 0, 0.5)',
    white: '#FFFFFF',
    black: '#000000',
    gradient: {
      primary: ['#FF4B7E', '#FF6B94'],
      secondary: ['#6C63FF', '#837DFF'],
      success: ['#2ECC71', '#55D98D'],
      warning: ['#FFA502', '#FFB733'],
    },
  },
  dark: {
    primary: '#FF6B94',
    primaryDark: '#FF4B7E',
    primaryLight: '#FF8CAB',
    secondary: '#837DFF',
    background: '#1A1A1A',
    surface: '#2D2D2D',
    surfaceVariant: '#3D3D3D',
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    border: '#404040',
    error: '#FF6B7D',
    success: '#55D98D',
    warning: '#FFB733',
    overlay: 'rgba(0, 0, 0, 0.7)',
    white: '#FFFFFF',
    black: '#000000',
    gradient: {
      primary: ['#FF6B94', '#FF8CAB'],
      secondary: ['#837DFF', '#9E99FF'],
      success: ['#55D98D', '#7DE4AA'],
      warning: ['#FFB733', '#FFD066'],
    },
  },
};

export const SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const TYPOGRAPHY = {
  h1: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: 0.25,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: 0.25,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    letterSpacing: 0,
  },
  subtitle1: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    letterSpacing: 0.15,
  },
  subtitle2: {
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 26,
    letterSpacing: 0.1,
  },
  body1: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  body2: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    letterSpacing: 0.25,
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: 1.25,
    textTransform: 'uppercase',
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  overline: {
    fontSize: 10,
    fontWeight: '400',
    lineHeight: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
};

export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5.84,
    elevation: 5,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 7.84,
    elevation: 8,
  },
};

export const BORDER_RADIUS = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  circular: 9999,
};

export const ANIMATIONS = {
  button: {
    scale: 0.98,
    duration: 100,
  },
  transition: {
    duration: 300,
  },
  spring: {
    damping: 15,
    mass: 1,
    stiffness: 150,
  },
};

export const LAYOUT = {
  container: {
    paddingHorizontal: SPACING.lg,
  },
  maxWidth: 500,
  aspectRatios: {
    square: 1,
    portrait: 4/5,
    landscape: 16/9,
  },
}; 