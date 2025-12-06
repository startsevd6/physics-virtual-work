<template>
  <div class="app">
    <div class="header">
      <h1>Виртуальная лаборатория: исследование свойств терморезистора</h1>
    </div>

    <div class="controls">
      <div style="flex:1" class="panel canvas">
        <CircuitBuilder/>
      </div>
    </div>

    <div style="margin-top:12px" class="panel">
      <h3>Инструкция</h3>
      <ol>
        <li>Перетащите компоненты из списка на слева на рабочую область и соберите схему, соответствующую рисунку 4
          (есть слоты для источника, образца терморезистора и амперметра).
        </li>
        <li>Установите регуляторы температуры и напряжения в минимальные положения и начните измерения.</li>
        <li>Сохраняйте показания приборов вручную — таблицы доступны внизу.</li>
      </ol>
    </div>
  </div>
</template>


<script lang="ts">
import {defineComponent} from 'vue'
import CircuitBuilder from './components/CircuitBuilder.vue'


export default defineComponent({
  components: {CircuitBuilder}
})
</script>