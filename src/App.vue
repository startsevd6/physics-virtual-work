<template>
    <div class="header" :class="{ 'header--loaded': isLoaded }">
      <h1>Виртуальная лаборатория: исследование свойств терморезистора</h1>
      <div class="subtitle">3D интерактивная среда</div>
    </div>

    <CircuitBuilder3D/>

    <!--
    <div class="instructions">
      <h3>Инструкция</h3>
      <ol>
        <li>Для изменения угла наклона камеры используйте левую кнопку мыши,
          перемещения камеры - правую кнопку мыши,
          изменения фокусного расстояния - колёсико</li>
        <li>Установите регуляторы температуры и напряжения в необходимые положения и начните измерения</li>
        <li>Сохраняйте показания приборов — таблица обновляется автоматически</li>
      </ol>
    </div>
    -->
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import CircuitBuilder3D from './components/CircuitBuilder3D.vue'

export default defineComponent({
  name: 'App',
  components: { CircuitBuilder3D },
  setup() {
    const isLoaded = ref(false)

    const handleLoad = () => {
      // Задержка для лучшего визуального эффекта
      setTimeout(() => {
        isLoaded.value = true
      }, 100)
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
      isLoaded
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

.instructions h3 {
  color: #1f2937;
  margin-bottom: 16px;
  font-size: 20px;
}

.instructions ol {
  color: #4b5563;
  line-height: 1.6;
  padding-left: 20px;
}

.instructions li {
  margin-bottom: 8px;
}

.instructions li:last-child {
  margin-bottom: 0;
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