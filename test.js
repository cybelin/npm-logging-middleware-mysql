import { createLogger } from './index.mjs';

const dbConfig = {
    host: 'localhost',
    user: 'alvaro',
    password: 'test1234',
    database: 'cybelinserver',
};

const logger = createLogger({ dbConfig });

(async () => {
    try {
        await logger.initialize();
        console.log('Logger initialized successfully');
    } catch (error) {
        console.error('Error initializing logger:', error);
    }
})();
