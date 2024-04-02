const fs = require('fs-extra');
const path = require('path');

const pwaBuilder = require('./pwa-builder.js');
const PWAServer = require('./pwa-server');


const pwaServer = new PWAServer();


const args = process.argv.slice(2);
const options = parseArgs(args);
function parseArgs(a) {
  let f = false;
  let v = false;
  var o = {
    init:false,
    help:false,
    h:false,
    serve:false,
    list: false
  }
  var lastKey = null;
  a.forEach(c=>{
    if(c.startsWith('-')){
     lastKey = c.toString().replace(/^-+/,'');
     o[lastKey] = true;
    }
    else if(!c.startsWith('-') && lastKey !==null){
      if(lastKey !==null){
        o[lastKey] = o[lastKey] === true?c:`${o[lastKey]} ${c}`;
      }
    }
  });
  
  return o;
}



async function main() {
  try {

  if(options.h || options.help){
    showHelp();
    process.exit(0);
  }

   if(options.init){
    await pwaBuilder.initializePWA();
    process.exit(0);
  }
  else if(options.list){
    const projects = await fs.readdir(path.join(__dirname, 'pwa-projects'));
    console.log(
      `
Available projects:
      `+
      
      projects.join(`
    `))+`
    

    `
    console.log(`
To run a project, use the following command:
  node app.js run <project-name> [--port <specific port number>]
Alternatively, you can run all projects by running: 
  npm run start
    `);
    if(projects.length>0){
      console.log(`
Example:
node app.js run ${projects[0]}

`);
    }
    else{
      console.log(`No projects found. run "node app.js init" to create a new pwa project`);
    }
    process.exit(0);
  }
  else if(options.serve){
   
    const projects = await fs.readdir(path.join(__dirname, 'pwa-projects'));
    projects.forEach(p=>{
       serveProject(path.join(__dirname, 'pwa-projects',p),'/'+ p);
    })
    return;
  }
  else if(options.run){
  const projects = await fs.readdir(path.join(__dirname, 'pwa-projects'));
  if(projects.includes(options.run) && !options.port){
    serveProject(path.join(__dirname, 'pwa-projects',options.run),'/'+ options.run);
  }
  else if (projects.includes(options.run) && options.port){
    serveProject(path.join(__dirname, 'pwa-projects',options.run),'/'+ options.run, parseInt(options.port));
  }
  return;
  }

else{
  console.log("invalid arguments given");
  showHelp();
  process.exit(0);
}
}catch(err){
  console.log(err);
  process.exit(0);
}
}
function showHelp(){
  console.log(`
  Web-UI Usage
  -------------------------
  npm run start
  
  CLI Usage
  -------------------------
    node app.js --init
    node app.js --list
    node app.js --run <project-name> [--port <specific port number>]
    node app.js --serve
  `);
 
}
function serveProject(path, relativePath,port = null) {
  pwaServer.createServer(path, relativePath, port)
  .then(()=>{
    pwaServer.startHostServer()
    .catch((err)=>{
      console.log(err)})
    })
  .catch((err)=>{
    console.log(err)});
}

// Call the main function
main().catch(error => console.error('Error in main:', error));
