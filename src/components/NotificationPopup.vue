<template>
  <Transition name="popup-fade">
    <div v-if="visible" class="popup-overlay" @click="closePopup">
      <div class="popup-container" :class="popupClass" @click.stop>
        <div class="popup-icon">
          <svg v-if="type === 'success'" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else viewBox="0 0 24 24"  xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="popup-content">
          <h3 class="popup-title">{{ titleText }}</h3>
          <p class="popup-message">{{ message }}</p>
        </div>
        <button class="popup-close-btn" @click="closePopup" aria-label="Закрыть">×</button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';

const props = defineProps<{
  message: string;
  type?: 'error' | 'success';
}>();

const emit = defineEmits<{
  close: []
}>();

const visible = ref(true);

const popupClass = computed(() => props.type === 'success' ? 'popup-success' : 'popup-error');
const titleText = computed(() => props.type === 'success' ? 'Готово' : 'Ошибка');

function closePopup() {
  visible.value = false;
  emit('close');
}

// Закрытие по Escape
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && visible.value) {
    closePopup();
  }
}

// Автозакрытие через 15 секунд (только для success)
watch(visible, (newVal) => {
  if (newVal) {
    document.addEventListener('keydown', handleKeydown);
    if (props.type === 'success') {
      const timer = setTimeout(() => {
        if (visible.value) closePopup();
      }, 15000);
      return () => clearTimeout(timer);
    }
  } else {
    document.removeEventListener('keydown', handleKeydown);
  }
}, { immediate: true });

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.popup-fade-enter-active,
.popup-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.popup-fade-enter-from,
.popup-fade-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.popup-container {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  max-width: 450px;
  width: 90%;
  padding: 24px 32px 24px 24px;
  border-radius: 24px;
  background: white;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2), 0 8px 16px rgba(0, 0, 0, 0.1);
  position: relative;
  transition: box-shadow 0.2s;
}

.popup-success {
  background: linear-gradient(145deg, #f0fff4, #e6ffe6);
  border-left: 6px solid #2ecc71;
}
.popup-error {
  background: linear-gradient(145deg, #fff5f5, #ffeaea);
  border-left: 6px solid #e74c3c;
}

.popup-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.popup-success .popup-icon {
  color: #2ecc71;
  background: rgba(46, 204, 113, 0.15);
}
.popup-error .popup-icon {
  color: #e74c3c;
  background: rgba(231, 76, 60, 0.15);
}

.popup-icon svg {
  width: 28px;
  height: 28px;
  stroke: currentColor;
}

.popup-content {
  flex: 1;
}

.popup-title {
  margin: 0 0 8px 0;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.3;
  color: #1a1a1a;
}

.popup-message {
  margin: 0;
  font-size: 16px;
  line-height: 1.5;
  color: #4a4a4a;
  word-break: break-word;
}

.popup-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: #999;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s, color 0.2s;
}

.popup-close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #333;
}
</style>