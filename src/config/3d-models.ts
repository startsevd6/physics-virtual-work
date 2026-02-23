import * as THREE from 'three';

// Тип для декоративных элементов
export type DecorativeElement = {
  name: string;
  path: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
  shadowEnabled: boolean;
};

// Конфигурация декоративных элементов
export const decorativeConfigs: DecorativeElement[] = [
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
  // Порты для терморезистора
  {
    name: 'port_thermistor_1',
    path: './models/port.glb',
    position: new THREE.Vector3(0.25, 0.01, 0.32),
    rotation: new THREE.Euler(0, -Math.PI/2, Math.PI/3),
    scale: 0.1,
    shadowEnabled: true
  },
  {
    name: 'port_thermistor_2',
    path: './models/port.glb',
    position: new THREE.Vector3(0.31, 0.01, 0.32),
    rotation: new THREE.Euler(0, -Math.PI/2, Math.PI/3),
    scale: 0.1,
    shadowEnabled: true
  },
  {
    name: 'port_thermistor_3',
    path: './models/port.glb',
    position: new THREE.Vector3(0.48, 0.01, 0.32),
    rotation: new THREE.Euler(0, -Math.PI/2, Math.PI/3),
    scale: 0.1,
    shadowEnabled: true
  },
  {
    name: 'port_thermistor_4',
    path: './models/port.glb',
    position: new THREE.Vector3(0.55, 0.01, 0.32),
    rotation: new THREE.Euler(0, -Math.PI/2, Math.PI/3),
    scale: 0.1,
    shadowEnabled: true
  },
  {
    name: 'port_thermistor_5',
    path: './models/port.glb',
    position: new THREE.Vector3(0.62, 0.01, 0.32),
    rotation: new THREE.Euler(0, -Math.PI/2, Math.PI/3),
    scale: 0.1,
    shadowEnabled: true
  },
  {
    name: 'port_thermistor_6',
    path: './models/port.glb',
    position: new THREE.Vector3(0.7, 0.01, 0.32),
    rotation: new THREE.Euler(0, -Math.PI/2, Math.PI/3),
    scale: 0.1,
    shadowEnabled: true
  },
  {
    name: 'port_thermistor_7',
    path: './models/port.glb',
    position: new THREE.Vector3(0.8, 0.01, 0.32),
    rotation: new THREE.Euler(0, -Math.PI/2, Math.PI/3),
    scale: 0.1,
    shadowEnabled: true
  },
  {
    name: 'port_thermistor_8',
    path: './models/port.glb',
    position: new THREE.Vector3(0.58, 0.03, 0.2),
    rotation: new THREE.Euler(0, -Math.PI/2, Math.PI/3),
    scale: 0.1,
    shadowEnabled: true
  },
  {
    name: 'port_thermistor_9',
    path: './models/port.glb',
    position: new THREE.Vector3(0.64, 0.03, 0.2),
    rotation: new THREE.Euler(0, -Math.PI/2, Math.PI/3),
    scale: 0.1,
    shadowEnabled: true
  },
  {
    name: 'port_thermistor_10',
    path: './models/port.glb',
    position: new THREE.Vector3(0.58, 0.05, 0.1),
    rotation: new THREE.Euler(0, -Math.PI/2, Math.PI/3),
    scale: 0.1,
    shadowEnabled: true
  },
  {
    name: 'port_thermistor_11',
    path: './models/port.glb',
    position: new THREE.Vector3(0.65, 0.05 , 0.1),
    rotation: new THREE.Euler(0, -Math.PI/2, Math.PI/3),
    scale: 0.1,
    shadowEnabled: true
  },
  {
    name: 'port_thermistor_12',
    path: './models/port.glb',
    position: new THREE.Vector3(0.8, 0.05, 0.1),
    rotation: new THREE.Euler(0, -Math.PI/2, Math.PI/3),
    scale: 0.1,
    shadowEnabled: true
  },
  {
    name: 'port_thermistor_13',
    path: './models/port.glb',
    position: new THREE.Vector3(0.59, 0.076, -0.01),
    rotation: new THREE.Euler(0, -Math.PI/2, Math.PI/3),
    scale: 0.1,
    shadowEnabled: true
  },
  {
    name: 'port_thermistor_14',
    path: './models/port.glb',
    position: new THREE.Vector3(0.65, 0.076, -0.01),
    rotation: new THREE.Euler(0, -Math.PI/2, Math.PI/3),
    scale: 0.1,
    shadowEnabled: true
  },
  {
    name: 'port_thermistor_15',
    path: './models/port.glb',
    position: new THREE.Vector3(0.59, 0.1, -0.13),
    rotation: new THREE.Euler(0, -Math.PI/2, Math.PI/3),
    scale: 0.1,
    shadowEnabled: true
  },
  {
    name: 'port_thermistor_16',
    path: './models/port.glb',
    position: new THREE.Vector3(0.65, 0.1, -0.13),
    rotation: new THREE.Euler(0, -Math.PI/2, Math.PI/3),
    scale: 0.1,
    shadowEnabled: true
  },
  {
    name: 'port_thermistor_17',
    path: './models/port.glb',
    position: new THREE.Vector3(0.8, 0.1, -0.13),
    rotation: new THREE.Euler(0, -Math.PI/2, Math.PI/3),
    scale: 0.1,
    shadowEnabled: true
  },
  {
    name: 'port_thermistor_18',
    path: './models/port.glb',
    position: new THREE.Vector3(0.59, 0.12, -0.24),
    rotation: new THREE.Euler(0, -Math.PI/2, Math.PI/3),
    scale: 0.1,
    shadowEnabled: true
  },
  {
    name: 'port_thermistor_19',
    path: './models/port.glb',
    position: new THREE.Vector3(0.65, 0.12, -0.24),
    rotation: new THREE.Euler(0, -Math.PI/2, Math.PI/3),
    scale: 0.1,
    shadowEnabled: true
  },
  {
    name: 'port_thermistor_20',
    path: './models/port.glb',
    position: new THREE.Vector3(0.65, 0.14, -0.35),
    rotation: new THREE.Euler(0, -Math.PI/2, Math.PI/3),
    scale: 0.1,
    shadowEnabled: true
  },
  {
    name: 'port_thermistor_21',
    path: './models/port.glb',
    position: new THREE.Vector3(0.8, 0.14, -0.35),
    rotation: new THREE.Euler(0, -Math.PI/2, Math.PI/3),
    scale: 0.1,
    shadowEnabled: true
  }
];

// Конфигурация слотов
export const slotConfigs = [
  {
    label: 'Источник напряжения',
    position: new THREE.Vector3(-0.75, 0, 0),
    rotation: new THREE.Euler(0, -Math.PI / 2, 0),
    scale: 1.5,
    allowedTypes: ['source']
  },
  {
    label: 'Терморезистор',
    position: new THREE.Vector3(0.75, 0, 0),
    rotation: new THREE.Euler(0, -Math.PI / 2, 0),
    scale: 1.2,
    allowedTypes: ['thermistor']
  },
  {
    label: 'Амперметр',
    position: new THREE.Vector3(-0.75, 0.325, 0),
    rotation: new THREE.Euler(0, -Math.PI / 2, 0),
    scale: 1,
    allowedTypes: ['amm']
  }
];

// Пути к моделям компонентов
export const modelPaths = {
  source: './models/voltage_source.glb',
  thermistor: './models/thermistor.glb',
  amm: './models/ammeter.glb'
};