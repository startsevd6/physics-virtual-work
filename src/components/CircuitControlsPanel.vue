<template>
  <!-- Кнопка вызова меню (только на мобильных) -->
  <button
      class="mobile-menu-button"
      @click="openMobileMenu"
      aria-label="Открыть панель управления"
  >
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  </button>

  <!-- Мобильная панель (overlay) -->
  <Transition name="mobile-panel">
    <div
        v-if="isMobileMenuOpen"
        class="mobile-panel-overlay"
        @click.self="closeMobileMenu"
    >
      <div class="mobile-panel-container">
        <div class="mobile-panel-header">
          <h3 class="mobile-panel-title">
            <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M8 10h8M8 14h6" />
            </svg>
            Панель управления
          </h3>
          <button class="mobile-panel-close" @click="closeMobileMenu" aria-label="Закрыть">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="mobile-panel-content">
          <PanelContent
              v-bind="$props"
              @update:globalTemp="emit('update:globalTemp', $event)"
              @update:voltage="emit('update:voltage', $event)"
              @temperature-wheel="emit('temperature-wheel', $event)"
              @voltage-wheel="emit('voltage-wheel', $event)"
              @save-snapshot="emit('save-snapshot')"
              @reset-values="emit('reset-values')"
              @delete-all-wires="emit('delete-all-wires')"
              @check-circuit="emit('check-circuit')"
              @open-snapshots-modal="emit('open-snapshots-modal')"
          />
        </div>
      </div>
    </div>
  </Transition>

  <!-- Десктопная панель (исходная, улучшенный дизайн) -->
  <div class="measurements-section desktop-panel">
    <div class="panel-header">
      <h4 class="panel-title">
        <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M8 10h8M8 14h6" />
        </svg>
        Компоненты схемы
      </h4>
      <div class="circuit-status" :class="{ valid: circuitValid }">
        <span class="status-dot"></span>
        {{ circuitValid ? 'Схема собрана' : 'Схема не проверена' }}
      </div>
    </div>
    <PanelContent
        v-bind="$props"
        @update:globalTemp="emit('update:globalTemp', $event)"
        @update:voltage="emit('update:voltage', $event)"
        @temperature-wheel="emit('temperature-wheel', $event)"
        @voltage-wheel="emit('voltage-wheel', $event)"
        @save-snapshot="emit('save-snapshot')"
        @reset-values="emit('reset-values')"
        @delete-all-wires="emit('delete-all-wires')"
        @check-circuit="emit('check-circuit')"
        @open-snapshots-modal="emit('open-snapshots-modal')"
        @open-settings="emit('open-settings')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import PanelContent from './PanelContent.vue'; // выделим содержимое в отдельный компонент

defineProps<{
  globalTemp: number;
  voltage: number;
  currentI: number | null;
  circuitValid: boolean;
  sourceEnabled: boolean;
  ammeterEnabled: boolean;
  thermistorEnabled: boolean;
}>();

const emit = defineEmits<{
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

// Состояние мобильного меню
const isMobileMenuOpen = ref(false);

function openMobileMenu() {
  isMobileMenuOpen.value = true;
  document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false;
  document.body.style.overflow = '';
}

// Сброс блокировки прокрутки при размонтировании
watch(isMobileMenuOpen, (val) => {
  if (!val) {
    document.body.style.overflow = '';
  }
}, { flush: 'post' });
</script>

<style scoped>
/* Общие стили */
.measurements-section {
  min-width: 455px;
  background: #ffffff;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.02);
  overflow-y: auto;
  transition: box-shadow 0.2s;
  border: 1px solid rgba(226, 232, 240, 0.4);
  backdrop-filter: blur(2px);
}

.measurements-section:hover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eef2f6;
}

.panel-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 10px;
}

.panel-title svg {
  color: #4f46e5;
  stroke-width: 2.2;
  fill: none;
}

.circuit-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 40px;
  background: #f1f5f9;
  color: #475569;
}

.circuit-status.valid {
  background: #ecfdf5;
  color: #047857;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #94a3b8;
}

.circuit-status.valid .status-dot {
  background: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

/* Мобильная кнопка */
.mobile-menu-button {
  display: none;
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 60px;
  height: 60px;
  border-radius: 30px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
  box-shadow: 0 8px 20px rgba(79, 70, 229, 0.35);
  z-index: 1000;
  border: none;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: transform 0.2s, box-shadow 0.2s;
}

.mobile-menu-button:hover {
  transform: scale(1.05);
  box-shadow: 0 12px 28px rgba(79, 70, 229, 0.45);
}

.mobile-menu-button:active {
  transform: scale(0.98);
}

/* Мобильная панель */
.mobile-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.mobile-panel-container {
  position: relative;
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  background: white;
  border-radius: 28px;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.mobile-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #eef2f6;
  background: white;
}

.mobile-panel-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 10px;
}

.mobile-panel-title svg {
  color: #4f46e5;
  fill: none;
}

.mobile-panel-close {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
  padding: 0;
}

.mobile-panel-close:hover {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #cbd5e1;
}

.mobile-panel-content {
  padding: 20px 24px 24px;
  overflow-y: auto;
  background: #fafcff;
}

/* Анимации */
.mobile-panel-enter-active,
.mobile-panel-leave-active {
  transition: opacity 0.25s ease;
}
.mobile-panel-enter-active .mobile-panel-container,
.mobile-panel-leave-active .mobile-panel-container {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.mobile-panel-enter-from,
.mobile-panel-leave-to {
  opacity: 0;
}
.mobile-panel-enter-from .mobile-panel-container,
.mobile-panel-leave-to .mobile-panel-container {
  transform: scale(0.92);
  opacity: 0;
}

/* Медиа-запросы */
@media (max-width: 900px) {
  .desktop-panel {
    display: none;
  }
  .mobile-menu-button {
    display: flex;
  }
}
</style>