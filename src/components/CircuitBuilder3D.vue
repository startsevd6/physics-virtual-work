<template>
  <div class="content">
    <div class="circuit-container">
      <div class="scene-section">
        <WelcomeScreen
            :visible="welcomeVisible"
            :loaded-count="loadedModelsCount"
            :total-count="totalModelsCount"
            :all-loaded="loadedModelsCount >= totalModelsCount && totalModelsCount > 0"
            @close="handleWelcomeClose"
        />

        <div
            id="scene3d"
            ref="sceneContainer"
            class="three-scene"
            :class="{ 'loading': welcomeVisible }"
        ></div>
      </div>

      <CircuitControlsPanel
          v-model:globalTemp="globalTemp"
          v-model:voltage="sourceComponent.data.voltage"
          :currentI="currentI"
          :circuitValid="circuitValid"
          :sourceEnabled="sourceEnabled"
          :ammeterEnabled="ammeterEnabled"
          :thermistorEnabled="thermistorEnabled"
          @temperature-wheel="handleTemperatureWheel"
          @voltage-wheel="handleVoltageWheel"
          @save-snapshot="saveSnapshot"
          @reset-values="resetValues"
          @delete-all-wires="deleteAllWires"
          @check-circuit="checkCircuit"
          @open-snapshots-modal="showSnapshotsModal = true"
          @open-settings="showSettingsModal = true"
          @toggle-fullscreen="toggleFullscreen"
      />
    </div>

    <SnapshotsModal
        v-model="showSnapshotsModal"
        :snapshots="snapshots"
        :getThermistorTypeLabel="getThermistorTypeLabel"
        @delete="deleteSnapshot"
    />

    <SettingsModal
        v-model="showSettingsModal"
        :settings="settings"
        @apply="applySettings"
    />

    <ErrorPopup
        v-if="popup.visible"
        :message="popup.message"
        :type="popup.type"
        @close="popup.visible = false"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, reactive, ref, type Ref, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshStandardMaterial, CubicBezierCurve3, TubeGeometry, Object3D } from 'three';
import NotificationPopup from './NotificationPopup.vue';
import SnapshotsModal from './SnapshotsModal.vue';
import CircuitControlsPanel from './CircuitControlsPanel.vue';
import SettingsModal, { type Settings } from './SettingsModal.vue';
import WelcomeScreen from './WelcomeScreen.vue';

// Импортируем конфигурацию из отдельного файла
import { decorativeConfigs, modelPaths } from '../config/3d-models';

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
    SnapshotsModal,
    CircuitControlsPanel,
    SettingsModal,
    WelcomeScreen,
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
    const globalTemp = ref(300);
    const voltageSpinner = ref<THREE.Object3D | null>(null);
    const thermistorSpinner = ref<THREE.Object3D | null>(null);

    // Состояние загрузки
    const isLoading = ref(true);
    const welcomeVisible = ref(true);
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
    const connectors = ref<Array<{
      wire: THREE.Mesh,
      connector1: THREE.Object3D,
      connector2: THREE.Object3D,
      port1: string,
      port2: string
    }>>([]);
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

    // Состояние нажатых клавиш
    const keysPressed = ref<Set<string>>(new Set());

    // Для расчёта delta времени
    let clock: THREE.Clock | null = null;

    // Переменные для включения приборов
    const sourceEnabled = ref(false);
    const ammeterEnabled = ref(false);
    const thermistorEnabled = ref(false);

    // Список кликабельных элементов (кнопки и рычажок)
    const clickableNames = ['red_button_for_ammeter', 'red_button_for_voltage_source', 'thermistor_lever'];
    const clickableMeshes = ref<THREE.Mesh[]>([]);
    const meshToClickableNameMap = ref<Map<THREE.Mesh, string>>(new Map());
    // Хранилище исходных позиций для анимации утопления
    const originalButtonPositions = ref<Map<string, THREE.Vector3>>(new Map());
    const originalButtonRotations = ref<Map<string, THREE.Euler>>(new Map());

    // Переменные для интерактивных крутилок
    const spinnerMeshes = ref<THREE.Mesh[]>([]);
    const meshToSpinnerMap = ref<Map<THREE.Mesh, 'voltage' | 'thermistor'>>(new Map());
    let activeSpinner: 'voltage' | 'thermistor' | null = null;
    let activeSpinnerModel: THREE.Object3D | null = null; // Модель активной крутилки
    let isDraggingSpinner = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartValue = 0;
    let originalCursorStyle = '';
    // Чувствительность: изменение значения на 1 единицу за количество пикселей
    const VOLTAGE_SENSITIVITY = 10;   // 10 пикселей = 1 В
    const TEMP_SENSITIVITY = 2;       // 2 пикселя = 1 K

    // Хранение оригинальных свойств материалов для hover/active эффектов
    const originalMaterialProps = new Map<THREE.Material, { emissive: number; color?: number }>();

    // Массив для хранения всех созданных коннекторов (для рейкастинга и удаления)
    const connectorMeshes = ref<THREE.Object3D[]>([]);

    // Текущее подсвеченное соединение (провод + оба коннектора)
    let currentHoveredConnection: typeof connectors.value[0] | null = null;

    // ref для отслеживания наведения на крутилку
    const isHoveringSpinner = ref(false);

    // Состояние открытия модального окна с сохранёнными показаниями
    const showSnapshotsModal = ref(false);

    // Реактивные ссылки на источники света и рендерер
    const ambientLightRef = ref<THREE.AmbientLight | null>(null);
    const dirLightRef = ref<THREE.DirectionalLight | null>(null);
    const rendererRef = ref<THREE.WebGLRenderer | null>(null);

    // Настройки
    const showSettingsModal = ref(false);

    // Полноэкранный режим
    const isFullscreen = ref(false);

    const defaultSettings: Settings = {
      shadowsEnabled: true,
      shadowMapSize: 2048,
      antialiasEnabled: true,
      ambientIntensity: 0.6,
      dirLightIntensity: 0.8,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      wireTubularSegments: 16,
      wireRadialSegments: 4,
    };

    const settings = reactive<Settings>({ ...defaultSettings });
    const showShadows = ref(settings.shadowsEnabled);

    // Загрузка сохранённых настроек из localStorage
    function loadSettings() {
      try {
        const saved = localStorage.getItem('circuit3d-settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          Object.assign(settings, parsed);
        }
      } catch (e) {
        console.warn('Не удалось загрузить настройки', e);
      }
    }
    loadSettings();

    // Применение настроек
    function applySettings(newSettings: Settings) {
      Object.assign(settings, newSettings);
      // Сохраняем в localStorage
      localStorage.setItem('circuit3d-settings', JSON.stringify(settings));

      // Применяем тени
      showShadows.value = settings.shadowsEnabled;
      if (rendererRef.value) {
        rendererRef.value.shadowMap.enabled = settings.shadowsEnabled;
        rendererRef.value.setPixelRatio(settings.pixelRatio);
      }
      if (dirLightRef.value) {
        dirLightRef.value.shadow.mapSize.width = settings.shadowMapSize;
        dirLightRef.value.shadow.mapSize.height = settings.shadowMapSize;
        dirLightRef.value.intensity = settings.dirLightIntensity;
      }
      if (ambientLightRef.value) {
        ambientLightRef.value.intensity = settings.ambientIntensity;
      }

      // Обновляем тени у объектов сцены
      updateShadowsForAllObjects();

      // Если изменился antialias – показываем подсказку о перезагрузке
      if (settings.antialiasEnabled !== (rendererRef.value?.getContext()?.getContextAttributes()?.antialias ?? true)) {
        showPopup('Изменение сглаживания вступит в силу после перезагрузки страницы', 'success');
      }
    }

    // Функция обновления теней у всех объектов (адаптированная)
    function updateShadowsForAllObjects() {
      if (!scene) return;
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.castShadow = showShadows.value;
          obj.receiveShadow = showShadows.value;
        }
      });
      // Для декоративных элементов можно оставить как есть (уже учтено)
    }

    // Функция для применения hover-эффекта к модели
    function applyHoverEffect(model: THREE.Object3D, isHover: boolean) {
      // Не применяем hover-эффект к активной крутилке (она в режиме drag)
      if (activeSpinnerModel === model) return;

      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.material) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach(mat => {
              if (mat instanceof MeshStandardMaterial) {
                if (isHover) {
                  // Сохраняем оригинальные свойства, если ещё не сохранены
                  if (!originalMaterialProps.has(mat)) {
                    originalMaterialProps.set(mat, {
                      emissive: mat.emissive.getHex(),
                      color: mat.color.getHex()
                    });
                  }
                  // Применяем эффект наведения
                  mat.emissive.setHex(0x444444);
                  mat.emissiveIntensity = 0.8;
                } else {
                  // Восстанавливаем оригинальные свойства
                  const original = originalMaterialProps.get(mat);
                  if (original) {
                    mat.emissive.setHex(original.emissive);
                    mat.emissiveIntensity = 0;
                    // Цвет не меняем, только если нужно
                  }
                }
              }
            });
          }
        }
      });
    }

    // Функция для применения active-эффекта к модели (для крутилок при перетаскивании)
    function applyActiveEffect(model: THREE.Object3D, isActive: boolean) {
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.material) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach(mat => {
              if (mat instanceof MeshStandardMaterial) {
                if (isActive) {
                  // Сохраняем оригинальные свойства, если ещё не сохранены
                  if (!originalMaterialProps.has(mat)) {
                    originalMaterialProps.set(mat, {
                      emissive: mat.emissive.getHex(),
                      color: mat.color.getHex()
                    });
                  }
                  // Применяем активный эффект (яркое свечение)
                  mat.emissive.setHex(0xff6600);
                  mat.emissiveIntensity = 1.2;
                } else {
                  // Восстанавливаем оригинальные свойства
                  const original = originalMaterialProps.get(mat);
                  if (original) {
                    mat.emissive.setHex(original.emissive);
                    mat.emissiveIntensity = 0;
                  }
                }
              }
            });
          }
        }
      });
    }

    // Применение hover ко всей группе (провод + оба коннектора)
    function applyConnectionHoverEffect(connection: typeof connectors.value[0], isHover: boolean) {
      if (!connection) return;
      // Применяем к проводу
      if (connection.wire && connection.wire.material) {
        const materials = Array.isArray(connection.wire.material) ? connection.wire.material : [connection.wire.material];
        materials.forEach(mat => {
          if ((mat as any).isMeshStandardMaterial) {
            const stdMat = mat as MeshStandardMaterial;
            if (isHover) {
              stdMat.emissive.setHex(0x333333);
              stdMat.emissiveIntensity = 0.6;
            } else {
              stdMat.emissive.setHex(0x000000);
              stdMat.emissiveIntensity = 0;
            }
          }
        });
      }
      // Применяем к коннекторам
      [connection.connector1, connection.connector2].forEach(conn => {
        if (!conn) return;
        conn.traverse(child => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.material) {
              const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              materials.forEach(mat => {
                if (mat instanceof MeshStandardMaterial) {
                  if (isHover) {
                    mat.emissive.setHex(0x666666);
                    mat.emissiveIntensity = 0.5;
                  } else {
                    mat.emissive.setHex(0x000000);
                    mat.emissiveIntensity = 0;
                  }
                }
              });
            }
          }
        });
      });
    }

    // Функция для обновления прогресса загрузки
    function incrementLoadedModels() {
      loadedModelsCount.value++;
      loadingProgress.value = Math.round((loadedModelsCount.value / totalModelsCount.value) * 100);
    }

    function handleWelcomeClose() {
      welcomeVisible.value = false;
      isLoading.value = false;
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

          // Добавляем меши крутилок в массив для рейкастинга
          if (config.name === 'spinner_for_voltage_2' || config.name === 'spinner_for_thermistor') {
            model.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                // Клонируем материал, чтобы избежать конфликтов
                if (mesh.material) {
                  if (Array.isArray(mesh.material)) {
                    mesh.material = mesh.material.map(mat => mat.clone());
                  } else {
                    mesh.material = mesh.material.clone();
                  }
                }
                spinnerMeshes.value.push(mesh);
                meshToSpinnerMap.value.set(mesh, config.name === 'spinner_for_voltage_2' ? 'voltage' : 'thermistor');
              }
            });
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

          // Обработка кликабельных кнопок/рычажков
          if (clickableNames.includes(config.name)) {
            model.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                if (mesh.material) {
                  if (Array.isArray(mesh.material)) {
                    mesh.material = mesh.material.map(mat => mat.clone());
                  } else {
                    mesh.material = mesh.material.clone();
                  }
                }
                clickableMeshes.value.push(mesh);
                meshToClickableNameMap.value.set(mesh, config.name);
              }
            });
            originalButtonPositions.value.set(config.name, model.position.clone());
            originalButtonRotations.value.set(config.name, model.rotation.clone());
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

            // Добавляем меши крутилок-заглушек
            if (config.name === 'spinner_for_voltage_2' || config.name === 'spinner_for_thermistor') {
              fallback.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                  const mesh = child as THREE.Mesh;
                  if (mesh.material) {
                    if (Array.isArray(mesh.material)) {
                      mesh.material = mesh.material.map(mat => mat.clone());
                    } else {
                      mesh.material = mesh.material.clone();
                    }
                  }
                  spinnerMeshes.value.push(mesh);
                  meshToSpinnerMap.value.set(mesh, config.name === 'spinner_for_voltage_2' ? 'voltage' : 'thermistor');
                }
              });
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

            // Для кликабельных элементов-заглушек
            if (clickableNames.includes(config.name)) {
              fallback.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                  const mesh = child as THREE.Mesh;
                  if (mesh.material) {
                    if (Array.isArray(mesh.material)) {
                      mesh.material = mesh.material.map(mat => mat.clone());
                    } else {
                      mesh.material = mesh.material.clone();
                    }
                  }
                  clickableMeshes.value.push(mesh);
                  meshToClickableNameMap.value.set(mesh, config.name);
                }
              });
              originalButtonPositions.value.set(config.name, fallback.position.clone());
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

    // Возвращает сопротивление терморезистора с учётом состояния прибора и температуры
    function getEffectiveResistance(): number {
      if (!thermistorEnabled.value) {
        // Если терморезистор выключен, используем T = 300K
        const originalTemp = globalTemp.value;
        globalTemp.value = 300;
        const resistance = calculateCurrentResistance(thermistorComponent.data);
        globalTemp.value = originalTemp;
        return resistance;
      } else {
        return calculateCurrentResistance(thermistorComponent.data);
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
      },
      // Дисплей режима на генераторе
      {
        name: 'generator_display_bottom',
        position: new THREE.Vector3(-0.396, 0.049, 0.581),
        rotation: new THREE.Euler(0, 0, 0),
        scale: 0.1,
        width: 0.35,
        height: 0.175,
        fontSize: 80,
        color: "#FF1616"
      }
    ];

    // Добавляем refs для дисплеев
    const thermistorDisplay = ref<THREE.Mesh | null>(null);
    const voltmeterDisplay = ref<THREE.Mesh | null>(null);
    const ammeterDisplay = ref<THREE.Mesh | null>(null);
    const generatorDisplay = ref<THREE.Mesh | null>(null);

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
        } else if (config.name === 'generator_display_bottom') {
          generatorDisplay.value = display;
        }
      });
    }

    // Функция для обновления всех дисплеев
    function updateAllDisplays() {
      const valid = circuitValid.value;

      // Дисплей температуры на терморезисторе (показываем только если терморезистор включён)
      updateDisplayText(
          thermistorDisplay.value,
          valid && thermistorEnabled.value ? `${globalTemp.value}` : '',
          displayConfigs.find(c => c.name === 'thermistor_display')
      );

      // Дисплей напряжения на вольтметре (показываем только если вольтамперметр включён)
      let voltageDisplayValue = '';
      if (valid && ammeterEnabled.value) {
        const voltage = sourceEnabled.value ? (sourceComponent.data.voltage || 0) : 0;
        voltageDisplayValue = `${voltage.toFixed(2)}`;
      }
      updateDisplayText(
          voltmeterDisplay.value,
          voltageDisplayValue,
          displayConfigs.find(c => c.name === 'voltmeter_display_top')
      );

      // Дисплей тока на амперметре (показываем только если вольтамперметр включён)
      let currentDisplayValue = '';
      if (valid && ammeterEnabled.value) {
        const current = calculateCurrent();
        if (current !== null) {
          currentDisplayValue = `${current.toFixed(2)}`;
        }
      }
      updateDisplayText(
          ammeterDisplay.value,
          currentDisplayValue,
          displayConfigs.find(c => c.name === 'ammeter_display_bottom')
      );

      // Дисплей генератора (показывает "0" при включённом источнике)
      updateDisplayText(
          generatorDisplay.value,
          valid && sourceEnabled.value ? '0' : '',
          displayConfigs.find(c => c.name === 'generator_display_bottom')
      );
    }

    // Вычисление текущего тока в цепи
    function calculateCurrent(): number | null {
      // Ток отображается только если включён вольтамперметр
      if (!circuitValid.value || !ammeterEnabled.value) return null;

      // Напряжение: 0 если источник выключен, иначе установленное значение
      const V = sourceEnabled.value ? (sourceComponent.data.voltage || 0) : 0;

      // Сопротивление с учётом состояния терморезистора
      const R = getEffectiveResistance();

      if (R <= 0) return 0;
      return V / R;
    }

    // Свойство для отображения текущего тока
    const currentI = ref<number | null>(null);

    // Функция для обновления текущего тока
    function updateCurrent() {
      currentI.value = calculateCurrent();
    }

    const hoveredPortName = ref<string | null>(null);

    // Переключение состояния прибора
    function toggleDevice(deviceName: string) {
      const obj = decorativeElementsMap.value.get(deviceName);
      if (!obj) return;

      // Определяем, какой прибор
      let enabledFlag: Ref<boolean> | null = null;
      let onToggle: (() => void) | null = null;

      switch (deviceName) {
        case 'red_button_for_voltage_source':
          enabledFlag = sourceEnabled;
          onToggle = () => {
            if (!sourceEnabled.value) {
              sourceComponent.data.voltage = 0;
            }
          };
          break;
        case 'red_button_for_ammeter':
          enabledFlag = ammeterEnabled;
          break;
        case 'thermistor_lever':
          enabledFlag = thermistorEnabled;
          break;
        default:
          return;
      }

      if (enabledFlag) {
        const newState = !enabledFlag.value;

        // Запрещаем включение, если схема не проверена
        if (newState && !circuitValid.value) {
          showPopup('Нельзя включить прибор до проверки схемы', 'error');
          return;
        }

        enabledFlag.value = newState;

        if (onToggle) onToggle();

        // Анимация позиции (общая для всех)
        const originalPos = originalButtonPositions.value.get(deviceName);
        if (originalPos) {
          if (deviceName === 'thermistor_lever') {
            // Рычажок: смещение по Y и Z
            const offsetY = newState ? 0.025 : 0;
            obj.position.y = originalPos.y + offsetY;
            const offsetZ = newState ? 0.135 : 0;
            obj.position.z = originalPos.z + offsetZ;
          } else {
            // Кнопки: смещение по Z (например, утопление внутрь прибора)
            const offsetZ = newState ? -0.01 : 0;
            obj.position.z = originalPos.z + offsetZ;
          }
        }

        // Анимация вращения (только для рычажка)
        if (deviceName === 'thermistor_lever') {
          const originalRot = originalButtonRotations.value.get(deviceName);
          if (originalRot) {
            // Например, при включении наклоняем рычажок вниз (вращение вокруг оси X)
            const angleOffset = newState ? -1.3 : 0; // радианы, подберите нужное значение
            obj.rotation.x = originalRot.x + angleOffset;
            // Можно также добавить rotation.z при необходимости
          }
        }

        // Обновляем дисплеи и ток
        updateAllDisplays();
        updateCurrent();
      }
    }

    // Обработчики для крутилок
    function handleSpinnerWheel(event: WheelEvent, spinnerType: 'voltage' | 'thermistor') {
      event.preventDefault();
      event.stopPropagation();

      if (spinnerType === 'voltage') {
        let newVoltage = sourceComponent.data.voltage + (event.deltaY > 0 ? -0.1 : 0.1);
        newVoltage = Math.min(15, Math.max(0, newVoltage));
        sourceComponent.data.voltage = parseFloat(newVoltage.toFixed(1));
      } else if (spinnerType === 'thermistor') {
        let newTemp = globalTemp.value + (event.deltaY > 0 ? -1 : 1);
        newTemp = Math.min(390, Math.max(290, newTemp));
        globalTemp.value = newTemp;
      }
    }

    function startSpinnerDrag(spinnerType: 'voltage' | 'thermistor', clientX: number, clientY: number) {
      activeSpinner = spinnerType;
      isDraggingSpinner = true;
      dragStartX = clientX;
      dragStartY = clientY;
      dragStartValue = spinnerType === 'voltage' ? sourceComponent.data.voltage : globalTemp.value;

      // Сохраняем модель активной крутилки
      activeSpinnerModel = spinnerType === 'voltage' ? voltageSpinner.value : thermistorSpinner.value;

      // Применяем активный эффект к крутилке
      if (activeSpinnerModel) {
        applyActiveEffect(activeSpinnerModel, true);
      }

      // Отключаем управление камерой
      if (controls) {
        controls.enabled = false;
      }

      if (renderer) {
        originalCursorStyle = renderer.domElement.style.cursor;
        renderer.domElement.style.cursor = 'grabbing';
      }
    }

    function onSpinnerMouseMove(event: MouseEvent) {
      if (!isDraggingSpinner || activeSpinner === null) return;

      const deltaX = event.clientX - dragStartX;
      const deltaY = event.clientY - dragStartY;
      // Используем сумму перемещений по X и Y (можно настроить под конкретную ось)
      const delta = deltaX + deltaY;
      let newValue = dragStartValue;

      if (activeSpinner === 'voltage') {
        let deltaVolts = delta / VOLTAGE_SENSITIVITY;
        newValue = dragStartValue + deltaVolts;
        newValue = Math.min(15, Math.max(0, newValue));
        sourceComponent.data.voltage = parseFloat(newValue.toFixed(1));
      } else if (activeSpinner === 'thermistor') {
        let deltaTemp = delta / TEMP_SENSITIVITY;
        newValue = dragStartValue + deltaTemp;
        newValue = Math.min(390, Math.max(290, newValue));
        globalTemp.value = Math.round(newValue);
      }
    }

    function stopSpinnerDrag() {
      if (isDraggingSpinner) {
        // Снимаем активный эффект с крутилки
        if (activeSpinnerModel) {
          applyActiveEffect(activeSpinnerModel, false);
        }

        isDraggingSpinner = false;
        activeSpinner = null;
        activeSpinnerModel = null;

        // Включаем управление камерой
        if (controls) {
          controls.enabled = true;
        }

        if (renderer) {
          renderer.domElement.style.cursor = originalCursorStyle;
        }
      }
    }

    // Удаление конкретного провода по объекту меша
    function deleteWire(wireMesh: THREE.Mesh) {
      if (!scene) return;

      // Находим провод в массиве (это может быть сам провод или его часть)
      const wireIndex = wires.value.findIndex(w => w === wireMesh);
      if (wireIndex === -1) {
        console.warn('Провод не найден в массиве wires');
        return;
      }

      const connectorData = connectors.value.find(c => c.wire === wireMesh);
      if (!connectorData) {
        console.warn('Коннекторы для провода не найдены');
        return;
      }

      // Сброс hover перед удалением
      if (currentHoveredConnection === connectorData) {
        applyConnectionHoverEffect(currentHoveredConnection, false);
        currentHoveredConnection = null;
      }

      // Удаляем из родительского объекта (не из scene напрямую)
      const removeFromParent = (obj: THREE.Object3D) => {
        if (obj.parent) {
          obj.parent.remove(obj);
        } else {
          scene!.remove(obj);
        }
      };

      removeFromParent(wireMesh);
      removeFromParent(connectorData.connector1);
      removeFromParent(connectorData.connector2);

      // Очистка памяти
      if (wireMesh.geometry) wireMesh.geometry.dispose();
      if (wireMesh.material) {
        if (Array.isArray(wireMesh.material)) {
          wireMesh.material.forEach(m => m.dispose());
        } else {
          wireMesh.material.dispose();
        }
      }

      [connectorData.connector1, connectorData.connector2].forEach(conn => {
        conn.traverse((obj: any) => {
          if (obj.isMesh) {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
              if (Array.isArray(obj.material)) {
                obj.material.forEach((m: any) => m.dispose());
              } else {
                obj.material.dispose();
              }
            }
          }
        });
      });

      // Удаляем из логических массивов
      wires.value.splice(wireIndex, 1);
      const connIndex = connectors.value.findIndex(c => c.wire === wireMesh);
      if (connIndex !== -1) connectors.value.splice(connIndex, 1);

      // Удаляем соединение
      const { port1, port2 } = connectorData;
      const connectionIndex = connections.value.findIndex(conn =>
          (conn.port1 === port1 && conn.port2 === port2) ||
          (conn.port1 === port2 && conn.port2 === port1)
      );
      if (connectionIndex !== -1) connections.value.splice(connectionIndex, 1);

      // Удаляем коннекторы из массива connectorMeshes
      connectorMeshes.value = connectorMeshes.value.filter(
          mesh => mesh !== connectorData.connector1 && mesh !== connectorData.connector2
      );

      // Сброс выделения
      if (firstSelectedPort.value) {
        highlightPort(null);
        firstSelectedPort.value = null;
      }
      if (hoveredPortName.value) {
        const prevPort = decorativeElementsMap.value.get(hoveredPortName.value);
        if (prevPort) setPortEmissive(prevPort, 0x000000);
        hoveredPortName.value = null;
      }

      circuitValid.value = false;
      circuitType.value = null;

      // Принудительный рендер
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    }

    // Функция удаления всех проводов
    function deleteAllWires() {
      if (!scene) return;

      // Сброс hover перед удалением
      if (currentHoveredConnection) {
        applyConnectionHoverEffect(currentHoveredConnection, false);
        currentHoveredConnection = null;
      }

      // Удаляем все объекты с userData.type = 'wire' или 'connector'
      const objectsToRemove: THREE.Object3D[] = [];
      scene.traverse((obj) => {
        if (obj.userData.type === 'wire' || obj.userData.type === 'connector') {
          objectsToRemove.push(obj);
        }
      });
      objectsToRemove.forEach(obj => {
        scene?.remove(obj);
        // Освобождаем ресурсы
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

      // Очищаем массивы
      wires.value = [];
      connectors.value = [];
      connections.value = [];
      connectorMeshes.value = [];

      // Сбрасываем состояние проверки и выделение порта
      circuitValid.value = false;
      circuitType.value = null;
      firstSelectedPort.value = null;
      highlightPort(null);
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
      renderer = new THREE.WebGLRenderer({ antialias: settings.antialiasEnabled, alpha: true });
      rendererRef.value = renderer;
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
      const ambientLight = new THREE.AmbientLight(0xffffff, settings.ambientIntensity);
      ambientLightRef.value = ambientLight;
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, settings.dirLightIntensity);
      directionalLight.position.set(5, 10, 5);
      directionalLight.castShadow = settings.shadowsEnabled;
      directionalLight.shadow.mapSize.width = settings.shadowMapSize;
      directionalLight.shadow.mapSize.height = settings.shadowMapSize;
      directionalLight.shadow.bias = -0.0001;
      dirLightRef.value = directionalLight;
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

      // Хранение текущего наведённого кликабельного элемента или крутилки для сброса hover
      let currentHoveredModel: THREE.Object3D | null = null;

      // Обработчик движения мыши (смена курсора и hover-эффекты)
      const mouseMoveHandler = (event: MouseEvent) => {
        if (!renderer || !camera || !scene) return;

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // Сначала проверяем крутилки
        const spinnerIntersects = raycaster.intersectObjects(spinnerMeshes.value);
        if (spinnerIntersects.length > 0) {
          const hitMesh = spinnerIntersects[0]?.object as THREE.Mesh;
          const spinnerType = meshToSpinnerMap.value.get(hitMesh);
          if (spinnerType) {
            if (!isHoveringSpinner.value) {
              isHoveringSpinner.value = true;
              if (controls) controls.enableZoom = false;
            }

            const spinnerModel = spinnerType === 'voltage' ? voltageSpinner.value : thermistorSpinner.value;
            // Применяем hover только если модель не активна (не в процессе drag)
            if (spinnerModel && currentHoveredModel !== spinnerModel && activeSpinnerModel !== spinnerModel) {
              // Сбрасываем предыдущий hover
              if (currentHoveredModel) {
                applyHoverEffect(currentHoveredModel, false);
              }
              // Применяем hover к новой модели
              applyHoverEffect(spinnerModel, true);
              currentHoveredModel = spinnerModel;
            }
            if (renderer.domElement.style.cursor !== 'grab') {
              renderer.domElement.style.cursor = 'grab';
            }
            return;
          }
        } else {
          if (isHoveringSpinner.value) {
            isHoveringSpinner.value = false;
            if (controls) controls.enableZoom = true;
          }
        }

        // Если не крутилка, проверяем кликабельные элементы
        const clickableIntersects = raycaster.intersectObjects(clickableMeshes.value);
        if (clickableIntersects.length > 0) {
          const hitMesh = clickableIntersects[0]?.object as THREE.Mesh;
          const deviceName = meshToClickableNameMap.value.get(hitMesh);
          if (deviceName) {
            const model = decorativeElementsMap.value.get(deviceName);
            if (model && currentHoveredModel !== model && activeSpinnerModel !== model) {
              if (currentHoveredModel) {
                applyHoverEffect(currentHoveredModel, false);
              }
              applyHoverEffect(model, true);
              currentHoveredModel = model;
            }
            if (renderer.domElement.style.cursor !== 'pointer') {
              renderer.domElement.style.cursor = 'pointer';
            }
            return;
          }
        }

        // Проверяем провода и коннекторы для группового hover
        const allWireAndConnectorObjects = [...wires.value, ...connectorMeshes.value];
        const intersects = raycaster.intersectObjects(allWireAndConnectorObjects);
        if (intersects.length > 0) {
          let hitObject: Object3D | null | undefined = intersects[0]?.object;
          // Поднимаемся по родителям, чтобы найти корневой объект (wire или connector)
          while (hitObject && hitObject.userData.type !== 'wire' && hitObject.userData.type !== 'connector') {
            hitObject = hitObject.parent;
          }
          if (hitObject) {
            let foundConnection: typeof connectors.value[0] | null = null;
            for (const conn of connectors.value) {
              if (conn.wire === hitObject || conn.connector1 === hitObject || conn.connector2 === hitObject) {
                foundConnection = conn;
                break;
              }
            }
            if (foundConnection) {
              if (currentHoveredConnection !== foundConnection) {
                if (currentHoveredConnection) {
                  applyConnectionHoverEffect(currentHoveredConnection, false);
                }
                currentHoveredConnection = foundConnection;
                applyConnectionHoverEffect(currentHoveredConnection, true);
              }
              if (renderer.domElement.style.cursor !== 'pointer') {
                renderer.domElement.style.cursor = 'pointer';
              }
              return;
            }
          }
        } else if (currentHoveredConnection) {
          applyConnectionHoverEffect(currentHoveredConnection, false);
          currentHoveredConnection = null;
        }

        // Если ничего не наведено, сбрасываем hover (но не для активной крутилки)
        if (currentHoveredModel && activeSpinnerModel !== currentHoveredModel) {
          applyHoverEffect(currentHoveredModel, false);
          currentHoveredModel = null;
        } else if (currentHoveredModel && activeSpinnerModel === currentHoveredModel) {
          // Если текущий наведённый элемент является активной крутилкой, не сбрасываем hover,
          // но и не меняем курсор (уже 'grabbing').
        }

        // Проверяем порты для смены курсора (без hover-эффекта)
        const portIntersects = raycaster.intersectObjects(portMeshes.value);
        if (portIntersects.length > 0) {
          const hitMesh = portIntersects[0]?.object as THREE.Mesh;
          const portName = meshToPortMap.value.get(hitMesh);
          if (portName) {
            if (hoveredPortName.value !== portName) {
              // Сброс предыдущего hover порта
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
            if (renderer.domElement.style.cursor !== 'pointer') {
              renderer.domElement.style.cursor = 'pointer';
            }
            return;
          }
        }

        // Если пересечений нет
        if (renderer.domElement.style.cursor !== 'default') {
          renderer.domElement.style.cursor = 'default';
        }
        if (hoveredPortName.value) {
          const prevPort = decorativeElementsMap.value.get(hoveredPortName.value);
          if (prevPort && firstSelectedPort.value !== hoveredPortName.value) {
            setPortEmissive(prevPort, 0x000000);
          }
          hoveredPortName.value = null;
        }
      };

      renderer.domElement.addEventListener('mousemove', mouseMoveHandler);

      // Обработчик нажатия мыши для начала drag на крутилке
      const onMouseDown = (event: MouseEvent) => {
        if (!renderer || !camera || !scene) return;

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const spinnerIntersects = raycaster.intersectObjects(spinnerMeshes.value);
        if (spinnerIntersects.length > 0) {
          const hitMesh = spinnerIntersects[0]?.object as THREE.Mesh;
          const spinnerType = meshToSpinnerMap.value.get(hitMesh);
          if (spinnerType) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation(); // добавить эту строку
            startSpinnerDrag(spinnerType, event.clientX, event.clientY);
          }
        }
      };

      // Обработчик движения мыши для drag
      const onGlobalMouseMove = (event: MouseEvent) => {
        if (isDraggingSpinner) {
          event.preventDefault();
          event.stopPropagation();
          onSpinnerMouseMove(event);
        }
      };

      // Обработчик отпускания мыши
      const onGlobalMouseUp = (event: MouseEvent) => {
        if (isDraggingSpinner) {
          event.preventDefault();
          event.stopPropagation();
          stopSpinnerDrag();
        }
      };

      // Обработчик колесика для крутилок (улучшен: предотвращает масштабирование камеры)
      const onWheel = (event: WheelEvent) => {
        if (!renderer || !camera || !scene) return;

        if (isHoveringSpinner.value) {
          event.preventDefault();
          event.stopPropagation();

          const raycaster = new THREE.Raycaster();
          const mouse = new THREE.Vector2();
          const rect = renderer.domElement.getBoundingClientRect();
          mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

          raycaster.setFromCamera(mouse, camera);
          const spinnerIntersects = raycaster.intersectObjects(spinnerMeshes.value);
          if (spinnerIntersects.length > 0) {
            const hitMesh = spinnerIntersects[0]?.object as THREE.Mesh;
            const spinnerType = meshToSpinnerMap.value.get(hitMesh);
            if (spinnerType) {
              handleSpinnerWheel(event, spinnerType);
            }
          }
        }
      };

      renderer.domElement.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onGlobalMouseMove);
      window.addEventListener('mouseup', onGlobalMouseUp);
      // Добавляем обработчик wheel с опцией { passive: false }, чтобы preventDefault работал надёжно
      renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

      // Сохраняем ссылки на обработчики для очистки
      const cleanupHandlers = {
        onMouseDown, onGlobalMouseMove, onGlobalMouseUp, onWheel, mouseMoveHandler
      };

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

      // Обработчик клика для портов, кнопок и проводов (удаление)
      const onClick = async (event: MouseEvent) => {
        if (!renderer || !camera || !scene) return;

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        // Вычисляем координаты мыши в нормализованных координатах (-1 до 1)
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        const clickableIntersects = raycaster.intersectObjects(clickableMeshes.value);
        if (clickableIntersects.length > 0) {
          const hitMesh = clickableIntersects[0]?.object as THREE.Mesh;
          const deviceName = meshToClickableNameMap.value.get(hitMesh);
          if (deviceName) {
            toggleDevice(deviceName);
          }
          return; // Не обрабатываем порты, если кликнули по кнопке
        }

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
          // Проверяем клик по проводу или коннектору для удаления
          const allWireAndConnectorObjects = [...wires.value, ...connectorMeshes.value];
          const wireConnectorIntersects = raycaster.intersectObjects(allWireAndConnectorObjects);
          if (wireConnectorIntersects.length > 0) {
            let hitObject: Object3D | null | undefined = wireConnectorIntersects[0]?.object;
            // Поднимаемся по родителям, чтобы найти корневой объект (wire или connector)
            while (hitObject && hitObject.userData.type !== 'wire' && hitObject.userData.type !== 'connector') {
              hitObject = hitObject.parent;
            }
            if (hitObject) {
              let connectionToDelete: typeof connectors.value[0] | null = null;
              for (const conn of connectors.value) {
                if (conn.wire === hitObject || conn.connector1 === hitObject || conn.connector2 === hitObject) {
                  connectionToDelete = conn;
                  break;
                }
              }
              if (connectionToDelete) {
                deleteWire(connectionToDelete.wire);
              }
            }
            return;
          }

          // Клик не по порту и не по проводу - снимаем выделение и сбрасываем hover
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

      // Сохраняем обработчики для очистки
      (window as any).__threeCleanup = {
        onClick,
        ...cleanupHandlers
      };
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

      return true;
    }

    // Сохранение измерений
    function saveSnapshot() {
      if (!circuitValid.value || !circuitType.value || !sourceEnabled.value || !thermistorEnabled.value || !ammeterEnabled.value) {
        showPopup('Убедитесь, что все приборы включены и схема собрана верно', 'error');
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

    // Функция удаления записи из таблицы
    function deleteSnapshot(index: number) {
      snapshots.value.splice(index, 1);
    }

    // Сброс значений к значениям по умолчанию
    function resetValues() {
      // Сбрасываем напряжение источника
      sourceComponent.data.voltage = 0;

      // Сбрасываем температуру
      globalTemp.value = 300;

      // Сбрасываем камеру к начальной позиции
      if (camera && controls) {
        controls.target.set(0, 0, 0);
        camera.position.set(0, 3, 5);
        controls.update();
      }

      // Снимаем выделение порта
      firstSelectedPort.value = null;
      highlightPort(null);

      // Удаляем все провода
      deleteAllWires();

      // Выключаем все приборы и возвращаем кнопки в исходное положение
      if (sourceEnabled.value) toggleDevice('red_button_for_voltage_source');
      if (ammeterEnabled.value) toggleDevice('red_button_for_ammeter');
      if (thermistorEnabled.value) toggleDevice('thermistor_lever');

      updateAllDisplays();
      updateCurrent();
      updateVoltageSpinnerRotation();
      updateThermistorSpinnerRotation();
    }

    // Обработка колеса для температуры
    function handleTemperatureWheel(event: WheelEvent) {
      if (!circuitValid.value || !thermistorEnabled.value) return;

      const delta = Math.sign(event.deltaY) * -1;
      const step = 1;
      let newTemp = globalTemp.value + delta * step;
      newTemp = Math.min(390, Math.max(290, newTemp));
      globalTemp.value = newTemp;
    }

    // Обработка колеса для напряжения
    function handleVoltageWheel(event: WheelEvent) {
      if (!circuitValid.value || !sourceEnabled.value) return;

      const delta = Math.sign(event.deltaY) * -1; // направление: вверх = увеличение
      const step = 0.1;
      let newVoltage = sourceComponent.data.voltage + delta * step;
      newVoltage = Math.min(15, Math.max(0, newVoltage));
      sourceComponent.data.voltage = parseFloat(newVoltage.toFixed(1));
    }

    const popup = reactive({
      visible: false,
      message: '',
      type: 'error' as 'error' | 'success'
    });

    const toggleFullscreen = () => {
      if (!renderer) return;
      const canvas = renderer.domElement;

      if (!document.fullscreenElement) {
        canvas.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    };

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
    async function createWireBetweenPorts(portName1: string, portName2: string) {
      if (!scene || !loader) return;

      // Цвета: красный, оранжевый, жёлтый, зелёный, бирюзовый, синий
      const WIRE_COLORS = [0xff0000, 0xffa500, 0xffff00, 0x00ff00, 0x00ffff, 0x0000ff];

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

      // Клонируем материалы для каждого коннектора, чтобы избежать общих ссылок
      [connector1, connector2].forEach(conn => {
        conn.traverse(child => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material = mesh.material.map(mat => mat.clone());
              } else {
                mesh.material = mesh.material.clone();
              }
            }
            child.castShadow = showShadows.value;
            child.receiveShadow = showShadows.value;
          }
        });
      });

      connector1.scale.set(CONNECTOR_SCALE, CONNECTOR_SCALE, CONNECTOR_SCALE);
      connector2.scale.set(CONNECTOR_SCALE, CONNECTOR_SCALE, CONNECTOR_SCALE);

      // Размещаем в позициях портов и применяем их повороты
      // Смещаем коннектор относительно плоскости порта наружу,
      // чтобы он сидел в нём плотно
      connector1.position.copy(pos1.addScaledVector(dir1, CONNECTOR_OFFSET));
      connector2.position.copy(pos2.addScaledVector(dir2, CONNECTOR_OFFSET));
      connector1.quaternion.copy(quat1);
      connector2.quaternion.copy(quat2);

      scene.add(connector1);
      scene.add(connector2);

      // Добавляем коннекторы в массив для рейкастинга и удаления
      connectorMeshes.value.push(connector1, connector2);

      // Точки крепления провода – концы коннекторов (смещение вдоль направления порта)
      const start = connector1.position.clone().addScaledVector(dir1, CONNECTOR_OFFSET);
      const end = connector2.position.clone().addScaledVector(dir2, CONNECTOR_OFFSET);

      // Создаём изогнутый провод
      //const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
      //mid.z = 0.8; // изгиб

      // Используем кривую Безье, чтобы получить торец провода ортогонально к направлению коннектора
      const curve = new CubicBezierCurve3(start, start.clone().addScaledVector(dir1, 0.5), end.clone().addScaledVector(dir2, 0.5), end);
      //const curve = new CatmullRomCurve3([start, mid, end]);
      const tubularSegments = settings.wireTubularSegments;
      const radialSegments = settings.wireRadialSegments;
      const tubeGeo = new TubeGeometry(curve, tubularSegments, 0.0075, radialSegments, false);
      const color = WIRE_COLORS[wires.value.length % WIRE_COLORS.length]; // Закольцовано выбираем цвет провода из списка
      const material = new THREE.MeshStandardMaterial({ color });
      const wire = new THREE.Mesh(tubeGeo, material);

      wire.castShadow = showShadows.value;
      wire.receiveShadow = showShadows.value;

      scene.add(wire);

      connectors.value.push({
        wire,
        connector1,
        connector2,
        port1: portName1,
        port2: portName2
      });

      // Сохраняем всё
      wires.value.push(wire);

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

    // Проверка соответствия требованиям
    function checkRequirements(requirements: any[]): boolean {
      for (const req of requirements) {
        //Если второй элемент в паре - жёстко фиксированный порт
        if (Array.isArray(req) && req.length === 2 && !Array.isArray(req[1])) {
          const [a, b] = req;
          const isConnected = connections.value.some(conn =>
            (conn.port1 === a && conn.port2 === b) || (conn.port1 === b && conn.port2 === a)
          );
          if (!isConnected) return false;
        }
        //Если второй элемент в паре - список альтернативных портов
        else if (Array.isArray(req) && req.length === 2 && Array.isArray(req[1])) {
          const [requiredPort, possiblePartners] = req;
          const isConnected = possiblePartners.some(partner =>
            connections.value.some(conn =>
              (conn.port1 === requiredPort && conn.port2 === partner) ||
              (conn.port1 === partner && conn.port2 === requiredPort)
            )
          );
          if (!isConnected) return false;
        }
      }
      return true;
    }

    // Функция проверки схемы
    function checkCircuit() {
      //На втором месте в паре стоят списки альтернативных портов
      const requiredPairsMetal = [
        ['port_amp_minus', ['port_thermistor_R2_1','port_thermistor_R2_2']],
        ['port_amp_plus', ['port_DC_source_plus']],
        ['port_volt_minus', ['port_thermistor_common_1','port_thermistor_common_2']],
        ['port_volt_plus', ['port_thermistor_R2_1','port_thermistor_R2_2']],
        ['port_DC_source_minus', ['port_thermistor_common_1','port_thermistor_common_2']]
      ];

      //На втором месте в паре стоят списки альтернативных портов
      const requiredPairsSemiconductor = [
        ['port_amp_minus', ['port_thermistor_R3_1','port_thermistor_R3_2']],
        ['port_amp_plus', 'port_DC_source_plus'],
        ['port_volt_minus', ['port_thermistor_common_1','port_thermistor_common_2']],
        ['port_volt_plus', ['port_thermistor_R3_1','port_thermistor_R3_2']],
        ['port_DC_source_minus', ['port_thermistor_common_1','port_thermistor_common_2']]
      ];

      const allPresentMetal = checkRequirements(requiredPairsMetal);
      
      const allPresentSemiconductor = checkRequirements(requiredPairsSemiconductor);

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

      if (circuitValid.value) {
        // Устанавливаем тип терморезистора в соответствии с собранной схемой
        thermistorComponent.data.kind = circuitType.value;

        if (circuitType.value === 'metal') {
          thermistorComponent.data.R0 = 100;
          thermistorComponent.data.alpha = 0.0039;
          thermistorComponent.data.B = undefined;
        } else {
          thermistorComponent.data.R0 = 1000;
          thermistorComponent.data.alpha = undefined;
          thermistorComponent.data.B = 3500;
        }
      }
    }

    function openSettings() {
      showSettingsModal.value = true;
    }

    // При изменении соединений сбрасываем статус проверки
    watch(connections, () => {
      circuitValid.value = false;
      circuitType.value = null;
    }, { deep: true });

    const handleFullscreenChange = () => {
      isFullscreen.value = !!document.fullscreenElement;
    };

    // Хуки жизненного цикла
    onMounted(() => {
      initThreeJS();
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      clock = new THREE.Clock();
      document.addEventListener('fullscreenchange', handleFullscreenChange);
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
      [thermistorDisplay.value, voltmeterDisplay.value, ammeterDisplay.value, generatorDisplay.value].forEach(display => {
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
      deleteAllWires();

      // Удаляем обработчики событий, добавленные для крутилок
      if (renderer) {
        const cleanup = (window as any).__threeCleanup;
        if (cleanup) {
          renderer.domElement.removeEventListener('mousemove', cleanup.mouseMoveHandler);
          renderer.domElement.removeEventListener('mousedown', cleanup.onMouseDown);
          renderer.domElement.removeEventListener('wheel', cleanup.onWheel);
          renderer.domElement.removeEventListener('click', cleanup.onClick);
          window.removeEventListener('mousemove', cleanup.onGlobalMouseMove);
          window.removeEventListener('mouseup', cleanup.onGlobalMouseUp);
        }
      }

      // Cброс hover-эффектов при размонтировании
      if (currentHoveredConnection) {
        applyConnectionHoverEffect(currentHoveredConnection, false);
      }

      // Очищаем соединения
      connections.value = [];

      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);

      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    });

    return {
      // Refs
      sceneContainer,
      globalTemp,
      popup,
      snapshots,
      currentI,
      showShadows,
      voltageSpinner,
      thermistorSpinner,
      sourceComponent,
      thermistorComponent,
      keysPressed,
      showSnapshotsModal,
      showSettingsModal,
      settings,
      isFullscreen,

      // Состояние загрузки
      isLoading,
      welcomeVisible,
      loadedModelsCount,
      totalModelsCount,
      loadingProgress,

      // Состояние проверки
      circuitValid,
      circuitType,

      // Состояния включения приборов
      sourceEnabled,
      ammeterEnabled,
      thermistorEnabled,

      // Methods
      handleVoltageWheel,
      handleTemperatureWheel,
      saveSnapshot,
      resetValues,
      //calculateCurrentResistance,
      getThermistorTypeLabel,
      deleteSnapshot,
      checkCircuit,
      deleteAllWires,
      applySettings,
      openSettings,
      toggleFullscreen,
      handleWelcomeClose,
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

  display: flex;
  flex-direction: column;
  gap: 60px;

  opacity: 0;
  transform: translateY(40px);
  transition: opacity 0.6s ease-out 0.4s, transform 0.6s ease-out 0.4s;
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

.scene-section {
  flex: 1;
  position: relative;
  width: calc(100vw - 900px);
}

.three-scene {
  width: 100%;
  height: 100%;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.three-scene.loading {
  filter: blur(2px);
  opacity: 0.7;
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

button {
  padding: 8px 16px;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

button:nth-child(3) {
  background: #10b981;
}

button:nth-child(3):hover {
  background: #0da271;
}

@media (max-width: 1900px) {
  .content {
    flex-direction: column;
  }
}

@media (max-width: 900px) {
  .content {
    padding: 0;
  }

  .three-scene {
    border-radius: 0;
  }
}
</style>