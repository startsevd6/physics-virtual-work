<template>
    <div class="header" :class="{ 'header--loaded': isLoaded }">
      <div class="header-title">
        <h1>Виртуальная лаборатория: исследование свойств терморезистора</h1>
        <span class="subtitle">3D интерактивная среда</span>
      </div>
      <!-- Кнопка настроек -->
      <button class="settings-button" @click="openSettingsModal" aria-label="Настройки">
        <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>
    </div>

    <CircuitBuilder3D ref="circuitBuilderRef"/>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import CircuitBuilder3D from './components/CircuitBuilder3D.vue'

export default defineComponent({
  name: 'App',
  components: { CircuitBuilder3D },
  setup() {
    const isLoaded = ref(false)
    const circuitBuilderRef = ref<InstanceType<typeof CircuitBuilder3D> | null>(null)

    const handleLoad = () => {
      setTimeout(() => {
        isLoaded.value = true
      }, 100)
    }

    const openSettingsModal = () => {
      circuitBuilderRef.value?.openSettings()
    }

    onMounted(() => {
      if (document.readyState === 'complete') {
        handleLoad()
      } else {
        window.addEventListener('load', handleLoad)
      }
    })

    onUnmounted(() => {
      window.removeEventListener('load', handleLoad)
    })

    return {
      isLoaded,
      circuitBuilderRef,
      openSettingsModal
    }
  }
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
}

#app {
  text-align: center;
  overflow: hidden;

  margin: 0 auto;
  padding: 0;
}

.header {
  display: flex;
  flex-direction: row;
  gap: 15px;
  position: fixed;
  top: 0;
  z-index: 1;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  height: 100px;
  text-align: center;
  padding: 30px 40px;
  background: white;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);

  transform: translateY(40px);
  opacity: 0;
  transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.8s ease-out;
  transition-delay: 0.1s;
}

.header--loaded {
  transform: translateY(0);
  opacity: 1;
}

.header-title {
  text-align: left;
}

.header h1 {
  color: #1f2937;
  margin-bottom: 8px;
  font-size: 28px;

  transform: translateY(10px);
  opacity: 0;
  transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s, opacity 0.8s ease-out 0.2s;
}

.header--loaded.header h1 {
  transform: translateY(0);
  opacity: 1;
}

.subtitle {
  color: #6b7280;
  font-size: 16px;
  font-weight: 500;

  transform: translateY(10px);
  opacity: 0;
  transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s, opacity 0.8s ease-out 0.3s;
}

.header--loaded .subtitle {
  transform: translateY(0);
  opacity: 1;
}

.settings-button {
  padding: 10px 12px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 30px;
  cursor: pointer;
  color: #4b5563;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);

  transition:
      background 0.25s ease,
      border-color 0.25s ease,
      color 0.25s ease,
      box-shadow 0.25s ease,
      transform 0.15s cubic-bezier(0.2, 0.9, 0.4, 1);

  animation: subtlePulse 2s ease-in-out 0.5s 1;
}

@keyframes subtlePulse {
  0% { box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05); }
  30% { box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15); }
  70% { box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15); }
  100% { box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05); }
}

.settings-button:hover {
  background: #f8fafc;
  border-color: #94a3b8;
  color: #1f2937;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
  transform: scale(1.02);
}

.settings-button:active {
  transform: scale(0.98);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: transform 0.05s, box-shadow 0.05s;
}

.settings-button svg {
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.settings-button:hover svg {
  transform: rotate(45deg) scale(1.05);
}

.settings-button:active svg {
  transform: rotate(45deg) scale(0.95);
  transition: transform 0.1s;
}

@media (max-width: 700px) {
  .header h1 {
    font-size: 20px;
  }

  .subtitle {
    font-size: 14px;
  }
}

@media (max-width: 500px) {
  .header {
    padding: 20px;
  }

  .header h1 {
    font-size: 16px;
  }

  .subtitle {
    font-size: 12px;
  }
}
</style>