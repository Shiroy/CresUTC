var mysql = require('mysql');

var pool = mysql.createPool({
	host: 'localhost',
	user: 'root',
	password: 'mxd351Rt',
	database: 'fablab_caisse',
	connectionLimit: 3,
	queueLimit: 100,
	waitForConnections: true
});

exports.registerNewUser = function(user_cas_login, callback) {
	pool.getConnection(function(error, connection) {
		if(error) {
			return callback(error);
		}

		connection.query("INSERT IGNORE INTO users(cas_login, rights) VALUES (?, 'client')", [user_cas_login], function(err, results) {
			connection.release();
			return callback(err);
		});
	});
}

exports.userRank = function(user_cas_login, callback) {
	pool.getConnection(function(error, connection) {
		if(error) {
			return callback(error);
		}

		connection.query("SELECT rights FROM users WHERE cas_login=?", [user_cas_login], function(err, results) {
			connection.release();
			return callback(err, results[0].rights);
		});
	});
}

exports.getCaisseProducts = function(callback) {
	pool.getConnection(function(error, connection) {
		if(error) {
			return callback(error);
		}

		connection.query("SELECT p.id AS p_id, c.name as cat_name, p.name AS p_name, p.icon AS p_icon, p.prix AS p_prix, p.produitType AS p_type FROM categorie AS c INNER JOIN produit AS p ON c.id = p.categorie ORDER BY p.categorie", function(err, results) {
			var catName = null;

			var allCategorie = [];
			var products = [];

			connection.release();

			for(var i = 0 ; i < results.length ; i++) {
				if(catName == null)
					catName = results[0].cat_name;

				if(catName != results[i].cat_name) {
					var catObj = {
						name: catName,
						produits: products
					}

					allCategorie.push(catObj);

					products = [];
					catName = results[i].cat_name;
				}

				var prodObj = {
					id: results[i].p_id,
					name: results[i].p_name,
					prix: results[i].p_prix,
					icon: results[i].p_icon,
					type: results[i].p_type
				};

				products.push(prodObj);
			}

			var catObj = {  //C'est sale !
				name: catName,
				produits: products
			};

			allCategorie.push(catObj);

			callback(error, allCategorie);
		});
	});
}

exports.ajouterVente = function(vente, callback) {

	pool.getConnection(function(error, connection) {
		if(error) {
			return callback(error);
		}

		connection.beginTransaction(function(err) {
			if(err) {
				connection.release();
				callback(err);
			}

			connection.query("INSERT INTO vente(moyen_de_paiement, total) VALUES(?, ?)", [vente.moyenPaiement, vente.prixTotal], function(err, res) {
				if(err)
				{
					return connection.rollback(function() {
						connection.release();
						callback(err);
					});
				}

				insertProducts(vente.detail, 0, connection, res.insertId, callback);
			});
		});
	});
}

function insertProducts(products, start, connection, vente_id, callback) {
	var i = start;

	var callbackInsert = function(err, res) {
		var currentProduct = products[i];
		if(err != null)
		{
			console.log(err);
			return connection.rollback(function() {
				connection.release();
				callback(err);
			});
		}

		if(i >= products.length)
		{
			return connection.commit(function(err) {
				if(err) {
					return connection.rollback(function() {
						connection.release();
					})
				}
				connection.release();
				callback();
			});

		}

		//console.log("Inserting ", vente_id, " ", currentProduct.id);

		connection.query("INSERT INTO produit_vente (id_vente, id_produit, name, quantite, prix_total) VALUES(?, ?, ?, ?, ?)", [vente_id, currentProduct.id, currentProduct.produit, currentProduct.quantite, currentProduct.prix], callbackInsert);
		i++;
	}

	callbackInsert(null, null);
}

exports.allCategorie = function(callback) {
	pool.getConnection(function(error, connection) {
		if(error) {
			return callback(error);
		}

		connection.query("SELECT id, name FROM categorie", function(err, res) {
			connection.release();

			if(err) {
				return callback(err);
			}

			callback(err, res);
		});
	});
}

exports.addCategorie = function(catName, callback) {
	pool.getConnection(function(error, connection) {
		if(error) {
			return callback(error);
		}

		connection.query("INSERT INTO categorie(name) VALUES(?)", [catName], function(err) {
			connection.release();

			callback(err);
		});
	});
}
