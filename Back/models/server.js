const express = require('express');
const cors = require('cors');
const { dbConnection } = require('../database/config');

class Server{

    constructor(){
        this.app = express();        
        this.port = process.env.PORT;
        
        this.paths = {
            auth:'/api/auth',      
            pacientes:'/api/pacientes',            
        }

        //Conectar a base de datos
        this.dbConnection();
        
        //Middlewares
        this.middlewares();    
        
        //Rutas de mi app
        this.routes();       

    }

    async dbConnection() {

        try {
            
            await dbConnection.authenticate();
            console.log('Database online');

        } catch (error) {
            throw new Error( error );
        }

    }

    middlewares(){

        //CORS
        this.app.use( cors());

        //Lectura y parse del body
        this.app.use( express.json() );

        //Directorio público
        this.app.use(express.static('public'));

        // Add headers before the routes are defined
        // this.app.use(function (req, res, next) {

        //     // Website you wish to allow to connect
        //     res.setHeader('Access-Control-Allow-Origin', '*');

        //     // Request methods you wish to allow
        //     res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

        //     // Request headers you wish to allow
        //     res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

        //     // Set to true if you need the website to include cookies in the requests sent
        //     // to the API (e.g. in case you use sessions)
        //     res.setHeader('Access-Control-Allow-Credentials', true);

        //     // Pass to next layer of middleware
        //     next();
        // });
    }

    routes(){               
        this.app.use(this.paths.auth, require('../routes/authRoute'));
        this.app.use(this.paths.pacientes, require('../routes/pacientesRoute'));
    }

    listen(){
        this.app.listen( this.port, () =>{
            console.log('Servidor corriendo en puerto ', this.port);
        } );
    }
}


module.exports = Server;
