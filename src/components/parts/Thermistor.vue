<template>
  <div class="container">
    <div class="wrapper">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <strong>{{ kindLabel }}</strong>
          <div style="font-size:12px;color:#667085">R0: <input v-model.number="local.R0"/> Ω</div>
        </div>
      </div>
      <div style="margin-top:6px;font-size:12px;color:#667085">
        <div v-if="isMetal">
          alpha: <input v-model.number="local.alpha"/>
        </div>
        <div v-else>
          B: <input v-model.number="local.B"/>
        </div>
      </div>
      <div>
        <button @click="$emit('remove')">Удалить</button>
      </div>
    </div>
  </div>
</template>


<script lang="ts">
import {defineComponent, reactive} from 'vue'

export default defineComponent({
  props: {data: {type: Object, required: true}},
  setup(props) {
    const local = reactive({
      R0: props.data.R0 ?? (props.data.kind === 'metal' ? 100 : 1000),
      alpha: props.data.alpha ?? 0.0039,
      B: props.data.B ?? 3500
    })
// keep props.data in sync when changed
    Object.assign(props.data, local)
    const isMetal = props.data.kind === 'metal'
    const kindLabel = isMetal ? 'Металлический терморезистор' : 'Полупроводниковый терморезистор'
    return {local, isMetal, kindLabel}
  }
})
</script>

<style scoped>
input {
  width: 80px;
}

.container {
  border: 1px solid #e3e8ef;
  padding: 8px;
  border-radius: 6px;
  background: #fff;
  color: #667085;
}

.wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>