//Guide:
//npm install           
//npm audit fix     
//node xml_parser.js  
//clear    

const fs = require('fs');
const xml2js = require('xml2js');

//Use the xml2js package to parse the XML to a JavaScript object
const parser = new xml2js.Parser();

//Read prices.xml file for getting the prices of the products
fs.readFile('prices_watchfinder.xml', (err, data) => {

	if (err) throw err;

	//Parse the price XML to a JavaScript object
	parser.parseString(data, (err, result) => {

		if (err) throw err;

		// Modify the result object to get the final prices and only take the currency, applicableCountries, applicableCurrencies and price
		const finalPriceData = result.pricebooks.pricebook.map((item) => {
			//get the currency value with validation
			const currency = item.header[0] && item.header[0].currency && item.header[0].currency[0];
			//get the applicableCountries value with validation
			const applicableCountries = item.header && item.header[0] && item.header[0]["custom-attributes"] && item.header[0]["custom-attributes"][0] && item.header[0]["custom-attributes"][0]["custom-attribute"] && item.header[0]["custom-attributes"][0]["custom-attribute"][0] && item.header[0]["custom-attributes"][0]["custom-attribute"][0].value || [];
			//get the applicableCurrencies value with validation
			const applicableCurrencies = item.header && item.header[0] && item.header[0]["custom-attributes"] && item.header[0]["custom-attributes"][0] && item.header[0]["custom-attributes"][0]["custom-attribute"] && item.header[0]["custom-attributes"][0]["custom-attribute"][1] && item.header[0]["custom-attributes"][0]["custom-attribute"][1].value || [];
			//get the price value with validation and map the price-tables array to get the sku, price and quantity
			const price = item["price-tables"] && item["price-tables"][0] && item["price-tables"][0]["price-table"] && item["price-tables"][0]["price-table"].map((elm) => {
				//get the sku value with validation
				const sku = elm["$"] && elm["$"]["product-id"] || "";
				//get the price value with validation
				const price = elm.amount && elm.amount[0] && elm.amount[0]["_"] || 0;
				//get the quantity value with validation
				const quantity = elm.amount && elm.amount[0] && elm.amount[0]["$"] && elm.amount[0]["$"].quantity || 1;
				//create the result object
				const result = { sku, price, quantity };
				return result;
			}) || [];
			const finalResult = { currency, applicableCountries, applicableCurrencies, price };
			return finalResult;
		});


		//Read product.json file for getting the products (it is only contain some of the product information. SO, I have to merge the product data and the price data)
		fs.readFile('product_new.json', (err, data) => {
			if (err) throw err;
			//Parse the product JSON to a JavaScript object
			const products = JSON.parse(data);

			// const di   

			//-------------------------------------------------------//
			//Here is not all the data is available. So, I have skip this part.
			//-------------------------------------------------------//

			// let resultData = products.map((product) => {
			// 	let priceData = finalPriceData
			// 		//filter the price data with the product id. So that I can get the available product price
			// 		.filter((elm) => {
			// 			return elm.price.find((el => {
			// 				return el.sku === product.id;
			// 			}))
			// 		})
			// 		//filter the price data with the applicableCountries and applicableCurrencies. without these two values, I can not use the price data
			// 		.filter((elm) => {
			// 			return elm.applicableCountries && elm.applicableCountries.length > 0 && elm.applicableCurrencies;
			// 		})
			// 		//map the price data to get the currency, applicableCountries, applicableCurrencies and price
			// 		.map((elm, i) => {
			// 			let price = elm.price.find((el => {
			// 				return el.sku === product.id;
			// 			})).price;

			// 			//There is multiple applicableCountries for a product. So, I have to map the applicableCountries. 
			// 			let applicableCountries = elm.applicableCountries
			// 				.map((el) => {
			// 					return {
			// 						currency: elm.currency,
			// 						applicableCountries: el,
			// 						applicableCurrencies: elm.applicableCurrencies[0],
			// 						price: price
			// 					};
			// 				})
			// 			return applicableCountries;
			// 		})
			// 		//reduce the price data to get the final price data form array of array to a single array
			// 		.reduce((acc, val) => acc.concat(val), [])
			// 	return { ...product, price: priceData }
			// });
			//return the result data
			let resultData = products.map((product) => {
				return { ...product };
			});


			//Read finalPrices.json file for getting the price data
			fs.readFile('finalPrices.json', (err, data) => {
				if (err) throw err;
				//Parse the finalPrices JSON to a JavaScript object
				const finalPrices = JSON.parse(data);
				//map the result data to get the final price data
				resultData = resultData.map((elm) => {
					//get the final price data with the product id
					let finalPrice = finalPrices.find((el) => {
						return el.sku === elm.id;
					});
					if (finalPrice) {
						Object.keys(finalPrice).forEach((key) => {
							if (key.includes("lng:")) {
								finalPrice[key.replace("lng:", "").replace(":price", "")] = finalPrice[key];
								delete finalPrice[key];
							} else if (key === "sku") {
								delete finalPrice[key];
							}
						});
					}
					return { ...elm, prices: finalPrice || [] };
				});


				//Read product_catalog.xml file for getting the product names and images (also id for matching the product)
				fs.readFile('product_catalog.xml', (err, data) => {
					if (err) throw err;
					//Parse the product_catalog XML to a JavaScript object
					parser.parseString(data, (err, result) => {
						const data = result.catalog.product;
						const finalProductData = data
							//filter the product data with the product id. So that I can get the available product data
							.filter((elm) => {
								let id = elm["$"] && elm["$"]["product-id"] && elm["$"]["product-id"] !== "" && elm["$"]["product-id"];
								return products.find((el) => {
									return el.id === id
								})
							})
							//map the product data to get the id, names and images
							.map((elm) => {
								let id = elm["$"] && elm["$"]["product-id"] && elm["$"]["product-id"] !== "" && elm["$"]["product-id"];

								let names = elm["display-name"] && elm["display-name"].reduce((acc, el) => {
									key = el["$"] && el["$"]["xml:lang"] || "";
									value = el["_"] || "";
									acc[key] = value;
									return acc;
								}, {}) || {};

								let images = elm.images && elm.images[0] && elm.images[0]["image-group"] && elm.images[0]["image-group"] && elm.images[0]["image-group"][0] && elm.images[0]["image-group"][0].image && elm.images[0]["image-group"][0].image.map((el) => {
									return el["$"] && el["$"]["path"] || "";
								});
								// <custom-attribute attribute-id="ATT_COLOR_CODE">#000000</custom-attribute>
								let colorCode = elm["custom-attributes"] && elm["custom-attributes"][0] && elm["custom-attributes"][0]["custom-attribute"]
									.filter((el) => {
										return el["$"] && el["$"]["attribute-id"] && el["$"]["attribute-id"] === "ATT_COLOR_CODE";
									})
								colorCode = colorCode[0] && colorCode[0]["_"] || "";

								let materials = elm["custom-attributes"] && elm["custom-attributes"][0] && elm["custom-attributes"][0]["custom-attribute"]
									.filter((el) => {
										return el["$"] && el["$"]["attribute-id"] && el["$"]["attribute-id"] === "ATT_CASE_MATERIAL_LABEL" && el["$"]["xml:lang"];
									}).reduce((acc, el) => {
										const key = el["$"] && el["$"]["xml:lang"] || "";
										value = el["_"] || "";
										acc[key] = value;
										return acc;
									}, {}) || {};

								let colors = elm["custom-attributes"] && elm["custom-attributes"][0] && elm["custom-attributes"][0]["custom-attribute"]
									.filter((el) => {
										return el["$"] && el["$"]["attribute-id"] && el["$"]["attribute-id"] === "ATT_STRAP_COLOR_LABEL" && el["$"]["xml:lang"];
									}).reduce((acc, el) => {
										const key = el["$"] && el["$"]["xml:lang"] || "";
										value = el["_"] || "";
										acc[key] = value;
										return acc;
									}, {}) || {};

								let movements = elm["custom-attributes"] && elm["custom-attributes"][0] && elm["custom-attributes"][0]["custom-attribute"]
									.filter((el) => {
										return el["$"] && el["$"]["attribute-id"] && el["$"]["attribute-id"] === "ATT_TYPE_MOVEMENT" && el["$"]["xml:lang"];
									}).reduce((acc, el) => {
										const key = el["$"] && el["$"]["xml:lang"] || "";
										value = el["_"] || "";
										acc[key] = value;
										return acc;
									}, {}) || {};


								let straps = elm["custom-attributes"] && elm["custom-attributes"][0] && elm["custom-attributes"][0]["custom-attribute"]
									.filter((el) => {
										return el["$"] && el["$"]["attribute-id"] && el["$"]["attribute-id"] === "ATT_STRAP_MATERIAL_LABEL" && el["$"]["xml:lang"];
									}).reduce((acc, el) => {
										const key = el["$"] && el["$"]["xml:lang"] || "";
										value = el["_"] || "";
										acc[key] = value;
										return acc;
									}, {}) || {};

								let subCollections = elm["custom-attributes"] && elm["custom-attributes"][0] && elm["custom-attributes"][0]["custom-attribute"]
									.filter((el) => {
										return el["$"] && el["$"]["attribute-id"] && el["$"]["attribute-id"] === "ATT_SUB_COLLECTION" && el["$"]["xml:lang"];
									}).reduce((acc, el) => {
										const key = el["$"] && el["$"]["xml:lang"] || "";
										value = el["_"] || "";
										acc[key] = value;
										return acc;
									}, {}) || {};


								let size = elm["custom-attributes"] && elm["custom-attributes"][0] && elm["custom-attributes"][0]["custom-attribute"]
									.filter((el) => {
										return el["$"] && el["$"]["attribute-id"] && el["$"]["attribute-id"] === "ATT_WATCH_SIZE";
									})
								size = size[0] && size[0]["_"] || "";

								return { id, images, names, materials, colorCode, colors, movements, size, straps, subCollections };
							})

						//merge the product data and the price data
						resultData = resultData
							.map((elm) => {
								let id = elm.id;
								let names = finalProductData.find((el) => {
									return el.id === id
								}) && finalProductData.find((el) => {
									return el.id === id
								}).names || {};
								let images = finalProductData.find((el) => {
									return el.id === id
								}) && finalProductData.find((el) => {
									return el.id === id
								}).images || [];
								let materials = finalProductData.find((el) => {
									return el.id === id
								}) && finalProductData.find((el) => {
									return el.id === id
								}).materials || {};
								let colors = finalProductData.find((el) => {
									return el.id === id
								}) && finalProductData.find((el) => {
									return el.id === id
								}).colors || {};
								let movements = finalProductData.find((el) => {
									return el.id === id
								}) && finalProductData.find((el) => {
									return el.id === id
								}).movements || {};
								let colorCode = finalProductData.find((el) => {
									return el.id === id
								}) && finalProductData.find((el) => {
									return el.id === id
								}).colorCode || "";
								let size = finalProductData.find((el) => {
									return el.id === id
								}) && finalProductData.find((el) => {
									return el.id === id
								}).size || "";
								let straps = finalProductData.find((el) => {
									return el.id === id
								}) && finalProductData.find((el) => {
									return el.id === id
								}).straps || {};
								let subCollections = finalProductData.find((el) => {
									return el.id === id
								}) && finalProductData.find((el) => {
									return el.id === id
								}).subCollections || {};
								return { ...elm, names, images, materials, colorCode, colors, movements, size, straps, subCollections };

							})
							.map((elm) => {
								// remove "material", "color", "name",  "movement" from the object because they are already in the object with translated values
								let { material, color, name, movement, ...rest } = elm;
								return rest;
							})
							.map((elm) => {
								//remove the " mm" from size value and make it a number because all the sizes are in mm
								let size = elm.size && elm.size.replace(" mm", "") || "";
								size = Number(size);
								return { ...elm, size };
							})
							.map((elm) => {
								//remove the full object if colorCode === "";
								//remove the full object if colors === {};
								//remove the full object if strap === {};
								//remove the full object if materials === {};
								//remove the full object if movements === {};
								//remove the full object if names === {};
								//remove the full object if images === [];
								//remove the full object if size === "";
								//remove the full object if prices === []

								let { colorCode, colors, materials, movements, names, images, size, prices, straps, subCollections, ...rest } = elm;
								if (colorCode === "" || Object.keys(colors).length === 0 || Object.keys(materials).length === 0 || Object.keys(movements).length === 0 || Object.keys(names).length === 0 || images.length === 0 || size === "" || prices.length === 0 || Object.keys(straps).length === 0) {
									return null;
								}
								else {
									return elm;
								}
							}).filter((elm) => {
								return elm !== null;
							}).map((elm) => {
								const acceptedCurrency = ["de_CH", "en_CH", "fr_CH", "it_CH", "zh_CH", "en_AU", "zh_AU", "de_DE", "en_DE", "en_ES", "es_ES", "en_FR", "fr_FR", "zh_FR", "en_IT", "it_IT", "en_GB", "zh_GB", "en_JP", "ja_JP", "en_US", "es_US", "fr_US", "zh_US"];
								const acceptedLanguage = ["de", "en-GB", "en-US", "x-default", "fr", "it", "zh", "es", "ja"];
								//remove the key and value prom prices if the key is not in the acceptedLanguage array
								let prices = elm.prices;
								let newPrices = {};
								Object.keys(prices).forEach((key) => {
									if (acceptedCurrency.includes(key)) {
										newPrices[key] = prices[key];
									}
								});
								//only keep the name from names, martial from materials, color from colors, movement from movements and strapColor from strap that are in the acceptedLanguage array
								let names = elm.names;
								let newNames = {};
								Object.keys(names).forEach((key) => {
									if (acceptedLanguage.includes(key)) {
										newNames[key] = names[key];
									}
								});

								let materials = elm.materials;
								let newMaterials = {};
								Object.keys(materials).forEach((key) => {
									if (acceptedLanguage.includes(key)) {
										newMaterials[key] = materials[key];
									}
								});

								let colors = elm.colors;
								let newColors = {};
								Object.keys(colors).forEach((key) => {
									if (acceptedLanguage.includes(key)) {
										newColors[key] = colors[key];
									}
								});

								let movements = elm.movements;
								let newMovements = {};
								Object.keys(movements).forEach((key) => {
									if (acceptedLanguage.includes(key)) {
										newMovements[key] = movements[key];
									}
								});

								let straps = elm.straps;
								let newStrap = {};
								Object.keys(straps).forEach((key) => {
									if (acceptedLanguage.includes(key)) {
										newStrap[key] = straps[key];
									}
								});

								let subCollections = elm.subCollections;
								let newSubCollections = {};
								Object.keys(subCollections).forEach((key) => {
									if (acceptedLanguage.includes(key)) {
										newSubCollections[key] = subCollections[key];
									}
								});

								return { ...elm, names: newNames, materials: newMaterials, colors: newColors, movements: newMovements, prices: newPrices, straps: newStrap, subCollections: newSubCollections };
							}).map((elm) => {
								//color name for which color name is "No name". 
								const colorCodeForNoName = [
									{
										"colorCode": "#9a9a9a",
										"de": "Grau",
										"x-default": "Grey",
										"en-GB": "Grey",
										"en-US": "Grey",
										"es": "Gris",
										"fr": "Gris",
										"it": "Grigio",
										"ja": "グレー",
										"zh": "灰色"
									},
									{
										"colorCode": "#000000",
										"de": "Schwarz",
										"x-default": "Black",
										"en-GB": "Black",
										"en-US": "Black",
										"es": "Negro",
										"fr": "Noir",
										"it": "Nero",
										"ja": "ブラック",
										"zh": "黑色"
									},
									{
										"colorCode": "#e0c133",
										"de": "Gold",
										"x-default": "Gold",
										"en-GB": "Gold",
										"en-US": "Gold",
										"es": "oro",
										"fr": "Or",
										"it": "oro",
										"ja": "ゴールド",
										"zh": "金子"
									},
									{
										"colorCode": "#f161ac",
										"de": "Rosa",
										"x-default": "Pink",
										"en-GB": "Pink",
										"en-US": "Pink",
										"es": "rosa",
										"fr": "Rose",
										"it": "rosa",
										"ja": "ピンク",
										"zh": "粉红色"
									},
									{
										"colorCode": "#587924",
										"de": "khaki",
										"x-default": "Khaki",
										"en-GB": "Khaki",
										"en-US": "Khaki",
										"es": "caqui",
										"fr": "Kaki",
										"it": "cachi",
										"ja": "カーキ",
										"zh": "卡其色"
									},
									{
										"colorCode": "#fee800",
										"de": "gelb",
										"x-default": "Yellow",
										"en-GB": "Yellow",
										"en-US": "Yellow",
										"es": "amarillo",
										"fr": "Jaune",
										"it": "giallo",
										"ja": "イエロー",
										"zh": "黄的"
									},
									{
										"colorCode": "#f48406",
										"de": "Orange",
										"x-default": "Orange",
										"en-GB": "Orange",
										"en-US": "Orange",
										"es": "naranja",
										"fr": "Orange",
										"it": "arancione",
										"ja": "オレンジ",
										"zh": "橘色"
									},
									{
										"colorCode": "#e22121",
										"de": "rot",
										"x-default": "Red",
										"en-GB": "Red",
										"en-US": "Red",
										"es": "rojo",
										"fr": "Rouge",
										"it": "rosso",
										"ja": "レッド",
										"zh": "红"
									},
									{
										"colorCode": "#66348e",
										"de": "lila",
										"x-default": "Purple",
										"en-GB": "Purple",
										"en-US": "Purple",
										"es": "morado",
										"fr": "Violet",
										"it": "viola",
										"ja": "パープル",
										"zh": "紫色"
									},
									{
										"colorCode": "#009de2",
										"de": "blau",
										"x-default": "Blue",
										"en-GB": "Blue",
										"en-US": "Blue",
										"es": "azul",
										"fr": "Bleu",
										"it": "blu",
										"ja": "青",
										"zh": "蓝"
									},
									{
										"colorCode": "#6ca927",
										"de": "Grün",
										"x-default": "Green",
										"en-GB": "Green",
										"en-US": "Green",
										"es": "verde",
										"fr": "Vert",
										"it": "verde",
										"ja": "ヴァート",
										"zh": "顶点"
									},
									{
										"colorCode": "#d9a976",
										"de": "beige",
										"x-default": "Beige",
										"en-GB": "Beige",
										"en-US": "Beige",
										"es": "beige",
										"fr": "Beige",
										"it": "beige",
										"ja": "ベージュ",
										"zh": "米黄色"
									},
									{
										"colorCode": "#9a5723",
										"de": "braun",
										"x-default": "Brown",
										"en-GB": "Brown",
										"en-US": "Brown",
										"es": "marrón",
										"fr": "Marron",
										"it": "marrone",
										"ja": "ブラウン",
										"zh": "棕色"
									},
									{
										"colorCode": "#172483",
										"de": "Dunkelblau",
										"x-default": "Dark Blue",
										"en-GB": "Dark Blue",
										"en-US": "Dark Blue",
										"es": "azul oscuro",
										"fr": "Bleu Nuit",
										"it": "blu scuro",
										"ja": "ダークブルー",
										"zh": "深蓝色"
									},
									{
										"colorCode": "#ffffff",
										"de": "weiß",
										"x-default": "White",
										"en-GB": "White",
										"en-US": "White",
										"es": "blanco",
										"fr": "Blanc",
										"it": "bianco",
										"ja": "ホワイト",
										"zh": "白色"
									},
									{
										"colorCode": "#00FF00",
										"de": "elektrisch grün",
										"x-default": "Electric green",
										"en-GB": "Electric green",
										"en-US": "Electric green",
										"es": "verde eléctrico",
										"fr": "Vert electrique",
										"it": "verde elettrico",
										"ja": "エレクトリックグリーン",
										"zh": "电绿"
									}
								]

								const element = colorCodeForNoName.find(color => color["colorCode"] === elm.colorCode);

								let colorName = elm.colors;
								const keys = ["de", "x-default", "en-GB", "en-US", "es", "fr", "it", "ja", "zh"];
								if (element && element["x-default"] !== "No Color") {
									colorName = keys.reduce((acc, key) => {
										if (element[key] && element[key] !== "No Color") {
											acc[key] = element[key];
										}
										return acc;
									}, {});
								}
								return { ...elm, colors: colorName }
							});

						console.log(resultData.length)

						//Write the result data to a JSON file
						fs.writeFile('dataTest.json', JSON.stringify(resultData, null, 4), (err) => {
							if (err) {
								console.log(err);
							}
							else {
								console.log("JSON saved to data.json");
							}
						});

					});
				});
			});
		});
	});
});

const acceptedCurrency = ["de_CH", "en_CH", "fr_CH", "it_CH", "zh_CH", "en_AU", "zh_AU", "de_DE", "en_DE", "en_ES", "es_ES", "en_FR", "fr_FR", "zh_FR", "en_IT", "it_IT", "en_GB", "zh_GB", "en_JP", "ja_JP", "en_US", "es_US", "fr_US", "zh_US"];

const allLanguages = ["de", "en-GB", "x-default", "fr", "it", "zh", "es", "ja", "ko", "pt", "ru", "vo"];
const acceptedLanguage = ["de", "en-GB", "x-default", "fr", "it", "zh", "es", "ja"];
const ignoreLanguages = ["ko", "pt", "ru", "vo"];

// US($), GB(£), CH(CHF), DE(€), FR(€), ES(€), IT(€), JP( ¥), AU(A$).
const currencyMap = [
	{
		"currency": "USD",
		"country": ["US"],
		"symbol": "$",
		"prices": ["en_US", "es_US", "fr_US", "zh_US"]
	},
	{
		"currency": "GBP",
		"country": ["GB"],
		"symbol": "£",
		"prices": ["en_GB", "zh_GB"]
	},
	{
		"currency": "CHF",
		"country": ["CH"],
		"symbol": "CHF",
		"prices": ["de_CH", "en_CH", "fr_CH", "it_CH", "zh_CH"]
	},
	{
		"currency": "EUR",
		"country": ["DE", "FR", "ES", "IT"],
		"symbol": "€",
		"prices": ["de_DE", "en_DE", "en_ES", "es_ES", "en_FR", "fr_FR", "zh_FR", "en_IT", "it_IT"]
	},
	{
		"currency": "JPY",
		"country": ["JP"],
		"symbol": "¥",
		"prices": ["en_JP", "ja_JP"]
	},
	{
		"currency": "AUD",
		"country": ["AU"],
		"symbol": "A$",
		"prices": ["en_AU", "zh_AU"]
	}
];
