const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const http = require('http');
const opn = require('opn');
const pwaBuilder = require('./pwa-builder');
const serverConfig = fs.readJSONSync(path.join(__dirname, 'pwa-server-settings.json'));

class IndexHandler {
  constructor(activeServers) {
    this.activeServers = activeServers;
  }
  dataTemplate(data){
    return JSON.stringify(data);
  }
  buildIndexFile() {
    let indexHtmlConent =`
      <!DOCTYPE html>
      <html lang="en">
     <head>  
  <title>PWA Server Host</title>
    <meta charset="UTF-8">  
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" href="./assets/project-icon-small.png" type="image/png">
    <link rel="stylesheet" href="./DevExtreme/css/dx.material.orange.dark.css" type="text/css">
    <script src="./jQuery/jquery-3.7.1.min.js" type="text/javascript"></script>
    <script src="./DevExtreme/js/dx.all.js" type="text/javascript"></script>  
    <style type="text/css">
    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      width: 100%;
    }
    .host-header {
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
    .host-body{
      flex-grow: 1;
      width: 100%;
      height: 100%;
      overflow: hidden;
      display: flex;
      align-items: flex-start;
      justify-content: flex-start;
      flex-flow: column nowrap;
      gap: 10px;
    }
    .logo-small{
      width: 32px;
      height: 32px;
    }
    .new-project-container{
      display: flex;
      flex-flow: row nowrap;
      align-items: baseline;
      justify-content: stretch;
      gap: 10px;
      width: 100%;
    }
    .new-project-text-container{
      flex-grow: 1;
    }
    </style>
    <script type="text/javascript">
    ${fs.readFileSync(path.join(__dirname, 'pwa-server-client.tmpl'), 'utf8')
      .replace('$$activeServers', this.dataTemplate(Object.keys(this.activeServers).map(k=>{
        return this.activeServers[k];
      })))

        
      }
  
    </script>
      </head>
      <body class="dx-viewport">
      <div class="host-header">
      <div><img class="logo-small" src="./assets/project-icon-small.png"></div>
      <div>
      PWA Server - Running Projects
      </div>
      </div>
      <div class="host-body">
        <div class="new-project-container">
        <div class="new-project-text-container"><div id="new-projext-text-box"></div></div>
        <div class="new-project-button-container"><div id="new-project-button-submit"></div></div>
        </div>
        <div id="project-list">
        </div>
          </div>
      </body>
    </html>`;
    return this.writeFiles(indexHtmlConent);
  }
writeFiles(indexHtmlConent){
  fs.writeFileSync(path.join(__dirname, 'pwa-projects', 'index.html'), indexHtmlConent);
  return fs.readFileSync(path.join(__dirname, 'pwa-projects', 'index.html'), 'utf8');
}
}



class PWAServer {
  static instance;

  constructor() {
    if (typeof(PWAServer.instance) !=="undefined"){
      return PWAServer.instance;
    }
    let self = this;
    PWAServer.instance = self;
    this.hostServerInit = false;
    this.config = Object.assign({}, serverConfig);
    this.hostApp = null;
    this.usedPorts = [];
    this.activeServers = {};

    PWAServer.instance = this;
  }

  async portInUse(port) {
    return this.usedPorts.includes(port);
  }

  async createServer(path, relativePath, port = null) {
    let customPortUsed = port !== null;
    port = customPortUsed ? port : this.config.portRange.start;

    this.activeServers[relativePath] = Object.assign({}, {
      port: port,
      path: path,
      staticPort: customPortUsed,
      relativePath: relativePath,
      active: false,
      app: null,
      server: null
    });

    const activeServer = this.activeServers[relativePath];


    if (activeServer.staticPort) {
      const success = await this.tryStartServer(activeServer);
      if (success === true) {
        return;
      } else {
        console.log("could not start project on server port " + activeServer.port);
        return;
      }
    }

    for (let i = this.config.portRange.start; i < this.config.portRange.end; i++) {
      activeServer.port = i;
      console.log('setting project port to: ' + activeServer.port);

      const success = await this.tryStartServer(activeServer);
      if (success) break;
    }
  }

  async tryStartServer(activeServer) {
    console.log('trying port ' + activeServer.port);

    try {
      activeServer.app = express();
      activeServer.server = http.createServer(activeServer.app);
      activeServer.app.use(activeServer.relativePath, express.static(activeServer.path));
      activeServer.app.use(activeServer.relativePath, cors());

      await new Promise((resolve, reject) => {
        activeServer.server.on('error', reject);
        activeServer.server.listen(activeServer.port, () => {
          activeServer.active = true;
          this.usedPorts.push(activeServer.port);
          resolve(true);
        });
      });

      return true;
    } catch (err) {
      return false;
    }
  }

  async startHostServer() {
    if(this.hostServerInit){
      return;
    }
    this.hostServerInit = true;
    this.hostApp = express();
    this.hostServer = http.createServer(this.hostApp);
    this.hostApp.use('*', cors());
    let router = new HostRouter(this.hostApp, this.activeServers);
    router.initRoutes();


    this.hostServer.listen(this.config.hostPort, () => {
      opn('http://localhost:' + this.config.hostPort);
    });
  }
}
class HostRouter {
  constructor(hostApp, activeServers) {
    this.activeServers = activeServers;
    this.hostApp = hostApp;
  }
  initRoutes(){
    this.hostApp.get('/', (req, res) => {
     
      if(fs.existsSync(path.join(__dirname, 'pwa-projects', 'index.html'))){
        fs.rmSync(path.join(__dirname, 'pwa-projects', 'index.html'));
      }
      const html = new IndexHandler(this.activeServers).buildIndexFile();
      fs.writeFileSync(path.join(__dirname, 'pwa-projects', 'index.html'), html);
      res.statusCode = 200;
      res.send(html);
      res.end();  
      //res.sendFile(path.join(__dirname, 'pwa-projects', 'index.html'));
    });
    this.hostApp.post('/initialize-pwa/:projectName', async (req, res) => {
      try {
        // Extract project name from request body if provided
        const projectName = req.params.projectName || null;
        if(projectName === null){
          res.status(400).json({ error: 'Project name is required.' });
          return;
        }
        // Call initializePWA function with the provided project name
        await pwaBuilder.initializePWA(projectName);
        res.status(200).json({ message: 'PWA initialized successfully.' });
        setTimeout(() => {
          process.exit(0); // Exit the current Node.js process with a success code (0)
      }, 3000); // Delay in milliseconds before restarting (e.g., 3000 milliseconds = 3 seconds)
      } catch (error) {
        console.error('Error initializing PWA:', error);
        res.status(500).json({ error: 'Internal server error.' });
      }
    });
  
    this.hostApp.use('/DevExtreme', express.static(path.join(__dirname, 'assets', 'DevExtreme')));
    this.hostApp.use('/jQuery', express.static(path.join(__dirname, 'assets', 'jQuery')));
    this.hostApp.use('/assets', express.static(path.join(__dirname, 'assets')));

  }
  
}

module.exports = PWAServer;
