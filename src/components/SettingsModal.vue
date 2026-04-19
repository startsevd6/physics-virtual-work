<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="closeModal">
        <div class="modal-container">
          <div class="modal-header">
            <h3 class="modal-title">
              Настройки
            </h3>
            <button class="modal-close" @click="closeModal" aria-label="Закрыть">
              <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6L18 18" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <!-- Графика -->
            <div class="settings-section">
              <div class="section-header">
                <h4>Графика</h4>
              </div>
              <div class="setting-item">
                <div class="setting-row">
                  <label class="setting-label">
                    <span>Тени</span>
                  </label>
                  <div class="toggle-switch" :class="{ active: localSettings.shadowsEnabled }" @click="toggleShadows">
                    <div class="toggle-slider"></div>
                  </div>
                </div>
                <p class="hint warning">
                  <span>⚠️</span> Изменение вступит в силу после перезагрузки страницы.
                </p>
                <div v-if="localSettings.shadowsEnabled" class="setting-subitem">
                  <label for="shadowMapSize" class="sub-label">Размер карты теней</label>
                  <select id="shadowMapSize" v-model.number="localSettings.shadowMapSize" class="modern-select">
                    <option :value="1024">1024 - Низкое</option>
                    <option :value="2048">2048 - Среднее</option>
                    <option :value="4096">4096 - Высокое</option>
                  </select>
                  <div class="hint">Влияет на чёткость теней и производительность.</div>
                </div>
              </div>

              <div class="setting-item">
                <label class="setting-label">
                  <span>Яркость окружения</span>
                </label>
                <div class="slider-container">
                  <input
                      type="range"
                      min="0.2"
                      max="1.0"
                      step="0.05"
                      v-model.number="localSettings.ambientIntensity"
                      class="modern-slider"
                  />
                  <span class="slider-value">{{ localSettings.ambientIntensity.toFixed(2) }}</span>
                </div>
              </div>

              <div class="setting-item">
                <label class="setting-label">
                  <span>Направленный свет</span>
                </label>
                <div class="slider-container">
                  <input
                      type="range"
                      min="0.2"
                      max="2.0"
                      step="0.1"
                      v-model.number="localSettings.dirLightIntensity"
                      class="modern-slider"
                  />
                  <span class="slider-value">{{ localSettings.dirLightIntensity.toFixed(2) }}</span>
                </div>
              </div>
            </div>

            <!-- Производительность -->
            <div class="settings-section">
              <div class="section-header">
                <h4>Производительность</h4>
              </div>
              <div class="setting-item">
                <div class="setting-row">
                  <label class="setting-label">
                    <span>Сглаживание (MSAA)</span>
                  </label>
                  <div class="toggle-switch" :class="{ active: localSettings.antialiasEnabled }" @click="toggleAntialias">
                    <div class="toggle-slider"></div>
                  </div>
                </div>
                <p class="hint warning">
                  <span>⚠️</span> Изменение вступит в силу после перезагрузки страницы.
                </p>
              </div>

              <div class="setting-item">
                <label class="setting-label">
                  <span>Pixel Ratio</span>
                </label>
                <div class="slider-container">
                  <input
                      type="range"
                      min="1"
                      max="2"
                      step="0.5"
                      v-model.number="localSettings.pixelRatio"
                      class="modern-slider"
                  />
                  <span class="slider-value">{{ localSettings.pixelRatio.toFixed(1) }}x</span>
                </div>
                <p class="hint">Выше = чётче, но больше нагрузка на GPU.</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="resetToDefaults">
              <span>↺</span> По умолчанию
            </button>
            <button class="btn-primary" @click="applyAndReloadIfNeeded">
              <span>✓</span> {{ requiresReload ? 'Применить и перезагрузить' : 'Применить' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, watch, ref } from 'vue';

export interface Settings {
  shadowsEnabled: boolean;
  shadowMapSize: 1024 | 2048 | 4096;
  antialiasEnabled: boolean;
  ambientIntensity: number;
  dirLightIntensity: number;
  pixelRatio: number;
}

const props = defineProps<{
  modelValue: boolean;
  settings: Settings;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'apply', settings: Settings): void;
}>();

const localSettings = reactive({ ...props.settings });
// Флаг, что требуется перезагрузка из-за изменения antialias
const requiresReload = ref(false);
// Запоминаем исходное значение antialias и ShadowMapSize при открытии
let originalAntialias: boolean;
let originalShadowMapSize: 1024 | 2048 | 4096;

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    originalAntialias = props.settings.antialiasEnabled;
    originalShadowMapSize = props.settings.shadowMapSize;
    requiresReload.value = false;
  }
});

// Отслеживаем изменения параметров, требующих перезагрузки
watch([() => localSettings.antialiasEnabled, () => localSettings.shadowMapSize], ([newAA, newSM]) => {
  requiresReload.value = (newAA !== originalAntialias) || (newSM !== originalShadowMapSize);
});

watch(() => props.settings, (newVal) => {
  Object.assign(localSettings, newVal);
}, { deep: true });

function closeModal() {
  emit('update:modelValue', false);
}

function applyAndReloadIfNeeded() {
  emit('apply', { ...localSettings });
  if (requiresReload.value) {
    window.location.reload();
  } else {
    closeModal();
  }
}

function toggleShadows() {
  localSettings.shadowsEnabled = !localSettings.shadowsEnabled;
}

function toggleAntialias() {
  localSettings.antialiasEnabled = !localSettings.antialiasEnabled;
}

function resetToDefaults() {
  Object.assign(localSettings, {
    shadowsEnabled: true,
    shadowMapSize: 2048,
    antialiasEnabled: true,
    ambientIntensity: 0.6,
    dirLightIntensity: 0.8,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
  });
}
</script>

<style scoped>
/* Modal overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20000;
  padding: 20px;
}

.modal-container {
  background: #ffffff;
  border-radius: 28px;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.25), 0 10px 30px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 520px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px 16px;
  border-bottom: 1px solid #f1f5f9;
  background: white;
}

.modal-title {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.modal-close {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  width: 40px;
  height: 40px;
  border-radius: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
  padding: 0;
}

.modal-close:hover {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #cbd5e1;
  transform: scale(1.05);
}

/* Body */
.modal-body {
  padding: 24px 28px;
  overflow-y: auto;
  flex: 1;
  background: #fafcff;
}

.settings-section {
  margin-bottom: 32px;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.section-header h4 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #1e293b;
}

/* Setting items */
.setting-item {
  margin-bottom: 24px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
  color: #334155;
  font-size: 1rem;
}

.setting-subitem {
  margin-left: 34px;
  margin-top: 12px;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #eef2f6;
}

.sub-label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #475569;
}

/* Toggle switch */
.toggle-switch {
  width: 52px;
  height: 28px;
  background: #cbd5e1;
  border-radius: 28px;
  padding: 2px;
  cursor: pointer;
  transition: background 0.25s ease;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
}

.toggle-switch.active {
  background: #4f46e5;
}

.toggle-slider {
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  transition: transform 0.25s cubic-bezier(0.2, 0.9, 0.4, 1);
}

.toggle-switch.active .toggle-slider {
  transform: translateX(24px);
}

/* Sliders */
.slider-container {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: 34px;
  margin-top: 6px;
}

.modern-slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #e2e8f0;
  -webkit-appearance: none;
  appearance: none;
}

.modern-slider::-webkit-slider-thumb {
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

.modern-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.modern-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  border: 2px solid #4f46e5;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
  cursor: grab;
}

.slider-value {
  min-width: 45px;
  text-align: right;
  font-weight: 600;
  color: #1e293b;
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 20px;
  font-size: 0.9rem;
}

/* Select */
.modern-select {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: white;
  font-size: 0.95rem;
  color: #1e293b;
  cursor: pointer;
  transition: border 0.2s, box-shadow 0.2s;
  margin-top: 4px;
}

.modern-select:hover {
  border-color: #a5b4cb;
}

.modern-select:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

/* Hints */
.hint {
  font-size: 0.8rem;
  color: #64748b;
  margin: 8px 0 0 34px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.hint.warning {
  color: #b45309;
  background: #fffbeb;
  padding: 8px 12px;
  border-radius: 10px;
  margin-left: 34px;
  border-left: 3px solid #f59e0b;
}

/* Footer */
.modal-footer {
  padding: 16px 28px 24px;
  border-top: 1px solid #edf2f7;
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
}

.btn-primary, .btn-secondary {
  padding: 12px 24px;
  border-radius: 40px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: #4f46e5;
  color: white;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
}

.btn-primary:hover {
  background: #4338ca;
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(79, 70, 229, 0.3);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.2);
}

.btn-secondary {
  background: #f1f5f9;
  color: #1e293b;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover {
  background: #e2e8f0;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.05);
}

.btn-secondary:active {
  transform: translateY(0);
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}
.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.25s cubic-bezier(0.2, 0.9, 0.4, 1), opacity 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.92);
  opacity: 0;
}

@media (max-width: 460px) {
  .modal-footer {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>