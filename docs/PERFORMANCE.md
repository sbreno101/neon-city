# Desempenho medido

Todos os números abaixo foram **medidos** no build de produção (`npm run build` + `vite preview`), com o medidor interno (`window.__NEON_CITY_STATS__`, janela de 0,5 s, 10 amostras por perfil após 3 s de aquecimento).

## Ambiente de teste

- Windows 11, CPU AMD Ryzen com **GPU integrada AMD Radeon** (Vega, device 0x1638), 12 threads
- Google Chrome 152 em modo headless **com GPU** (`ANGLE (AMD … Direct3D11)`), via DevTools Protocol
- Data: 15/10/2026

## 60 Hz (vsync ligado — como num navegador normal)

| Resolução | DPR | Baixa | Média | Alta |
| --- | --- | --- | --- | --- |
| 1280×720 | 1 | 60 FPS (mín. 60) | 60 FPS (mín. 60) | 60 FPS (mín. 60) |
| 1920×1080 | 1 | 60 FPS (mín. 60) | 60 FPS (mín. 60) | 60 FPS (mín. 60) |
| 1280×720 | 2 | 60 FPS (mín. 60) | 60 FPS (mín. 60) | 60 FPS (mín. 60) |
| 1920×1080 | 2 | 60 FPS (mín. 60) | 60 FPS (mín. 60) | ~32 FPS → **~50 FPS** depois que a resolução adaptativa baixa o DPR para 1,5 |

- Troca de qualidade com vsync: nenhum quadro acima de 17 ms durante 5 s após cada troca.
- Sem trocas: maior intervalo entre quadros em 5 s = 18 ms.

## Sem limite de quadros (custo bruto, 1280×720, DPR 1)

| Perfil | Tempo médio de quadro | Draw calls | Triângulos |
| --- | --- | --- | --- |
| Baixa | 2,8 ms | 40 | 28 k |
| Média | 3,0 ms | 50 | 47 k |
| Alta | 3,1 ms | 62 | 69 k |

Com vsync e limite de quadros desligados, o Chrome headless apresentou travamentos periódicos de 0,5–1,2 s mesmo sem nenhuma interação. Eles desaparecem completamente com vsync ligado, então são um artefato de renderização sem limite (fila da GPU saturada), não da aplicação.

## Tamanho do download (gzip)

| Arquivo | gzip |
| --- | --- |
| three.js | 191,9 kB |
| R3F + drei + postprocessing | 162,7 kB |
| Código da aplicação | 20,5 kB |
| CSS | 5,1 kB |
| Fontes (woff2, só latin) | ~44 kB |

Nenhuma textura ou modelo é baixado: a cidade é gerada em ~10 ms na CPU.

## Problemas encontrados e corrigidos

| Problema | Causa | Correção |
| --- | --- | --- |
| Tela preta em Média/Alta | MSAA (`multisampling`) no pipeline HDR do postprocessing com ANGLE/D3D11 | MSAA desligado; linhas suavizadas no shader |
| Travamento de ~1 s ao trocar qualidade | Efeitos diferentes por perfil e opções de construção do Bloom recompilavam o shader combinado | Cadeia de efeitos idêntica em todos os perfis; só uniforms mudam |
| Resolução adaptativa parava em 40 FPS | Limite padrão do `PerformanceMonitor` em telas de 60 Hz é 40 FPS | Limites `[50, 59]` (60 Hz) e `[60, 100]` (>100 Hz) |

## Ainda não medido

- GPUs dedicadas, macOS/Safari, Firefox, celulares e tablets reais, monitores de 120/144 Hz.
- Em telas 4K com GPU integrada, prefira **Média**.
