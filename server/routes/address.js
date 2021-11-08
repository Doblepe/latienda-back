const express = require('express');
const router = express.Router();

router.post('/address/info', function (req, res) {
	app.locals.db.collection('address').insertOne(req.body, function (err, data, mensaje) {
		err ? res.send({ mensaje: 'Ha habido un error al enviar la información, por favor, vuelve a intentarlo', error: true, contenido: err }) : res.send({  mensaje:'Hemos recogido tu dirección.  Muchas gracias por confiar en nosotros🥰 ', error: false, contenido: data });
	});
});


module.exports = router;