<template>
  <div class="snapshots-table-wrapper">
    <table class="snapshots-table">
      <thead>
      <tr>
        <th>Напряжение (В)</th>
        <th>Ток (А)</th>
        <th>Сопротивление (Ом)</th>
        <th>Температура (K)</th>
        <th>Тип терморезистора</th>
        <th>Действия</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="(s, i) in snapshots" :key="i">
        <td>{{ s.V }}</td>
        <td>{{ s.I || '—' }}</td>
        <td>{{ s.R || '—' }}</td>
        <td>{{ s.T }}</td>
        <td>{{ getThermistorTypeLabel(s.thermistorType) }}</td>
        <td>
          <button class="delete-btn" @click="$emit('delete', i)" title="Удалить запись">×</button>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';

export interface Snapshot {
  V: string;
  I?: string;
  R?: string;
  T: number;
  thermistorType: string;
}

export default defineComponent({
  name: 'SnapshotsTable',
  props: {
    snapshots: {
      type: Array as PropType<Snapshot[]>,
      required: true,
    },
    getThermistorTypeLabel: {
      type: Function as PropType<(type: string) => string>,
      required: true,
    },
  },
  emits: ['delete'],
});
</script>

<style scoped>
.snapshots-table-wrapper {
  max-height: 60vh;
  overflow-y: auto;
  border-radius: 12px;
  background: white;
}

.snapshots-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.snapshots-table th,
.snapshots-table td {
  padding: 14px 18px;
  text-align: left;
  color: #1e293b;
  border-bottom: 1px solid #eef2f6;
}

.snapshots-table th {
  background: #f8fafd;
  font-weight: 600;
  color: #1e293b;
  position: sticky;
  top: 0;
  z-index: 1;
  box-shadow: 0 1px 0 #e2e8f0;
}

.snapshots-table tbody tr {
  transition: background 0.15s;
}

.snapshots-table tbody tr:hover {
  background: #f9fbfd;
}

.delete-btn {
  color: #dc2626;
  border: none;
  font-size: 20px;
  font-weight: 300;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 20px;
  background: transparent;
  transition: all 0.2s;
  line-height: 1;
}

.delete-btn:hover {
  background: #fee2e2;
  color: #b91c1c;
  transform: scale(1.1);
}

.delete-btn:active {
  background: #fecaca;
  transform: scale(0.95);
}
</style>