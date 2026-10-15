# Publicação: GitHub + Vercel (plano Hobby, gratuito)

NEON CITY é um site **estático**: o build gera HTML, CSS, JS e fontes em `dist/`. Não há servidor Node.js, funções serverless, banco de dados, WebSockets nem chaves de API — então nada precisa ser configurado depois do deploy.

## 1. Verificar localmente

```bash
npm install
npm test
npm run build
npm run preview
```

Abra o endereço do `preview` e confira se a cidade aparece.

## 2. Publicar no GitHub

```bash
git init
git add .
git commit -m "NEON CITY: cidade synthwave procedural em 3D"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/neon-city.git
git push -u origin main
```

O `.gitignore` já exclui `node_modules/`, `dist/`, `.env*`, `.vercel/` e configurações locais.

## 3. Importar na Vercel

1. Entre em <https://vercel.com> com a conta do GitHub (plano **Hobby**).
2. **Add New… → Project** e importe o repositório `neon-city`.
3. A Vercel detecta o framework **Vite**. Confirme:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
   - Nenhuma variável de ambiente é necessária.
4. Clique em **Deploy**. Cada `git push` na branch `main` gera um novo deploy, e cada pull request ganha uma URL de pré-visualização.

### Pela linha de comando (opcional)

```bash
npx vercel
```

```bash
npx vercel --prod
```

## 4. Depois do deploy

- Copie a URL (`https://neon-city-xxxx.vercel.app`) para o README, na linha **Demonstração online**.
- Abra a URL diretamente numa aba anônima para confirmar que a página carrega sem cache e sem login.
- Opcional: rode o Lighthouse do Chrome para registrar métricas de carregamento.

## Por que existe um `vercel.json`

Ele só define `Cache-Control: public, max-age=31536000, immutable` para `/assets/*`. Esses arquivos têm hash no nome (ex.: `three-uTu7zYnk.js`), então podem ficar em cache para sempre: visitantes recorrentes não baixam de novo os ~375 kB de JS, o que economiza a banda do plano gratuito. O `index.html` continua sem cache longo, então novos deploys aparecem imediatamente.

## Uso dos limites gratuitos

- 0 funções serverless, 0 middleware, 0 chamadas de API.
- Cada primeira visita transfere aproximadamente 0,45 MB comprimido (JS + CSS + fontes + HTML).
- Não há imagens, vídeos ou modelos 3D servidos pelo site (as capturas em `docs/` ficam só no GitHub).

## Outras hospedagens estáticas

Como `vite.config.ts` usa `base: './'`, o mesmo `dist/` também funciona em GitHub Pages, Netlify ou Cloudflare Pages, inclusive em subpastas.
