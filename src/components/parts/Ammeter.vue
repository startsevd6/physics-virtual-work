<template>
  <div class="container">
    <div>
      <strong>Амперметр</strong>
      <div style="font-size:12px"><span>Диапазон: 0–1 A</span></div>
    </div>
    <div>
      <button @click="$emit('remove')">Удалить</button>
    </div>
  </div>
</template>


<script lang="ts">
import {defineComponent} from 'vue'

export default defineComponent({})
</script>

<style scoped>
.container {
  border: 1px solid #e3e8ef;
  padding: 8px;
  border-radius: 6px;
  background: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  color: #667085
}
</style>