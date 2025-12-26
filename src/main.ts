import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

createApp(App).mount('#app')

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason)
})