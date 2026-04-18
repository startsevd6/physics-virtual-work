<template>
  <div class="measurements-section">
    <h4>Компоненты схемы</h4>
    <div class="current-components">
      <!-- Температурный регулятор -->
      <div class="slot-info">
        <strong>Температура</strong>
        <div class="component-params">
          <div class="param-row">
            <label>Температура:</label>
            <div class="param-controls">
              <input
                  type="range"
                  min="290"
                  max="390"
                  step="1"
                  :value="globalTemp"
                  class="slider"
                  :disabled="!circuitValid || !thermistorEnabled"
                  @input="$emit('update:globalTemp', +($event.target as HTMLInputElement).value)"
                  @wheel.prevent="$emit('temperature-wheel', $event)"
              />
              <input
                  type="number"
                  min="290"
                  max="390"
                  step="1"
                  :value="globalTemp"
                  class="input"
                  :disabled="!circuitValid || !thermistorEnabled"
                  @input="$emit('update:globalTemp', +($event.target as HTMLInputElement).value)"
              />
              <span class="param-unit">K</span>
            </div>
          </div>
        </div>
      </div>
      <!-- Источник напряжения -->
      <div class="slot-info">
        <strong>Источник напряжения</strong>
        <div class="component-params">
          <div class="param-row">
            <label class="label-voltage">Напряжение:</label>
            <div class="param-controls">
              <input
                  type="range"
                  min="0"
                  max="15"
                  step="0.1"
                  :value="voltage"
                  class="slider"
                  :disabled="!circuitValid || !sourceEnabled"
                  @input="$emit('update:voltage', +($event.target as HTMLInputElement).value)"
                  @wheel.prevent="$emit('voltage-wheel', $event)"
              />
              <input
                  type="number"
                  min="0"
                  max="15"
                  step="0.1"
                  :value="voltage"
                  class="input"
                  :disabled="!circuitValid || !sourceEnabled"
                  @input="$emit('update:voltage', +($event.target as HTMLInputElement).value)"
              />
              <span class="param-unit">В</span>
            </div>
          </div>
        </div>
      </div>
      <!-- Амперметр -->
      <div class="slot-info">
        <strong>Амперметр</strong>
        <div class="component-params">
          <div class="param-info">
            <div v-if="circuitValid && ammeterEnabled && currentI !== null">
              Текущий ток: {{ currentI.toFixed(4) }} А
            </div>
            <div v-else>
              Прибор выключен
            </div>
          </div>
        </div>
      </div>

      <div style="margin-top:8px;display:flex;flex-direction:column;gap:8px;align-items:stretch">
        <button
            @click="$emit('save-snapshot')"
            :disabled="!circuitValid || !sourceEnabled || !thermistorEnabled || !ammeterEnabled"
            class="save-button"
        >Сохранить показания
        </button>

        <button @click="$emit('open-snapshots-modal')" style="background: #3b82f6;">Сохранённые показания</button>

        <div style="display: flex; gap: 8px;">
          <button @click="$emit('reset-values')" style="flex: 1;">Сброс</button>
          <button @click="$emit('delete-all-wires')" style="flex: 1; background: #ef4444;">Удалить провода</button>
        </div>

        <button @click="$emit('check-circuit')">Проверить схему</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  globalTemp: number;
  voltage: number;
  currentI: number | null;
  circuitValid: boolean;
  sourceEnabled: boolean;
  ammeterEnabled: boolean;
  thermistorEnabled: boolean;
}>();

defineEmits<{
  (e: 'update:globalTemp', value: number): void;
  (e: 'update:voltage', value: number): void;
  (e: 'temperature-wheel', event: WheelEvent): void;
  (e: 'voltage-wheel', event: WheelEvent): void;
  (e: 'save-snapshot'): void;
  (e: 'reset-values'): void;
  (e: 'delete-all-wires'): void;
  (e: 'check-circuit'): void;
  (e: 'open-snapshots-modal'): void;
}>();
</script>

<style scoped>
.measurements-section {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
}

.current-components {
  display: grid;
  gap: 16px;
  margin-top: 12px;
}

.slot-info {
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.component-params {
  margin: 12px 0;
  padding: 12px;
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.param-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.param-row label {
  font-weight: 500;
  color: #4b5563;
  font-size: 14px;
}

.param-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.slider {
  flex: 1;
  max-height: 6px;
  border-radius: 3px;
  background: #e5e7eb;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.slider:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #4f46e5;
  cursor: pointer;
}

.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #4f46e5;
  cursor: pointer;
  border: none;
}

.input {
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
  appearance: textfield;
}

.input:disabled {
  background-color: #f0f0f0;
  color: #999;
  cursor: not-allowed;
}

.input::-webkit-inner-spin-button,
.input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}

.param-unit {
  font-size: 14px;
  color: #6b7280;
  min-width: 20px;
}

.param-info {
  margin-top: 12px;
  padding: 8px;
  background: #f0f9ff;
  border-radius: 4px;
  font-size: 13px;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.param-info div {
  margin-bottom: 4px;
}

.param-info div:last-child {
  margin-bottom: 0;
}

button {
  padding: 8px 16px;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

button:not(.save-button) {
  background: #4f46e5;
}

button:not(.save-button):hover {
  background: #4338ca;
  transform: translateY(-1px);
}

button:not(.save-button):active {
  transform: translateY(0);
}

button.save-button {
  background: #4f46e5;
  opacity: 0.6;
  cursor: not-allowed;
}

button.save-button:enabled {
  background: #10b981;
  opacity: 1;
  cursor: pointer;
}

button.save-button:enabled:hover {
  background: #0da271;
  transform: translateY(-1px);
}

button.save-button:enabled:active {
  transform: translateY(0);
}

@media (max-width: 700px) {
  .measurements-section {
    display: none;
  }
}
</style>