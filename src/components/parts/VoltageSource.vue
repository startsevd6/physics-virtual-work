<template>
  <div
      style="border:1px solid #e3e8ef;padding:8px;border-radius:6px;background:#fff;color:#667085;display:flex;justify-content:space-between;align-items:center;flex-direction:column;gap:10px;">
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

export default defineComponent({props: {data: {type: Object, required: true}}})
</script>