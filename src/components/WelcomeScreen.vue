<template>
  <Transition name="fade">
    <div v-if="visible" class="welcome-overlay">
      <div class="welcome-container">
        <!-- Логотип НГТУ НЭТИ -->
        <div class="logo">
        </div>

        <h1 class="title">Исследование свойств терморезистора</h1>

        <div class="info-row">
          <div class="info-left">
            <p><strong>Факультет:</strong> &nbsp;&nbsp;&nbsp;ПМИ</p>
            <p><strong>Выполнили:</strong> ПМИ-42:<br>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Старцев Дмитрий,<br>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Пирожков Никита,<br>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Аширов Дамир,<br>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Феофанов Александр</p>
          </div>
          <div class="info-right">
            <p><strong>Руководитель:</strong> к.ф-м.н. Баранов А.В.</p>
          </div>
        </div>

        <div class="footer">Новосибирск 2026</div>

        <!-- Индикатор загрузки моделей -->
        <div class="loading-section">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
          </div>
          <div class="progress-text">Загрузка 3D-моделей: {{ progressPercent }}%</div>
        </div>

        <!-- Кнопка закрытия (активна только после полной загрузки) -->
        <button
            class="close-button"
            :disabled="!allLoaded"
            @click="handleClose"
        >
          {{ allLoaded ? 'Перейти к лаборатории' : 'Загрузка...' }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  visible: boolean;        // показывать ли экран
  loadedCount: number;
  totalCount: number;
  allLoaded: boolean;      // все ли модели загружены
}>();

const emit = defineEmits<{
  close: [];
}>();

const progressPercent = computed(() => {
  if (props.totalCount === 0) return 0;
  return Math.round((props.loadedCount / props.totalCount) * 100);
});

function handleClose() {
  if (props.allLoaded) {
    emit('close');
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.welcome-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f0f4fa 0%, #d9e2ef 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.welcome-container {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 40px;
  padding: 40px 60px;
  max-width: 1000px;
  width: 90%;
  text-align: center;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.logo {
  margin-bottom: 75px;
  display: flex;
  justify-content: center;
  min-height: 100px;
  background-image: url('/nstu_logo.png');
  background-size: contain; /* Растянуть, чтобы заполнить весь div */
  background-position: center; /* Центрировать картинку */
  background-repeat: no-repeat; /* Не повторять */
}

.title {
  font-size: 2.2rem;
  font-weight: 700;
  color: #0f2b4d;
  margin-bottom: 40px;
  letter-spacing: -0.01em;
  border-bottom: 2px solid #4f46e5;
  display: inline-block;
  padding-bottom: 10px;
}

.info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
  justify-content: space-between;
  text-align: left;
  margin-bottom: 40px;
  background: #f8fafc;
  padding: 25px;
  border-radius: 28px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
}

.info-left, .info-right {
  flex: 1;
  min-width: 200px;
}

.info-left p, .info-right p {
  margin: 8px 0;
  font-size: 1rem;
  color: #1e293b;
  line-height: 1.4;
}

.info-left strong, .info-right strong {
  color: #4f46e5;
}

.footer {
  font-size: 1.1rem;
  font-weight: 500;
  color: #475569;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
}

.loading-section {
  margin-top: 30px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4f46e5, #7c3aed);
  width: 0;
  border-radius: 10px;
  transition: width 0.2s ease;
}

.progress-text {
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 500;
}

.close-button {
  margin-top: 30px;
  padding: 12px 32px;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 40px;
  background: #4f46e5;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.close-button:hover:not(:disabled) {
  background: #4338ca;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(79, 70, 229, 0.4);
}

.close-button:active:not(:disabled) {
  transform: translateY(0);
}

.close-button:disabled {
  background: #a5b4fc;
  cursor: not-allowed;
  opacity: 0.7;
}

@media (max-width: 600px) {
  .welcome-container {
    padding: 30px 20px;
  }
  .title {
    font-size: 1.6rem;
  }
  .info-row {
    flex-direction: column;
    gap: 20px;
  }
}
</style>