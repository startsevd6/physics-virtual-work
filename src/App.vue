<template>
    <div class="header" :class="{ 'header--loaded': isLoaded }">
      <h1>Виртуальная лаборатория: исследование свойств терморезистора</h1>
      <div class="subtitle">3D интерактивная среда</div>
      <!-- Кнопка настроек -->
      <button class="settings-button" @click="openSettingsModal" aria-label="Настройки">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
  padding: 0px;
}

.header {
  display: flex;
  flex-direction: row;
  gap: 15px;
  position: fixed;
  top: 0px;
  z-index: 1;
  justify-content: space-between;
  align-items: center;
  width: stretch;
  height: 100px;
  text-align: center;
  /*
  margin: 32px;
  margin-bottom: 30px;
  */
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

.controls {
  /*background: white;*/
  /*border-radius: 12px;*/
  padding: 30px;
  /*box-shadow: 0 4px 20px rgba(0,0,0,0.1);*/
  margin-bottom: 24px;

  scroll-snap-align: start;
  min-block-size: calc(100vh - 100px);
  scroll-snap-stop: always;

  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease-out 0.4s, transform 0.6s ease-out 0.4s;
}

.header--loaded ~ .controls {
  opacity: 1;
  transform: translateY(0);
}

.instructions {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);

  scroll-snap-align: start;
  min-block-size: calc(100vh - 100px);
  scroll-snap-stop: always;

  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease-out 0.5s, transform 0.6s ease-out 0.5s;
}

.header--loaded ~ .instructions {
  opacity: 1;
  transform: translateY(0);
}

/* Стили для кнопки настроек */
.settings-button {
  padding: 10px 12px;
  background: #ffffff;
  border-color: #cbd5e1;
  cursor: pointer;
  color: #4b5563;
}

.settings-button:hover {
  background: #f8fafc;
  border-color: #94a3b8;
  color: #1f2937;
}

.settings-button svg {
  transition: transform 0.2s;
}

.settings-button:hover svg {
  transform: scale(1.1);
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
  .header h1 {
    font-size: 16px;
  }

  .subtitle {
    font-size: 12px;
  }
}
</style>