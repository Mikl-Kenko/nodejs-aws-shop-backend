const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors())
app.use(express.json());
app.all('/*', (req, res) => {  
  const recipient_service = req.originalUrl.split('/')[1]; 
  const recipient_service_url = process.env[`${recipient_service.toUpperCase()}_SERVICE`]; 
  const url = `${recipient_service_url}${req.originalUrl.slice(recipient_service.length+1)}`;

  if(recipient_service_url) {
    const axios_config = {
      method: req.method,
      url: url, 
      ...(Object.keys(req.body || {}).length > 0 && {data: req.body})
    };

    axios (axios_config)
    .then(function (response) {
      res.json(response.data);
    })
    .catch(error => {
      if(error.response) {
        const {status, data} = error.response;
        res.status(status).json(data);
      } else {
        res.status(500).json({error: error.message});
      }
    });

  } else {
    res.status(502).json({error: 'Cannot process request'});
  }
})

app.listen(PORT, () => { console.log('App is listening on port: ', PORT);});
