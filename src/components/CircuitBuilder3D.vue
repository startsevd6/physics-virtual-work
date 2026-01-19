<template>
  <div class="circuit-container">
    <div class="circuit-3d-container">
      <div class="controls-panel">
        <h4>Управление</h4>

        <div class="controls-panel-wrapper">
          <div class="shadow-control">
            <label>Тени:</label>
            <button class="shadow-toggle-btn" @click="toggleShadows">
              {{ showShadows ? 'Выключить' : 'Включить' }}
            </button>
          </div>

          <div class="thermistor-type-selector">
            <label>Тип терморезистора:</label>
            <div class="radio-group">
              <label>
                <input
                    type="radio"
                    value="metal"
                    v-model="selectedThermistorKind"
                />
                Металлический
              </label>
              <label>
                <input
                    type="radio"
                    value="semiconductor"
                    v-model="selectedThermistorKind"
                />
                Полупроводниковый
              </label>
            </div>
          </div>

          <div class="temperature-control">
            <label>Температура (K)</label>
            <input
                type="range"
                min="290"
                max="390"
                v-model.number="globalTemp"
                class="slider"
                @wheel.prevent="handleWheelScroll"
            />
            <div>{{ globalTemp }} K</div>
          </div>
        </div>
      </div>

      <div class="scene-container">
        <!-- Оверлей загрузки -->
        <div v-if="isLoading" class="loading-overlay">
          <div class="loading-content">
            <div class="spinner"></div>
            <div class="loading-text">Загрузка 3D-моделей...</div>
            <div class="loading-progress">
              <div class="progress-bar">
                <div
                    class="progress-fill"
                    :style="{ width: loadingProgress + '%' }"
                ></div>
              </div>
              <div class="progress-text">
                {{ loadedModelsCount }} / {{ totalModelsCount }}
              </div>
            </div>
          </div>
        </div>

        <div
            id="scene3d"
            ref="sceneContainer"
            class="three-scene"
            :class="{ 'loading': isLoading }"
        ></div>
      </div>

      <div class="measurements-section">
        <div>
          <h4>Текущие компоненты в схеме</h4>
          <div class="current-components">
            <div v-for="(slot, idx) in slots" :key="idx" class="slot-info">
              <div v-if="!slot.component" class="slot-label">{{ slot.label }}</div>
              <div v-if="slot.component" class="slot-content">
                <!-- Источник напряжения -->
                <div v-if="slot.component.data.type === 'source'">
                  <strong>Источник напряжения</strong>
                  <div class="component-params">
                    <div class="param-row">
                      <label>Напряжение:</label>
                      <div class="param-controls">
                        <input
                            type="range"
                            min="0"
                            max="15"
                            step="0.1"
                            v-model.number="slot.component.data.voltage"
                            class="slider"
                        />
                        <input
                            type="number"
                            min="0"
                            max="15"
                            step="0.1"
                            v-model.number="slot.component.data.voltage"
                            class="input"
                        />
                        <span class="param-unit">В</span>
                      </div>
                    </div>
                    <div class="voltage-value">
                      Текущее значение: {{ slot.component.data.voltage || 0 }} В
                    </div>
                  </div>
                </div>

                <!-- Терморезистор -->
                <div v-else-if="slot.component.data.type === 'thermistor'">
                  <strong>{{ slot.component.data.kind === 'metal' ? 'Металлический' : 'Полупроводниковый' }} терморезистор</strong>
                  <div class="component-params">
                    <div class="params-column">
                      <div class="param-row">
                        <label>R0 (Ω):</label>
                        <div class="param-controls">
                          <input
                              type="number"
                              min="1"
                              max="10000"
                              step="1"
                              v-model.number="slot.component.data.R0"
                              class="input"
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
                                class="input"
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
                                class="input"
                            />
                            <span class="param-unit">K</span>
                          </div>
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
                </div>
              </div>
            </div>
            <div style="margin-top:8px;display:flex;gap:8px;align-items:stretch">
              <button @click="saveSnapshot">Сохранить показания</button>
              <button @click="resetValues">Сброс</button>
              <button @click="updateCharts">Обновить графики</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="saved-readings">
      <h4>Сохранённые показания</h4>
      <div class="snapshots-table">
        <table>
          <thead>
          <tr>
            <th>Напряжение (В)</th>
            <th>Ток (А)</th>
            <th>Сопротивление (Ω)</th>
            <th>Температура (K)</th>
            <th>Тип терморезистора</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(s,i) in snapshots" :key="i">
            <td>{{ s.V }}</td>
            <td>{{ s.I || '—' }}</td>
            <td>{{ s.R || '—' }}</td>
            <td>{{ s.T }}</td>
            <td>{{ getThermistorTypeLabel(s.thermistorType) }}</td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Секция с графиками -->
    <div class="charts-section">
      <h4>Графики зависимостей</h4>

      <div class="charts-container">
        <!-- График U = f(I) при T=300K -->
        <div class="chart-card">
          <h5>Зависимость напряжения от тока U = f(I) при T=300K</h5>
          <div class="chart-wrapper">
            <canvas ref="uiChartCanvas" class="chart-canvas"></canvas>
          </div>
          <div class="chart-legend">
            <div class="legend-item">
              <span class="legend-color metal-color"></span>
              <span>Металлический терморезистор</span>
            </div>
            <div class="legend-item">
              <span class="legend-color semiconductor-color"></span>
              <span>Полупроводниковый терморезистор</span>
            </div>
          </div>
        </div>

        <!-- График R = f(T) -->
        <div class="chart-card">
          <h5>Зависимость сопротивления от температуры R = f(T)</h5>
          <div class="chart-wrapper">
            <canvas ref="rtChartCanvas" class="chart-canvas"></canvas>
          </div>
          <div class="chart-legend">
            <div class="legend-item">
              <span class="legend-color metal-color"></span>
              <span>Металлический терморезистор</span>
            </div>
            <div class="legend-item">
              <span class="legend-color semiconductor-color"></span>
              <span>Полупроводниковый терморезистор</span>
            </div>
          </div>
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
import { defineComponent, onMounted, onUnmounted, ref, reactive, watch, nextTick } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Chart, registerables } from 'chart.js';
import ErrorPopup from './ErrorPopup.vue';

// Регистрация компонентов Chart.js
Chart.register(...registerables);

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

// Тип для декоративных элементов
type DecorativeElement = {
  name: string;
  path: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
  shadowEnabled: boolean;
};

export default defineComponent({
  name: 'CircuitBuilder3D',
  components: {
    ErrorPopup,
  },

  setup() {
    // Ссылки на DOM элементы
    const sceneContainer = ref<HTMLElement | null>(null);
    const uiChartCanvas = ref<HTMLCanvasElement | null>(null);
    const rtChartCanvas = ref<HTMLCanvasElement | null>(null);

    // Three.js переменные
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let loader: GLTFLoader | null = null;

    // Chart.js переменные
    let uiChart: Chart | null = null;
    let rtChart: Chart | null = null;

    // Состояние приложения
    const globalTemp = ref(300);
    const showError = ref(false);
    const errorMessage = ref('');
    const selectedThermistorKind = ref('metal');
    const showShadows = ref(true);
    const voltageSpinner = ref<THREE.Object3D | null>(null);
    const thermistorSpinner = ref<THREE.Object3D | null>(null);

    // Состояние загрузки
    const isLoading = ref(true);
    const loadedModelsCount = ref(0);
    const totalModelsCount = ref(0);
    const loadingProgress = ref(0);

    // Слоты для компонентов (3D позиции)
    const slots = reactive<Slot3D[]>([
      {
        label: 'Источник напряжения',
        position: new THREE.Vector3(-0.75, 0, 0),
        rotation: new THREE.Euler(0, -Math.PI / 2, 0),
        scale: 1.5,
        occupied: false,
        component: null,
        allowedTypes: ['source']
      },
      {
        label: 'Терморезистор',
        position: new THREE.Vector3(0.75, 0, 0),
        rotation: new THREE.Euler(0, -Math.PI / 2, 0),
        scale: 1.2,
        occupied: false,
        component: null,
        allowedTypes: ['thermistor']
      },
      {
        label: 'Амперметр',
        position: new THREE.Vector3(-0.75, 0.325, 0),
        rotation: new THREE.Euler(0, -Math.PI / 2, 0),
        scale: 1,
        occupied: false,
        component: null,
        allowedTypes: ['amm']
      }
    ]);

    const snapshots = ref<any[]>([]);
    const decorativeElements = ref<THREE.Object3D[]>([]); // Храним ссылки на декоративные элементы

    // Конфигурация декоративных элементов
    const decorativeConfigs: DecorativeElement[] = [
      // Красная кнопка для вольтамперметра
      {
        name: 'red_button_for_ammeter',
        path: './models/red_button.glb',
        position: new THREE.Vector3(-1.185, 0.22, 0.585),
        rotation: new THREE.Euler(0, Math.PI/2, 0),
        scale: 0.1,
        shadowEnabled: true
      },

      // Кнопки для вольтамперметра
      {
        name: 'button_1_2',
        path: './models/button_1.glb',
        position: new THREE.Vector3(-0.815, 0.32, 0.585),
        rotation: new THREE.Euler(0, -Math.PI/2, 0),
        scale: 0.11,
        shadowEnabled: true
      },
      {
        name: 'button_1_20',
        path: './models/button_1.glb',
        position: new THREE.Vector3(-0.725, 0.32, 0.585),
        rotation: new THREE.Euler(0, -Math.PI/2, 0),
        scale: 0.11,
        shadowEnabled: true
      },
      {
        name: 'button_1_200',
        path: './models/button_1.glb',
        position: new THREE.Vector3(-0.635, 0.32, 0.585),
        rotation: new THREE.Euler(0, -Math.PI/2, 0),
        scale: 0.11,
        shadowEnabled: true
      },
      {
        name: 'button_2_2',
        path: './models/button_2.glb',
        position: new THREE.Vector3(-0.815, 0.4, 0.585),
        rotation: new THREE.Euler(0, -Math.PI/2, 0),
        scale: 0.11,
        shadowEnabled: true
      },
      {
        name: 'button_2_20',
        path: './models/button_2.glb',
        position: new THREE.Vector3(-0.725, 0.4, 0.585),
        rotation: new THREE.Euler(0, -Math.PI/2, 0),
        scale: 0.11,
        shadowEnabled: true
      },
      {
        name: 'button_2_200',
        path: './models/button_2.glb',
        position: new THREE.Vector3(-0.635, 0.4, 0.585),
        rotation: new THREE.Euler(0, -Math.PI/2, 0),
        scale: 0.11,
        shadowEnabled: true
      },
      {
        name: 'button_3_1',
        path: './models/button_3.glb',
        position: new THREE.Vector3(-0.795, 0.22, 0.585),
        rotation: new THREE.Euler(0, -Math.PI/2, 0),
        scale: 0.09,
        shadowEnabled: true
      },
      {
        name: 'button_3_2',
        path: './models/button_3.glb',
        position: new THREE.Vector3(-0.725, 0.22, 0.585),
        rotation: new THREE.Euler(0, -Math.PI/2, 0),
        scale: 0.09,
        shadowEnabled: true
      },
      {
        name: 'button_3_3',
        path: './models/button_3.glb',
        position: new THREE.Vector3(-0.655, 0.22, 0.585),
        rotation: new THREE.Euler(0, -Math.PI/2, 0),
        scale: 0.09,
        shadowEnabled: true
      },

      // Порты для вольтамперметра
      {
        name: 'port_1_1',
        path: './models/port.glb',
        position: new THREE.Vector3(-1.06, 0.22, 0.585),
        rotation: new THREE.Euler(0, -Math.PI/2, 0),
        scale: 0.1,
        shadowEnabled: true
      },
      {
        name: 'port_1_2',
        path: './models/port.glb',
        position: new THREE.Vector3(-0.97, 0.22, 0.585),
        rotation: new THREE.Euler(0, -Math.PI/2, 0),
        scale: 0.1,
        shadowEnabled: true
      },
      {
        name: 'port_1_3',
        path: './models/port.glb',
        position: new THREE.Vector3(-0.385, 0.22, 0.585),
        rotation: new THREE.Euler(0, -Math.PI/2, 0),
        scale: 0.1,
        shadowEnabled: true
      },
      {
        name: 'port_1_4',
        path: './models/port.glb',
        position: new THREE.Vector3(-0.305, 0.22, 0.585),
        rotation: new THREE.Euler(0, -Math.PI/2, 0),
        scale: 0.1,
        shadowEnabled: true
      },

      // Красная кнопка для источника напряжения
      {
        name: 'red_button_for_voltage_source',
        path: './models/red_button.glb',
        position: new THREE.Vector3(-1.2, -0.1, 0.585),
        rotation: new THREE.Euler(0, Math.PI/2, 0),
        scale: 0.1,
        shadowEnabled: true
      },

      // Порты для источника напряжения
      {
        name: 'port_2_1',
        path: './models/port.glb',
        position: new THREE.Vector3(-1.1, 0.06, 0.585),
        rotation: new THREE.Euler(0, -Math.PI/2, 0),
        scale: 0.1,
        shadowEnabled: true
      },
      {
        name: 'port_2_2',
        path: './models/port.glb',
        position: new THREE.Vector3(-1.015, 0.06, 0.585),
        rotation: new THREE.Euler(0, -Math.PI/2, 0),
        scale: 0.1,
        shadowEnabled: true
      },
      {
        name: 'port_2_3',
        path: './models/port.glb',
        position: new THREE.Vector3(-0.825, 0.06, 0.585),
        rotation: new THREE.Euler(0, -Math.PI/2, 0),
        scale: 0.1,
        shadowEnabled: true
      },
      {
        name: 'port_2_4',
        path: './models/port.glb',
        position: new THREE.Vector3(-0.745, 0.06, 0.585),
        rotation: new THREE.Euler(0, -Math.PI/2, 0),
        scale: 0.1,
        shadowEnabled: true
      },

      // Спиннеры для источника напряжения
      {
        name: 'spinner_for_voltage_1',
        path: './models/spinner_for_voltage_source.glb',
        position: new THREE.Vector3(-0.94, -0.05, 0.585),
        rotation: new THREE.Euler(-Math.PI/2, -3*Math.PI/4, -Math.PI/2),
        scale: 0.1,
        shadowEnabled: true
      },
      {
        name: 'spinner_for_voltage_2',
        path: './models/spinner_for_voltage_source.glb',
        position: new THREE.Vector3(-0.67, -0.05, 0.585),
        rotation: new THREE.Euler(-Math.PI/2, -3*Math.PI/4, -Math.PI/2),
        scale: 0.1,
        shadowEnabled: true
      },

      // Спиннер для терморезистора
      {
        name: 'spinner_for_thermistor',
        path: './models/spinner_for_thermistor.glb',
        position: new THREE.Vector3(1.07, 0.05, 0),
        rotation: new THREE.Euler(0, -Math.PI/2, 0),
        scale: 0.1,
        shadowEnabled: true
      },

      // Большая красная кнопка
      /*{
        name: 'red_big_button',
        path: './models/red_big_button.glb',
        position: new THREE.Vector3(-1.5, 0.2, -2),
        rotation: new THREE.Euler(0, Math.PI/4, 0),
        scale: 1.2,
        shadowEnabled: true
      },*/
    ];

    // Функция для обновления прогресса загрузки
    function incrementLoadedModels() {
      loadedModelsCount.value++;
      loadingProgress.value = Math.round((loadedModelsCount.value / totalModelsCount.value) * 100);

      if (loadedModelsCount.value >= totalModelsCount.value) {
        setTimeout(() => {
          isLoading.value = false;
        }, 500);
      }
    }

    // Функция для добавления декоративных элементов
    async function addDecorativeElements() {
      if (!scene || !loader) return;

      // Увеличиваем общее количество моделей
      totalModelsCount.value += decorativeConfigs.length;

      for (const config of decorativeConfigs) {
        try {
          const gltf = await new Promise<any>((resolve, reject) => {
            loader!.load(
                config.path,
                (gltf) => resolve(gltf),
                undefined,
                (error) => reject(error)
            );
          });

          const model = gltf.scene;

          // Настройка модели
          model.position.copy(config.position);
          model.rotation.copy(config.rotation);
          model.scale.set(config.scale, config.scale, config.scale);

          // Настройка теней
          model.traverse((child: THREE.Mesh) => {
            if (child.isMesh) {
              child.castShadow = config.shadowEnabled && showShadows.value;
              child.receiveShadow = config.shadowEnabled && showShadows.value;
            }
          });

          scene.add(model);
          decorativeElements.value.push(model);

          // Сохраняем ссылки на спиннеры
          if (config.name === 'spinner_for_voltage_2') {
            voltageSpinner.value = model;
          } else if (config.name === 'spinner_for_thermistor') {
            thermistorSpinner.value = model;
          }

          incrementLoadedModels();

        } catch (error) {
          console.warn(`Не удалось загрузить декоративную модель ${config.name}:`, error);
          // Создаем простую геометрию в качестве заглушки
          const fallback = createFallbackDecorative(config.name);
          if (fallback) {
            scene.add(fallback);
            decorativeElements.value.push(fallback);

            // Сохраняем ссылки для заглушек тоже
            if (config.name === 'spinner_for_voltage_2') {
              voltageSpinner.value = fallback;
            } else if (config.name === 'spinner_for_thermistor') {
              thermistorSpinner.value = fallback;
            }
          }
          incrementLoadedModels();
        }
      }
    }

    // Функция для вращения спиннера источника напряжения
    function updateVoltageSpinnerRotation() {
      if (!voltageSpinner.value) return;

      const sourceSlot = slots[0];
      if (!sourceSlot?.component) return;

      const voltage = sourceSlot.component.data.voltage || 0;
      // Масштабируем напряжение в угол вращения (0-15В = 0-360 градусов)
      const rotationAngle = (voltage / 15) * Math.PI / 2.5;

      // Вращаем вокруг оси Y (в данном случае)
      voltageSpinner.value.rotation.y = -3*Math.PI/4 + rotationAngle;
    }

    // Функция для вращения спиннера терморезистора
    function updateThermistorSpinnerRotation() {
      if (!thermistorSpinner.value) return;

      // Масштабируем температуру в угол вращения (290-390K = 0-315 градусов)
      const minTemp = 290;
      const maxTemp = 390;
      const normalizedTemp = (globalTemp.value - minTemp) / (maxTemp - minTemp);
      const rotationAngle = -normalizedTemp * Math.PI * 1.75;

      // Вращаем вокруг оси Y
      thermistorSpinner.value.rotation.y = -Math.PI/2 + rotationAngle;
    }

    // Следим за изменением напряжения
    watch(() => slots[0]?.component?.data?.voltage, () => {
      updateVoltageSpinnerRotation();
    });

    // Следим за изменением температуры
    watch(globalTemp, () => {
      updateThermistorSpinnerRotation();
    });

    // Также обновляем при изменении типа терморезистора
    watch(selectedThermistorKind, () => {
      updateThermistorSpinnerRotation();
    });

    // Создание заглушки для декоративных элементов
    function createFallbackDecorative(name: string): THREE.Mesh | null {
      let geometry: THREE.BufferGeometry;
      let material: THREE.Material;
      let scale = 1;

      // Создаем разные геометрии в зависимости от имени элемента
      if (name.includes('button')) {
        geometry = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16);
        material = new THREE.MeshStandardMaterial({
          color: name.includes('red') ? 0xff4444 : 0x4444ff,
          metalness: 0.7,
          roughness: 0.3
        });
        scale = name.includes('big') ? 1.5 : 1;
      } else if (name.includes('port')) {
        geometry = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 8);
        material = new THREE.MeshStandardMaterial({
          color: 0x888888,
          metalness: 0.9,
          roughness: 0.1
        });
      } else if (name.includes('spinner')) {
        geometry = new THREE.TorusGeometry(0.3, 0.05, 16, 32);
        material = new THREE.MeshStandardMaterial({
          color: name.includes('thermistor') ? 0xffaa00 : 0x00aaff,
          metalness: 0.6,
          roughness: 0.4
        });
      } else {
        return null;
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = showShadows.value;
      mesh.receiveShadow = showShadows.value;

      // Позиционируем заглушку
      const config = decorativeConfigs.find(c => c.name === name);
      if (config) {
        mesh.position.copy(config.position);
        mesh.rotation.copy(config.rotation);
        mesh.scale.set(scale, scale, scale);
      }

      return mesh;
    }

    // Функция для переключения теней
    function toggleShadows() {
      showShadows.value = !showShadows.value;
      updateShadows();
    }

    // Функция для обновления теней во всех объектах сцены
    function updateShadows() {
      if (!scene || !renderer) return;

      // Обновляем настройки рендерера
      renderer.shadowMap.enabled = showShadows.value;

      // Обходим все объекты в сцене и обновляем их тени
      scene.traverse((object) => {
        // Для декоративных элементов проверяем, должны ли они отбрасывать тени
        const isDecorative = decorativeElements.value.some(el => el.uuid === object.uuid);
        if (isDecorative) {
          const config = decorativeConfigs.find(c =>
              object.position.equals(c.position) ||
              object.position.distanceTo(c.position) < 0.1
          );
          object.castShadow = config?.shadowEnabled && showShadows.value || false;
          object.receiveShadow = config?.shadowEnabled && showShadows.value || false;
        } else {
          object.castShadow = showShadows.value;
          object.receiveShadow = showShadows.value;
        }
      });

      // Также обновляем тени у направленного света
      if (scene.children) {
        scene.children.forEach(child => {
          if (child instanceof THREE.DirectionalLight) {
            child.castShadow = showShadows.value;
          }
        });
      }
    }

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

    // Добавляем новые конфигурации для дисплеев (текстовых плоскостей)
    const displayConfigs = [
      // Дисплей температуры на терморезисторе
      {
        name: 'thermistor_display',
        position: new THREE.Vector3(1.0375, 0.1199, -0.305),
        rotation: new THREE.Euler(-43.25*Math.PI/100, 0, 0),
        scale: 0.1,
        width: 2.1,
        height: 1,
        fontSize: 80,
        color: "#FF1616"
      },
      // Дисплей напряжения на вольтамперметре
      {
        name: 'voltmeter_display_top',
        position: new THREE.Vector3(-0.374, 0.393, 0.586),
        rotation: new THREE.Euler(0, 0, 0),
        scale: 0.115,
        width: 1.95,
        height: 0.7,
        fontSize: 80,
        color: "#FF1616"
      },
      // Дисплей тока на вольтамперметре
      {
        name: 'ammeter_display_bottom',
        position: new THREE.Vector3(-1.107, 0.393, 0.586),
        rotation: new THREE.Euler(0, 0, 0),
        scale: 0.115,
        width: 1.95,
        height: 0.7,
        fontSize: 80,
        color: "#FF1616"
      }
    ];

    // Добавляем refs для дисплеев
    const thermistorDisplay = ref<THREE.Mesh | null>(null);
    const voltmeterDisplay = ref<THREE.Mesh | null>(null);
    const ammeterDisplay = ref<THREE.Mesh | null>(null);

    // Функция для создания текстовой плоскости
    function createTextDisplay(config: any): THREE.Mesh {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = 256;
      canvas.height = 128;

      // Фон
      context.fillStyle = '#000011';
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Текст по умолчанию
      context.font = 'bold 80px SevenSegment';
      context.fillStyle = '#FF1616';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('0.00', canvas.width/2, canvas.height/2);

      // Создаем текстуру
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;

      // Создаем материал с текстурой
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true
      });

      // Создаем плоскость
      const geometry = new THREE.PlaneGeometry(config.width, config.height);
      const plane = new THREE.Mesh(geometry, material);

      // Позиционируем
      plane.position.copy(config.position);
      plane.rotation.copy(config.rotation);
      plane.scale.set(config.scale, config.scale, config.scale);

      return plane;
    }

    // Функция для обновления текста на дисплее
    function updateDisplayText(display: THREE.Mesh | null, text: string, config: any) {
      if (!display || !display.material) return;

      const material = display.material as THREE.MeshBasicMaterial;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;

      canvas.width = 256;
      canvas.height = 128;

      // Фон
      context.fillStyle = '#000000';
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Настройки шрифта
      const fontSize = config.fontSize || 80;
      context.font = `bold ${fontSize}px SevenSegment`;
      context.fillStyle = config.color || '#FF1616';
      context.textAlign = 'center';
      context.textBaseline = 'middle';

      // Для моноширинного эффекта - отрисовываем каждый символ отдельно
      // с фиксированным расстоянием между ними
      const charSpacing = 44; // Фиксированное расстояние между символами
      const verticalOffset = 2;

      // Центрируем всю строку
      const totalWidth = (text.length - 1) * charSpacing;
      const startX = (canvas.width - totalWidth) / 2;

      // Рисуем каждый символ в своей позиции
      let dotCounter = 0;
      if (text.length < 5 && (config.name === 'voltmeter_display_top' || config.name === 'ammeter_display_bottom')) {
        text = '⠀' + text;
      }
      for (let i = 0; i < text.length; i++) {
        const char: string | undefined = text[i]?.toString();
        let x = startX + (i * charSpacing);
        if (char != null) {
          if (char === '.') {
            x += charSpacing * 0.5;
            dotCounter += 1;
          }
          if (char === '1') {
            x += charSpacing * 0.3;
          }
          if (text[0] === '1') {
            x += charSpacing * 0.5;
          }
          context.fillText(char, x - charSpacing * dotCounter, canvas.height / 2 + verticalOffset);
        }
      }

      // Обновляем текстуру
      if (material.map) {
        (material.map as THREE.CanvasTexture).image = canvas;
        (material.map as THREE.CanvasTexture).needsUpdate = true;
      }
    }

    // Функция для создания дисплеев
    function createDisplays() {
      if (!scene) return;

      // Создаем дисплеи для каждого прибора
      displayConfigs.forEach(config => {
        const display = createTextDisplay(config);
        scene!.add(display);

        // Сохраняем ссылки
        if (config.name === 'thermistor_display') {
          thermistorDisplay.value = display;
        } else if (config.name === 'voltmeter_display_top') {
          voltmeterDisplay.value = display;
        } else if (config.name === 'ammeter_display_bottom') {
          ammeterDisplay.value = display;
        }
      });
    }

    // Функция для обновления всех дисплеев
    function updateAllDisplays() {
      // Обновляем дисплей температуры на терморезисторе
      updateDisplayText(
          thermistorDisplay.value,
          `${globalTemp.value}`,
          displayConfigs.find(c => c.name === 'thermistor_display')
      );

      // Обновляем дисплей напряжения на вольтамперметре
      const sourceSlot = slots[0];
      const voltage = sourceSlot?.component?.data?.voltage || 0;
      updateDisplayText(
          voltmeterDisplay.value,
          `${voltage.toFixed(2)}`,
          displayConfigs.find(c => c.name === 'voltmeter_display_top')
      );

      // Обновляем дисплей тока на вольтамперметре
      const current = calculateCurrent();
      updateDisplayText(
          ammeterDisplay.value,
          current !== null ? `${current.toFixed(2)}` : '0.00',
          displayConfigs.find(c => c.name === 'ammeter_display_bottom')
      );
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

    // Инициализация графиков Chart.js
    function initCharts() {
      nextTick(() => {
        if (uiChartCanvas.value && rtChartCanvas.value) {
          createUIChart();
          createRTChart();
        }
      });
    }

    // Создание графика U = f(I)
    function createUIChart() {
      if (!uiChartCanvas.value) return;

      const ctx = uiChartCanvas.value.getContext('2d');
      if (!ctx) return;

      if (uiChart) {
        uiChart.destroy();
      }

  // Фильтруем данные из таблицы сохранённых показаний
  // Только записи с T=300 и напряжением от 2 до 4 В
  const filteredSnapshots = snapshots.value.filter(s => {
    return s.T === 300 && s.V >= 2 && s.V <= 4;
  });

  // Разделяем данные по типу терморезистора
  const metalData = filteredSnapshots
      .filter(s => s.thermistorType === 'metal')
      .map(s => ({
        x: parseFloat(s.I || 0), // ток
        y: parseFloat(s.V) // напряжение
      }));

  const semiData = filteredSnapshots
      .filter(s => s.thermistorType === 'semiconductor')
      .map(s => ({
        x: parseFloat(s.I || 0), // ток
        y: parseFloat(s.V) // напряжение
      }));

      uiChart = new Chart(ctx, {
        type: 'scatter',
        data: {
          datasets: [
            {
              label: 'Металлический терморезистор',
              data: metalData,
              borderColor: 'rgba(54, 162, 235, 1)',
              backgroundColor: 'rgba(54, 162, 235, 0.1)',
              borderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7,
              showLine: true,
              fill: false,
            },
            {
              label: 'Полупроводниковый терморезистор',
              data: semiData,
              borderColor: 'rgba(255, 99, 132, 1)',
              backgroundColor: 'rgba(255, 99, 132, 0.1)',
              borderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7,
              showLine: true,
              fill: false,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                font: {
                  size: 12
                }
              }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              callbacks: {
                label: function(context) {
                  let label = context.dataset.label || '';
                  if (label) {
                    label += ': ';
                  }
                  const point = context.raw as { x: number; y: number };
                  label += `U = ${point.y?.toFixed(2)} В, I = ${point.x?.toFixed(4)} А`;
                  return label;
                }
              }
            }
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Ток I, А',
                font: {
                  size: 14,
                  weight: 'bold'
                }
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              }
            },
            y: {
              title: {
                display: true,
                text: 'Напряжение U, В',
                font: {
                  size: 14,
                  weight: 'bold'
                }
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              },
              min: 0,
              max: 4.5,
            }
          }
        }
      });
    }

    // Создание графика R = f(T)
    function createRTChart() {
      if (!rtChartCanvas.value) return;

      const ctx = rtChartCanvas.value.getContext('2d');
      if (!ctx) return;

      if (rtChart) {
        rtChart.destroy();
      }

  // Фильтруем данные из таблицы сохранённых показаний
  // Только записи с напряжением от 5 до 15 В
  const filteredSnapshots = snapshots.value.filter(s => {
    return s.V >= 5 && s.V <= 15;
  });

  // Разделяем данные по типу терморезистора
  const metalData = filteredSnapshots
      .filter(s => s.thermistorType === 'metal')
      .map(s => ({
        x: parseFloat(s.T), // температура
        y: parseFloat(s.R || 0) // сопротивление
      }));

  const semiData = filteredSnapshots
      .filter(s => s.thermistorType === 'semiconductor')
      .map(s => ({
        x: parseFloat(s.T), // температура
        y: parseFloat(s.R || 0) // сопротивление
      }));

      rtChart = new Chart(ctx, {
        type: 'scatter',
        data: {
          datasets: [
            {
              label: 'Металлический терморезистор',
              data: metalData,
              borderColor: 'rgba(54, 162, 235, 1)',
              backgroundColor: 'rgba(54, 162, 235, 0.1)',
              borderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7,
              showLine: true,
              fill: false,
            },
            {
              label: 'Полупроводниковый терморезистор',
              data: semiData,
              borderColor: 'rgba(255, 99, 132, 1)',
              backgroundColor: 'rgba(255, 99, 132, 0.1)',
              borderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7,
              showLine: true,
              fill: false,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                font: {
                  size: 12
                }
              }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              callbacks: {
                label: function(context) {
                  let label = context.dataset.label || '';
                  if (label) {
                    label += ': ';
                  }
                  label += `R = ${context.parsed.y?.toFixed(2)} Ω, T = ${context.parsed.x} K`;
                  return label;
                }
              }
            }
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Температура T, K',
                font: {
                  size: 14,
                  weight: 'bold'
                }
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              },
              min: 280,
              max: 400,
            },
            y: {
              title: {
                display: true,
                text: 'Сопротивление R, Ω',
                font: {
                  size: 14,
                  weight: 'bold'
                }
              },
              type: 'linear',
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              }
            }
          }
        }
      });
    }

    // Функция обновления обоих графиков
    function updateCharts() {
      createUIChart();
      createRTChart();
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
      camera.position.set(0, 3, 5);
      camera.lookAt(0, 0, 0);

      // Рендерер
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(sceneContainer.value.clientWidth, sceneContainer.value.clientHeight);
      renderer.shadowMap.enabled = showShadows.value;
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
      directionalLight.castShadow = showShadows.value;
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      directionalLight.shadow.bias = -0.0001;
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
      floor.receiveShadow = showShadows.value;
      scene.add(floor);

      // Загрузчик моделей
      loader = new GLTFLoader();

      // Добавляем декоративные элементы
      addDecorativeElements();

      // Создаем дисплеи для отображения значений
      createDisplays();

      // Инициализация компонентов схемы
      initComponents();

      // Анимация
      animate();

      // Обработка изменения размера окна
      window.addEventListener('resize', onWindowResize);

      // Инициализация графиков после загрузки
      setTimeout(() => {
        initCharts();
      }, 1000);
    }

    // Инициализация всех компонентов схемы
    async function initComponents() {
      if (!scene) return;

      // Добавляем все компоненты сразу
      await addComponentToSlot('source', { kind: 'source' }, 0);
      await addComponentToSlot('thermistor', { kind: selectedThermistorKind.value }, 1);
      await addComponentToSlot('amm', { kind: 'amm' }, 2);
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

      // Обновляем дисплеи на приборах
      updateAllDisplays();

      // Обновляем вращение спиннеров
      updateVoltageSpinnerRotation();
      updateThermistorSpinnerRotation();
    }

    // Обработка изменения размера окна
    function onWindowResize() {
      if (!sceneContainer.value || !camera || !renderer) return;

      camera.aspect = sceneContainer.value.clientWidth / sceneContainer.value.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(sceneContainer.value.clientWidth, sceneContainer.value.clientHeight);
    }

    // Загрузка 3D модели для компонента
    async function loadModelForType(type: string, kind?: string): Promise<THREE.Object3D | null> {
      if (!loader) return null;

      try {
        let modelPath = '';

        // Определяем путь к модели в зависимости от типа компонента
        switch(type) {
          case 'source':
            modelPath = './models/voltage_source.glb';
            break;
          case 'thermistor':
            modelPath = './models/thermistor.glb'; // Одинаковая модель для обоих типов
            break;
          case 'amm':
            modelPath = './models/ammeter.glb';
            break;
          default:
            return null;
        }

        const gltf = await new Promise<any>((resolve, reject) => {
          loader!.load(
              modelPath,
              (gltf) => resolve(gltf),
              undefined,
              (error) => reject(error)
          );
        });

        const model = gltf.scene;

        // Настройка тени для всех дочерних объектов
        model.traverse((child: THREE.Mesh) => {
          child.castShadow = showShadows.value;
          child.receiveShadow = showShadows.value;
        });

        return model;
      } catch (error) {
        console.warn(`Не удалось загрузить модель для ${type}:`, error);
        // Возвращаем примитив как запасной вариант
        return createFallbackGeometry(type, kind);
      }
    }

    // Создание геометрии для типа компонента (запасной вариант)
    function createFallbackGeometry(type: string, kind?: string): THREE.Mesh {
      let geometry: THREE.BufferGeometry;
      let material: THREE.Material;

      switch(type) {
        case 'source':
          geometry = new THREE.BoxGeometry(2, 1.5, 1);
          material = new THREE.MeshStandardMaterial({
            color: 0xff4444,
            metalness: 0.8,
            roughness: 0.2
          });
          break;
        case 'thermistor':
          geometry = new THREE.CylinderGeometry(0.8, 0.8, 2, 16);
          material = new THREE.MeshStandardMaterial({
            color: kind === 'metal' ? 0x4477cc : 0xcc7744,
            metalness: 0.6,
            roughness: 0.4
          });
          break;
        case 'amm':
          geometry = new THREE.BoxGeometry(1.5, 1, 0.5);
          material = new THREE.MeshStandardMaterial({
            color: 0x44ff44,
            metalness: 0.7,
            roughness: 0.3
          });
          break;
        default:
          geometry = new THREE.BoxGeometry(1, 1, 1);
          material = new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 0.3,
            roughness: 0.7
          });
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = showShadows.value;
      mesh.receiveShadow = showShadows.value;
      return mesh;
    }

    // Добавление компонента в слот
    async function addComponentToSlot(type: string, meta: any, slotIndex: number) {
      const slot = slots[slotIndex];
      if (!slot || !scene) return false;

      // Загружаем 3D модель или создаем запасной вариант
      let model = await loadModelForType(type, meta.kind);

      if (!model) {
        model = createFallbackGeometry(type, meta.kind);
      }

      // Настройка модели
      model.traverse((child) => {
        child.castShadow = showShadows.value;
        child.receiveShadow = showShadows.value;
      });

      model.scale.set(slot.scale, slot.scale, slot.scale);
      model.position.copy(slot.position);
      model.rotation.copy(slot.rotation);

      const initialScale = 0.1;
      model.scale.set(initialScale, initialScale, initialScale);
      scene.add(model);

      // Создание объекта компонента с начальными параметрами
      const component: Component3D = {
        type,
        model,
        data: {
          type,
          kind: meta.kind,
          voltage: type === 'source' ? 0 : undefined,
          R0: type === 'thermistor' ?
              (meta.kind === 'metal' ? 100 : 1000) : undefined,
          alpha: type === 'thermistor' && meta.kind === 'metal' ? 0.0039 : undefined,
          B: type === 'thermistor' && meta.kind === 'semiconductor' ? 3500 : undefined
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

      // Обновляем графики после добавления компонента
      updateCharts();

      return true;
    }

    // Обновление типа терморезистора при изменении радиокнопки
    function updateThermistorKind() {
      const thermistorSlot = slots[1];
      if (thermistorSlot?.component && thermistorSlot.component.data.type === 'thermistor') {
        // Обновляем данные компонента
        thermistorSlot.component.data.kind = selectedThermistorKind.value;

        // Обновляем параметры по умолчанию в зависимости от типа
        if (selectedThermistorKind.value === 'metal') {
          thermistorSlot.component.data.R0 = 100;
          thermistorSlot.component.data.alpha = 0.0039;
          thermistorSlot.component.data.B = undefined;
        } else {
          thermistorSlot.component.data.R0 = 1000;
          thermistorSlot.component.data.alpha = undefined;
          thermistorSlot.component.data.B = 3500;
        }

        updateCurrent();
        updateCharts();
      }
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

      // Получаем тип терморезистора из данных компонента
      const thermistorType = sampleSlot.component?.data?.kind || selectedThermistorKind.value;

      const snapshot: any = {
        V: V.toFixed(2),
        R: isNaN(Rsample) ? '—' : Rsample.toFixed(2),
        T,
        thermistorType // Добавляем тип терморезистора
      };

      if (ammeterSlot && ammeterSlot.occupied) {
        const I = calculateCurrent();
        snapshot.I = I !== null ? I.toFixed(4) : '—';
      }

      snapshots.value.unshift(snapshot);
    }

    // Функция для получения читаемого названия типа терморезистора
    function getThermistorTypeLabel(type: string): string {
      switch(type) {
        case 'metal':
          return 'Металлический';
        case 'semiconductor':
          return 'Полупроводниковый';
        default:
          return '—';
      }
    }

    // Сброс значений к значениям по умолчанию
    function resetValues() {
      // Сбрасываем напряжение источника
      const sourceSlot = slots[0];
      if (sourceSlot?.component) {
        sourceSlot.component.data.voltage = 0;
      }

      // Сбрасываем температуру
      globalTemp.value = 300;

      // Сбрасываем параметры терморезистора к значениям по умолчанию
      selectedThermistorKind.value = 'metal';
      updateThermistorKind();

      // Очищаем сохраненные показания
      snapshots.value = [];

      // Сбрасываем камеру к начальной позиции
      if (camera && controls) {
        camera.position.set(0, 2, 3);
        camera.lookAt(0, 0, 0);
        controls.update();
      }

      updateAllDisplays();
      updateCurrent();
      updateVoltageSpinnerRotation();
      updateThermistorSpinnerRotation();
      updateCharts();
    }

    // Обработка колесика мыши для температуры
    function handleWheelScroll(event: WheelEvent) {
      const delta = Math.sign(event.deltaY) * -1;
      const step = 1;

      let newTemp = globalTemp.value + (delta * step);
      if (newTemp < 290) newTemp = 290;
      if (newTemp > 390) newTemp = 390;

      globalTemp.value = newTemp;
      event.preventDefault();

      // Обновляем текущий ток при изменении температуры
      updateCurrent();
      updateCharts();
    }

    function showErrorPopup(message: string) {
      errorMessage.value = message;
      showError.value = true;
    }

    // Следим за изменением типа терморезистора
    watch(selectedThermistorKind, updateThermistorKind);

    // Следим за изменением параметров для обновления графиков
    watch(() => slots[1]?.component?.data, () => {
      updateCharts();
    }, { deep: true });

    watch(() => slots[0]?.component?.data?.voltage, () => {
      updateCharts();
    });

    // Хуки жизненного цикла
    onMounted(() => {
      initThreeJS();
    });

    onUnmounted(() => {
      window.removeEventListener('resize', onWindowResize);
      if (renderer) {
        renderer.dispose();
      }
      // Очищаем декоративные элементы
      decorativeElements.value.forEach(element => {
        if (scene && element.parent === scene) {
          scene.remove(element);
        }
      });
      decorativeElements.value = [];

      // Очищаем дисплеи
      [thermistorDisplay.value, voltmeterDisplay.value, ammeterDisplay.value].forEach(display => {
        if (display && scene && display.parent === scene) {
          scene.remove(display);
          if (display.material) {
            (display.material as THREE.Material).dispose();
          }
          if (display.geometry) {
            display.geometry.dispose();
          }
        }
      });

      // Уничтожаем графики
      if (uiChart) {
        uiChart.destroy();
      }
      if (rtChart) {
        rtChart.destroy();
      }
    });

    return {
      // Refs
      sceneContainer,
      uiChartCanvas,
      rtChartCanvas,
      globalTemp,
      showError,
      errorMessage,
      slots,
      snapshots,
      currentI,
      selectedThermistorKind,
      showShadows,
      voltageSpinner,
      thermistorSpinner,

      // Состояние загрузки
      isLoading,
      loadedModelsCount,
      totalModelsCount,
      loadingProgress,

      // Methods
      handleWheelScroll,
      saveSnapshot,
      resetValues,
      calculateCurrentResistance,
      toggleShadows,
      getThermistorTypeLabel,
      updateCharts,
    };
  }
});
</script>

<style scoped>
@font-face {
  font-family: 'SevenSegment';
  src: url('/fonts/Seven Segment.ttf') format('truetype');
  font-display: swap;
}

h2,
h4,
h5 {
  color: #000000;
}

strong, div {
  color: #222222;
}

.circuit-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.circuit-3d-container {
  display: flex;
  gap: 20px;
}

.controls-panel {
  width: 250px;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  position: relative;
}

.scene-container {
  flex: 1;
  position: relative;
  width: calc(100vw - 900px);
}

.three-scene {
  width: 100%;
  height: 746px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.three-scene.loading {
  filter: blur(2px);
  opacity: 0.7;
}

/* Оверлей загрузки */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  border-radius: 8px;
}

.loading-content {
  text-align: center;
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  max-width: 400px;
  width: 90%;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4f46e5;
  border-radius: 50%;
  margin: 0 auto 20px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 15px;
}

.loading-progress {
  margin-top: 20px;
}

.progress-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4f46e5, #7c3aed);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 14px;
  color: #6b7280;
}

@keyframes spin-small {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-info div {
  display: inline-block;
  vertical-align: middle;
  font-size: 14px;
  color: #0369a1;
}

.shadow-control {
  margin-bottom: 20px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
}

.shadow-control label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

.shadow-toggle-btn {
  width: 100%;
  margin-top: 0;
}

.thermistor-type-selector {
  margin-bottom: 20px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
}

.thermistor-type-selector label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: normal;
  margin-bottom: 0;
}

.radio-group input[type="radio"] {
  cursor: pointer;
}

.temperature-control {
  padding: 16px;
  background: #f8fafc;
  border-radius: 6px;
}

.temperature-control label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

.temperature-control input[type="range"] {
  width: 100%;
  margin: 8px 0;
}

.measurements-section {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.current-components {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(416px, 1fr));
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

.component-params {
  margin: 12px 0;
  padding: 12px;
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.params-column {
  display: flex;
  justify-content: space-around;
}

.param-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
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
  width: 80px;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
  appearance: textfield;
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

.charts-section {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-top: 20px;
}

.charts-section h4 {
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e5e7eb;
}

.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 24px;
}

.chart-card {
  background: #f9fafb;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.chart-card h5 {
  margin-bottom: 16px;
  color: #374151;
  font-size: 16px;
  text-align: center;
}

.chart-wrapper {
  position: relative;
  height: 350px;
  width: 100%;
}

.chart-canvas {
  width: 100% !important;
  height: 100% !important;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #4b5563;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.metal-color {
  background-color: rgba(54, 162, 235, 1);
}

.semiconductor-color {
  background-color: rgba(255, 99, 132, 1);
}

.snapshots-table {
  margin: 16px 0;
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
}

button:hover {
  background: #4338ca;
  transform: translateY(-1px);
}

button:active {
  transform: translateY(0);
}

button:nth-child(3) {
  background: #10b981;
}

button:nth-child(3):hover {
  background: #0da271;
}

@media (max-width: 1900px) {
  .circuit-container {
    flex-direction: column;
  }
}

@media (max-width: 1300px) {
  .circuit-3d-container {
    flex-direction: column-reverse;
  }

  .controls-panel {
    width: 100%;
  }

  .controls-panel-wrapper {
    display: flex;
    justify-content: space-around;
  }

  .scene-container {
    width: 100%;
  }

  .charts-container {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .current-components {
    display: flex;
    flex-direction: column;
  }

  .controls-panel-wrapper,
  .param-row,
  .param-controls {
    flex-direction: column;
  }

  .charts-container {
    grid-template-columns: 1fr;
  }

  .chart-wrapper {
    height: 250px;
  }
}
</style>