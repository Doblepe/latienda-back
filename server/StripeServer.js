const express = require("express")
const app = express()
require("dotenv").config()
// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
const stripe = require("stripe")(process.env.SECRET_KEY)
const bodyParser = require("body-parser")
const cors = require("cors")

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.use(cors())

app.post("/payment", cors(), async (req, res) => {
	let { amount, id } = req.body
	try {
		const payment = await stripe.paymentIntents.create({
			amount,
			currency: "EUR",
			description: "Pedido en Tu Tienda",
			payment_method: id,
			confirm: true
		})
		console.log("Payment", payment)
		res.json({
			mensaje: "Pago correcto",
			success: true,
			error: false
		})
	} catch (error) {
		console.log("Error", error)
		res.json({
			error: true,
			mensaje: "Algo ha fallado",
			success: false
		})
	}
})

app.listen(process.env.PORT || 4000, () => {
	console.log("Sever is listening on port 4000")
})