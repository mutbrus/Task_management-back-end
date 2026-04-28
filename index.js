require('dotenv').config();
const cors = require('cors');
const express = require('express');
const http = require('http');
const morgan = require('morgan');

const setup = require('./src/middlewares/setup')
const router = require('./src/configs/router')

const PORT = process.env.PORT || 3000;

const bootstrap = () => {
    const app = express();
    app.set('trust proxy', 1);
    app.use(cors({
        methods: "POST, GET, PUT, PATCH, DELETE",
        origin:'http://localhost:5173',
    }));
    app.use(express.json());
    app.use(morgan('dev'));
    app.use(setup);
    app.use('/', router);

    console.log("Starting app op port " + PORT);
    process.on('SIGINT', () => { console.log('Exiting app...'); process.exit(0); });

    const server = http.createServer(app);
    server.listen(PORT);
}

bootstrap();