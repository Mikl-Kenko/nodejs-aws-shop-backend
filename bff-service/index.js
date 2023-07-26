const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors())
app.use(express.json());
app.all('/*', (req, res) => {   })

app.listen(PORT, () => { console.log('App is listening on port: ', PORT);});
