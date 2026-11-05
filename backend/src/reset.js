import { resetDatabase } from './db.js';
import { seed } from './seed.js';

resetDatabase();
seed();
console.log('✔ Banco recriado com dados de demonstração');
