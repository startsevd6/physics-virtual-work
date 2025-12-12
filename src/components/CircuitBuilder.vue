<template>
  <ErrorPopup
      v-if="showError"
      :message="errorMessage"
      @close="showError = false"
  />

  <div>
    <h2>Сборка схемы (2D)</h2>
    <div class="circuit-assembly">
      <div class="components">
        <h4>Компоненты</h4>
        <div class="panels">
          <div v-for="c in components" :key="c.type" draggable="true" @dragstart="onDragStart($event,c)" class="panel"
               style="margin-bottom:8px;cursor:grab">
            <strong>{{ c.label }}</strong>
            <div style="font-size:12px">{{ c.desc }}</div>
          </div>
          <div
              class="panel temperature"
              @wheel.prevent="handleWheelScroll"
              style="cursor: ew-resize;"
          >
            <label>Температура (K)</label>
            <input
                type="range"
                min="290"
                max="380"
                v-model.number="globalTemp"
                @wheel.prevent="handleWheelScroll"
            />
            <div>{{ globalTemp }} K</div>
          </div>
        </div>
      </div>

      <div style="flex:1">
        <h4>Рабочая область</h4>
        <div id="board" @dragover.prevent @drop="onDrop"
             style="height:340px;min-width:670px;border:2px dashed #d6dde7;border-radius:6px;padding:12px;position:relative;background:#fbfdff">
          <div v-for="(slot,idx) in slots" :key="idx" :style="slotStyle(slot)" class="slot">
            <div v-if="slot.item">
              <component :is="slot.item.component" :ref="slot.item.component" :data="slot.item.data"
                         @remove="() => removeFromSlot(idx)"/>
            </div>
            <div v-else style="font-size:12px;color:#7b8592">{{ slot.label }}</div>
          </div>
        </div>

        <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
          <button @click="saveSnapshot">Сохранить показания</button>
          <button @click="resetBoard">Сброс</button>
        </div>

        <div style="margin-top:8px">
          <h4>Сохранённые показания</h4>
          <ul>
            <li v-for="(s,i) in snapshots" :key="i" class="saved-readings">{{ formatSnapshot(s) }}</li>
          </ul>
        </div>

      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, reactive, ref} from 'vue'
import ThermistorComponent from './parts/Thermistor.vue'
import SourceComponent from './parts/VoltageSource.vue'
import AmmeterComponent from './parts/Ammeter.vue'
import ErrorPopup from './ErrorPopup.vue'
import "../style.css";

type Slot = { label: string, x: number, y: number, w: number, h: number, item: null | { component: any, data: any } }

// Маппинг типов компонентов на их реализации
const componentMap: Record<string, any> = {
  'source': SourceComponent,
  'therm-sem': ThermistorComponent,
  'therm-met': ThermistorComponent,
  'amm': AmmeterComponent
}

export default defineComponent({
  components: {
    ThermistorComponent,
    SourceComponent,
    AmmeterComponent,
    ErrorPopup,
  },

  setup() {
    const components = [
      {type: 'source', label: 'Источник напряжения', desc: 'Источник питания 0–15 В'},
      {
        type: 'therm-sem',
        label: 'Терморезистор (полупр.)',
        desc: 'Полупроводниковый образец',
        meta: {kind: 'semiconductor'}
      },
      {type: 'therm-met', label: 'Терморезистор (металл)', desc: 'Металлический образец', meta: {kind: 'metal'}},
      {type: 'amm', label: 'Амперметр', desc: 'Включается в цепь'}
    ]

    let globalTemp = ref(300)
    const supplyVoltage = ref(0)
    const showError = ref(false)
    const errorMessage = ref('')

    const slots = reactive<Slot[]>([
      {label: 'Слот: Источник', x: 20, y: 20, w: 180, h: 60, item: null},
      {label: 'Слот: Образец', x: 220, y: 120, w: 180, h: 60, item: null},
      {label: 'Слот: Амперметр', x: 460, y: 20, w: 180, h: 60, item: null},
    ])

    const snapshots = ref<any[]>([])

    function showErrorPopup(message: string) {
      errorMessage.value = message
      showError.value = true
    }

    function onDragStart(e: DragEvent, c: any) {
      // Передаем только тип и метаданные, не сам компонент
      e.dataTransfer?.setData('application/json', JSON.stringify({
        type: c.type,
        meta: c.meta || {}
      }))
    }

    function onDrop(e: DragEvent) {
      const json = e.dataTransfer?.getData('application/json')
      if (!json) return

      const {type, meta} = JSON.parse(json)
      const component = componentMap[type]

      if (!component) {
        console.error('Компонент не найден:', type)
        return
      }

      // Находим первый пустой слот
      const emptySlot = slots.find(s => !s.item)
      if (!emptySlot) return

      // Проверяем, нет ли уже такого компонента в другом слоте
      const existingSameType = slots.some(s => {
        if (!s.item) return false;
        // Определяем тип уже существующего компонента по его компоненту Vue
        return (s.item.component === SourceComponent && type === 'source') ||
            (s.item.component === ThermistorComponent && ['therm-met', 'therm-sem'].includes(type)) ||
            (s.item.component === AmmeterComponent && type === 'amm');
      });

      if (existingSameType) {
        showErrorPopup('Такой компонент уже добавлен в схему!')
        return;
      }

      // Проверяем, в какой слот добавляем (по индексу)
      const slotIndex = slots.indexOf(emptySlot)

      // Проверка для каждого слота
      if (slotIndex === 0 && type !== 'source') {
        showErrorPopup('В этот слот можно добавить только источник напряжения')
        return
      }

      if (slotIndex === 1 && !['therm-met', 'therm-sem'].includes(type)) {
        showErrorPopup('В этот слот можно добавить только терморезистор (металлический или полупроводниковый)')
        return
      }

      if (slotIndex === 2 && type !== 'amm') {
        showErrorPopup('В этот слот можно добавить только амперметр')
        return
      }

      // Создаем данные компонента
      const data: any = {...meta}
      if (type === 'source') data.voltage = supplyVoltage.value

      emptySlot.item = {component, data}
    }

    function removeFromSlot(idx: number) {
      const slot = slots[idx]
      if (slot) {
        slot.item = null
      }
    }

    function resetBoard() {
      slots.forEach(s => s.item = null);
      snapshots.value = []
    }

    function handleWheelScroll(event: WheelEvent) {
      const delta = Math.sign(event.deltaY) * -1 // Инвертируем, чтобы прокрутка вверх увеличивала значение
      const step = 1 // Шаг изменения температуры

      let newTemp = globalTemp.value + (delta * step)

      // Ограничиваем значение в диапазоне 290-380
      if (newTemp < 290) newTemp = 290
      if (newTemp > 380) newTemp = 380

      globalTemp.value = newTemp

      // Предотвращаем прокрутку страницы
      event.preventDefault()
    }

    function slotStyle(s: Slot): Record<string, string> {
      return {
        position: 'absolute',
        left: s.x + 'px',
        top: s.y + 'px',
        width: s.w + 'px',
        height: s.h + 'px',
        borderRadius: '6px',
        padding: '6px'
      }
    }

    function saveSnapshot() {
      const source = slots[0]?.item
      const sample = slots[1]?.item
      const ammeter = slots[2]?.item
      if (!source || !sample) {
        showErrorPopup("Схема собрана не полностью!")
        return;
      }

      const V = source?.data?.voltage ?? supplyVoltage.value
      const T = globalTemp.value
      let Rsample = NaN

      if (sample) {
        const kind = sample.data.kind || 'semiconductor'
        if (kind === 'metal') {
          const R0 = sample.data.R0 ?? 100
          const alpha = sample.data.alpha ?? 0.0039
          Rsample = R0 * (1 + alpha * (T - 300))
        } else {
          const R0 = sample.data.R0 ?? 1000
          const B = sample.data.B ?? 3500
          const T0 = 300
          Rsample = R0 * Math.exp(B * (1 / T - 1 / T0))
        }
      }

      if (ammeter) {
        const I = (Rsample && !isNaN(Rsample) && Rsample > 0) ? V / Rsample : 0
        snapshots.value.push({
          time: new Date().toISOString(),
          V: V.toFixed(3),
          I: I.toFixed(6),
          R: isNaN(Rsample) ? '—' : Rsample.toFixed(6),
          T
        });
      } else {
        snapshots.value.push({
          time: new Date().toISOString(),
          V: V.toFixed(3),
          R: isNaN(Rsample) ? '—' : Rsample.toFixed(6),
          T
        });
      }
    }

    function formatSnapshot(s: any) {
      return s.I
          ? `V=${s.V} В, I=${Number(s.I)} А, R=${Number(s.R).toFixed(2)} Ω, T=${s.T} K`
          : `V=${s.V} В, R=${Number(s.R).toFixed(2)} Ω, T=${s.T} K`
    }

    return {
      components,
      slots,
      onDragStart,
      onDrop,
      globalTemp,
      supplyVoltage,
      saveSnapshot,
      snapshots,
      resetBoard,
      removeFromSlot,
      slotStyle,
      formatSnapshot,
      handleWheelScroll,
      showError,
      errorMessage,
      showErrorPopup
    }
  }
})
</script>