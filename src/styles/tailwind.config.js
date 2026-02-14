const colors = require('./colors.js');
module.exports = {
  content: [
    '../dashboards/**/*.{html,js}',
    '../**/*.{html,js}'
  ],
  theme: {
    extend: {
      colors: {
        ...colors.brand,
        ...colors.neutral,
        blue: colors.blue[600],
        green: colors.green[600],
        orange: colors.orange[600],
        red: colors.red[600]
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio')
  ]
};
