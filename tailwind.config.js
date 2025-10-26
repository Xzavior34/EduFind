module.exports = {
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0f172a',     // dark slate
        accent: '#06b6d4',      // teal
        cta: '#7c3aed',         // violet
        success: '#16a34a',
        neutralBg: '#f8fafc',
        cardBg: '#ffffff'
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px'
      },
      borderRadius: {
        sm: '6px',
        md: '12px',
        lg: '20px'
      },
      fontSize: {
        sm: ['13px', '1.2'],
        base: ['16px', '1.5'],
        lg: ['18px', '1.4'],
        xl: ['20px', '1.3'],
        '2xl': ['28px', '1.2'],
      },
      maxWidth: {
        content: '1100px'
      }
    }
  }
}
