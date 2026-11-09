'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = {'/':'index.html','/index.html':'index.html','/game.js':'game.js','/style.css':'style.css'};
http.createServer((req,res)=>{const file=files[req.url.split('?')[0]];if(!file){res.writeHead(404);return res.end('Not found');}fs.readFile(path.join(__dirname,file),(err,data)=>{if(err){res.writeHead(500);return res.end('Unable to read file');}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(data);});}).listen(3000,'127.0.0.1',()=>console.log('APEX is running at http://localhost:3000'));
