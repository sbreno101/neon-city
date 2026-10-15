# PROGRESS — NEON CITY

Última atualização: 15/10/2026

## Concluído

### Fase 1 — Inicialização
- [x] Projeto Vite + React 19 + TypeScript (strict) criado do zero
- [x] three r186, R3F 9, drei 10, postprocessing, zustand, Tailwind 4, Vitest 4 (0 vulnerabilidades no `npm audit`)
- [x] Canvas, câmera, cena e ambiente inicial

### Fase 2 — Cidade procedural
- [x] Gerador determinístico (`src/utils/cityGenerator.ts`) com quarteirões, lotes, ruas e avenidas
- [x] 8 famílias arquitetônicas + torre-marco + torre do holograma + praças
- [x] Núcleo detalhado + anel distante (skyline) + height field
- [x] 10 testes unitários (determinismo, prédios fora das ruas, densidade por perfil, faixas dentro das ruas, etc.)

### Fase 3 — Neon
- [x] Shader de prédios: contornos, telhados, janelas dinâmicas, 5 estilos de fachada, LOD por derivadas
- [x] Solo com quadras, bordas neon, faixas, avenidas com pulsos e grid synthwave
- [x] Céu com gradiente, sol synthwave animado, grid, estrelas e bandas atmosféricas
- [x] Bloom HDR com limiar, vinheta, aberração cromática, grão e tone mapping

### Fase 4 — Movimento
- [x] Tráfego luminoso na GPU, drones, partículas, beacons, feixes pulsando, anéis, holograma
- [x] Câmera cinematográfica + Órbita + Panorama + Aproximação, transições suaves, proteção contra colisão

### Fase 5 — Experiência
- [x] HUD mínimo, barra de controles, ajustes (neon, bloom, velocidade, FPS), qualidade, tela cheia, ocultar UI
- [x] Atalhos de teclado, loading screen (HTML instantâneo + React), fallback sem WebGL 2
- [x] Layout responsivo (retrato: câmera afastada e FOV maior, qualidade dentro dos ajustes)

### Fase 6 — Otimização
- [x] InstancedMesh por blocos com frustum culling (40/50/62 draw calls por perfil)
- [x] Sem sombras, sem texturas, recursos GPU descartados ao trocar de perfil
- [x] Resolução adaptativa, perfis Baixa/Média/Alta, medidor de FPS real
- [x] Corrigido: tela preta com MSAA; travamento na troca de qualidade; limite do PerformanceMonitor
- [x] Medições documentadas em `docs/PERFORMANCE.md`

### Fase 7 — Publicação (preparação)
- [x] `npm run build` sem erros; build de produção testado (`vite preview`)
- [x] README, LICENSE (MIT), `.gitignore`, `vercel.json` (só cache de assets), docs de arquitetura/deploy/desempenho
- [x] Capturas de tela em `docs/screenshots/`

## Pendente (depende do proprietário)

- [ ] **Aprovar a licença** e trocar "NEON CITY authors" pelo nome do titular em `LICENSE`
- [ ] Criar o repositório no GitHub e fazer o primeiro commit/push (não feito: requer autorização)
- [ ] Importar na Vercel e colocar o link da demonstração no README (não feito: requer conta do proprietário)

## Próximos passos sugeridos

- [ ] Testar em celulares reais (iOS Safari, Android Chrome), Firefox e GPU dedicada; ajustar perfis se necessário
- [ ] Gravar um GIF/vídeo curto do modo cinemático para o README
- [ ] Opcional: versão em inglês da interface (`src/config/strings.ts`)

## Como continuar o trabalho

```bash
npm install
npm run dev        # desenvolvimento em http://localhost:5173
npm test           # testes do gerador
npm run build      # build de produção em dist/
npm run preview    # testar o build
```

- Aparência geral: `src/config/palette.ts` (cores), `src/components/effects/PostEffects.tsx` (bloom), `src/shaders/buildingShader.ts` (fachadas).
- Densidade/tamanho da cidade e custos: `src/config/quality.ts`.
- Trajetória da câmera: `src/components/camera/cameraPaths.ts`.
- Em desenvolvimento, `await window.__neonBench(60)` no console mede o custo real por quadro; `window.__neonCinematic.current = 130` pula o passeio para outro trecho.
- Ao alterar efeitos de pós-processamento, mantenha a mesma lista em todos os perfis (ver comentário em `PostEffects.tsx`).
