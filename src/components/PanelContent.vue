<template>
  <div class="current-components">
    <!-- Карточка температуры -->
    <div class="component-card temperature-card">
      <div class="card-header">
        <div class="card-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="8"/>
            <path d="M12 4v8l3 3"/>
          </svg>
        </div>
        <div class="card-title">
          <strong>Температура</strong>
          <span class="card-badge" :class="{ active: circuitValid && thermistorEnabled }">
            {{ circuitValid && thermistorEnabled ? 'Активен' : 'Выключен' }}
          </span>
        </div>
      </div>
      <div class="card-body">
        <div class="param-row">
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
            <div class="number-input-wrapper">
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
    </div>

    <!-- Карточка источника напряжения -->
    <div class="component-card voltage-card">
      <div class="card-header">
        <div class="card-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
        <div class="card-title">
          <strong>Источник напряжения</strong>
          <span class="card-badge" :class="{ active: circuitValid && sourceEnabled }">
            {{ circuitValid && sourceEnabled ? 'Активен' : 'Выключен' }}
          </span>
        </div>
      </div>
      <div class="card-body">
        <div class="param-row">
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
            <div class="number-input-wrapper">
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
    </div>

    <!-- Карточка амперметра -->
    <div class="component-card ammeter-card">
      <div class="card-header">
        <div class="card-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v8M8 12h8"/>
          </svg>
        </div>
        <div class="card-title">
          <strong>Амперметр</strong>
          <span class="card-badge" :class="{ active: circuitValid && ammeterEnabled }">
            {{ circuitValid && ammeterEnabled ? 'Активен' : 'Выключен' }}
          </span>
        </div>
      </div>
      <div class="card-body">
        <div class="current-display">
          <div v-if="circuitValid && ammeterEnabled && currentI !== null" class="current-value">
            <span class="current-number">{{ currentI.toFixed(4) }}</span>
            <span class="current-unit">А</span>
          </div>
          <div v-else class="current-placeholder">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v8M8 12h8"/>
            </svg>
            Прибор выключен
          </div>
        </div>
      </div>
    </div>

    <!-- Кнопки управления -->
    <div class="action-buttons">
      <button
          @click="$emit('save-snapshot')"
          :disabled="!circuitValid || !sourceEnabled || !thermistorEnabled || !ammeterEnabled"
          class="action-btn primary-btn"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
        Сохранить показания
      </button>

      <button @click="$emit('open-snapshots-modal')" class="action-btn secondary-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          <line x1="12" y1="11" x2="12" y2="17" />
          <line x1="9" y1="14" x2="15" y2="14" />
        </svg>
        Сохранённые показания
      </button>

      <div class="button-group">
        <button @click="$emit('reset-values')" class="action-btn outline-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          Сброс
        </button>
        <button @click="$emit('delete-all-wires')" class="action-btn danger-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Удалить провода
        </button>
      </div>

      <button @click="$emit('check-circuit')" class="action-btn success-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        Проверить схему
      </button>

      <button @click="$emit('open-settings')" class="action-btn settings-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        Настройки
      </button>
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
  (e: 'open-settings'): void;
}>();
</script>

<style scoped>
.current-components {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Карточки компонентов */
.component-card {
  background: white;
  border-radius: 16px;
  border: 1px solid #eef2f6;
  overflow: hidden;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.component-card:hover {
  border-color: #d9e2ef;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.04);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  background: #fafcff;
  border-bottom: 1px solid #f1f5f9;
}

.card-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.temperature-card .card-icon {
  background: linear-gradient(135deg, #f97316, #ea580c);
}
.voltage-card .card-icon {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}
.ammeter-card .card-icon {
  background: linear-gradient(135deg, #10b981, #059669);
}

.card-title {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title strong {
  font-size: 1rem;
  color: #1e293b;
  font-weight: 600;
}

.card-badge {
  font-size: 0.7rem;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 20px;
  background: #f1f5f9;
  color: #64748b;
}

.card-badge.active {
  background: #e0f2fe;
  color: #0369a1;
}

.card-body {
  padding: 18px;
}

.param-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.param-row label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.param-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #e2e8f0;
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
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  border: 2px solid #4f46e5;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
  cursor: grab;
  transition: transform 0.1s;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  border: 2px solid #4f46e5;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
  cursor: grab;
}

.number-input-wrapper {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 4px 8px;
}

.input {
  width: 70px;
  padding: 8px 4px;
  border: none;
  background: transparent;
  font-size: 0.95rem;
  font-weight: 500;
  color: #0f172a;
  text-align: right;
  -moz-appearance: textfield;
}

.input:disabled {
  color: #94a3b8;
}

.input::-webkit-inner-spin-button,
.input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.param-unit {
  font-size: 0.9rem;
  font-weight: 500;
  color: #64748b;
  margin-left: 4px;
}

.temp-range-indicator {
  margin-top: 16px;
}

.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: #94a3b8;
  margin-bottom: 6px;
}

.range-bar {
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.range-fill {
  height: 100%;
  background: linear-gradient(90deg, #f97316, #ea580c);
  border-radius: 3px;
  transition: width 0.2s;
}

.current-display {
  background: #f8fafc;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  border: 1px dashed #cbd5e1;
}

.current-value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
}

.current-number {
  font-size: 2.5rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1;
}

.current-unit {
  font-size: 1rem;
  font-weight: 500;
  color: #64748b;
}

.current-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #94a3b8;
  font-size: 0.9rem;
}

.measurement-hint {
  margin-top: 10px;
  text-align: center;
  font-size: 0.75rem;
  color: #64748b;
  font-family: monospace;
}

/* Кнопки действий */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 18px;
  border-radius: 12px;
  font-weight: 500;
  font-size: 0.95rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
  border: 1px solid #e2e8f0;
  color: #1e293b;
}

.action-btn svg {
  stroke-width: 2;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f1f5f9;
}

.primary-btn {
  background: #4f46e5;
  border-color: #4f46e5;
  color: white;
}

.primary-btn:not(:disabled):hover {
  background: #4338ca;
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(79, 70, 229, 0.2);
}

.secondary-btn {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.secondary-btn:not(:disabled):hover {
  background: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(59, 130, 246, 0.2);
}

.success-btn {
  background: #10b981;
  border-color: #10b981;
  color: white;
}

.success-btn:not(:disabled):hover {
  background: #059669;
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(16, 185, 129, 0.2);
}

.button-group {
  display: flex;
  gap: 10px;
}

.outline-btn {
  flex: 1;
  background: white;
  border-color: #cbd5e1;
}

.outline-btn:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.danger-btn {
  flex: 1;
  background: white;
  border-color: #fecaca;
  color: #dc2626;
}

.danger-btn:hover {
  background: #fef2f2;
  border-color: #fca5a5;
}

.settings-btn {
  background: #64748b;
  border-color: #64748b;
  color: white;
}

.settings-btn:hover {
  background: #475569;
}

@media (max-width: 700px) {
  .current-components {
    gap: 16px;
  }
  .card-header {
    padding: 14px 16px;
  }
  .card-body {
    padding: 16px;
  }
}
</style>