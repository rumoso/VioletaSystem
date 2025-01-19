const express = require('express');
const cors = require('cors');
const { dbConnection } = require('../database/config');

class Server{

    constructor(){
        this.app = express();        
        this.port = process.env.PORT;

        this.paths = {
            auth:'/api/auth',
            users:'/api/users',
            roles:'/api/roles',
            products:'/api/products',
            families:'/api/families',
            groups:'/api/groups',
            origin:'/api/origin',
            quality:'/api/quality',
            customers:'/api/customers',
            sucursales:'/api/sucursales',
            salesType:'/api/salesType',
            formaPago:'/api/formaPago',
            sales:'/api/sales',
            fxRate:'/api/fxRate',
            electronicMoney:'/api/electronicMoney',
            cajas:'/api/cajas',
            synchronization:'/api/synchronization',
            printers:'/api/printers',
            actions:'/api/actions',
            authorizationActions:'/api/authorizationActions',
            rep_utilidades:'/api/rep_utilidades',
            suppliers:'/api/suppliers',
            comisiones:'/api/comisiones',
            finanzas:'/api/finanzas',

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
        this.app.use( cors() );

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
        this.app.use(this.paths.users, require('../routes/usersRoute'));
        this.app.use(this.paths.roles, require('../routes/rolesRoute'));
        this.app.use(this.paths.products, require('../routes/productsRoute'));
        this.app.use(this.paths.families, require('../routes/familiesRoute'));
        this.app.use(this.paths.groups, require('../routes/groupsRoute'));
        this.app.use(this.paths.origin, require('../routes/originRoute'));
        this.app.use(this.paths.quality, require('../routes/qualityRoute'));
        this.app.use(this.paths.customers, require('../routes/customersRoute'));
        this.app.use(this.paths.sucursales, require('../routes/sucursalesRoute'));
        this.app.use(this.paths.salesType, require('../routes/salesTypeRoute'));
        this.app.use(this.paths.formaPago, require('../routes/formaPagoRoute'));
        this.app.use(this.paths.sales, require('../routes/salesRoute'));
        this.app.use(this.paths.fxRate, require('../routes/fxRateRoute'));
        this.app.use(this.paths.electronicMoney, require('../routes/electronicMoneyRoute'));
        this.app.use(this.paths.cajas, require('../routes/cajasRoute'));
        this.app.use(this.paths.synchronization, require('../routes/synchronizationRoute'));
        this.app.use(this.paths.printers, require('../routes/printersRoute'));
        this.app.use(this.paths.actions, require('../routes/actionsRoute'));
        this.app.use(this.paths.authorizationActions, require('../routes/authorizationActionsRoute'));
        this.app.use(this.paths.rep_utilidades, require('../routes/rep_utilidadesRoute'));
        this.app.use(this.paths.suppliers, require('../routes/suppliersRoute'));
        this.app.use(this.paths.comisiones, require('../routes/comisionesRoute'));
        this.app.use(this.paths.finanzas, require('../routes/finanzasRoute'));
    }

    listen(){
        this.app.listen( this.port, () =>{
            console.log('Servidor corriendo en puerto ', this.port);
        } );
    }
}


module.exports = Server;