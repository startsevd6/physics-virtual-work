<template>
  <div class="app">
    <div class="header">
      <h1>Виртуальная лаборатория: исследование свойств терморезистора</h1>
      <div class="subtitle">3D интерактивная среда</div>
    </div>

    <div class="controls">
      <div class="circuit-3d-wrapper">
        <CircuitBuilder3D/>
      </div>
    </div>

    <div class="instructions">
      <h3>Инструкция</h3>
      <ol>
        <li>Перетащите компоненты из левой панели на 3D рабочую область.</li>
        <li>Используйте элементы управления камерой для изменения ракурса.</li>
        <li>Установите регуляторы температуры и напряжения в минимальные положения и начните измерения.</li>
        <li>Сохраняйте показания приборов — таблица обновляется автоматически.</li>
      </ol>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import CircuitBuilder3D from './components/CircuitBuilder3D.vue'

export default defineComponent({
  name: 'App',
  components: { CircuitBuilder3D }
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

.app {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 30px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.header h1 {
  color: #1f2937;
  margin-bottom: 8px;
  font-size: 28px;
}

.subtitle {
  color: #6b7280;
  font-size: 16px;
  font-weight: 500;
}

.controls {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  margin-bottom: 24px;
}

.instructions {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
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
</style>