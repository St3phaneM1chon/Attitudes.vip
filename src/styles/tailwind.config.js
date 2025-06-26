const colors = require('./colors.js');
module.exports = {
  content: [
    '../dashboards/**/*.{html,js}',
    '../**/*.{html,js}',
    '../../UI.html'
  ],
  theme: {
    extend: {
      colors: {
        ...colors.brand,
        ...colors.neutral,
        ...colors.blue,
        ...colors.green,
        ...colors.orange,
        ...colors.red
      },
      screens: {
        'mobile': '375px',
        'tablet-h': { 'raw': '(min-width: 768px) and (orientation: landscape)' }
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio')
  ]
};
