import tokens from './design-system/tokens.json'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: tokens.colors.primary,
        secondary: tokens.colors.secondary,
        accent: tokens.colors.accent,
        surface: tokens.colors.surface,
        neutral: tokens.colors.neutral,
        success: tokens.colors.success,
        warning: tokens.colors.warning,
        danger: tokens.colors.danger,
      },
      fontFamily: {
        sans: tokens.fontFamily.sans,
      },
      fontSize: {
        h1: tokens.fontSize.h1,
        h2: tokens.fontSize.h2,
        h3: tokens.fontSize.h3,
        body: tokens.fontSize.body,
        small: tokens.fontSize.small,
      },
      borderRadius: {
        sm: tokens.borderRadius.sm,
        md: tokens.borderRadius.md,
        lg: tokens.borderRadius.lg,
      },
    },
  },
  plugins: [],
}
