'use strict';

const ElectronModule = require( 'electron' );
const ChildModule = require( 'child_process' );
const PathModule = require( 'path' );
const ReadlineModule = require( 'readline' );
const ExpressModule = require( 'express' );
const BodyparserModule = require( 'body-parser' );
const ExpressApp = ExpressModule( );

const DeviceDriver = { running: false };
let ReadyToGui = 0;
let EventSource;
let MainWindow;
let ExpressServer;

// Ejecutada cuando se crea el proceso hijo.
function onChildExec( error, stdout, stderr ) {
  if( error ) {
    // No se pudo lanzar el proceso hijo.
  } else {
    // Ok. Proceso lanzado.
  }
}

function OnEventSource( req, res ) {
  EventSource = res;

  // Dejamos el socket abierto el maximo de tiempo posible.
  req.socket.setTimeout( 2147483647 );

  // Los sockets EventSource tienen un tipo mime concreto.
  // Ademas, pedimos al navegador que no los cachee.
  // Y que mantenga la conexion abierta.
  res.writeHead( 200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  } );
  res.write( '\n' );
}

// Peticion de 'pitido'.
function OnBeep( req, res ) {
  if( ( 'hz' in req.body ) && ( 'ms' in req.body ) ) {
    // Se nos esta pidiendo que pite.
    if( DeviceDriver.running ) {
      // Pitido.
      // Comprobamos el rango de los hz.
      if( req.body.hz < 1 ) req.body.hz = 1;
      if( req.body.hz > 9 ) req.body.hz = 9;
      // Y el de los ms.
      if( req.body.ms < 1 ) req.body.hz = 1;
      if( req.body.ms > 9 ) req.body.hz = 9;

      res.writeHead( 200 );
      res.end( );
      DeviceDriver.child.stdin.write( `beep${req.body.hz}${req.body.ms}\n` );
    } else {
      res.writeHead( 500, 'Device driver not running' );
      res.end( );
    }
  } else {
    // Peticion incorrecta.
    res.writeHead( '400' );
    res.end( );
  }
}

// Creamos la ventana del navegador.
function CreateWindow( ) {
  console.log( 'CreateWindow( )' );

  MainWindow = new ElectronModule.BrowserWindow( {
    width: 800,
    height: 600,
    title: 'Concept Test',
    // kiosk: true,
    webPreferences: {
      webSecurity: false,
      preload: PathModule.join( __dirname, '/preload.js' ),
      nodeIntegration: false,
      allowRunningInsecureContent: true,
      defaultEncoding: 'UTF-8',
    }
  } );

  global.Indra = { DocumentRoot: 'http://127.0.0.1:' + ExpressServer.address( ).port + '/' };

  MainWindow.setMenu( null );
  MainWindow.loadFile( 'public/index.html' );

  MainWindow.webContents.openDevTools( );

  MainWindow.on( 'closed', function( ) {
    MainWindow = null;
  } );
}

// Respuesta a eventos de la ventana del navegador.
ElectronModule.app.on( 'window-all-closed', function ( ) {
  if( process.platform !== 'darwin' ) ElectronModule.app.quit( );
} );

ElectronModule.app.on( 'activate', function( ) {
  if( MainWindow === null ) {
    CreateWindow( );
  }
} );

ElectronModule.app.on( 'ready', function( ) {
  console.log( 'ready( )' );
  ReadyToGui |= 2;
  if( ReadyToGui === 3 ) CreateWindow( );
} );

// Modulo para parsear los POST con datos JSON.
ExpressApp.use( BodyparserModule.json( ) );
ExpressApp.post( '/beep', OnBeep );
ExpressApp.get( '/events', OnEventSource );

// Lanzamos el controlador.
DeviceDriver.child = ChildModule.spawn( PathModule.join( __dirname, 'beep/beep.exe' ),
                                        {
                                          stdio: 'pipe',
                                          windowsHide: true
                                        } );

// Adaptador para poder comunicarnos con el controlador mediante su stdin / stdout.
DeviceDriver.stdio = ReadlineModule.createInterface( {
  input: DeviceDriver.child.stdout,
  terminal: false
} );

DeviceDriver.stdio.on( 'line', function( input ) {
  EventSource.write( `data: ${input}\n\n` );
} );

DeviceDriver.running = true;

ExpressServer = ExpressApp.listen( null, '127.0.0.1', 511, function( ) {
  console.log( 'listening event' );

  ReadyToGui |= 1;
  if( ReadyToGui === 3 ) setTimeout( CreateWindow, 0 );
} );
