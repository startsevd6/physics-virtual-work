<template>
  <div v-if="visible">
    <div class="background" @click="closePopup"></div>

    <div class="container">
      <div class="error-header">
        <span>Ошибка</span>
        <button class="close-btn" @click="closePopup">×</button>
      </div>
      <div class="error-content">
        <p>{{ message }}</p>
      </div>
      <div class="error-footer">
        <button @click="closePopup">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits, watch, onUnmounted } from 'vue';

const props = defineProps<{
  message: string
}>();

const emit = defineEmits<{
  close: []
}>();

const visible = ref(true);

function closePopup() {
  visible.value = false;
  emit('close');
}

// Функция для обработки нажатия клавиш
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && visible.value) {
    closePopup();
  }
}

// Автоматически закрыть через 5 секунд
watch(visible, (newVal) => {
  if (newVal) {
    // Добавляем обработчик нажатия клавиш
    document.addEventListener('keydown', handleKeydown);

    // Устанавливаем таймер для автоматического закрытия
    const timer = setTimeout(() => {
      if (visible.value) {
        closePopup();
      }
    }, 5000);

    // Функция для очистки
    return () => {
      clearTimeout(timer);
    };
  } else {
    // Удаляем обработчик нажатия клавиш
    document.removeEventListener('keydown', handleKeydown);
  }
}, { immediate: true });

// Убедимся, что обработчик удаляется при размонтировании компонента
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 9998;
}

.container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 400px;
  max-width: 90vw;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  z-index: 9999;
  overflow: hidden;
}

.error-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background-color: #f44336;
  color: white;
  font-weight: bold;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.close-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.error-content {
  padding: 24px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.error-content p {
  margin: 0;
  font-size: 16px;
  line-height: 1.5;
  color: #333;
}

.error-footer {
  padding: 16px 20px;
  text-align: right;
}

.error-footer button {
  padding: 8px 24px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.error-footer button:hover {
  background-color: #d32f2f;
}
</style>