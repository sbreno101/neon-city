# Arquitetura técnica

## Visão geral

```
main.tsx ─ App ─┬─ Scene (Canvas R3F)
                │   ├─ Atmosphere      uniforms compartilhados (tempo, névoa, ganho neon)
                │   ├─ Sky             domo procedural (gradiente, sol, grid, estrelas)
                │   ├─ City            Ground · Buildings · Traffic · LightBeams · GlowPoints · LandmarkFx
                │   ├─ CameraRig       camera-controls + trajetória cinematográfica + height field
                │   ├─ PostEffects     Bloom · Aberração · Vinheta · Grão · Tone mapping
                │   └─ PerformanceProbe / ReadySignal / DevBench (só em dev)
                ├─ Hud (DOM + Tailwind)
                └─ LoadingScreen
```

Toda a renderização acontece no navegador. Não há backend: o build é um conjunto de arquivos estáticos.

## Dados → GPU

1. `utils/cityGenerator.ts` é **puro e determinístico** (PRNG `mulberry32` com semente fixa). Ele devolve apenas dados: caixas (`BoxInstance`), feixes, beacons, faixas de tráfego, um *height field* e estatísticas. É coberto por testes em `cityGenerator.test.ts`.
2. Os componentes React convertem esses dados em poucos objetos three.js, criados uma única vez por perfil de qualidade (`useMemo`) e descartados ao desmontar (`useDisposable` + cleanups).
3. Nada da cidade é atualizado pela CPU a cada quadro: tempo e névoa são **uniforms compartilhados** (`shaders/uniforms.ts`), e todas as animações (janelas, faixas, scanner, tráfego, drones, partículas, beacons) são calculadas nos shaders.

## Layout urbano

- Constantes em `config/city.ts` (`block = 14`, `street = 4`, `PITCH = 18`, avenida a cada 4 ruas). São usadas tanto pelo gerador (CPU) quanto pelo shader do solo e pelo tráfego (GPU), mantendo ruas, prédios e rastros alinhados.
- **Núcleo** (raio por perfil): quarteirões subdivididos em 1, 4, 6 ou 9 lotes; cada lote recebe uma família arquitetônica ponderada pela distância ao centro (centro alto e denso, periferia baixa). Algumas praças com obeliscos quebram a repetição.
- **Centro**: torre-marco com seções, coroa rotacionada, antena de 40 m, anéis animados e feixe principal; um prédio vizinho sustenta o holograma.
- **Anel distante**: silhuetas simplificadas, mais baixas perto do núcleo (onde a câmera voa) e com picos esparsos no horizonte, alguns com feixes de luz.
- **Height field** (células de 4 m) guarda a altura máxima construída — usado pela câmera para nunca atravessar prédios.

## Materiais (shaders)

| Arquivo | Conteúdo |
| --- | --- |
| `buildingShader.ts` | Caixa unitária instanciada; o tamanho vem da matriz da instância. Contornos de quina/topo, telhados, janelas (grade antisserrilhada com `fwidth`, acendendo/apagando), 5 estilos de fachada, reflexo do neon da rua na base, brilho magenta voltado ao sol, fresnel e névoa. |
| `groundShader.ts` | Quadras, bordas neon por quarteirão, grid fino, faixas, avenidas com pulsos, marcação de cruzamentos e grid synthwave fora do núcleo. |
| `skyShader.ts` | Gradiente, horizonte magenta, sol listrado animado, grid digital próximo ao horizonte, estrelas, bandas atmosféricas. Renderizado no plano distante (`xyww`). |
| `fxShaders.ts` | Feixes de luz (cilindros aditivos com fresnel), rastros de tráfego (quads instanciados movidos no vertex shader) e pontos luminosos (beacons, drones e partículas num único `Points`). |
| `common.ts` | Hashes, `lineAA` e `lineE` (linha que conserva energia: quando fica mais fina que um pixel ela escurece em vez de engrossar, evitando que prédios distantes virem blocos sólidos de cor) e névoa exp² + desvanecimento radial. |

A cena é renderizada em HDR (neon > 1.0). O Bloom usa limiar de luminância 0.82, então só o neon brilha; o tone mapping (Khronos Neutral) acontece uma vez no fim da cadeia.

## Draw calls

| Elemento | Draw calls |
| --- | --- |
| Prédios (InstancedMesh por bloco de 6×6 quarteirões, com frustum culling) | ~25–45 visíveis |
| Solo, céu, tráfego, feixes, pontos | 5 |
| Anéis e holograma | 5 |
| Pós-processamento | demais passes |

Total medido: **40 (Baixa) / 50 (Média) / 62 (Alta)** draw calls por quadro, incluindo o pós-processamento.

## Câmera

`components/camera/CameraRig.tsx` usa `CameraControls` (camera-controls) para amortecimento, transições, limites de distância (16 m até 2,6× o raio), limites de ângulo polar e uma *boundary* para o alvo.

- **Cinemático**: a cada quadro calcula uma pose em `cameraPaths.ts` (órbita lenta cujo raio, altura e alvo variam em frequências incomensuráveis, alternando tomadas baixas do horizonte com o sol e vistas aéreas) e a câmera persegue essa pose com `smoothTime` alto, sem trancos. A pose é elevada se passar perto de uma torre.
- **Panorama** / **Aproximação**: poses fixas com transição animada.
- **Órbita**: controle livre; qualquer arrasto/zoom no modo cinemático muda para Órbita.
- **Segurança**: depois de cada atualização, a altura da câmera é comparada ao height field e corrigida.
- **Telas em retrato**: `fitToAspect` afasta a câmera e a FOV sobe de 50° para 60°.

## Qualidade e desempenho

Perfis em `config/quality.ts` controlam raio do núcleo/anel, densidade do anel, faixa de DPR, quantidade de tráfego, drones, partículas, feixes distantes, aberração cromática, grão e densidade da névoa.

- A cadeia de efeitos é **idêntica em todos os perfis** (só uniforms mudam). Adicionar/remover efeitos ou mudar opções de construção do Bloom força recompilação do shader combinado — medido em ~1 s de travamento numa GPU integrada.
- `PerformanceMonitor` (drei) reduz/aumenta o DPR dentro da faixa do perfil.
- O perfil inicial vem de `utils/device.ts` (toque/tela pequena → Baixa; ≥ 8 núcleos e ≥ 8 GB → Alta; senão Média) e a escolha do usuário fica no `localStorage`.
- Sem sombras: a estética é toda emissiva, então shadow maps não são usados.

## Medição

- `PerformanceProbe` mede FPS, tempo de quadro, draw calls e triângulos do quadro inteiro (reseta `gl.info` no início e lê no fim) e publica em `window.__NEON_CITY_STATS__` e no medidor de FPS da interface.
- Em desenvolvimento, `await window.__neonBench(60)` renderiza N quadros seguidos com sincronização da GPU e devolve o custo médio/mediano/p95.

## Estado

`state/useAppStore.ts` (zustand): modo de câmera, qualidade, bloom, intensidade neon, velocidade, FPS visível, interface oculta e estágio de carregamento. Os componentes 3D leem o estado com `getState()` dentro de `useFrame`, evitando re-renderizações React por quadro.
