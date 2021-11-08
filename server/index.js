const express = require('express');
const mongodb = require('mongodb');
const MongoStore = require("connect-mongo");
const cookieParser = require('cookie-parser')
const secreto = "patata";
const crypto = require("crypto");
/* const contact = require('./routes/contact');
const address = require('./routes/address') */

require('dotenv').config();
const app = express();
const port = process.env.PORT || 3001
const cors = require('cors')
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");
// Accessing the path module
const path = require("path");
// Step 1:
app.use(express.static(path.resolve(__dirname, "./client/build")));
// Step 2:
app.get("*", function (request, response) {
  response.sendFile(path.resolve(__dirname, "./client/build", "index.html"));
});


app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(
	cors({
		origin: "http://localhost:3000", //dirección de la app de React desde la que nos llegarán las peticiones.
		credentials: true,
	})
);

app.use(
	session({
		secret: secreto, //Secreto de la sesion (se puede hacer dinámico),
		resave: false, //Evita el reseteo de la sesión con cada llamada
		saveUninitialized: false, //Evita crear sesiones vacías
		store: MongoStore.create({
			//Nos guarda las sesiones en la colección "sesiones" en la base de datos "prueba"
			mongoUrl: process.env.MONGO_URL,
			dbName: "prueba",
			collectionName: "sesiones",
			ttl: 1000 * 60 * 60 * 24, //Time To Live de las sesiones
			autoRemove: "native", //Utiliza el registro TTL de Mongo para ir borrando las sesiones caducadas.
		}),
		cookie: {
			maxAge: 1000 * 60 * 60 * 24, //Caducidad de la cookie en el navegador del cliente.
		},
	})
);
app.use(cookieParser(secreto)); //Mismo que el secreto de la sesión
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
	//Middleware para publicar en consola la sesión y el usuario. Activar en desarrollo.
	console.log(req.session ? req.session : "No hay sesión");
	console.log(req.user ? req.user : "No hay usuario");
	next();
})

app.use(passport.initialize());
app.use(passport.session());



let MongoClient = mongodb.MongoClient;

MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true }, function (err, client) {
	err ? console.log(err) : (app.locals.db = client.db("store"), console.log('Mongo conectado'));
});

//------------------- Autorización y gestión de sesiones ----------
passport.use(
	new LocalStrategy(
		{
			usernameField: "email",
			passwordField: "password",
		},
		function (email, password, done) {
			app.locals.db.collection("users").findOne({ email: email }, function (err, user) {
				if (err) {
					return done(err);
				}
				if (!user) {
					return done(null, false);
				}
				if (!validoPass(password, user.password.hash, user.password.salt)) {
					return done(null, false);
				}
				return done(null, user);
			});
		}
	)
);
passport.serializeUser(function (user, done) {
	console.log("-> Serialize");
	done(null, user);
});
passport.deserializeUser(function (user, done) {
	console.log("-> Deserialize");
	app.locals.db.collection("users").findOne(
		{ email: user.email },
		function (err, usuario) {
			if (err) {
				return done(err);
			}
			if (!usuario) {
				return done(null, null);
			}
			return done(null, usuario);
		}
	);
});
passport.serializeUser(function (user, done) {
	done(null, user.email);
});
// Introduce la cookie en el navegador del usuario. 
passport.deserializeUser(function (email, done) {
	app.locals.db.collection("users").findOne({ email: email }, function (err, user) {
		if (err) {
			return done(err);
		}
		if (!user) {
			return done(null, null);
		}
		return done(null, user), console.log(user);
	});
});
// ----------------------- REGISTRO -------------------------------
app.post("/registro", function (req, res) {
	app.locals.db.collection("users")
		.find({ email: req.body.email })
		.toArray(function (err, user) {
			if (user.length === 0) {
				const saltYHash = creaPass(req.body.password);
				app.locals.db.collection("users").insertOne(
					{
						nombre: req.body.nombre,
						apellidos: req.body.apellidos,
						email: req.body.email,
						password: {
							hash: saltYHash.hash,
							salt: saltYHash.salt,
						},
					},
					function (err, respuesta) {
						if (err !== null) {
							console.log(err);
							res.send({ mensaje: "Ha habido un error: " + err });
						} else {
							res.send({ mensaje: "Usuario registrado" });
						}
					}
				);
			} else {
				res.send({ err: true, mensaje: "Usuario ya registrado" });
			}
		});
});

app.post("/login",
	passport.authenticate("local", {
		successRedirect: "/api",
		failureRedirect: "/api/fail",
	})
);
app.all("/api/fail", function (err, res,) {
	res.send({ logged: false, mensaje: "Conexión rechazada: el email o la contraseña son incorrectos", err: true });
});
app.all("/api", function (req, res) {
	// Utilizar .all como verbo => Las redirecciones desde un cliente Rest las ejecuta en POST, desde navegador en GET
	res.send({ logged: true, mensaje: "Login correcto", user: req.user });
});
app.post("/logout", function (req, res) {
	res.send({ logged: null, err: false, mensaje: "Logout Correcto", nombre: null });
	req.logOut();
});

// ----------------------- CONTACT  VÍCTOR-------------------------------
/* app.use('/contact/info', contact); */
app.post('/contact/info', function (req, res) {
	app.locals.db.collection('contact').insertOne(req.body, function (err, data, mensaje) {
		err ? res.send({ mensaje: '😅 Ha habido un error al enviar la información, por favor, vuelve a intentarlo ', error: true, contenido: err }) : res.send({  mensaje:'Mensaje recibido correctamente. Muchas gracias por confiar en nosotros, intentaremos resolver tu incidencia lo antes posible 😉', error: false, contenido: data });
	});
}); 
/* 
app.use('/contact/info', contact); */
/* app.use('/address/info', address); */
app.post('/address/info', function (req, res) {
	app.locals.db.collection('address').insertOne(req.body, function (err, data, mensaje) {
		err ? res.send({ mensaje: 'Ha habido un error al enviar la información, por favor, vuelve a intentarlo', error: true, contenido: err }) : res.send({  mensaje:'Hemos recogido tu dirección.  Muchas gracias por confiar en nosotros🥰 ', error: false, contenido: data });
	});
});

app.listen(port, function (err) {
	err
		? console.log("🔴 Servidor fallido")
		: console.log("🟢 Servidor a la escucha en el puerto:" + port);
});
// ------------------- FUNCIONES CRYPTO PASSWORD -------------------------

/**
 *
 * @param {*} password -> Recibe el password a encriptar
 * @returns -> Objeto con las claves salt y hash resultantes.
 */

function creaPass(password) {
	var salt = crypto.randomBytes(32).toString("hex");
	var genHash = crypto
		.pbkdf2Sync(password, salt, 10000, 64, "sha512")
		.toString("hex");

	return {
		salt: salt,
		hash: genHash,
	};
}

/**
 *
 * @param {*} password -> Recibe el password a comprobar
 * @param {*} hash -> Recibe el hash almacenado a comprobar
 * @param {*} salt -> Recibe el salt almacenado a comprobar
 * @returns -> Booleano ( true si es el correcto, false en caso contrario)
 */

function validoPass(password, hash, salt) {
	var hashVerify = crypto
		.pbkdf2Sync(password, salt, 10000, 64, "sha512")
		.toString("hex");
	return hash === hashVerify;
}

