<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="closeModal">
        <div class="modal-container">
          <div class="modal-header">
            <h3 class="modal-title">
              Сохранённые показания
            </h3>
            <button class="modal-close" @click="closeModal" aria-label="Закрыть">
              <svg width="24" height="24" viewBox="0 0 24 24"  xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <SnapshotsTable
                :snapshots="snapshots"
                :getThermistorTypeLabel="getThermistorTypeLabel"
                @delete="handleDelete"
            />
          </div>
          <div class="modal-footer">
            <button class="btn-close" @click="closeModal">Закрыть</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import SnapshotsTable from './SnapshotsTable.vue';
import type { Snapshot } from './SnapshotsTable.vue';

defineProps<{
  modelValue: boolean;
  snapshots: Snapshot[];
  getThermistorTypeLabel: (type: string) => string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'delete', index: number): void;
}>();

function closeModal() {
  emit('update:modelValue', false);
}

function handleDelete(index: number) {
  emit('delete', index);
}
</script>

<style scoped>
.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
  opacity: 0;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20000;
  padding: 20px;
}

.modal-container {
  background: white;
  border-radius: 24px;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.2), 0 10px 30px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 1000px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 28px;
  border-bottom: 1px solid #edf2f7;
  background: #ffffff;
}

.modal-title {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-close {
  background: transparent;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
}

.modal-close:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.modal-body {
  padding: 24px 28px;
  overflow-y: auto;
  flex: 1;
  background: #fafcff;
}

.modal-footer {
  padding: 16px 28px;
  border-top: 1px solid #edf2f7;
  display: flex;
  justify-content: flex-end;
  background: #ffffff;
}

.btn-close {
  background: #4f46e5;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 40px;
  font-weight: 500;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 6px rgba(79, 70, 229, 0.15);
}

.btn-close:hover {
  background: #4338ca;
  transform: translateY(-1px);
  box-shadow: 0 8px 12px rgba(79, 70, 229, 0.2);
}

.btn-close:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(79, 70, 229, 0.1);
}

svg {
  fill: none;
}
</style>