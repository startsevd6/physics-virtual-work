<template>
  <div
      style="border:1px solid #e3e8ef;padding:8px;border-radius:6px;background:#fff;color:#667085;display:flex;justify-content:space-between;align-items:center;flex-direction:column;gap:10px;cursor:ns-resize;"
      @wheel.prevent="handleWheelScroll"
  >
    <div>
      <strong>Источник</strong>
      <div style="font-size:12px;color:#667085">U (В): <input type="number" max="15" min="0" v-model.number="data.voltage" style="width:80px"/></div>
    </div>
    <div>
      <button @click="$emit('remove')">Удалить</button>
    </div>
  </div>
</template>


<script lang="ts">
import {defineComponent} from 'vue'

export default defineComponent({
  props: {
    data: {
      type: Object, required: true
    }
  },

  setup(props) { // Принимаем props как параметр
    function handleWheelScroll(event: WheelEvent) {
      const delta = Math.sign(event.deltaY) // Направление прокрутки
      const step = 1 // Шаг изменения напряжения

      let newVoltage = Number((props.data.voltage + Math.round(delta * step)/10).toFixed(1)) // Используем props.data.voltage

      // Ограничиваем значение в диапазоне 0-15
      if (newVoltage < 0) newVoltage = 0
      if (newVoltage > 15) newVoltage = 15

      props.data.voltage = newVoltage // Изменяем значение напрямую

      // Предотвращаем прокрутку страницы
      event.preventDefault()
    }

    return {
      handleWheelScroll,
    }
  }
});
</script>