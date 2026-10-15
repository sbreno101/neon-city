import type { QualityLevel } from './quality';
import type { CameraMode } from '../state/useAppStore';

/** All user-facing copy lives here (pt-BR) so it is easy to translate. */
export const STRINGS = {
  title: 'NEON CITY',
  subtitle: 'Metrópole synthwave procedural em tempo real',
  loading: {
    boot: 'Inicializando grid',
    generating: 'Gerando quarteirões',
    compiling: 'Compilando shaders',
    ready: 'Ativando neon',
  },
  modes: {
    cinematic: 'Cinemático',
    orbit: 'Órbita',
    panorama: 'Panorama',
    closeup: 'Aproximação',
  } satisfies Record<CameraMode, string>,
  quality: {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
  } satisfies Record<QualityLevel, string>,
  play: 'Iniciar passeio cinemático',
  pause: 'Pausar passeio cinemático',
  fullscreen: 'Tela cheia',
  exitFullscreen: 'Sair da tela cheia',
  settings: 'Ajustes visuais',
  hideUi: 'Ocultar interface (H)',
  graphics: 'Qualidade gráfica',
  bloom: 'Bloom',
  neon: 'Intensidade neon',
  speed: 'Velocidade do passeio',
  fps: 'Mostrar FPS',
  hint: 'Arraste para orbitar · Role para aproximar · Botão direito para mover',
  hintTouch: 'Arraste para orbitar · Pinça para aproximar',
  shortcuts: 'Atalhos: C passeio · 1-4 ângulos · F tela cheia · H ocultar',
  noWebgl:
    'Seu navegador ou dispositivo não suporta WebGL 2, necessário para renderizar a cidade em 3D.',
} as const;
