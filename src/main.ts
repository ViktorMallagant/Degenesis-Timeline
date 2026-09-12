import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'
import './styles.css'
import App from './App.vue'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: {
          background: '#0f0f0f',
          surface: '#1a1a1a',
          primary: '#B71C1C',
          secondary: '#D32F2F',
          info: '#78909C'
        }
      }
    }
  }
})

createApp(App).use(vuetify).mount('#app')
