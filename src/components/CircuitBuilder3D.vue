<template>
  <div>
    <h2>Сборка схемы (3D)</h2>
    <div class="circuit-3d-container">
      <div class="components-panel">
        <h4>Компоненты</h4>
        <div class="component-list">
          <div
              v-for="c in components"
              :key="c.type"
              draggable="true"
              @dragstart="onDragStart($event, c)"
              class="component-item"
          >
            <strong>{{ c.label }}</strong>
            <div style="font-size:12px">{{ c.desc }}</div>
          </div>

          <div class="temperature-control">
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

      <div class="scene-container">
        <div
            id="scene3d"
            ref="sceneContainer"
            @dragover.prevent
            @drop="onDrop"
            class="three-scene"
        ></div>
      </div>
    </div>

    <div class="measurements-section">
      <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
        <button @click="saveSnapshot">Сохранить показания</button>
        <button @click="resetScene">Сброс сцены</button>
      </div>

      <div style="margin-top:12px">
        <h4>Текущие компоненты в схеме</h4>
        <div class="current-components">
          <div v-for="(slot, idx) in slots" :key="idx" class="slot-info">
            <div class="slot-label">{{ slot.label }}</div>
            <div v-if="slot.component" class="slot-content">
              <!-- Источник напряжения -->
              <div v-if="slot.component.data.type === 'source'">
                <strong>Источник напряжения</strong>
                <div class="component-params">
                  <div class="param-row">
                    <label>Напряжение (В):</label>
                    <div class="param-controls">
                      <input
                          type="range"
                          min="0"
                          max="15"
                          step="0.1"
                          v-model.number="slot.component.data.voltage"
                          class="voltage-slider"
                      />
                      <input
                          type="number"
                          min="0"
                          max="15"
                          step="0.1"
                          v-model.number="slot.component.data.voltage"
                          class="voltage-input"
                      />
                      <span class="param-unit">В</span>
                    </div>
                  </div>
                  <div class="voltage-value">
                    Текущее значение: {{ slot.component.data.voltage || 0 }} В
                  </div>
                </div>
                <button @click="() => removeComponent3D(slot)">Удалить</button>
              </div>

              <!-- Терморезистор -->
              <div v-else-if="slot.component.data.type === 'therm-met' || slot.component.data.type === 'therm-sem'">
                <strong>{{ slot.component.data.kind === 'metal' ? 'Металлический' : 'Полупроводниковый' }} терморезистор</strong>
                <div class="component-params">
                  <div class="param-row">
                    <label>R0 (Ω):</label>
                    <div class="param-controls">
                      <input
                          type="number"
                          min="1"
                          max="10000"
                          step="1"
                          v-model.number="slot.component.data.R0"
                          class="param-input"
                      />
                      <span class="param-unit">Ω</span>
                    </div>
                  </div>

                  <div v-if="slot.component.data.kind === 'metal'">
                    <div class="param-row">
                      <label>α (1/K):</label>
                      <div class="param-controls">
                        <input
                            type="number"
                            min="0.001"
                            max="0.01"
                            step="0.0001"
                            v-model.number="slot.component.data.alpha"
                            class="param-input"
                        />
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <div class="param-row">
                      <label>B (K):</label>
                      <div class="param-controls">
                        <input
                            type="number"
                            min="1000"
                            max="5000"
                            step="1"
                            v-model.number="slot.component.data.B"
                            class="param-input"
                        />
                        <span class="param-unit">K</span>
                      </div>
                    </div>
                  </div>

                  <div class="param-info">
                    <div>Температура: {{ globalTemp }} K</div>
                    <div>
                      Текущее сопротивление:
                      {{ calculateCurrentResistance(slot.component.data).toFixed(2) }} Ω
                    </div>
                  </div>
                </div>
                <button @click="() => removeComponent3D(slot)">Удалить</button>
              </div>

              <!-- Амперметр -->
              <div v-else-if="slot.component.data.type === 'amm'">
                <strong>Амперметр</strong>
                <div class="component-params">
                  <div class="param-info">
                    <div v-if="currentI !== null">
                      Текущий ток: {{ currentI.toFixed(4) }} А
                    </div>
                    <div v-else>
                      Нет данных для расчёта тока
                    </div>
                  </div>
                </div>
                <button @click="() => removeComponent3D(slot)">Удалить</button>
              </div>
            </div>
            <div v-else class="slot-empty">Пусто</div>
          </div>
        </div>
      </div>

      <div style="margin-top:12px">
        <h4>Сохранённые показания</h4>
        <div class="snapshots-table">
          <table>
            <thead>
            <tr>
              <th>Напряжение (В)</th>
              <th>Ток (А)</th>
              <th>Сопротивление (Ω)</th>
              <th>Температура (K)</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(s,i) in snapshots" :key="i">
              <td>{{ s.V }}</td>
              <td>{{ s.I || '—' }}</td>
              <td>{{ s.R || '—' }}</td>
              <td>{{ s.T }}</td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <ErrorPopup
        v-if="showError"
        :message="errorMessage"
        @close="showError = false"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref, reactive } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Tween, Easing } from '@tweenjs/tween.js';
import ErrorPopup from './ErrorPopup.vue';

// Типы для 3D объектов
type Component3D = {
  type: string;
  model: THREE.Object3D | null;
  data: any;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
  slotIndex: number;
};

type Slot3D = {
  label: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
  occupied: boolean;
  component: Component3D | null;
  allowedTypes: string[];
};

export default defineComponent({
  name: 'CircuitBuilder3D',
  components: {
    ErrorPopup,
  },

  setup() {
    // Ссылки на DOM элементы
    const sceneContainer = ref<HTMLElement | null>(null);

    // Three.js переменные
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let loader: GLTFLoader | null = null;

    // Состояние приложения
    const components = [
      { type: 'source', label: 'Источник напряжения', desc: 'Источник питания 0–15 В' },
      { type: 'therm-sem', label: 'Терморезистор (полупр.)', desc: 'Полупроводниковый образец', meta: { kind: 'semiconductor' } },
      { type: 'therm-met', label: 'Терморезистор (металл)', desc: 'Металлический образец', meta: { kind: 'metal' } },
      { type: 'amm', label: 'Амперметр', desc: 'Включается в цепь' }
    ];

    const globalTemp = ref(300);
    const showError = ref(false);
    const errorMessage = ref('');

    // Слоты для компонентов (3D позиции)
    const slots = reactive<Slot3D[]>([
      {
        label: 'Источник напряжения',
        position: new THREE.Vector3(-1, 0, 0),
        rotation: new THREE.Euler(0, 0, 0),
        scale: 1.5,
        occupied: false,
        component: null,
        allowedTypes: ['source']
      },
      {
        label: 'Терморезистор',
        position: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Euler(0, 0, 0),
        scale: 1.2,
        occupied: false,
        component: null,
        allowedTypes: ['therm-sem', 'therm-met']
      },
      {
        label: 'Амперметр',
        position: new THREE.Vector3(1, 0, 0),
        rotation: new THREE.Euler(0, Math.PI / 2, 0),
        scale: 1,
        occupied: false,
        component: null,
        allowedTypes: ['amm']
      }
    ]);

    const snapshots = ref<any[]>([]);

    // Текстуры и материалы
    const materials = {
      default: new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.3, roughness: 0.7 }),
      source: new THREE.MeshStandardMaterial({ color: 0xff4444, metalness: 0.8, roughness: 0.2 }),
      thermistor: new THREE.MeshStandardMaterial({ color: 0x44aaff, metalness: 0.4, roughness: 0.6 }),
      ammeter: new THREE.MeshStandardMaterial({ color: 0x44ff44, metalness: 0.7, roughness: 0.3 })
    };

    // Вычисление текущего сопротивления терморезистора
    function calculateCurrentResistance(componentData: any): number {
      if (!componentData) return 0;

      const T = globalTemp.value;
      const T0 = 300;

      if (componentData.kind === 'metal') {
        const R0 = componentData.R0 ?? 100;
        const alpha = componentData.alpha ?? 0.0039;
        return R0 * (1 + alpha * (T - T0));
      } else {
        const R0 = componentData.R0 ?? 1000;
        const B = componentData.B ?? 3500;
        return R0 * Math.exp(B * (1 / T - 1 / T0));
      }
    }

    // Вычисление текущего тока в цепи
    function calculateCurrent(): number | null {
      const sourceSlot = slots[0];
      const sampleSlot = slots[1];

      if (!sourceSlot?.component || !sampleSlot?.component) {
        return null;
      }

      const V = sourceSlot.component.data.voltage || 0;
      const R = calculateCurrentResistance(sampleSlot.component.data);

      if (R <= 0) return 0;

      return V / R;
    }

    // Свойство для отображения текущего тока
    const currentI = ref<number | null>(null);

    // Функция для обновления текущего тока
    function updateCurrent() {
      currentI.value = calculateCurrent();
    }

    // Инициализация Three.js сцены
    function initThreeJS() {
      if (!sceneContainer.value) return;

      // Создание сцены
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf0f0f0);

      // Камера
      camera = new THREE.PerspectiveCamera(
          45,
          sceneContainer.value.clientWidth / sceneContainer.value.clientHeight,
          0.1,
          1000
      );
      camera.position.set(0, 8, 15);
      camera.lookAt(0, 0, 0);

      // Рендерер
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(sceneContainer.value.clientWidth, sceneContainer.value.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      sceneContainer.value.appendChild(renderer.domElement);

      // Контролы для вращения камеры
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.screenSpacePanning = false;
      controls.minDistance = 0.5;
      controls.maxDistance = 30;
      controls.maxPolarAngle = Math.PI / 2;

      // Освещение
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 10, 5);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      scene.add(directionalLight);

      // Пол
      const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0xcccccc);
      gridHelper.position.set(0, -0.17, 0);
      scene.add(gridHelper);

      const floorGeometry = new THREE.PlaneGeometry(20, 20);
      const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.8,
        metalness: 0.2
      });
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.175;
      floor.receiveShadow = true;
      scene.add(floor);

      // Загрузчик моделей
      loader = new GLTFLoader();

      // Анимация
      animate();

      // Обработка изменения размера окна
      window.addEventListener('resize', onWindowResize);
    }

    // Анимационный цикл
    function animate() {
      requestAnimationFrame(animate);
      if (controls) {
        controls.update();
      }
      if (renderer && camera && scene) {
        renderer.render(scene, camera);
      }
      // Обновляем текущий ток
      updateCurrent();
    }

    // Обработка изменения размера окна
    function onWindowResize() {
      if (!sceneContainer.value || !camera || !renderer) return;

      camera.aspect = sceneContainer.value.clientWidth / sceneContainer.value.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(sceneContainer.value.clientWidth, sceneContainer.value.clientHeight);
    }

    // Создание геометрии для типа компонента
    function createGeometryForType(type: string): THREE.BufferGeometry {
      switch(type) {
        case 'source':
          return new THREE.BoxGeometry(2, 1.5, 1);
        case 'therm-sem':
        case 'therm-met':
          return new THREE.CylinderGeometry(0.8, 0.8, 2, 16);
        case 'amm':
          return new THREE.BoxGeometry(1.5, 1, 0.5);
        default:
          return new THREE.BoxGeometry(1, 1, 1);
      }
    }

    // Получение материала для типа компонента
    function getMaterialForType(type: string): THREE.Material {
      switch(type) {
        case 'source': return materials.source;
        case 'therm-sem':
        case 'therm-met': return materials.thermistor;
        case 'amm': return materials.ammeter;
        default: return materials.default;
      }
    }

    // Добавление компонента в слот
    async function addComponentToSlot(type: string, meta: any, slotIndex: number) {
      const slot = slots[slotIndex];
      if (!slot || !scene) return false;

      // Проверка допустимости типа
      if (!slot.allowedTypes.includes(type)) {
        showErrorPopup(`В слот "${slot.label}" нельзя добавить этот компонент`);
        return false;
      }

      // Проверка занятости слота
      if (slot.occupied) {
        showErrorPopup(`Слот "${slot.label}" уже занят`);
        return false;
      }

      // Проверка уникальности компонента
      const existingComponent = slots.find(s =>
          s.component?.type === type && s.component !== null
      );
      if (existingComponent) {
        showErrorPopup('Такой компонент уже добавлен в схему!');
        return false;
      }

      // Загружаем модель или создаем геометрию
      let model: THREE.Object3D;

      if (type === 'amm' && loader) {
        // Для амперметра пытаемся загрузить GLB
        try {
          const gltf = await loadGLBModel('/models/ammeter.glb');
          model = gltf.scene;
        } catch (error) {
          console.warn('Не удалось загрузить GLB модель, создаем геометрию');
          model = new THREE.Mesh(createGeometryForType(type), getMaterialForType(type));
        }
      } else {
        // Для других компонентов создаем геометрию
        model = new THREE.Mesh(createGeometryForType(type), getMaterialForType(type));
      }

      // Настройка модели
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // поворот на 180 градусов вокруг оси Y
      slot.rotation.y += Math.PI;

      model.scale.set(slot.scale, slot.scale, slot.scale);
      model.position.copy(slot.position);
      model.rotation.copy(slot.rotation);

      // Анимация появления
      const initialScale = 0.1;
      model.scale.set(initialScale, initialScale, initialScale);
      scene.add(model);

      new Tween(model.scale)
          .to({ x: slot.scale, y: slot.scale, z: slot.scale }, 500)
          .easing(Easing.Elastic.Out)
          .start();

      // Создание объекта компонента с начальными параметрами
      const component: Component3D = {
        type,
        model,
        data: {
          type,
          ...meta,
          voltage: type === 'source' ? 0 : undefined,
          R0: (type === 'therm-met' || type === 'therm-sem') ?
              (meta.kind === 'metal' ? 100 : 1000) : undefined,
          alpha: type === 'therm-met' ? 0.0039 : undefined,
          B: type === 'therm-sem' ? 3500 : undefined
        },
        position: slot.position.clone(),
        rotation: slot.rotation.clone(),
        scale: slot.scale,
        slotIndex
      };

      // Обновление состояния слота
      slot.occupied = true;
      slot.component = component;

      // Обновляем ток после добавления компонента
      updateCurrent();

      return true;
    }

    // Загрузка GLB модели
    function loadGLBModel(path: string): Promise<any> {
      return new Promise((resolve, reject) => {
        if (!loader) {
          reject(new Error('GLTFLoader не инициализирован'));
          return;
        }
        loader.load(
            path,
            (gltf) => resolve(gltf),
            undefined,
            (error) => reject(error)
        );
      });
    }

    // Удаление компонента из сцены
    function removeComponent3D(slot: Slot3D | undefined) {
      if (!slot || !slot.component || !scene) return;

      if (slot.component.model) {
        // Сохраняем ссылки на объекты для анимации
        const model = slot.component.model;
        const slotRef = slot;

        // Анимация исчезновения
        new Tween(model.scale)
            .to({ x: 0.1, y: 0.1, z: 0.1 }, 300)
            .easing(Easing.Back.In)
            .onComplete(() => {
              scene!.remove(model);
              slotRef.occupied = false;
              slotRef.component = null;
              updateCurrent();
            })
            .start();
      } else {
        slot.occupied = false;
        slot.component = null;
        updateCurrent();
      }
    }

    // Обработка начала перетаскивания
    function onDragStart(e: DragEvent, c: any) {
      e.dataTransfer?.setData('application/json', JSON.stringify({
        type: c.type,
        meta: c.meta || {}
      }));
    }

    // Обработка drop на сцену
    async function onDrop(e: DragEvent) {
      e.preventDefault();

      const json = e.dataTransfer?.getData('application/json');
      if (!json) return;

      const { type, meta } = JSON.parse(json);

      // Находим ближайший свободный слот
      const freeSlotIndex = slots.findIndex(s => !s.occupied);
      if (freeSlotIndex === -1) {
        showErrorPopup('Все слоты заняты!');
        return;
      }

      // Добавляем компонент в слот
      await addComponentToSlot(type, meta, freeSlotIndex);
    }

    // Сохранение измерений
    function saveSnapshot() {
      const sourceSlot = slots[0];
      const sampleSlot = slots[1];
      const ammeterSlot = slots[2];

      if (!sourceSlot || !sampleSlot) {
        showErrorPopup("Схема собрана не полностью!");
        return;
      }

      if (!sourceSlot.occupied || !sampleSlot.occupied) {
        showErrorPopup("Схема собрана не полностью!");
        return;
      }

      const V = sourceSlot.component?.data?.voltage || 0;
      const T = globalTemp.value;
      let Rsample = calculateCurrentResistance(sampleSlot.component?.data);

      const snapshot: any = {
        V: V.toFixed(2),
        R: isNaN(Rsample) ? '—' : Rsample.toFixed(2),
        T
      };

      if (ammeterSlot && ammeterSlot.occupied) {
        const I = calculateCurrent();
        snapshot.I = I !== null ? I.toFixed(4) : '—';
      }

      snapshots.value.unshift(snapshot);
    }

    // Сброс сцены
    function resetScene() {
      slots.forEach(slot => {
        if (slot && slot.component) {
          removeComponent3D(slot);
        }
      });

      snapshots.value = [];
      globalTemp.value = 300;

      // Сброс камеры к начальной позиции
      if (camera && controls) {
        camera.position.set(0, 8, 15);
        camera.lookAt(0, 0, 0);
        controls.update();
      }
    }

    // Обработка колесика мыши для температуры
    function handleWheelScroll(event: WheelEvent) {
      const delta = Math.sign(event.deltaY) * -1;
      const step = 1;

      let newTemp = globalTemp.value + (delta * step);
      if (newTemp < 290) newTemp = 290;
      if (newTemp > 380) newTemp = 380;

      globalTemp.value = newTemp;
      event.preventDefault();

      // Обновляем текущий ток при изменении температуры
      updateCurrent();
    }

    function showErrorPopup(message: string) {
      errorMessage.value = message;
      showError.value = true;
    }

    // Хуки жизненного цикла
    onMounted(() => {
      initThreeJS();
    });

    onUnmounted(() => {
      window.removeEventListener('resize', onWindowResize);
      if (renderer) {
        renderer.dispose();
      }
    });

    return {
      // Refs
      sceneContainer,
      components,
      globalTemp,
      showError,
      errorMessage,
      slots,
      snapshots,
      currentI,

      // Methods
      onDragStart,
      onDrop,
      handleWheelScroll,
      saveSnapshot,
      resetScene,
      removeComponent3D,
      showErrorPopup,
      calculateCurrentResistance,
      calculateCurrent
    };
  }
});
</script>

<style scoped>
h2, h4 {
  color: #000000;
}

strong, div {
  color: #222222;
}

.circuit-3d-container {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.components-panel {
  width: 250px;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.component-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.component-item {
  padding: 12px;
  border: 2px dashed #e3e8ef;
  border-radius: 6px;
  cursor: grab;
  transition: all 0.2s;
}

.component-item:hover {
  border-color: #4f46e5;
  background: #f8fafc;
  transform: translateY(-2px);
}

.component-item:active {
  cursor: grabbing;
}

.temperature-control {
  padding: 16px;
  background: #f8fafc;
  border-radius: 6px;
  margin-top: 16px;
}

.temperature-control label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

.scene-container {
  flex: 1;
  position: relative;
}

.three-scene {
  width: 100%;
  height: 500px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.measurements-section {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.current-components {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  margin-top: 12px;
}

.slot-info {
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.slot-label {
  font-weight: 600;
  margin-bottom: 12px;
  color: #374151;
}

.slot-empty {
  color: #9ca3af;
  font-style: italic;
  text-align: center;
  padding: 20px;
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
  margin-bottom: 10px;
}

.param-row label {
  font-weight: 500;
  color: #4b5563;
  font-size: 14px;
  min-width: 80px;
}

.param-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.voltage-slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #e5e7eb;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.voltage-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #4f46e5;
  cursor: pointer;
}

.voltage-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #4f46e5;
  cursor: pointer;
  border: none;
}

.voltage-input, .param-input {
  width: 80px;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
  appearance: textfield;
}

.voltage-input::-webkit-inner-spin-button,
.voltage-input::-webkit-outer-spin-button,
.param-input::-webkit-inner-spin-button,
.param-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}

.param-unit {
  font-size: 14px;
  color: #6b7280;
  min-width: 20px;
}

.voltage-value {
  margin-top: 8px;
  padding: 8px;
  background: #f3f4f6;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
  color: #374151;
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

.snapshots-table {
  margin-top: 16px;
  overflow-x: auto;
}

.snapshots-table table {
  width: 100%;
  border-collapse: collapse;
}

.snapshots-table th,
.snapshots-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.snapshots-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
}

.snapshots-table tbody tr:hover {
  background: #f3f4f6;
}

button {
  padding: 8px 16px;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  margin-top: 8px;
}

button:hover {
  background: #4338ca;
  transform: translateY(-1px);
}

button:active {
  transform: translateY(0);
}
</style>