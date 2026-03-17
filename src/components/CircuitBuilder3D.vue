<template>
  <div class="content">
    <div class="circuit-container">
      <div class="scene-section">
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
                {{ (loadedModelsCount / totalModelsCount * 100).toFixed(0) }} %
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
          <h4>Компоненты схемы</h4>
          <div class="current-components">
            <!-- Температурный регулятор -->
            <div class="slot-info temperature-control">
              <label><strong>Температура (K)</strong></label>
              <input
                  type="range"
                  min="290"
                  max="390"
                  v-model.number="globalTemp"
                  class="slider"
                  @wheel.prevent="handleWheelScroll"
                  :disabled="!circuitValid"
              />
              <div>{{ globalTemp }} K</div>
            </div>
            <!-- Источник напряжения -->
            <div class="slot-info">
              <strong>Источник напряжения</strong>
              <div class="component-params">
                <div class="param-row">
                  <label class="label-voltage">Напряжение:</label>
                  <div class="param-controls">
                    <input
                        type="range"
                        min="0"
                        max="15"
                        step="0.1"
                        v-model.number="sourceComponent.data.voltage"
                        class="slider"
                        :disabled="!circuitValid"
                    />
                    <input
                        type="number"
                        min="0"
                        max="15"
                        step="0.1"
                        v-model.number="sourceComponent.data.voltage"
                        class="input"
                        :disabled="!circuitValid"
                    />
                    <span class="param-unit">В</span>
                  </div>
                </div>
                <div class="voltage-value">
                  Текущее значение: {{ sourceComponent.data.voltage || 0 }} В
                </div>
              </div>
            </div>
            <!-- Амперметр -->
            <div class="slot-info">
              <strong>Амперметр</strong>
              <div class="component-params">
                <div class="param-info">
                  <div v-if="circuitValid && currentI !== null">
                    Текущий ток: {{ currentI.toFixed(4) }} А
                  </div>
                  <div v-else>
                    Нет данных для расчёта тока
                  </div>
                </div>
              </div>
            </div>

            <div style="margin-top:8px;display:flex;flex-direction:column;gap:8px;align-items:stretch">
              <button
                  @click="saveSnapshot"
                  :disabled="!circuitValid"
                  class="save-button"
              >Сохранить показания</button>
              <button @click="resetValues">Сброс</button>
              <button @click="checkCircuit">Проверить схему</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="readings-container">
      <h4>Сохранённые показания</h4>
      <div class="snapshots-table">
        <table>
          <thead>
          <tr>
            <th>Напряжение (В)</th>
            <th>Ток (А)</th>
            <th>Сопротивление (Ом)</th>
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
    </div>

    <ErrorPopup
        v-if="popup.visible"
        :message="popup.message"
        :type="popup.type"
        @close="popup.visible = false"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref, reactive, watch, nextTick } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshStandardMaterial, CatmullRomCurve3, TubeGeometry } from 'three';
import { Chart, registerables } from 'chart.js';
import NotificationPopup from './NotificationPopup.vue';

// Импортируем конфигурацию из отдельного файла
import { decorativeConfigs, modelPaths } from '../config/3d-models';

Chart.register(...registerables);

// Типы для 3D объектов
type Component3D = {
  type: string;
  model: THREE.Object3D | null;
  data: any;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
};

export default defineComponent({
  name: 'CircuitBuilder3D',
  components: {
    ErrorPopup: NotificationPopup,
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
    const selectedThermistorKind = ref('metal');
    const showShadows = ref(true);
    const voltageSpinner = ref<THREE.Object3D | null>(null);
    const thermistorSpinner = ref<THREE.Object3D | null>(null);

    // Состояние загрузки
    const isLoading = ref(true);
    const loadedModelsCount = ref(0);
    const totalModelsCount = ref(0);
    const loadingProgress = ref(0);

    // Компоненты схемы (фиксированные)
    const sourceComponent = reactive<Component3D>({
      type: 'source',
      model: null,
      data: {
        type: 'source',
        kind: 'source',
        voltage: 0
      },
      position: new THREE.Vector3(-0.75, 0, 0),
      rotation: new THREE.Euler(0, -Math.PI / 2, 0),
      scale: 1.5
    });

    const thermistorComponent = reactive<Component3D>({
      type: 'thermistor',
      model: null,
      data: {
        type: 'thermistor',
        kind: 'metal',
        R0: 100,
        alpha: 0.0039
      },
      position: new THREE.Vector3(0.75, 0, 0),
      rotation: new THREE.Euler(0, -Math.PI / 2, 0),
      scale: 1.2
    });

    const ammeterComponent = reactive<Component3D>({
      type: 'amm',
      model: null,
      data: {
        type: 'amm',
        kind: 'amm'
      },
      position: new THREE.Vector3(-0.75, 0.325, 0),
      rotation: new THREE.Euler(0, -Math.PI / 2, 0),
      scale: 1
    });

    const snapshots = ref<any[]>([]);
    const decorativeElements = ref<THREE.Object3D[]>([]); // Храним ссылки на декоративные элементы

    // Карта для быстрого доступа к декоративным элементам по имени
    const decorativeElementsMap = ref<Map<string, THREE.Object3D>>(new Map());

    // Для выделения портов
    const selectedPortName = ref<string | null>(null);
    const portMeshes = ref<THREE.Mesh[]>([]);
    const meshToPortMap = ref<Map<THREE.Mesh, string>>(new Map());

    // Для хранения созданных проводов, коннекторов и состояния выбора первого порта
    const wires = ref<THREE.Mesh[]>([]);
    const connectors = ref<Array<{ wire: THREE.Mesh, connector1: THREE.Object3D, connector2: THREE.Object3D }>>([]);
    const firstSelectedPort = ref<string | null>(null);

    // Массив соединений (какие порты соединены)
    const connections = ref<Array<{port1: string, port2: string}>>([]);

    // Состояние проверки схемы
    const circuitValid = ref(false); // пройдена ли проверка
    const circuitType = ref<'metal' | 'semiconductor' | null>(null); // тип схемы после проверки

    // Константы
    const CONNECTOR_MODEL_PATH = './models/connector.glb';
    const CONNECTOR_SCALE = 0.1; // масштаб модели коннектора
    const CONNECTOR_OFFSET = 0.075; // смещение точки крепления провода от центра коннектора

    // Хранение обработчика
    let mouseMoveHandler: ((event: MouseEvent) => void) | null = null;

    // Состояние нажатых клавиш
    const keysPressed = ref<Set<string>>(new Set());

    // Для расчёта delta времени
    let clock: THREE.Clock | null = null;

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

    // Функция загрузки
    const modelCache = new Map<string, THREE.Object3D>();
    async function loadModelWithCache(path: string): Promise<THREE.Object3D | null> {
      // Проверяем кэш
      if (modelCache.has(path)) {
        const cached = modelCache.get(path);
        return cached ? cached.clone() : null; // Клонируем, если нужно несколько экземпляров
      }

      try {
        const gltf = await new Promise<any>((resolve, reject) => {
          loader!.load(path, resolve, undefined, reject);
        });

        const model = gltf.scene;
        // Настраиваем тени и другие общие свойства
        model.traverse((child: THREE.Mesh) => {
          child.castShadow = showShadows.value;
          child.receiveShadow = showShadows.value;
        });

        // Сохраняем в кэше
        modelCache.set(path, model);

        return model.clone(); // Клонируем для использования
      } catch (error) {
        console.warn(`Не удалось загрузить модель ${path}:`, error);
        return null;
      }
    }

    // Функция для добавления декоративных элементов
    async function addDecorativeElements() {
      if (!scene || !loader) return;

      // Увеличиваем общее количество моделей
      totalModelsCount.value += decorativeConfigs.length;

      for (const config of decorativeConfigs) {
        try {
          const gltf = await loadModelWithCache(config.path);
          if (!gltf) {
            break;
          }

          const model = gltf;

          // Настройка модели
          model.position.copy(config.position);
          model.rotation.copy(config.rotation);
          model.scale.set(config.scale, config.scale, config.scale);

          // Настройка теней
          model.traverse((child: THREE.Object3D) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = config.shadowEnabled && showShadows.value;
              child.receiveShadow = config.shadowEnabled && showShadows.value;
            }
          });

          scene.add(model);
          decorativeElements.value.push(model);
          // Сохраняем в карту по имени
          decorativeElementsMap.value.set(config.name, model);

          // Сохраняем ссылки на спиннеры
          if (config.name === 'spinner_for_voltage_2') {
            voltageSpinner.value = model;
          } else if (config.name === 'spinner_for_thermistor') {
            thermistorSpinner.value = model;
          }

          // Если это порт, обрабатываем его меши для кликабельности и уникальности материалов
          if (config.name.includes('port')) {
            // Проходим по всем дочерним мешам
            model.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                // Клонируем материал, чтобы он был уникальным для этого порта
                if (mesh.material) {
                  if (Array.isArray(mesh.material)) {
                    mesh.material = mesh.material.map(mat => mat.clone());
                  } else {
                    mesh.material = mesh.material.clone();
                  }
                }
                // Добавляем меш в массив для рейкастинга
                portMeshes.value.push(mesh);
                meshToPortMap.value.set(mesh, config.name);
              }
            });
          }

          incrementLoadedModels();

        } catch (error) {
          console.warn(`Не удалось загрузить декоративную модель ${config.name}:`, error);
          // Создаем простую геометрию в качестве заглушки
          const fallback = createFallbackDecorative(config.name);
          if (fallback) {
            scene.add(fallback);
            decorativeElements.value.push(fallback);
            // Сохраняем и заглушку
            decorativeElementsMap.value.set(config.name, fallback);

            // Сохраняем ссылки для заглушек тоже
            if (config.name === 'spinner_for_voltage_2') {
              voltageSpinner.value = fallback;
            } else if (config.name === 'spinner_for_thermistor') {
              thermistorSpinner.value = fallback;
            }

            // Если это порт, обрабатываем заглушку
            if (config.name.includes('port')) {
              fallback.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                  const mesh = child as THREE.Mesh;
                  // Клонируем материал
                  if (mesh.material) {
                    if (Array.isArray(mesh.material)) {
                      mesh.material = mesh.material.map(mat => mat.clone());
                    } else {
                      mesh.material = mesh.material.clone();
                    }
                  }
                  portMeshes.value.push(mesh);
                  meshToPortMap.value.set(mesh, config.name);
                }
              });
            }

            incrementLoadedModels();
          }
        }
      }
    }

    // Функция для вращения спиннера источника напряжения
    function updateVoltageSpinnerRotation() {
      if (!voltageSpinner.value) return;

      const voltage = sourceComponent.data.voltage || 0;
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
      thermistorSpinner.value.rotation.y = 4*Math.PI/10 + rotationAngle;
    }

    // Следим за изменением напряжения
    watch(() => sourceComponent.data.voltage, () => {
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
    /*function toggleShadows() {
      showShadows.value = !showShadows.value;
      updateShadows();
    }*/

    // Функция для обновления теней во всех объектах сцены
    /*function updateShadows() {
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
    }*/

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

    // Конфигурации для дисплеев
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
      const valid = circuitValid.value;

      // Дисплей температуры на терморезисторе
      updateDisplayText(
          thermistorDisplay.value,
          valid ? `${globalTemp.value}` : '',
          displayConfigs.find(c => c.name === 'thermistor_display')
      );

      // Дисплей напряжения на вольтметре
      const voltage = valid ? (sourceComponent.data.voltage || 0) : 0;
      updateDisplayText(
          voltmeterDisplay.value,
          valid ? `${voltage.toFixed(2)}` : '',
          displayConfigs.find(c => c.name === 'voltmeter_display_top')
      );

      // Дисплей тока на амперметре
      const current = valid ? calculateCurrent() : null;
      updateDisplayText(
          ammeterDisplay.value,
          valid && current !== null ? `${current.toFixed(2)}` : '',
          displayConfigs.find(c => c.name === 'ammeter_display_bottom')
      );
    }

    // Вычисление текущего тока в цепи
    function calculateCurrent(): number | null {
      const V = sourceComponent.data.voltage || 0;
      const R = calculateCurrentResistance(thermistorComponent.data);

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
            x: parseFloat(s.V),
            y: parseFloat(s.I || 0)
          }));

      const semiData = filteredSnapshots
          .filter(s => s.thermistorType === 'semiconductor')
          .map(s => ({
            x: parseFloat(s.V),
            y: parseFloat(s.I || 0)
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
                  label += `U = ${point.x?.toFixed(2)} В, I = ${point.y?.toFixed(4)} А`;
                  return label;
                }
              }
            }
          },
          scales: {
            x: {
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
              min: 1.5,
              max: 4.5,
            },
            y: {
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
              },
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
                text: 'Сопротивление R, Ом',
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

    const hoveredPortName = ref<string | null>(null);

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

      const mouseMoveHandler = (event: MouseEvent) => {
        if (!renderer || !camera || !scene) return;

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects(portMeshes.value);

        if (intersects.length > 0) {
          const hitMesh = intersects[0]?.object as THREE.Mesh;
          const portName = meshToPortMap.value.get(hitMesh);
          if (portName) {
            if (hoveredPortName.value !== portName) {
              // Сброс предыдущего hover
              if (hoveredPortName.value) {
                const prevPort = decorativeElementsMap.value.get(hoveredPortName.value);
                if (prevPort && firstSelectedPort.value !== hoveredPortName.value) {
                  setPortEmissive(prevPort, 0x000000);
                }
              }
              // Установка нового hover, если порт не выделен
              if (firstSelectedPort.value !== portName) {
                const newPort = decorativeElementsMap.value.get(portName);
                if (newPort) {
                  setPortEmissive(newPort, 0x333333); // серый цвет свечения
                }
              }
              hoveredPortName.value = portName;
            }
            return; // выход после обработки
          }
        }

        // Если пересечений нет или порт не найден
        if (hoveredPortName.value) {
          const prevPort = decorativeElementsMap.value.get(hoveredPortName.value);
          if (prevPort && firstSelectedPort.value !== hoveredPortName.value) {
            setPortEmissive(prevPort, 0x000000);
          }
          hoveredPortName.value = null;
        }
      };

      renderer.domElement.addEventListener('mousemove', mouseMoveHandler);

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

      // Обработчик клика для выделения портов и создания проводов
      const onClick = async (event: MouseEvent) => {
        if (!renderer || !camera || !scene) return;

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        // Вычисляем координаты мыши в нормализованных координатах (-1 до 1)
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // Проверяем пересечения с мешами портов
        const intersects = raycaster.intersectObjects(portMeshes.value);

        if (intersects.length > 0) {
          // Берем первый меш, находим имя порта
          const hitMesh = intersects[0]?.object as THREE.Mesh;
          const portName = meshToPortMap.value.get(hitMesh);
          if (!portName) return;

          // Проверяем, занят ли порт (участвует ли уже в соединении)
          const isPortUsed = (port: string) =>
              connections.value.some(conn => conn.port1 === port || conn.port2 === port);

          if (firstSelectedPort.value === null) {
            // Первый клик - выбираем порт
            if (isPortUsed(portName)) {
              showPopup('Этот порт уже занят', 'error');
              return; // не выделяем занятый порт
            }
            firstSelectedPort.value = portName;
            highlightPort(portName);
          } else if (firstSelectedPort.value === portName) {
            // Клик на тот же порт - снимаем выделение
            firstSelectedPort.value = null;
            highlightPort(null);
          } else {
            // Клик на другой порт - проверяем, свободны ли оба
            const port1 = firstSelectedPort.value;
            const port2 = portName;

            if (isPortUsed(port1) || isPortUsed(port2)) {
              showPopup('Один из портов уже занят', 'error');
              // Снимаем выделение
              firstSelectedPort.value = null;
              highlightPort(null);
              return;
            }

            // Оба свободны - создаём провод
            await createWireBetweenPorts(port1, port2);
            firstSelectedPort.value = null;
            highlightPort(null);
          }
        } else {
          // Клик не по порту - снимаем выделение и сбрасываем hover
          firstSelectedPort.value = null;
          highlightPort(null);

          // Сброс hover
          if (hoveredPortName.value) {
            const prevPort = decorativeElementsMap.value.get(hoveredPortName.value);
            if (prevPort) setPortEmissive(prevPort, 0x000000);
            hoveredPortName.value = null;
          }
        }
      };

      renderer.domElement.addEventListener('click', onClick);
    }

    // Инициализация всех компонентов схемы
    async function initComponents() {
      if (!scene) return;

      // Увеличиваем общее количество моделей для основных компонентов
      totalModelsCount.value += 3;

      // Добавляем все компоненты сразу
      await addComponentToScene(sourceComponent);
      await addComponentToScene(thermistorComponent);
      await addComponentToScene(ammeterComponent);
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

      if (keysPressed.value.size > 0 && camera && controls) {
        const delta = clock!.getDelta();
        const speed = 0.5; // единиц в секунду – подберите под свой масштаб
        const moveDist = speed * delta;

        // Направление "вперёд" (без учёта вертикальной составляющей)
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        if (forward.lengthSq() < 0.001) {
          // Если камера смотрит строго вверх/вниз – используем направление по умолчанию
          forward.set(0, 0, -1);
        } else {
          forward.normalize();
        }

        // Направление "вправо" (перпендикулярно forward и глобальной оси Y)
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        // Вектор перемещения
        const move = new THREE.Vector3(0, 0, 0);

        // WASD и стрелки
        if (keysPressed.value.has('KeyW') || keysPressed.value.has('ArrowUp')) move.add(forward);
        if (keysPressed.value.has('KeyS') || keysPressed.value.has('ArrowDown')) move.sub(forward);
        if (keysPressed.value.has('KeyA') || keysPressed.value.has('ArrowLeft')) move.sub(right);
        if (keysPressed.value.has('KeyD') || keysPressed.value.has('ArrowRight')) move.add(right);
        if (keysPressed.value.has('KeyQ')) move.y -= 1;
        if (keysPressed.value.has('KeyE')) move.y += 1;

        if (move.lengthSq() > 0) {
          move.normalize().multiplyScalar(moveDist);
          camera.position.add(move);
          controls.target.add(move);
        }
      }
    }

    // Обработка изменения размера окна
    function onWindowResize() {
      if (!sceneContainer.value || !camera || !renderer) return;

      camera.aspect = sceneContainer.value.clientWidth / sceneContainer.value.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(sceneContainer.value.clientWidth, sceneContainer.value.clientHeight);
    }

    // Функция загрузки модели с использованием импортированных путей
    async function loadModelForType(type: string, kind?: string): Promise<THREE.Object3D | null> {
      if (!loader) return null;

      try {
        // Получаем путь из modelPaths, импортированного сверху
        const modelPath = modelPaths[type as keyof typeof modelPaths];
        if (!modelPath) return null;

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

    // Добавление компонента на сцену
    async function addComponentToScene(component: Component3D) {
      if (!scene) return false;

      // Загружаем 3D модель или создаем запасной вариант
      let model = await loadModelForType(component.type, component.data.kind);

      if (!model) {
        model = createFallbackGeometry(component.type, component.data.kind);
      }

      // Настройка модели
      model.traverse((child) => {
        child.castShadow = showShadows.value;
        child.receiveShadow = showShadows.value;
      });

      model.scale.set(component.scale, component.scale, component.scale);
      model.position.copy(component.position);
      model.rotation.copy(component.rotation);

      const initialScale = 0.1;
      model.scale.set(initialScale, initialScale, initialScale);
      scene.add(model);

      // Обновляем модель компонента
      component.model = model;

      // Увеличиваем счетчик загруженных моделей для этого компонента
      incrementLoadedModels();

      // Обновляем ток после добавления компонента
      updateCurrent();

      // Обновляем графики после добавления компонента
      updateCharts();

      return true;
    }

    // Обновление типа терморезистора при изменении радиокнопки
    function updateThermistorKind() {
      // Обновляем данные компонента
      thermistorComponent.data.kind = selectedThermistorKind.value;

      // Обновляем параметры по умолчанию в зависимости от типа
      if (selectedThermistorKind.value === 'metal') {
        thermistorComponent.data.R0 = 100;
        thermistorComponent.data.alpha = 0.0039;
        thermistorComponent.data.B = undefined;
      } else {
        thermistorComponent.data.R0 = 1000;
        thermistorComponent.data.alpha = undefined;
        thermistorComponent.data.B = 3500;
      }

      updateCurrent();
      updateCharts();
    }

    // Сохранение измерений
    function saveSnapshot() {
      if (!circuitValid.value || !circuitType.value) {
        return;
      }

      const V = sourceComponent.data.voltage || 0;
      const T = globalTemp.value;
      let Rsample = calculateCurrentResistance(thermistorComponent.data);

      // Используем тип, определённый при проверке схемы
      const snapshot: any = {
        V: V.toFixed(2),
        R: isNaN(Rsample) ? '—' : Rsample.toFixed(2),
        T,
        thermistorType: circuitType.value
      };

      const I = calculateCurrent();
      snapshot.I = I !== null ? I.toFixed(4) : '—';

      snapshots.value.unshift(snapshot);

      // Автоматически обновляем графики после добавления новой записи
      updateCharts();
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
      sourceComponent.data.voltage = 0;

      // Сбрасываем температуру
      globalTemp.value = 300;

      // Сбрасываем параметры терморезистора к значениям по умолчанию
      selectedThermistorKind.value = 'metal';
      updateThermistorKind();

      // Сбрасываем камеру к начальной позиции
      if (camera && controls) {
        controls.target.set(0, 0, 0);
        camera.position.set(0, 3, 5);
        controls.update();
      }

      // Снимаем выделение порта
      firstSelectedPort.value = null;
      highlightPort(null);

      // Удаляем все провода и коннекторы из сцены
      if (scene) {
        // Удаляем все объекты с userData.type = 'wire' или 'connector'
        const objectsToRemove: THREE.Object3D[] = [];
        scene.traverse((obj) => {
          if (obj.userData.type === 'wire' || obj.userData.type === 'connector') {
            objectsToRemove.push(obj);
          }
        });
        objectsToRemove.forEach(obj => {
          scene?.remove(obj);
          // Освобождаем ресурсы (геометрии, материалы)
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach(m => m.dispose());
              } else {
                mesh.material.dispose();
              }
            }
          }
        });
      }

      // Очищаем список соединений
      wires.value = [];
      connectors.value = [];
      connections.value = [];

      // Сбрасываем состояние проверки
      circuitValid.value = false;
      circuitType.value = null;

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

    const popup = reactive({
      visible: false,
      message: '',
      type: 'error' as 'error' | 'success'
    });

    function showPopup(message: string, type: 'error' | 'success' = 'error') {
      popup.message = message;
      popup.type = type;
      popup.visible = true;
    }

    function handleKeyDown(event: KeyboardEvent) {
      // Игнорируем события, если фокус на поле ввода
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const code = event.code;
      // Список отслеживаемых физических кодов клавиш
      const relevantCodes = [
        'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE',
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
      ];

      if (relevantCodes.includes(code)) {
        event.preventDefault();
        keysPressed.value.add(code);
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      const code = event.code;
      keysPressed.value.delete(code);
    }

    // Функция создания гнущихся проводов с коннекторами
    const WIRE_COLORS = [0xff0000, 0xffa500, 0xffa5c00, 0xffff00, 0x0000ff];
    async function createWireBetweenPorts(portName1: string, portName2: string) {
      if (!scene || !loader) return;

      // Проверяем, остались ли доступные цвета
      if (wires.value.length >= WIRE_COLORS.length) {
        showPopup('Достигнуто максимальное количество проводов', 'error');
        return;
      }

      const map = decorativeElementsMap.value;
      const portObj1 = map.get(portName1);
      const portObj2 = map.get(portName2);
      if (!portObj1 || !portObj2) return;

      // Получаем позиции и кватернионы портов
      const pos1 = portObj1.position.clone();
      const pos2 = portObj2.position.clone();
      const quat1 = portObj1.quaternion.clone();
      const quat2 = portObj2.quaternion.clone();

      // Направления осей портов (предполагаем, что коннектор должен быть направлен по +Z)
      const dir1 = new THREE.Vector3(1, 0, 0).applyQuaternion(quat1);
      const dir2 = new THREE.Vector3(1, 0, 0).applyQuaternion(quat2);

      // Загружаем модель коннектора (используем кэш)
      const connectorModel = await loadModelWithCache(CONNECTOR_MODEL_PATH);
      if (!connectorModel) {
        console.warn('Не удалось загрузить модель коннектора');
        return;
      }

      // Создаём и настраиваем коннекторы
      const connector1 = connectorModel.clone();
      const connector2 = connectorModel.clone();

      [connector1, connector2].forEach(conn => {
        conn.traverse(child => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = showShadows.value;
            child.receiveShadow = showShadows.value;
          }
        });
      });

      connector1.scale.set(CONNECTOR_SCALE, CONNECTOR_SCALE, CONNECTOR_SCALE);
      connector2.scale.set(CONNECTOR_SCALE, CONNECTOR_SCALE, CONNECTOR_SCALE);

      // Размещаем в позициях портов и применяем их повороты
      connector1.position.copy(pos1);
      connector2.position.copy(pos2);
      connector1.quaternion.copy(quat1);
      connector2.quaternion.copy(quat2);

      scene.add(connector1);
      scene.add(connector2);

      // Точки крепления провода – концы коннекторов (смещение вдоль направления порта)
      const start = pos1.clone().add(dir1.multiplyScalar(CONNECTOR_OFFSET));
      const end = pos2.clone().add(dir2.multiplyScalar(CONNECTOR_OFFSET));


      // Создаём изогнутый провод
      const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
      mid.z = 0.8; // изгиб

      const curve = new CatmullRomCurve3([start, mid, end]);
      const tubeGeo = new TubeGeometry(curve, 64, 0.0075, 8, false);
      const color = WIRE_COLORS[wires.value.length];
      const material = new THREE.MeshStandardMaterial({ color });
      const wire = new THREE.Mesh(tubeGeo, material);

      wire.castShadow = showShadows.value;
      wire.receiveShadow = showShadows.value;

      scene.add(wire);

      // Сохраняем всё
      wires.value.push(wire);
      connectors.value.push({ wire, connector1, connector2 });

      // Сохраняем соединение
      connections.value.push({ port1: portName1, port2: portName2 });

      wire.userData = { type: 'wire' };
      connector1.userData = { type: 'connector' };
      connector2.userData = { type: 'connector' };
    }

    // Функции для выделения портов
    function highlightPort(portName: string | null) {
      // Сначала снимаем выделение с предыдущего порта
      if (selectedPortName.value) {
        const prevPort = decorativeElementsMap.value.get(selectedPortName.value);
        if (prevPort) {
          setPortEmissive(prevPort, 0x000000);
        }
      }

      // Если передан новый порт, выделяем его
      if (portName) {
        const newPort = decorativeElementsMap.value.get(portName);
        if (newPort) {
          setPortEmissive(newPort, 0x444400); // желтоватое свечение
        }
        selectedPortName.value = portName;
      } else {
        selectedPortName.value = null;
      }
    }

    function setPortEmissive(portObject: THREE.Object3D, colorHex: number) {
      portObject.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.material) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach(mat => {
              if (mat instanceof MeshStandardMaterial) {
                mat.emissive.setHex(colorHex);
              }
            });
          }
        }
      });
    }

    // Функция проверки схемы
    function checkCircuit() {
      const requiredPairsMetal = [
        ['port_1_1', 'port_thermistor_16'],
        ['port_1_2', 'port_2_4'],
        ['port_1_3', 'port_thermistor_15'],
        ['port_1_4', 'port_thermistor_17'],
        ['port_2_3', 'port_thermistor_12']
      ];

      const requiredPairsSemiconductor = [
        ['port_1_1', 'port_thermistor_14'],
        ['port_1_2', 'port_2_4'],
        ['port_1_3', 'port_thermistor_13'],
        ['port_1_4', 'port_thermistor_17'],
        ['port_2_3', 'port_thermistor_12']
      ];

      const allPresentMetal = requiredPairsMetal.every(([a, b]) => {
        return connections.value.some(conn =>
            (conn.port1 === a && conn.port2 === b) || (conn.port1 === b && conn.port2 === a)
        );
      });

      const allPresentSemiconductor = requiredPairsSemiconductor.every(([a, b]) => {
        return connections.value.some(conn =>
            (conn.port1 === a && conn.port2 === b) || (conn.port1 === b && conn.port2 === a)
        );
      });

      if (allPresentMetal) {
        circuitValid.value = true;
        circuitType.value = 'metal';
        showPopup('Схема собрана верно для металлического терморезистора', 'success');
      } else if (allPresentSemiconductor) {
        circuitValid.value = true;
        circuitType.value = 'semiconductor';
        showPopup('Схема собрана верно для полупроводникового терморезистора', 'success');
      } else {
        circuitValid.value = false;
        circuitType.value = null;
        showPopup('Схема собрана неверно', 'error');
      }
    }

    // Следим за изменением типа терморезистора
    watch(selectedThermistorKind, updateThermistorKind);

    // Следим за изменением параметров для обновления графиков
    watch(() => thermistorComponent.data, () => {
      updateCharts();
    }, { deep: true });

    watch(() => sourceComponent.data.voltage, () => {
      updateCharts();
    });

    // При изменении соединений сбрасываем статус проверки
    watch(connections, () => {
      circuitValid.value = false;
      circuitType.value = null;
    }, { deep: true });

    // Хуки жизненного цикла
    onMounted(() => {
      initThreeJS();
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      clock = new THREE.Clock();
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

      // Удаляем все провода
      if (scene) {
        wires.value.forEach(wire => {
          scene?.remove(wire);
          if (wire.geometry) wire.geometry.dispose();
          if (wire.material) {
            if (Array.isArray(wire.material)) {
              wire.material.forEach(m => m.dispose());
            } else {
              wire.material.dispose();
            }
          }
        });
        wires.value = [];

        // Удаляем коннекторы
        connectors.value.forEach(item => {
          scene?.remove(item.connector1);
          scene?.remove(item.connector2);
          // Очистка ресурсов
          [item.connector1, item.connector2].forEach(conn => {
            conn.traverse((obj: any) => {
              if (obj.geometry) obj.geometry.dispose();
              if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose());
                else obj.material.dispose();
              }
            });
          });
        });
        connectors.value = [];
      }

      // Удаляем обработчик наведения мыши
      if (renderer && mouseMoveHandler) {
        renderer.domElement.removeEventListener('mousemove', mouseMoveHandler);
      }

      // Очищаем соединения
      connections.value = [];

      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);

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
      popup,
      snapshots,
      currentI,
      selectedThermistorKind,
      showShadows,
      voltageSpinner,
      thermistorSpinner,
      sourceComponent,
      thermistorComponent,
      keysPressed,

      // Состояние загрузки
      isLoading,
      loadedModelsCount,
      totalModelsCount,
      loadingProgress,

      // Состояние проверки
      circuitValid,
      circuitType,

      // Methods
      handleWheelScroll,
      saveSnapshot,
      resetValues,
      //calculateCurrentResistance,
      //toggleShadows,
      getThermistorTypeLabel,
      checkCircuit,
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

.content {
  padding: 30px;

  height: calc(100vh - 100px);
  margin-top: 100px;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  scroll-padding: 30px;

  display: flex;
  flex-direction: column;
  gap: 60px;

  opacity: 0;
  transform: translateY(40px);
  transition: opacity 0.6s ease-out 0.4s, transform 0.6s ease-out 0.4s;

  /*
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  scroll-padding: 100px;
  */
}


.header--loaded ~ .content {
  opacity: 1;
  transform: translateY(0px);
}

.circuit-container {
  min-height: calc(100vh - 160px);

  scroll-snap-align: start;
  display: flex;
  gap: 20px;
}

.readings-container {
  min-height: calc(100vh - 160px);
  scroll-snap-align: start;

  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);

  overflow-y: auto;
}

/*.controls-panel {
  width: 250px;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  position: relative;
}*/

.scene-section {
  flex: 1;
  position: relative;
  width: calc(100vw - 900px);
}

.three-scene {
  width: 100%;
  height: 100%;
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

/*.shadow-control {
  margin-bottom: 20px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
}*/

.shadow-control label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

/*.shadow-toggle-btn {
  width: 100%;
  margin-top: 0;
}*/

/*.thermistor-type-selector {
  margin-bottom: 20px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
}*/

.thermistor-type-selector label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

/*.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}*/

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
  overflow-y: auto;
}

.current-components {
  display: grid;
  /*grid-template-columns: repeat(auto-fit, minmax(416px, 1fr));
  */gap: 16px;
  margin-top: 12px;
}

.slot-info {
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.component-params {
  margin: 12px 0;
  padding: 12px;
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

/*.params-column {
  display: flex;
  justify-content: space-around;
}*/

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

.slider:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
  appearance: textfield;
}

.input:disabled {
  background-color: #f0f0f0;
  color: #999;
  cursor: not-allowed;
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
  grid-template-rows: 1fr;
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
  height: 70%;
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
  overflow-y: scroll;
  height: 30%;
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
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

button:not(.save-button) {
  background: #4f46e5;
}

button:not(.save-button):hover {
  background: #4338ca;
  transform: translateY(-1px);
}

button:not(.save-button):active {
  transform: translateY(0);
}

button:nth-child(3) {
  background: #10b981;
}

button:nth-child(3):hover {
  background: #0da271;
}

button.save-button {
  background: #4f46e5;
  opacity: 0.6;
  cursor: not-allowed;
}

button.save-button:enabled {
  background: #10b981;
  opacity: 1;
  cursor: pointer;
}

button.save-button:enabled:hover {
  background: #0da271;
  transform: translateY(-1px);
}

button.save-button:enabled:active {
  transform: translateY(0);
}

@media (max-width: 1900px) {
  .content {
    flex-direction: column;
  }
}

@media (max-width: 1300px) {
  /*
  .circuit-container {
    flex-direction: column-reverse;
  }
  */

  /*.controls-panel {
    width: 100%;
  }*/

  /*.controls-panel-wrapper {
    display: flex;
    justify-content: space-around;
  }*/

  /*.scene-section {
    width: 100%;
  }*/

  .charts-container {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .label-voltage {
    display: none;
  }
}

@media (max-width: 700px) {
  .content {
    padding: 20px;
  }

  .current-components {
    display: flex;
    flex-direction: column;
  }

  .measurements-section {
    display: none;
  }

  /*.controls-panel-wrapper,*/
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