const fs = require('fs-extra')
const path = require('path');
const nodemon = require('nodemon');
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
class PWABuilder {
    constructor() {
       
    }
    getUserInput(question) {
        return new Promise(resolve => {
          rl.question(question, answer => {
            resolve(answer);
          });
        });
      }
    async initializePWA (pn=null) {
        const projectName = pn === null?await this.getUserInput('Enter a name for the project: '):pn;
        const availableProjectName = await this.findAvailableProjectName(projectName);
      
        const projectFolderName = availableProjectName.replace(/\s+/g, '-').toLowerCase();
        const projectFolderPath = path.join(__dirname, 'pwa-projects', projectFolderName);
      
        await fs.ensureDir(projectFolderPath);
        console.log(`Created PWA project folder: '${projectFolderName}'`);
      
        const jsFolderPath = path.join(projectFolderPath, 'js');
        const cssFolderPath = path.join(projectFolderPath, 'css');
        const assetsFolderPath = path.join(projectFolderPath, 'assets');
      
        await fs.ensureDir(jsFolderPath);
        await fs.ensureDir(cssFolderPath);
        await fs.ensureDir(assetsFolderPath);
        fs.ensureDirSync(path.join(projectFolderPath, 'DevExtreme'));
        fs.ensureDirSync(path.join(projectFolderPath, 'jQuery'));
        await fs.copy(path.join(__dirname, 'assets','DevExtreme'), path.join(projectFolderPath, 'DevExtreme'));
        await fs.copy(path.join(__dirname, 'assets','jQuery'), path.join(projectFolderPath, 'jQuery'));
      
        console.log(`Created 'js' and 'css' and 3rd party libs to folders within the project.`);
      
      
      
        const iconContent = await fs.readFile(path.join(__dirname, 'assets', 'project-icon-small.png'));
        const iconLargeContent = await fs.readFile(path.join(__dirname, 'assets', 'project-icon-large.png'));
        await fs.writeFile(path.join(assetsFolderPath, 'icon-small.png'), iconContent);
        await fs.writeFile(path.join(assetsFolderPath, 'icon-large.png'), iconLargeContent);
      
        const serviceWorker =  `
      const CACHE_NAME = '${projectFolderName}-cache';
      self.addEventListener('install', (event) => {
        event.waitUntil(
          caches.open(CACHE_NAME)
            .then((cache) => {
              let base = location.href.replace('/service-worker.js', '');
              debugger
              return cache.addAll([
                base+ '/index.html',
                base+ '/assets/icon-small.png', 
                base+ '/assets/icon-large.png',
                base+ '/DevExtreme/css/dx.material.orange.light.css',
                base+ '/jQuery/jquery-3.7.1.min.js',
                base+ '/DevExtreme/js/dx.all.js',
                base+ '/worker.js',
                base+ '/js/index.js',
                base+ '/css/index.css'
              ])
            })
        );
      });
      self.addEventListener('fetch', (event) => {
        event.respondWith(
          caches.match(event.request)
            .then((response) => {
              return fetch(event.request)
                .then((networkResponse) => {
                  // Check if the response is successful before caching and responding
                  if (networkResponse.ok) {
                    const clonedResponse = networkResponse.clone();
      
                    caches.open(CACHE_NAME)
                      .then((cache) => {
                        cache.put(event.request, clonedResponse);
                      });
                  }
      
                  return networkResponse;
                })
                .catch(() => {
                  return response || caches.match('/offline.html');
                });
            })
        );
      });
      
        `
      
        await fs.writeFile(path.join(projectFolderPath, 'service-worker.js'), serviceWorker);
      
      
        const manifestContent = `
      {
        "name": "${availableProjectName}",
        "short_name": "${availableProjectName}",
        "description": "A PWA project created with Node.js app",
        "start_url": "./",
        "display": "standalone",
        "background_color": "#ffffff",
        "theme_color": "#000000",
        "icons": [
          {
            "src": "assets/icon-small.png",
            "sizes": "192x192",
            "type": "image/png"
          },
          {
              "src": "assets/icon-large.png",
              "sizes": "512x512",
              "type": "image/png"
            }
        ]
      }
        `;
        await fs.writeFile(path.join(projectFolderPath, 'manifest.json'), manifestContent);
        console.log('Created manifest file.');
      
        const workerContent = `
      console.log('Hello from worker.js!');
        `;
        await fs.writeFile(path.join(projectFolderPath, 'worker.js'), workerContent);
        console.log('Created worker.js file.');
      
        const indexHtmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>  
        <title>${availableProjectName.split('-').join(' ')}</title>
          <meta charset="UTF-8">  
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="icon" href="./assets/icon-small.png">
          <link rel="stylesheet" href="./DevExtreme/css/dx.material.orange.light.css" type="text/css">
          <link rel="stylesheet" href="./css/index.css" type="text/css">
          <script src="./jQuery/jquery-3.7.1.min.js" type="text/javascript"></script>
          <script src="./DevExtreme/js/dx.all.js" type="text/javascript"></script>  
          <script src="./worker.js" type="text/javascript"></script>
          <script src="./js/index.js" type="text/javascript"></script>
        
          <link rel="manifest" href="./manifest.json">
          <script>
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('service-worker.js')
                .then((registration) => {
                  console.log('Service Worker registered with scope:', registration.scope);
                })
                .catch((error) => {
                  console.error('Service Worker registration failed:', error);
                });
            }
          </script>
        </head>
        <body class= "dx-viewport">
          <div class="app-header dx-theme-border-color-as-background-color dx-theme-accent-as-border-color">
          <div><img src="./assets/icon-small.png" alt="logo-small" class="logo-small"></img></div>
          <div>${availableProjectName.split('-').join(' ')}</div>
          </div>
          <div class="app-body" style="width: 100%; height: 100%;text-align: center">
          <div style="margin:auto">
          <img alt="logo" src="./assets/icon-large.png" class="logo-large"></img>
          </div>
          </div>
        </body>
        </html>
        `;
      
        const indexJsContent = `console.log('Hello from index.js!');`;
      
        const indexCssContent = `
        /* Add your styles here */
        /*defaults*/  
        body, html {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
        }
        body{
          display:flex;
          flex-direction:column;
          justify-content: stretch;
          align-items: stretch;
        }
        .app-header {
          width: 100%;
          max-height: 50px;
          font-size: 24px;
          display: flex;
          flex-flow: row wrap;
          align-items: center;
          justify-content: flex-start;
          gap: 10px;
          border-bottom: solid 1px;
      }
        .app-body {
          grow: 1;
          width: 100%;
          height: 100%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      .logo-small{
        width: 32px;
        height: 32px;
      }
      .logo-large{
        width: 512px;
        height: 512px;
      }
        
        `;
      
        await fs.writeFile(path.join(projectFolderPath, 'index.html'), indexHtmlContent);
        await fs.writeFile(path.join(jsFolderPath, 'index.js'), indexJsContent);
        await fs.writeFile(path.join(cssFolderPath, 'index.css'), indexCssContent);
      
        
        return;
      }
      async findAvailableProjectName(projectName) {
        let availableProjectName = projectName;
        let counter = 1;
      
        while (await fs.pathExists(path.join(__dirname, 'pwa-projects', availableProjectName))) {
          availableProjectName = `${projectName}-${counter}`;
          counter++;
        }
      
        return availableProjectName;
      }
}
module.exports = new PWABuilder();